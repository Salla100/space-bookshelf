# Space Vault — Curated Space Shop

**Subdomain:** vault.svenamberg.com  
**Repo:** github.com/Salla100/space-bookshelf  
**Status:** 📋 Planned  
**Design:** See root CLAUDE.md for full design system

---

## What it does

A curated affiliate site for space students, engineers, and enthusiasts. Showcases
hand-picked books, textbooks, telescopes, electronics/PCB gear, LEGO sets, tools,
movies, gadgets, and DIY kits — all with affiliate links to Amazon and other
retailers.

The goal is a visually rich product gallery that feels editorial, not like a
generic affiliate dump. Each item is personally curated and categorised.

---

## File Structure

```
space-vault/
├── index.html
├── style.css
├── app.js           # filter + render + 3D card hover effects
├── data/
│   └── products.json # all curated items
└── CNAME            # contains: vault.svenamberg.com
```

---

## Data Schema (products.json)

```json
[
  {
    "id": "fundamentals-astrodynamics",
    "title": "Fundamentals of Astrodynamics",
    "author": "Bate, Mueller & White",
    "category": "textbook",
    "tags": ["orbital mechanics", "engineering", "classic", "university"],
    "description": "The Dover classic. Every aerospace engineer owns this.",
    "image": "https://...",
    "price_approx": "€18",
    "affiliate_url": "https://amzn.to/...",
    "retailer": "amazon",
    "rating": 5,
    "featured": true
  }
]
```

**Categories:**
- `book` — space science / popular science / memoir / sci-fi
- `textbook` — engineering / physics / orbital mechanics / EEE
- `telescope` — beginner, visual, imaging
- `electronics` — PCB tools, soldering, oscilloscopes, dev boards, sensors
- `lego` — space sets (Saturn V, ISS, Apollo, etc.)
- `movie` — DVD/Blu-ray space films, documentaries
- `gadget` — space-themed gear, star projectors, prints
- `diy` — rocket model kits, satellite kits, experiment kits
- `apparel` — space-themed clothing, mission patches
- `travel` — space tourism experiences, launch-viewing packages

---

## UI Layout

```
┌──────────────────────────────────────────────────────────────┐
│  ← svenamberg.com                    🛸 Space Vault          │
│  "Gear for the space-obsessed."                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  FEATURED  ──────────────────────────────────────────────   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [Wide hero card — featured item]                     │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Filter: [All] [Books] [Textbooks] [Telescopes] [Electronics]│
│          [LEGO] [Movies] [Gadgets] [DIY] [Travel]            │
│                                                              │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────┐  │
│  │  [image]  │  │  [image]  │  │  [image]  │  │ [image]  │  │
│  │  Title    │  │  Title    │  │  Title    │  │  Title   │  │
│  │  ~€18     │  │  ~€24     │  │  ~€340    │  │  ~€9     │  │
│  │ [Buy →]   │  │ [Buy →]   │  │ [Buy →]   │  │ [Buy →]  │  │
│  └───────────┘  └───────────┘  └───────────┘  └──────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## Key Features to Build

- [ ] Card grid with 3D CSS hover tilt effect (`transform: perspective rotateX rotateY` on mousemove)
- [ ] Category filter tabs (single-select, show all by default)
- [ ] Featured items hero strip at top (items with `"featured": true`)
- [ ] Each card: image, title, author/brand, short description, approx price, "Buy →" affiliate link
- [ ] "Opens in new tab" on all affiliate links with `rel="noopener noreferrer"`
- [ ] Optional: "recommended by Sven" badge on select items
- [ ] Optional: tag-based sub-filters within categories (e.g. "beginner" telescopes)
- [ ] Optional: search bar filtering by title, author, tags
- [ ] Affiliate disclosure banner/footer note (legally required in most countries)
- [ ] Responsive grid: 4 col desktop → 2 col tablet → 1 col mobile
- [ ] Populate `products.json` with at least 40–60 real, high-quality items
- [ ] Link back to svenamberg.com in nav

---

## Suggested Initial Product List

| Category   | Items to include                                                    |
|------------|---------------------------------------------------------------------|
| Textbooks  | Bate/Mueller/White Astrodynamics, Wertz Space Mission Engineering, Fortescue Spacecraft Systems, Weste CMOS VLSI Design, Horowitz Art of Electronics |
| Books      | The Martian, Pale Blue Dot, An Astronaut's Guide to Life on Earth, Packing for Mars, Ignition!, Hidden Figures |
| Telescopes | Celestron StarSense Explorer, Sky-Watcher Heritage 130, Bresser beginner refractor |
| Electronics| Hakko FX-888D soldering station, Rigol DS1054Z oscilloscope, Raspberry Pi 5, STM32 Nucleo dev board, SparkFun sensor kits |
| LEGO       | LEGO Saturn V, LEGO ISS, LEGO Apollo 11 Lunar Lander, LEGO NASA Mars Rover |
| Movies     | Interstellar, The Martian, Apollo 13, 2001: A Space Odyssey, For All Mankind (series) |
| DIY        | Estes model rocket kits, CubeSat educational kit, Arduino satellite experiment kit |

---

## Affiliate Notes

- **Amazon:** Use Amazon Associates links (amazon.com or amazon.de for EU audience)
- **Disclosure:** Add visible text: "This site contains affiliate links. Purchases may earn a small commission at no extra cost to you."
- Keep `affiliate_url` fields in `products.json` so links can be updated without touching code
- Price shown is approximate (`price_approx`) — actual prices vary, never show as exact

---

## Deployment

```bash
git init && git add . && git commit -m "launch: space vault"
gh repo create space-bookshelf --public
git remote add origin https://github.com/Salla100/space-bookshelf.git
git push -u origin main
# GitHub repo Settings → Pages → Deploy from main branch
```

**CNAME file** (must exist in repo root):
```
vault.svenamberg.com
```

**Namecheap DNS:**
- Type: CNAME · Host: `vault` · Value: `salla100.github.io`

---

## Notes for Claude Code

- Pure HTML/CSS/JS — no framework
- The 3D card tilt is CSS + JS on `mousemove` — keep it subtle (max ~8° rotation)
- All affiliate links must open in a new tab with `rel="noopener noreferrer"`
- The affiliate disclosure is legally required — do not remove it
- Product images: use Amazon product image CDN URLs where possible (check ToS), or host small thumbnails locally
- Subdomain is `vault.svenamberg.com` even though the repo is `space-bookshelf` — the CNAME file handles this
