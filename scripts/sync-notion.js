#!/usr/bin/env node
/**
 * Space Vault — Notion → products.json sync
 *
 * SETUP:
 *   1. Create a Notion integration at https://www.notion.so/my-integrations
 *   2. Share your database with the integration
 *   3. Copy NOTION_API_KEY and NOTION_DATABASE_ID into .env
 *   4. Run:  npm run sync
 *
 * REQUIRED NOTION DATABASE PROPERTIES:
 *   Name              │ Notion type  │ Notes
 *   ──────────────────┼──────────────┼───────────────────────────────────
 *   Title             │ Title        │ Product/book name
 *   Author / Brand    │ Text         │ Author, brand, or creator
 *   Category          │ Select       │ book · textbook · electronics ·
 *                     │              │ telescope · lego · movie · gadget ·
 *                     │              │ diy · food · travel
 *   Description       │ Text         │ 1–3 sentence description
 *   Tags              │ Multi-select │ e.g. "orbital mechanics", "beginner"
 *   Image URL         │ URL          │ Direct image link (Amazon CDN, etc.)
 *   Price (approx)    │ Text         │ e.g. "€18" or "~€55 entry"
 *   Affiliate URL     │ URL          │ Amazon Associates link (or # if TBD)
 *   Retailer          │ Select       │ amazon · official · saleae · lego
 *   Rating            │ Number       │ 1–5
 *   Featured          │ Checkbox     │ Show in weekly-picks hero
 *   Sven Pick         │ Checkbox     │ "Sven picks" badge
 *   Difficulty        │ Select       │ Undergraduate · Graduate · Intermediate
 *   Status            │ Select       │ Published · Draft  (only Published syncs)
 */

import { Client } from '@notionhq/client';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const __dir = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dir, '..', '.env') });

const API_KEY  = process.env.NOTION_API_KEY;
const DB_ID    = process.env.NOTION_DATABASE_ID;
const OUT_FILE = join(__dir, '..', 'data', 'products.json');

if (!API_KEY || !DB_ID) {
  console.error('\n❌  Missing environment variables.\n');
  console.error('   Create a .env file in the space-vault root with:\n');
  console.error('   NOTION_API_KEY=secret_xxxxxxxxxxxx');
  console.error('   NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxx\n');
  console.error('   See .env.example for full instructions.\n');
  process.exit(1);
}

const notion = new Client({ auth: API_KEY });

// ── Property helpers ─────────────────────────────────────────────────────────

function getText(prop) {
  if (!prop) return '';
  if (prop.type === 'title')     return prop.title.map(t => t.plain_text).join('');
  if (prop.type === 'rich_text') return prop.rich_text.map(t => t.plain_text).join('');
  return '';
}

function getSelect(prop) {
  return prop?.select?.name ?? null;
}

function getMultiSelect(prop) {
  return (prop?.multi_select ?? []).map(s => s.name.toLowerCase().replace(/\s+/g, '-'));
}

function getUrl(prop) {
  return prop?.url ?? '';
}

function getNumber(prop) {
  return prop?.number ?? null;
}

function getCheckbox(prop) {
  return prop?.checkbox ?? false;
}

function getFiles(prop) {
  if (!prop?.files?.length) return '';
  const f = prop.files[0];
  return f.type === 'external' ? f.external.url : (f.file?.url ?? '');
}

// ── Map a Notion page to a product record ─────────────────────────────────

function mapPage(page) {
  const p = page.properties;

  const title    = getText(p['Title']);
  const category = getSelect(p['Category'])?.toLowerCase()?.replace(/\s+/g, '-') ?? 'gadget';

  // Prefer URL property; fall back to file attachment
  const image = getUrl(p['Image URL']) || getFiles(p['Image']);

  // Generate a slug-style id from title
  const id = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);

  return {
    id,
    title,
    author:       getText(p['Author / Brand']),
    category,
    tags:         getMultiSelect(p['Tags']),
    description:  getText(p['Description']),
    image,
    price_approx: getText(p['Price (approx)']),
    affiliate_url: getUrl(p['Affiliate URL']) || '#TODO',
    retailer:     getSelect(p['Retailer'])?.toLowerCase() ?? 'amazon',
    rating:       getNumber(p['Rating']) ?? 4,
    featured:     getCheckbox(p['Featured']),
    sven_pick:    getCheckbox(p['Sven Pick']),
    difficulty:   getSelect(p['Difficulty']) ?? null,
  };
}

