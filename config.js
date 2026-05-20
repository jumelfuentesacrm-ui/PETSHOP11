'use strict';

/**
 * Central configuration for the Posh Pet website.
 * Business details were collected from the shop's public listings.
 */

const business = {
  name: 'Posh Pet',
  legalName: 'Posh Pet Store & Grooming',
  tagline: 'Store & Grooming',
  slogan: 'Pampered pets. Happy owners.',
  intro:
    'Alimentos, accesorios, grooming y mucho más para tu mascota — food, accessories, grooming and more for your pet.',
  about:
    'For more than two decades, Posh Pet has cared for the dogs and cats of San Juan and the ' +
    'metro area. What began as a love for animals grew into a full-service pet store and grooming ' +
    'salon on Avenida Hostos — a place where pets are pampered, and owners find everything from ' +
    'holistic nutrition to the perfect toy.',
  yearsExperience: 20,
  address: {
    line1: '359 Ave. Hostos',
    city: 'San Juan',
    region: 'Puerto Rico',
    zip: '00918',
    full: '359 Ave. Hostos, San Juan, PR 00918'
  },
  geo: { lat: 18.4210691, lng: -66.063579 },
  phone: '787-923-0482',
  phoneHref: '+17879230482',
  email: 'poshpet@ymail.com',
  social: {
    instagram: 'https://www.instagram.com/posh_pet_store_and_grooming_/',
    facebook: 'https://www.facebook.com/poshpetpuertorico/',
    website: 'https://poshpetpuertorico.com/'
  },
  mapLink:
    'https://www.google.com/maps/place/Posh+Pet+Store+%26+grooming/@18.4210691,-66.063579,17z/',
  mapEmbed:
    'https://maps.google.com/maps?q=18.4210691,-66.063579&z=16&hl=en&output=embed',
  // Hours the store is open to the public.
  hours: [
    { day: 'Monday', open: '8:00 AM', close: '6:00 PM' },
    { day: 'Tuesday', open: '8:00 AM', close: '6:00 PM' },
    { day: 'Wednesday', open: '8:00 AM', close: '6:00 PM' },
    { day: 'Thursday', open: '8:00 AM', close: '6:00 PM' },
    { day: 'Friday', open: '8:00 AM', close: '6:00 PM' },
    { day: 'Saturday', open: '8:00 AM', close: '6:00 PM' },
    { day: 'Sunday', open: null, close: null }
  ]
};

/** Grooming services bookable online. */
const services = [
  {
    id: 'full-groom',
    name: 'Full Groom',
    tagline: 'Bath, breed-specific haircut & finishing',
    blurb:
      'The complete spa day: warm bath, hand-dry, breed-specific or custom haircut, ' +
      'nail trim, ear cleaning and a finishing spritz.',
    durationMin: 90,
    icon: 'scissors',
    popular: true,
    pricing: {
      type: 'size',
      sizes: { Small: 45, Medium: 60, Large: 85, 'X-Large': 110 }
    }
  },
  {
    id: 'bath-tidy',
    name: 'Bath & Tidy',
    tagline: 'Bath, blow-dry, brush-out & nails',
    blurb:
      'A fresh, clean coat without a full haircut — shampoo, conditioner, blow-dry, ' +
      'brush-out, nail trim and ear cleaning.',
    durationMin: 60,
    icon: 'bath',
    popular: true,
    pricing: {
      type: 'size',
      sizes: { Small: 30, Medium: 40, Large: 55, 'X-Large': 70 }
    }
  },
  {
    id: 'puppy-first',
    name: "Puppy's First Groom",
    tagline: 'A gentle introduction for pups under 6 months',
    blurb:
      'A calm, confidence-building first visit: light bath, gentle brush, sanitary trim, ' +
      'nails and lots of patience and treats.',
    durationMin: 60,
    icon: 'puppy',
    popular: false,
    pricing: { type: 'flat', amount: 35 }
  },
  {
    id: 'cat-groom',
    name: 'Feline Groom',
    tagline: 'Specialty grooming for cats',
    blurb:
      'Stress-aware grooming for cats — bath, blow-dry, de-matting, nail trim and ' +
      'a tidy sanitary trim by an experienced groomer.',
    durationMin: 75,
    icon: 'cat',
    popular: false,
    pricing: { type: 'flat', amount: 65 }
  },
  {
    id: 'deshed',
    name: 'De-Shed Treatment',
    tagline: 'Reduce shedding up to 90%',
    blurb:
      'A deep de-shedding bath with specialized conditioner and tools that lift loose ' +
      'undercoat — perfect for double-coated breeds.',
    durationMin: 75,
    icon: 'brush',
    popular: false,
    pricing: {
      type: 'size',
      sizes: { Small: 42, Medium: 58, Large: 74, 'X-Large': 90 }
    }
  },
  {
    id: 'nail-spa',
    name: 'Nail Trim & Paw Care',
    tagline: 'Express paw service — walk-in friendly',
    blurb:
      'A quick, low-stress nail trim, file and paw-pad check. In and out in about ' +
      'twenty minutes.',
    durationMin: 20,
    icon: 'paw',
    popular: false,
    pricing: { type: 'flat', amount: 16 }
  },
  {
    id: 'spa-refresh',
    name: 'Spa Refresh Add-On',
    tagline: 'Teeth brushing, blueberry facial & cologne',
    blurb:
      'Add a little luxury to any groom: gentle teeth brushing, a soothing blueberry ' +
      'facial and a light, fresh cologne finish.',
    durationMin: 30,
    icon: 'sparkle',
    popular: false,
    pricing: { type: 'flat', amount: 22 }
  }
];

const petSizes = [
  { key: 'Small', label: 'Small', detail: 'Up to 20 lb' },
  { key: 'Medium', label: 'Medium', detail: '21 – 50 lb' },
  { key: 'Large', label: 'Large', detail: '51 – 90 lb' },
  { key: 'X-Large', label: 'X-Large', detail: 'Over 90 lb' }
];

/** Booking rules. Day 0 = Sunday. */
const booking = {
  slots: ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30'],
  slotCapacity: 2, // groomers working in parallel
  closedDays: [0], // Sunday
  windowDays: 60 // how far ahead customers may book
};

const store = {
  deliveryFee: 7,
  freeDeliveryOver: 60,
  taxRate: 0.115, // Puerto Rico IVU
  currency: 'USD'
};

// Demo passcode for the staff dashboard. Override with ADMIN_KEY env var.
const adminKey = process.env.ADMIN_KEY || 'poshpet2024';

module.exports = { business, services, petSizes, booking, store, adminKey };
