// English strings. The single source of keys; si.ts and ta.ts must mirror the shape.
export const en = {
  app: {
    title: "Juno",
    tagline: "Your Kapruka shopping agent",
  },
  hero: {
    greeting: "Hey, I am",
    question: "What are we shopping for today?",
    headline: "Hey, I am Juno. What are we shopping for today?",
    sub: "Tell me about a gift, an occasion, or a name. I'll show you the good stuff, plan delivery, and take you to checkout, right here.",
    // Short, single-intent prompts. Each one routes in a single pass and maps
    // to a catalog query that reliably returns products, so the first tap
    // always lands a quick, simple answer.
    suggestions: {
      birthday: "Birthday gift ideas",
      cake: "Show me chocolates",
      flowers: "Show me flowers",
      sinhala: "අම්මාට තෑග්ගක්",
      tamil: "அம்மாவுக்கு ஒரு பரிசு",
      tanglish: "Chocolates for amma",
    },
    categoriesTitle: "Or browse a category",
  },
  composer: {
    placeholder: "Make a wish ...",
    send: "Send",
    languageEN: "EN",
    languageSI: "සි",
    languageTA: "தமி",
    sending: "Sending",
  },
  status: {
    thinking: "Thinking",
    working: "Working",
    idle: "",
  },
  products: {
    seeAll: "See all",
    addedToCart: "Added to cart",
    soldOut: "Sold out",
    inStock: "In stock",
    openOnKapruka: "View",
  },
  cart: {
    title: "Cart",
    subtotal: "Subtotal",
    delivery: "Delivery",
    total: "Total",
    empty: "Your cart is empty.",
    proceed: "Proceed to checkout",
    remove: "Remove",
  },
  delivery: {
    title: "Delivery details",
    name: "Recipient name",
    phone: "Recipient phone",
    line1: "Address line 1",
    line2: "Address line 2 (optional)",
    city: "City",
    cityHelp: "Sinhala, Tamil, or romanized spellings all work.",
    postal: "Postal code (optional)",
    date: "Delivery date",
    submit: "Continue",
    perishableWarning: "This is a perishable item. Confirm the date works before it sets out.",
  },
  gift: {
    toggle: "Add a gift message",
    placeholder: "From me to you, with love.",
    help: "We print this on the card.",
    save: "Save message",
    charsLeft: (n: number) => `${n} characters left`,
  },
  checkout: {
    title: "Order summary",
    orderId: "Order",
    payNow: "Pay securely on Kapruka",
    pricesLocked: "Pay link expires in 60 minutes. Prices locked.",
    waiting: "Waiting for payment",
    confirmed: "Payment received",
    iPaid: "I just paid",
    expired: "Pay link expired.",
    expiredCta: "Create a fresh order",
    failed: "Payment did not complete.",
    failedCta: "Try again",
    edit: "Edit",
  },
  success: {
    title: "Order placed",
    tracking: "Track your order",
    shopAgain: "Shop again",
  },
  error: {
    generic: "Something did not go through. Want me to try again?",
    rateLimited: "One moment, the store is catching up. Trying again shortly.",
    retry: "Retry",
    dismiss: "Dismiss",
  },
};

export type Strings = typeof en;
