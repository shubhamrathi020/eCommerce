// Generates libs/shared/data-access/src/mock/data/categories.json (deterministic).
// Run: node tools/generate-mock-data/categories.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const tree = {
  Fashion: ['Men Clothing', 'Women Clothing', 'Kids Wear', 'Footwear', 'Watches', 'Bags & Luggage'],
  Electronics: ['Mobiles', 'Laptops', 'Televisions', 'Audio & Headphones', 'Cameras', 'Smart Wearables'],
  Grocery: ['Fruits & Vegetables', 'Staples & Grains', 'Snacks', 'Beverages', 'Dairy & Eggs', 'Packaged Foods'],
  'Home & Kitchen': ['Furniture', 'Cookware', 'Home Decor', 'Bedding', 'Appliances', 'Storage'],
  Beauty: ['Skincare', 'Makeup', 'Haircare', 'Fragrances', 'Personal Care'],
  'Sports & Fitness': ['Gym Equipment', 'Sportswear', 'Outdoor', 'Cycling', 'Yoga'],
  Books: ['Fiction', 'Non-Fiction', 'Academic', 'Comics'],
  'Toys & Games': ['Action Figures', 'Board Games', 'Learning Toys', 'Outdoor Play'],
};

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const out = [];
let order = 0;
for (const [top, children] of Object.entries(tree)) {
  const parent = { id: `cat-${slugify(top)}`, slug: slugify(top), name: top, order: ++order };
  out.push(parent);
  children.forEach((name, i) =>
    out.push({ id: `cat-${slugify(name)}`, slug: slugify(name), name, parentId: parent.id, order: i + 1 }),
  );
}

const dir = 'libs/shared/data-access/src/mock/data';
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/categories.json`, JSON.stringify(out, null, 2) + '\n');
console.log(`categories: ${out.length}`);
