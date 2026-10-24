# FALVIO Perfume — website

A static website: plain HTML, CSS and JavaScript. No build step and no server code.

## Host it

Upload the contents of this folder to any static host: Netlify (drag and drop), Vercel, Cloudflare Pages, GitHub Pages, or the `public_html` folder of a cPanel account. `index.html` is the home page.

You can also preview it by double-clicking `index.html`. The fonts load from Google Fonts, so they need an internet connection. Everything else works offline.

## Pages

| File | Page |
|---|---|
| `index.html` | Home: 3D bottle scroll story, film, collection, gallery, newsletter |
| `shop.html` | Product grid |
| `product.html?id=…` | Product detail: gallery, sizes, quantity, add to bag |
| `story.html` | Our Story |
| `fragrance.html` | Notes pyramid and how to wear |
| `contact.html` | Contact details and form |
| `checkout.html` | Order summary and delivery form |

## Edit content: `assets/js/config.js`

- **Prices, sizes, product images and descriptions** live in `products`. The prices are placeholders.
- **Fragrance notes** live in `notes`. These are placeholders: replace them with the official composition.
- **Announcement bar** is `announcement`. Set it to `''` to hide it. Only publish offers you actually provide.
- **Contact details** are in `contact`. The email address is a placeholder. Empty fields are hidden.
- **Currency** is `currency` (for example `'EUR'`, `'GBP'`, `'AED'`).

## Before launch: connect the forms

The contact form, the newsletter form and the checkout order request validate and confirm on screen. While `formEndpoint` is empty, though, **nothing is sent anywhere**. To receive submissions by email, create a free form endpoint (for example at formspree.io) and paste its URL:

```js
formEndpoint: 'https://formspree.io/f/your-id',
```

Checkout sends an **order request**: the customer's details, items and total. No payment is taken online, and the page tells the customer that you will email them to confirm payment. To take card payments online, link the checkout button to a hosted checkout such as Shopify, Stripe Payment Links or Snipcart.

## How it is built

- **Cart:** stored in the visitor's browser (`localStorage`). It is validated on read, and quantities are capped at 10 per item.
- **3D bottle:** `assets/js/bottle3d.js`, using Three.js r158 (bundled in `assets/vendor`). The scroll poses are the `data-pose` (desktop) and `data-pose-m` (mobile) attributes on each `.step` in `index.html`. The keys are `x`, `y`, `s` (scale), `rx`, `ry` (rotation), `cap` (lift) and `mist`.
- **Fallbacks:** without WebGL, the hero shows the product photo instead of the 3D bottle. With "reduce motion" switched on, idle animation stops.
- **Images:** the product photography and details come from the supplied bottle photo and product film (`assets/img`, `assets/video`).
