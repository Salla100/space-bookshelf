#!/usr/bin/env python3
"""
Space Vault — Notion → products.json sync
Run by GitHub Actions daily, or manually: python sync/sync.py

Requires NOTION_TOKEN environment variable.

NOTION DATABASE PROPERTIES:
  Name              │ Type         │ Notes
  ──────────────────┼──────────────┼───────────────────────────────
  Title             │ Title        │ Product / book name
  Author / Brand    │ Text         │ Author, brand, or studio
  Category          │ Select       │ book · textbook · electronics ·
                    │              │ telescope · lego · movie · gadget ·
                    │              │ diy · food · travel
  Description       │ Text         │ 1–3 sentence description
  Tags              │ Multi-select │ e.g. "orbital mechanics", "beginner"
  Image URL         │ URL          │ Direct link (right-click Amazon img → Copy image address)
  Price (approx)    │ Text         │ e.g. "€18" or "~€55 entry"
  Affiliate URL     │ URL          │ Amazon Associates link (leave blank if not yet set)
  Retailer          │ Select       │ amazon · official · saleae · lego
  Rating            │ Number       │ 1–5
  Featured          │ Checkbox     │ Show in weekly-picks hero strip
  Sven Pick         │ Checkbox     │ "Sven picks" badge
  Difficulty        │ Select       │ Undergraduate · Graduate · Intermediate
  Status            │ Select       │ Published · Draft  (only Published syncs)
"""

import json
import os
import re
import sys
import requests

NOTION_TOKEN = os.environ.get("NOTION_TOKEN", "")
if not NOTION_TOKEN:
    print("ERROR: NOTION_TOKEN environment variable not set.", file=sys.stderr)
    sys.exit(1)

# ── Fill in your Space Vault Notion database ID ───────────────────────────────
# Find it in the URL when the database is open in Notion:
#   notion.so/yourname/[THIS-32-CHAR-ID]?v=...
VAULT_DB_ID = "PASTE_YOUR_DATABASE_ID_HERE"

HEADERS = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
}

OUT_FILE = "data/products.json"

# ── Notion API ────────────────────────────────────────────────────────────────

def notion_post(path, body):
    r = requests.post(f"https://api.notion.com/v1{path}", headers=HEADERS, json=body)
    r.raise_for_status()
    return r.json()

def db_query(db_id, body):
    results, cursor = [], None
    while True:
        payload = {**body, **({"start_cursor": cursor} if cursor else {})}
        data = notion_post(f"/databases/{db_id}/query", payload)
        results.extend(data.get("results", []))
        if not data.get("has_more"):
            break
        cursor = data.get("next_cursor")
    return results

# ── Property helpers ──────────────────────────────────────────────────────────

def prop_title(p):   return "".join(rt["plain_text"] for rt in (p.get("title") or []))
def prop_text(p):    return "".join(rt["plain_text"] for rt in (p.get("rich_text") or []))
def prop_select(p):  s = p.get("select"); return s["name"] if s else None
def prop_multi(p):   return [o["name"].lower().replace(" ", "-") for o in (p.get("multi_select") or [])]
def prop_url(p):     return p.get("url") or ""
def prop_num(p):     return p.get("number") or None
def prop_check(p):   return bool(p.get("checkbox"))

def prop_files(p):
    """Return URL from a Files & Media property (fallback for image uploads)."""
    files = p.get("files") or []
    if not files:
        return ""
    f = files[0]
    return f.get("external", {}).get("url") or f.get("file", {}).get("url") or ""

def slugify(text):
    s = re.sub(r"[^\w\s-]", "", text.lower())
    return re.sub(r"-+", "-", re.sub(r"[\s_]+", "-", s.strip()))[:60]

# ── Map Notion page → product dict ───────────────────────────────────────────

def map_page(page):
    p = page["properties"]

    title    = prop_title(p.get("Title", {}))
    category = (prop_select(p.get("Category", {})) or "gadget").lower().replace(" ", "-")
    image    = prop_url(p.get("Image URL", {})) or prop_files(p.get("Image", {}))
    aff_url  = prop_url(p.get("Affiliate URL", {})) or "#TODO"
    rating   = prop_num(p.get("Rating", {})) or 4

    return {
        "id":           slugify(title),
        "title":        title,
        "author":       prop_text(p.get("Author / Brand", {})),
        "category":     category,
        "tags":         prop_multi(p.get("Tags", {})),
        "description":  prop_text(p.get("Description", {})),
        "image":        image,
        "price_approx": prop_text(p.get("Price (approx)", {})),
        "affiliate_url": aff_url,
        "retailer":     (prop_select(p.get("Retailer", {})) or "amazon").lower(),
        "rating":       min(5, max(1, int(rating))),
        "featured":     prop_check(p.get("Featured", {})),
        "sven_pick":    prop_check(p.get("Sven Pick", {})),
        "difficulty":   prop_select(p.get("Difficulty", {})),
    }

# ── Merge: preserve hand-edited affiliate links ───────────────────────────────

def merge(fresh, existing):
    existing_map = {p["id"]: p for p in (existing or [])}
    merged = []
    for item in fresh:
        prev = existing_map.get(item["id"])
        if prev and item["affiliate_url"] == "#TODO" and prev.get("affiliate_url", "#TODO") != "#TODO":
            item["affiliate_url"] = prev["affiliate_url"]
        merged.append(item)
    return merged

# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if VAULT_DB_ID == "PASTE_YOUR_DATABASE_ID_HERE":
        print("ERROR: Set VAULT_DB_ID in sync/sync.py to your Notion database ID.", file=sys.stderr)
        sys.exit(1)

    print("\n🛸  Space Vault — Notion sync\n")

    # Load existing
    existing = None
    if os.path.exists(OUT_FILE):
        with open(OUT_FILE, encoding="utf-8") as f:
            existing = json.load(f)
        print(f"   Existing : {len(existing)} items in products.json")

    # Fetch from Notion
    print("   Fetching from Notion...")
    rows = db_query(VAULT_DB_ID, {
        "filter": {"property": "Status", "select": {"equals": "Published"}},
        "sorts":  [{"property": "Category", "direction": "ascending"}],
    })
    print(f"   Found    : {len(rows)} published items\n")

    if not rows:
        print("   ⚠  No published items found. Check that Status = 'Published' on your Notion rows.")
        sys.exit(0)

    fresh  = [map_page(r) for r in rows if prop_title(r["properties"].get("Title", {}))]
    merged = merge(fresh, existing)

    os.makedirs("data", exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)

    print(f"   ✅  {len(merged)} items written to {OUT_FILE}\n")

    # New items report
    if existing:
        existing_ids = {p["id"] for p in existing}
        new_items    = [p for p in merged if p["id"] not in existing_ids]
        if new_items:
            print(f"   🆕  New items ({len(new_items)}):")
            for p in new_items:
                print(f"      + {p['title']}  [{p['category']}]")
            print()

    # Missing images
    no_img = [p for p in merged if not p["image"]]
    if no_img:
        print(f"   📷  Missing image URL ({len(no_img)}) — add in Notion 'Image URL' column:")
        for p in no_img:
            print(f"      - {p['title']}")
        print("   Tip: right-click product image on Amazon → Copy image address\n")
    else:
        print("   📷  All items have images ✓\n")

    # Missing affiliate links
    no_link = [p for p in merged if p["affiliate_url"] == "#TODO"]
    if no_link:
        print(f"   🔗  Missing affiliate links ({len(no_link)}) — add via Amazon Associates SiteStripe:")
        for p in no_link:
            print(f"      - {p['title']}")
        print()