// ── Fetch all pages (handles pagination) ────────────────────────────────────

async function fetchAll() {
  const pages = [];
  let cursor;

  do {
    const res = await notion.databases.query({
      database_id: DB_ID,
      filter: {
        property: 'Status',
        select: { equals: 'Published' },
      },
      sorts: [{ property: 'Category', direction: 'ascending' }],
      start_cursor: cursor,
      page_size: 100,
    });

    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  return pages;
}

// ── Merge with existing data (preserve hand-edited fields) ─────────────────

function merge(fresh, existing) {
  const existingMap = Object.fromEntries((existing ?? []).map(p => [p.id, p]));

  return fresh.map(item => {
    const prev = existingMap[item.id];
    if (!prev) return item;

    // Keep old affiliate URL if Notion one is still placeholder
    const affiliate_url = (item.affiliate_url === '#TODO' && prev.affiliate_url && prev.affiliate_url !== '#TODO')
      ? prev.affiliate_url
      : item.affiliate_url;

    return { ...item, affiliate_url };
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🛸  Space Vault — Notion sync\n');
  console.log(`   Database:  ${DB_ID}`);
  console.log(`   Output:    data/products.json\n`);

  let existing = null;
  if (existsSync(OUT_FILE)) {
    try {
      existing = JSON.parse(readFileSync(OUT_FILE, 'utf8'));
      console.log(`   Existing:  ${existing.length} items in current products.json`);
    } catch {
      console.warn('   ⚠  Could not parse existing products.json — will overwrite');
    }
  }

  console.log('   Fetching from Notion...');
  const pages = await fetchAll();
  console.log(`   Found:     ${pages.length} published items in Notion\n`);

  if (!pages.length) {
    console.warn('   ⚠  No published items found. Check that your Status column has "Published" entries.\n');
    process.exit(0);
  }

  const fresh   = pages.map(mapPage);
  const merged  = merge(fresh, existing);

  writeFileSync(OUT_FILE, JSON.stringify(merged, null, 2), 'utf8');

  // Summary
  const newItems = existing
    ? fresh.filter(f => !existing.find(e => e.id === f.id))
    : fresh;

  console.log('   ✅  Sync complete!\n');
  console.log(`   ${merged.length} items written to data/products.json`);
  if (newItems.length) {
    console.log(`\n   🆕  New items added:`);
    newItems.forEach(i => console.log(`      + ${i.title} (${i.category})`));
  }

  // Images report
  const missingImg = merged.filter(p => !p.image);
  if (missingImg.length) {
    console.log(`\n   📷  Items missing images (${missingImg.length}):`);
    missingImg.forEach(p => console.log(`      - ${p.title}`));
    console.log('\n   Tip: paste the image URL in the "Image URL" column in Notion.');
    console.log('   For Amazon items: right-click product image → Copy image address.\n');
  } else {
    console.log('\n   📷  All items have images. 🎉\n');
  }

  // Affiliate links report
  const todoLinks = merged.filter(p => p.affiliate_url === '#TODO');
  if (todoLinks.length) {
    console.log(`   🔗  Items still needing affiliate links (${todoLinks.length}):`);
    todoLinks.forEach(p => console.log(`      - ${p.title}`));
    console.log('\n   Tip: generate links via Amazon Associates SiteStripe.\n');
  }
}

main().catch(err => {
  console.error('\n❌  Sync failed:', err.message ?? err);
  process.exit(1);
});
