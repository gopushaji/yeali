# Yeali — Storefront

A clean, distraction-free website for **Yeali**, the slow-fashion clothing label by designer **Vidhu**.

Pure HTML/CSS/JS — no build step, no dependencies. Open `index.html` in a browser, or host the folder anywhere (Netlify, Vercel, GitHub Pages).

## How ordering works

Yeali currently sells through Instagram DMs, so checkout keeps that flow but makes it feel effortless:

1. Customer adds pieces to the bag (with size).
2. A 3-step drawer collects name, phone and address.
3. The order summary is composed automatically and sent via **WhatsApp** (pre-filled message) or **copied for an Instagram DM**.

No payment gateway needed — payment and delivery are confirmed personally, exactly like today.

## Things to update before launch

| What | Where |
|------|-------|
| WhatsApp number | `WHATSAPP_NUMBER` at the top of [js/app.js](js/app.js) |
| Instagram handle | `INSTAGRAM_URL` in [js/app.js](js/app.js) + links in [index.html](index.html) |
| Products, prices, sizes | [js/products.js](js/products.js) |
| Product photos | Drop images in `assets/` and point each product's `image` field at them (the current SVGs are placeholders) |
| Founder photo | Replace `assets/vidhu.svg` |
| Free-shipping threshold | `FREE_SHIP_THRESHOLD` in [js/app.js](js/app.js) |
| Email | `hello@yeali.in` in the footer |

## Structure

```
index.html        — the whole site (one page: shop, story, reviews, contact)
css/styles.css    — design system (fonts, colors, layout)
js/products.js    — product catalog (edit this to manage inventory)
js/app.js         — cart, quick-view, checkout logic
assets/           — product & founder artwork
```

Cart contents persist in the browser (`localStorage`), so a customer can come back later and finish checkout.
