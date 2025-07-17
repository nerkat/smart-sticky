# Smart Sticky – Shopify App

This app adds a sticky Add to Cart bar to Shopify product pages when the original button scrolls out of view.

## Tech Stack
- Node.js + Express (Shopify app template)
- Polaris for admin UI
- ScriptTag API for storefront injection

## Goals
- MVP: Sticky bar injected via ScriptTag
- No hydration, no React on storefront
- Simple JS logic: detect button → show sticky → click triggers original

## Key Tasks
- Inject stickybar.js using ScriptTag
- Sticky bar shows/hides based on scroll
- Admin toggle for enable/disable
- Future: position settings, animation options, mobile behavior
