# Yeali — Storefront

A clean, distraction-free website for **Yeali**, the slow-fashion clothing label by designer **Vidhu**.

Pure HTML/CSS/JS — no build step, no dependencies. Open `index.html` in a browser, or host the folder anywhere (Netlify, Vercel, GitHub Pages).

## How ordering works

Yeali currently sells through Instagram DMs, so checkout keeps that flow but makes it feel effortless:

1. Customer adds pieces to the bag (with size).
2. A 3-step drawer collects name, phone and address.
3. The order summary is composed automatically and sent via **WhatsApp** (pre-filled message) or **copied for an Instagram DM**.

No payment gateway needed — payment and delivery are confirmed personally, exactly like today.

## Admin panel

Open **`admin.html`** to manage the catalog without touching code: add/remove products,
edit names, prices, sizes, badges and descriptions, upload photos (multiple per product —
they show as a carousel in the shop's quick view; the first photo is the cover), and
reorder everything.

- Edits auto-save as a **draft in your browser** — customers see nothing until you press
  **Publish to site**.
- Publishing commits directly to this GitHub repo via the API: uploaded photos land in
  `assets/uploads/` and the catalog file `js/products.js` is rewritten. GitHub Pages
  redeploys automatically (~1 minute).
- One-time setup (Settings button): create a **fine-grained personal access token** on
  GitHub (Settings → Developer settings → Personal access tokens → Fine-grained tokens)
  scoped to **only this repository** with **Contents: Read and write**. Paste it in the
  admin Settings — it's stored only in that browser.
- Note: `admin.html` itself is public on the hosted site, but it's harmless without the
  token. Keep the token private; you can revoke it on GitHub anytime.
- After publishing, your local copy of the repo is behind — run `git pull` before making
  code changes locally.

## Things to update before launch

| What | Where |
|------|-------|
| WhatsApp number | `WHATSAPP_NUMBER` at the top of [js/app.js](js/app.js) |
| Instagram handle | `INSTAGRAM_URL` in [js/app.js](js/app.js) + links in [index.html](index.html) |
| Products, prices, sizes, photos | [admin.html](admin.html) (or edit [js/products.js](js/products.js) by hand) |
| Founder photo | Replace `assets/vidhu.svg` |
| Free-shipping threshold | `FREE_SHIP_THRESHOLD` in [js/app.js](js/app.js) |
| Email | `hello@yeali.in` in the footer |

## Structure

```
index.html        — the customer site (one page: shop, story, reviews, contact)
admin.html        — catalog manager (products, prices, photos)
css/styles.css    — design system (fonts, colors, layout)
css/admin.css     — admin page styles
js/products.js    — product catalog (managed by admin publish)
js/app.js         — cart, quick-view carousel, checkout logic
js/admin.js       — admin editor + GitHub publishing
assets/           — product & founder artwork (uploads go to assets/uploads/)
```

Cart contents persist in the browser (`localStorage`), so a customer can come back later and finish checkout.
