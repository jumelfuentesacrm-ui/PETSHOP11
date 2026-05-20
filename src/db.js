'use strict';

/**
 * Tiny JSON-file data store. No external dependencies, no native builds.
 * Holds products (with mutable stock), bookings, orders and contact messages.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function product(id, name, category, brand, price, stock, blurb, extra = {}) {
  return {
    id,
    name,
    category,
    brand,
    price,
    stock,
    blurb,
    rating: extra.rating || 4.7,
    featured: !!extra.featured,
    badge: extra.badge || null
  };
}

function seedProducts() {
  return [
    // Dog Food
    product('df-salmon-24', 'Holistic Salmon & Sweet Potato Dry Food', 'Dog Food', 'Harbor Holistic', 64.99, 18,
      '24 lb bag of grain-free, omega-rich kibble for shiny coats and easy digestion.',
      { featured: true, badge: 'Staff pick', rating: 4.9 }),
    product('df-puppy-12', 'Grain-Free Chicken Recipe Puppy Food', 'Dog Food', 'Little Paws', 42.99, 12,
      '12 lb of protein-packed nutrition formulated for growing puppies.'),
    product('df-senior-20', 'Senior Lamb & Rice Formula', 'Dog Food', 'Harbor Holistic', 54.99, 9,
      '20 lb of joint-supporting nutrition for dogs in their golden years.'),

    // Cat Food
    product('cf-indoor-7', 'Indoor Cat Chicken Dry Food', 'Cat Food', 'Whiskerton', 24.99, 22,
      '7 lb bag formulated for indoor cats — hairball control and lean protein.',
      { featured: true }),
    product('cf-pate-12', 'Salmon Pâté Wet Food, 12-pack', 'Cat Food', 'Whiskerton', 19.99, 30,
      'A dozen single-serve tins of smooth, grain-free salmon pâté.'),
    product('cf-kitten-5', 'Kitten Nutritional Formula', 'Cat Food', 'Little Paws', 21.99, 4,
      '5 lb of calorie-dense kibble to fuel playful, growing kittens.',
      { badge: 'Low stock' }),

    // Treats
    product('tr-pb-biscuits', 'Soft-Baked Peanut Butter Biscuits', 'Treats', 'Island Bakehouse', 8.49, 40,
      'Oven-baked, soft-textured biscuits dogs adore — made with real peanut butter.'),
    product('tr-chicken-fd', 'Freeze-Dried Chicken Bites', 'Treats', 'Island Bakehouse', 12.99, 25,
      'Single-ingredient freeze-dried chicken — a pure, high-value training reward.',
      { featured: true, rating: 4.8 }),
    product('tr-dental-28', 'Dental Chew Sticks, 28 ct', 'Treats', 'FreshBite', 14.99, 17,
      'Daily chews that help reduce tartar and freshen breath.'),

    // Toys
    product('to-rope-tug', 'Tough Rope Tug Toy', 'Toys', 'Romp & Roll', 9.99, 33,
      'Braided cotton rope built for tug-of-war and gentle teeth cleaning.'),
    product('to-puzzle', 'Interactive Treat Puzzle', 'Toys', 'BrightMind', 16.99, 14,
      'A slide-and-seek puzzle that turns snack time into enrichment.',
      { featured: true }),
    product('to-catnip-mice', 'Catnip Mice, 3-pack', 'Toys', 'Whiskerton', 6.99, 28,
      'Three plush mice stuffed with potent, premium catnip.'),
    product('to-plush-bone', 'Squeaky Plush Bone', 'Toys', 'Romp & Roll', 7.49, 0,
      'A soft, squeaky companion for cuddles and play.',
      { badge: 'Back soon' }),

    // Beds & Accessories
    product('ac-ortho-bed', 'Cushioned Orthopedic Pet Bed, Medium', 'Beds & Accessories', 'NestWell', 59.99, 7,
      'Memory-foam base with a washable, plush cover for restful sleep.',
      { featured: true, badge: 'Staff pick' }),
    product('ac-collar-ref', 'Adjustable Reflective Collar', 'Beds & Accessories', 'TrailMate', 13.99, 26,
      'Night-safe reflective stitching with a secure quick-release buckle.'),
    product('ac-leash-hf', 'Hands-Free Padded Leash', 'Beds & Accessories', 'TrailMate', 22.99, 15,
      'Adjustable waist leash with bungee shock absorption for walks and runs.'),
    product('ac-bowl-set', 'Stainless Steel Bowl Set', 'Beds & Accessories', 'NestWell', 18.99, 20,
      'Two non-slip, dishwasher-safe bowls for food and water.'),
    product('ac-water-bottle', 'Travel Water Bottle', 'Beds & Accessories', 'TrailMate', 11.99, 19,
      'Leak-proof bottle with a fold-out drinking tray for trips to the beach.'),

    // Grooming
    product('gr-slicker', 'Detangling Slicker Brush', 'Grooming', 'Posh Pet Spa', 15.99, 21,
      'Fine, angled bristles that lift loose hair and ease out mats.'),
    product('gr-oat-shampoo', 'Oatmeal Soothing Shampoo, 16 oz', 'Grooming', 'Posh Pet Spa', 13.49, 24,
      'Gentle, tear-free oatmeal shampoo for sensitive skin and itch relief.',
      { featured: true }),
    product('gr-nail-set', 'Nail Clipper & File Set', 'Grooming', 'Posh Pet Spa', 10.99, 16,
      'Sharp, safety-guarded clippers with a built-in file for tidy paws.'),
    product('gr-towel', 'Quick-Dry Microfiber Pet Towel', 'Grooming', 'Posh Pet Spa', 12.49, 13,
      'Ultra-absorbent towel that cuts drying time after baths and beach days.'),

    // Small Pets & Aquatics
    product('sp-fish-flakes', 'Tropical Fish Flake Food', 'Small Pets & Aquatics', 'AquaLife', 7.99, 18,
      'Color-enhancing daily flakes for tropical community aquariums.'),
    product('sp-timothy-hay', 'Small Animal Timothy Hay, 48 oz', 'Small Pets & Aquatics', 'Meadow & Co.', 11.99, 10,
      'Sweet, high-fiber hay for rabbits, guinea pigs and chinchillas.'),
    product('sp-reptile-calcium', 'Reptile Calcium Supplement', 'Small Pets & Aquatics', 'AquaLife', 8.99, 6,
      'Phosphorus-free calcium dust for healthy reptile bones and shells.')
  ];
}

function defaultData() {
  return {
    meta: { seededAt: new Date().toISOString(), version: 1 },
    products: seedProducts(),
    bookings: [],
    orders: [],
    messages: []
  };
}

let cache = null;

function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    // Ensure all collections exist even if an older file is loaded.
    for (const key of ['products', 'bookings', 'orders', 'messages']) {
      if (!Array.isArray(cache[key])) cache[key] = [];
    }
  } catch (err) {
    cache = defaultData();
    persist();
  }
  return cache;
}

function persist() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(cache, null, 2));
}

module.exports = {
  load,
  persist,
  get data() {
    return load();
  }
};
