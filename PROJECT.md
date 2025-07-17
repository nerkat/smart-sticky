# Smart Sticky – Shopify App

This app adds a sticky “Add to Cart” bar to Shopify product pages when the original button scrolls out of view.

## Purpose
Improve mobile conversion by giving users a persistent checkout CTA. Built for modern UX, theme-agnostic compatibility, and lightweight JS injection.

## Tech Stack
- Shopify Embedded App (Node.js + Express)
- ScriptTag API for injecting storefront JS
- Polaris + App Bridge for admin UI
- Supabase or SQLite for storing shop settings (later)
- Hosted on Render/Railway (TBD)

## MVP Goals
1. Inject `stickybar.js` on app install using ScriptTag API
2. stickybar.js:
   - Detect original “Add to Cart” button
   - Show sticky bar when it scrolls out of view
   - On click → trigger original button’s `.click()`
   - Fully mobile responsive
3. No React/hydration needed on storefront

## Phase 2 Features (future tasks)
- Animation: fade/slide-in
- Admin panel toggle for enable/disable
- Position selector (top/bottom)
- Optional price or product image in bar
- Variant & quantity sync (advanced)

## Rules for Copilot Agent
- Do not touch checkout or admin pages
- Use the 2024-04 Shopify API
- Keep storefront code in plain JS (no hydration)
- Add comments in `stickybar.js`
- Webhook cleanup logic should remove ScriptTag on uninstall

## Key Files
- App entry: `server.js`
- OAuth callback: `middleware/afterAuth.js` (or equivalent)
- ScriptTag logic goes in post-auth step
- Frontend file to inject: `public/stickybar.js`
