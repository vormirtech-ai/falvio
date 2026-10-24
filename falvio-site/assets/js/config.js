// FALVIO store settings. Edit this file to change prices, copy, contact details and promotions.
// Everything marked DEMO is placeholder content: replace it with verified information before launch.
window.FALVIO = {
  currency: 'USD',
  locale: 'en-US',

  // Announcement bar. Leave empty ('') to hide it. Only publish offers you actually provide.
  announcement: 'The FALVIO Eau de Parfum — now available',

  // Where contact, newsletter and order-request forms are sent (e.g. 'https://formspree.io/f/xxxxxx').
  // While empty, forms validate and confirm on screen but nothing is sent anywhere.
  formEndpoint: '',

  contact: {
    email: 'hello@falvioperfume.com',        // DEMO
    phone: '',                                // optional, hidden when empty
    hours: 'Monday – Friday, 10:00 – 18:00',  // DEMO
    instagram: ''                             // full URL, hidden when empty
  },

  // DEMO notes: replace with the perfumer's official composition.
  notes: {
    top: ['Bergamot', 'Pink Pepper', 'Cardamom'],
    heart: ['Iris', 'Lavender', 'Cedar Leaf'],
    base: ['Amber', 'Sandalwood', 'Vetiver', 'Musk']
  },

  // DEMO prices and sizes.
  products: [
    {
      id: 'falvio-edp-100',
      name: 'FALVIO Eau de Parfum',
      size: '100 ml',
      price: 185,
      image: 'assets/img/bottle.webp',
      thumb: 'assets/img/bottle-sm.webp',
      gallery: ['assets/img/bottle.webp', 'assets/img/portrait-monogram.webp', 'assets/img/portrait-cap.webp', 'assets/img/portrait-spray.webp', 'assets/img/portrait-glass.webp'],
      summary: 'The signature. Amber eau de parfum in clear rectangular glass, crowned with a natural wood cap.'
    },
    {
      id: 'falvio-edp-50',
      name: 'FALVIO Eau de Parfum',
      size: '50 ml',
      price: 125,
      image: 'assets/img/hero-still.webp',
      thumb: 'assets/img/hero-still.webp',
      gallery: ['assets/img/hero-still.webp', 'assets/img/portrait-monogram.webp', 'assets/img/portrait-spray.webp', 'assets/img/portrait-cap.webp'],
      summary: 'The same composition in a size made for travel and for discovering FALVIO for the first time.'
    }
  ]
};
