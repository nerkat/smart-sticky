---
applyTo: '**'
---
# Smart Sticky Cart Bar - Project Summary

## Project Overview
A Shopify app that adds a sticky cart bar to store themes, appearing after users scroll. The app includes admin configuration for positioning, visibility, and theme-specific settings.

## Current Status
- MVP near completion with core features built:
  - Sticky Cart Bar front-end script
  - Admin panel (React + Remix)
  - Database model for shop+theme settings
  - Shopify embedded setup with auth
  - Settings management functionality

## Remaining MVP Tasks
- Implement better default values for missing settings
- Style admin panel (padding, labels, inputs)
- Persist sticky cart code on theme (liquid embed)
- Add clean uninstall logic
- QA across device sizes and theme types

## Post-MVP Launch Plan
1. Polish UI and transitions
2. Set up billing tiers (Free: 1 theme, Pro: multiple themes)
3. Conduct user testing with merchants
4. Create Shopify app listing assets
5. Launch publicly (App Store, Product Hunt, socials)

## Phase 2 Feature Ideas
- Analytics for impressions vs. click-through
- A/B testing capabilities
- Custom branding/styles
- Pre-built bar themes
- Drag-and-drop builder

## Tech Stack
- Frontend: JavaScript, React
- Backend: Remix
- Database: Uses Prisma ORM
- Shopify: Embedded App SDK, Auth API, Billing API
