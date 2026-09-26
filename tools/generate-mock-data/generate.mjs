// Deterministic mock-data generator (fixed seed => reproducible fixtures).
// Run: node tools/generate-mock-data/generate.mjs
// Writes JSON into libs/shared/data-access/src/mock/data and SVG images into apps/storefront/public/mock/img.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

const DATA_DIR = 'libs/shared/data-access/src/mock/data';
const IMG_DIR = 'apps/storefront/public/mock/img';
const PRODUCTS_PER_LEAF = 6;
const NOW = Date.UTC(2026, 8, 1); // fixed "today" so output never changes

// ---------- helpers ----------
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260926);
const int = (min, max) => Math.floor(rnd() * (max - min + 1)) + min;
const pick = (list) => list[Math.floor(rnd() * list.length)];
const chance = (p) => rnd() < p;
const slugify = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const title = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const paise = (rupees) => Math.round(rupees) * 100;

// ---------- taxonomy ----------
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

const APPAREL_SIZES = ['S', 'M', 'L', 'XL'];
const COLOURS = ['Black', 'White', 'Navy', 'Olive', 'Maroon', 'Grey'];
const SHOE_SIZES = ['6', '7', '8', '9', '10'];
const axis = (label, values) => ({ label, values });
const spec = (label, values, type = 'enum') => ({ label, values, type });

// [brands, product types, [minRupees, maxRupees], variant axes, specs]
const T = {
  'men-clothing': [['Urban Roots', 'Denim Co', 'Northline', 'Casa Moda'], ['T-Shirt', 'Shirt', 'Jeans', 'Jacket', 'Hoodie', 'Chinos'], [499, 3999], { size: axis('Size', APPAREL_SIZES), colour: axis('Colour', COLOURS) }, { material: spec('Material', ['Cotton', 'Linen', 'Denim', 'Polyester']), fit: spec('Fit', ['Regular', 'Slim', 'Relaxed']), pattern: spec('Pattern', ['Solid', 'Striped', 'Checked']) }],
  'women-clothing': [['Aurelia Studio', 'Veda', 'Silk & Sage', 'Northline'], ['Kurta', 'Dress', 'Top', 'Palazzo', 'Saree', 'Cardigan'], [599, 5999], { size: axis('Size', APPAREL_SIZES), colour: axis('Colour', COLOURS) }, { material: spec('Material', ['Cotton', 'Silk', 'Georgette', 'Rayon']), fit: spec('Fit', ['Regular', 'A-Line', 'Relaxed']), pattern: spec('Pattern', ['Solid', 'Printed', 'Floral']) }],
  'kids-wear': [['Tiny Tots', 'Little Leaf', 'Playpen'], ['T-Shirt', 'Frock', 'Shorts', 'Romper', 'Track Pants'], [299, 1999], { size: axis('Age', ['2-3Y', '4-5Y', '6-7Y', '8-9Y']), colour: axis('Colour', COLOURS) }, { material: spec('Material', ['Cotton', 'Fleece', 'Polyester']), gender: spec('For', ['Boys', 'Girls', 'Unisex']) }],
  footwear: [['StrideX', 'Tread & Co', 'Northline', 'Casa Moda'], ['Sneakers', 'Running Shoes', 'Sandals', 'Loafers', 'Boots', 'Flip Flops'], [699, 6999], { size: axis('Size (UK)', SHOE_SIZES), colour: axis('Colour', COLOURS) }, { material: spec('Material', ['Leather', 'Mesh', 'Canvas', 'Rubber']), closure: spec('Closure', ['Lace-up', 'Slip-on', 'Velcro']) }],
  watches: [['Chronos', 'Tempo', 'Aero Time'], ['Analog Watch', 'Chronograph', 'Digital Watch', 'Dress Watch'], [1499, 14999], { colour: axis('Strap colour', ['Black', 'Navy', 'Grey', 'Brown']) }, { dial: spec('Dial shape', ['Round', 'Square']), strap: spec('Strap material', ['Leather', 'Steel', 'Silicone']), water: spec('Water resistant', ['Yes', 'No']) }],
  'bags-and-luggage': [['Wanderpack', 'Northline', 'Casa Moda'], ['Backpack', 'Duffel Bag', 'Trolley Bag', 'Handbag', 'Laptop Sleeve'], [799, 7999], { colour: axis('Colour', COLOURS) }, { capacity: spec('Capacity (L)', ['15', '25', '35', '55', '75']), material: spec('Material', ['Nylon', 'Polyester', 'Leather']) }],
  mobiles: [['Nova', 'Zenith', 'Pixelon', 'Orbit'], ['5G Smartphone', 'Smartphone', 'Flagship Phone'], [8999, 89999], { storage: axis('Storage', ['64 GB', '128 GB', '256 GB']), colour: axis('Colour', ['Black', 'Blue', 'Silver']) }, { ram: spec('RAM', ['4 GB', '6 GB', '8 GB', '12 GB']), display: spec('Display', ['6.1 in', '6.5 in', '6.7 in']), battery: spec('Battery', ['4500 mAh', '5000 mAh', '5500 mAh']) }],
  laptops: [['Zenith', 'Orbit', 'Vertex'], ['Laptop', 'Ultrabook', 'Gaming Laptop', 'Business Laptop'], [29999, 149999], { ram: axis('RAM', ['8 GB', '16 GB', '32 GB']), storage: axis('Storage', ['256 GB SSD', '512 GB SSD', '1 TB SSD']) }, { processor: spec('Processor', ['Core i5', 'Core i7', 'Ryzen 5', 'Ryzen 7']), screen: spec('Screen', ['13.3 in', '14 in', '15.6 in']), os: spec('OS', ['Windows 11', 'Linux', 'macOS-like']) }],
  televisions: [['Visio', 'Lumen', 'Orbit'], ['Smart TV', 'QLED TV', '4K TV', 'OLED TV'], [12999, 129999], { size: axis('Screen size', ['32 in', '43 in', '55 in', '65 in']) }, { resolution: spec('Resolution', ['HD', 'Full HD', '4K']), panel: spec('Panel', ['LED', 'QLED', 'OLED']), refresh: spec('Refresh rate', ['60 Hz', '120 Hz']) }],
  'audio-and-headphones': [['Sonar', 'Beatwave', 'Orbit'], ['Wireless Earbuds', 'Over-Ear Headphones', 'Bluetooth Speaker', 'Soundbar', 'Neckband'], [799, 19999], { colour: axis('Colour', ['Black', 'White', 'Blue', 'Red']) }, { type: spec('Connectivity', ['Bluetooth', 'Wired', 'Bluetooth + Wired']), anc: spec('Noise cancellation', ['Yes', 'No']), battery: spec('Playback', ['8 hrs', '20 hrs', '40 hrs']) }],
  cameras: [['Lensia', 'Pixelon', 'Aperture'], ['Mirrorless Camera', 'DSLR Camera', 'Action Camera', 'Instant Camera'], [4999, 99999], { colour: axis('Colour', ['Black', 'Silver']), kit: axis('Kit', ['Body only', 'With lens']) }, { sensor: spec('Sensor', ['APS-C', 'Full frame', '1-inch']), video: spec('Video', ['1080p', '4K']) }],
  'smart-wearables': [['Pulse', 'Tempo', 'Zenith'], ['Smartwatch', 'Fitness Band', 'Smart Ring'], [1999, 29999], { colour: axis('Colour', ['Black', 'Silver', 'Rose Gold']), size: axis('Case size', ['40 mm', '44 mm']) }, { battery: spec('Battery life', ['5 days', '10 days', '14 days']), gps: spec('GPS', ['Yes', 'No']) }],
  'fruits-and-vegetables': [['Farm Fresh', 'Green Basket', 'Orchard Lane'], ['Apples', 'Bananas', 'Tomatoes', 'Onions', 'Spinach', 'Mangoes'], [39, 349], { weight: axis('Pack size', ['500 g', '1 kg', '2 kg']) }, { organic: spec('Organic', ['Yes', 'No']), origin: spec('Origin', ['Local farms', 'Imported']) }],
  'staples-and-grains': [['Golden Harvest', 'Pure Grain', 'Farm Fresh'], ['Basmati Rice', 'Whole Wheat Atta', 'Toor Dal', 'Chickpeas', 'Quinoa', 'Rolled Oats'], [69, 899], { weight: axis('Pack size', ['1 kg', '5 kg', '10 kg']) }, { diet: spec('Diet', ['Vegetarian', 'Vegan']), organic: spec('Organic', ['Yes', 'No']) }],
  snacks: [['Crunchy Co', 'Snack Shack', 'Golden Harvest'], ['Potato Chips', 'Roasted Makhana', 'Namkeen Mix', 'Cookies', 'Protein Bars', 'Popcorn'], [20, 499], { weight: axis('Pack size', ['100 g', '250 g', '500 g']) }, { diet: spec('Diet', ['Vegetarian', 'Vegan']), flavour: spec('Flavour', ['Salted', 'Masala', 'Cheese', 'Chocolate']) }],
  beverages: [['Sip & Co', 'Tea Valley', 'Bean Brothers'], ['Green Tea', 'Ground Coffee', 'Fruit Juice', 'Energy Drink', 'Masala Chai', 'Coconut Water'], [49, 799], { weight: axis('Pack size', ['250 ml', '1 L', '2 L']) }, { type: spec('Type', ['Hot', 'Cold']), sugar: spec('Sugar', ['Regular', 'Sugar free']) }],
  'dairy-and-eggs': [['Pure Dairy', 'Farm Fresh', 'Green Basket'], ['Full Cream Milk', 'Paneer', 'Curd', 'Butter', 'Cheese Slices', 'Farm Eggs'], [30, 599], { weight: axis('Pack size', ['200 g', '500 g', '1 kg']) }, { diet: spec('Diet', ['Vegetarian', 'Non-Vegetarian']), fat: spec('Fat', ['Full fat', 'Low fat']) }],
  'packaged-foods': [['Kitchen Craft', 'Golden Harvest', 'Snack Shack'], ['Instant Noodles', 'Pasta', 'Pasta Sauce', 'Ready Meal', 'Peanut Butter', 'Breakfast Cereal'], [40, 699], { weight: axis('Pack size', ['200 g', '500 g', '1 kg']) }, { diet: spec('Diet', ['Vegetarian', 'Vegan', 'Non-Vegetarian']), shelf: spec('Shelf life', ['6 months', '12 months']) }],
  furniture: [['Woodwell', 'Casa Moda', 'Nest & Co'], ['Study Table', 'Bookshelf', 'Office Chair', 'Sofa', 'Shoe Rack', 'Coffee Table'], [1999, 39999], { colour: axis('Finish', ['Walnut', 'Oak', 'White', 'Black']) }, { material: spec('Material', ['Engineered wood', 'Solid wood', 'Metal']), assembly: spec('Assembly', ['DIY', 'Carpenter']) }],
  cookware: [['Kitchen Craft', 'Nest & Co', 'Ferro'], ['Non-stick Pan', 'Pressure Cooker', 'Kadhai', 'Cookware Set', 'Tawa'], [499, 6999], { size: axis('Size', ['Small', 'Medium', 'Large']) }, { material: spec('Material', ['Stainless steel', 'Aluminium', 'Cast iron']), induction: spec('Induction ready', ['Yes', 'No']) }],
  'home-decor': [['Nest & Co', 'Casa Moda', 'Lumina'], ['Wall Clock', 'Table Lamp', 'Photo Frame', 'Cushion Cover', 'Vase', 'Wall Art'], [299, 4999], { colour: axis('Colour', ['White', 'Gold', 'Black', 'Blue']) }, { material: spec('Material', ['Wood', 'Metal', 'Ceramic', 'Fabric']), style: spec('Style', ['Modern', 'Classic', 'Rustic']) }],
  bedding: [['Sleep Well', 'Nest & Co', 'Casa Moda'], ['Bedsheet', 'Comforter', 'Pillow', 'Mattress Protector', 'Blanket'], [399, 7999], { size: axis('Size', ['Single', 'Double', 'King']), colour: axis('Colour', ['White', 'Grey', 'Blue', 'Beige']) }, { material: spec('Material', ['Cotton', 'Microfibre', 'Linen']), thread: spec('Thread count', ['150', '250', '400']) }],
  appliances: [['Ferro', 'Aerocool', 'Kitchen Craft'], ['Mixer Grinder', 'Air Fryer', 'Microwave Oven', 'Electric Kettle', 'Vacuum Cleaner', 'Toaster'], [999, 24999], { colour: axis('Colour', ['Black', 'White', 'Silver']) }, { power: spec('Power', ['500 W', '1000 W', '1500 W']), warranty: spec('Warranty', ['1 year', '2 years']) }],
  storage: [['Nest & Co', 'Ferro', 'Casa Moda'], ['Storage Box', 'Wardrobe Organiser', 'Laundry Basket', 'Container Set', 'Shelf'], [199, 3999], { size: axis('Size', ['Small', 'Medium', 'Large']) }, { material: spec('Material', ['Plastic', 'Fabric', 'Metal', 'Bamboo']) }],
  skincare: [['Glow Lab', 'Pure Botanics', 'DermaCare'], ['Face Wash', 'Moisturiser', 'Sunscreen', 'Serum', 'Face Mask', 'Toner'], [149, 1999], { size: axis('Size', ['50 ml', '100 ml', '200 ml']) }, { skin: spec('Skin type', ['All', 'Oily', 'Dry', 'Sensitive']), vegan: spec('Vegan', ['Yes', 'No']) }],
  makeup: [['Glow Lab', 'Rouge Room', 'Pure Botanics'], ['Lipstick', 'Foundation', 'Kajal', 'Eyeshadow Palette', 'Mascara', 'Compact'], [199, 2499], { shade: axis('Shade', ['Nude', 'Rose', 'Berry', 'Coral']) }, { finish: spec('Finish', ['Matte', 'Glossy', 'Satin']), vegan: spec('Vegan', ['Yes', 'No']) }],
  haircare: [['Pure Botanics', 'DermaCare', 'Root & Ritual'], ['Shampoo', 'Conditioner', 'Hair Oil', 'Hair Serum', 'Hair Mask'], [149, 1499], { size: axis('Size', ['100 ml', '250 ml', '500 ml']) }, { hair: spec('Hair type', ['All', 'Dry', 'Oily', 'Curly']), sulphate: spec('Sulphate free', ['Yes', 'No']) }],
  fragrances: [['Essence', 'Rouge Room', 'Aura'], ['Eau de Parfum', 'Body Mist', 'Deodorant', 'Perfume Gift Set'], [199, 4999], { size: axis('Size', ['30 ml', '50 ml', '100 ml']) }, { for: spec('For', ['Men', 'Women', 'Unisex']), notes: spec('Fragrance family', ['Woody', 'Floral', 'Citrus', 'Musk']) }],
  'personal-care': [['Root & Ritual', 'DermaCare', 'Aura'], ['Body Wash', 'Trimmer', 'Toothpaste', 'Hand Cream', 'Razor', 'Soap Pack'], [49, 2499], { size: axis('Size', ['Regular', 'Family pack']) }, { for: spec('For', ['Men', 'Women', 'Unisex']) }],
  'gym-equipment': [['IronCore', 'FlexFit', 'Peak'], ['Dumbbell Set', 'Resistance Bands', 'Treadmill', 'Kettlebell', 'Pull-up Bar', 'Gym Bench'], [299, 34999], { weight: axis('Weight', ['2 kg', '5 kg', '10 kg']) }, { material: spec('Material', ['Steel', 'Rubber', 'Neoprene']), level: spec('Level', ['Beginner', 'Intermediate', 'Pro']) }],
  sportswear: [['StrideX', 'FlexFit', 'Peak'], ['Track Pants', 'Sports T-Shirt', 'Shorts', 'Compression Tights', 'Sports Bra'], [399, 2999], { size: axis('Size', APPAREL_SIZES), colour: axis('Colour', COLOURS) }, { material: spec('Material', ['Polyester', 'Dry-fit', 'Spandex blend']), sport: spec('Sport', ['Running', 'Gym', 'Training']) }],
  outdoor: [['Wanderpack', 'Peak', 'Trailmate'], ['Tent', 'Sleeping Bag', 'Trekking Pole', 'Camping Lantern', 'Water Bottle'], [299, 12999], { colour: axis('Colour', ['Green', 'Orange', 'Grey']) }, { season: spec('Season', ['Summer', '3 season', '4 season']), weight: spec('Weight', ['Ultralight', 'Standard']) }],
  cycling: [['Velo', 'Peak', 'Trailmate'], ['Mountain Bike', 'Road Bike', 'Cycling Helmet', 'Bike Light', 'Cycling Gloves'], [499, 39999], { size: axis('Size', ['S', 'M', 'L']), colour: axis('Colour', ['Black', 'Red', 'Blue']) }, { type: spec('Type', ['Adult', 'Kids']), gears: spec('Gears', ['Single speed', '7 speed', '21 speed']) }],
  yoga: [['ZenFlow', 'FlexFit', 'Peak'], ['Yoga Mat', 'Yoga Block', 'Yoga Strap', 'Meditation Cushion', 'Yoga Wheel'], [249, 2999], { colour: axis('Colour', ['Purple', 'Teal', 'Grey', 'Pink']) }, { thickness: spec('Thickness', ['4 mm', '6 mm', '8 mm']), material: spec('Material', ['TPE', 'Cork', 'Natural rubber']) }],
  fiction: [['Riverstone Press', 'Paperleaf', 'Inkwell'], ['Novel', 'Mystery Thriller', 'Fantasy Saga', 'Romance', 'Short Stories'], [149, 899], { format: axis('Format', ['Paperback', 'Hardcover']) }, { language: spec('Language', ['English', 'Hindi']), pages: spec('Pages', ['200', '320', '480']) }],
  'non-fiction': [['Riverstone Press', 'Paperleaf', 'Inkwell'], ['Biography', 'Self-help Guide', 'History of India', 'Business Handbook', 'Science Explained'], [199, 1299], { format: axis('Format', ['Paperback', 'Hardcover']) }, { language: spec('Language', ['English', 'Hindi']), pages: spec('Pages', ['200', '320', '480']) }],
  academic: [['Scholar House', 'Paperleaf', 'Riverstone Press'], ['Mathematics Textbook', 'Physics Guide', 'Chemistry Workbook', 'Programming Fundamentals', 'Economics Primer'], [249, 1899], { format: axis('Format', ['Paperback', 'Hardcover']) }, { level: spec('Level', ['School', 'Undergraduate', 'Competitive exams']), edition: spec('Edition', ['Latest', 'Revised']) }],
  comics: [['Inkwell', 'PanelWorks', 'Paperleaf'], ['Superhero Comic', 'Manga Volume', 'Graphic Novel', 'Kids Comic', 'Comic Collection'], [99, 1499], { format: axis('Format', ['Paperback', 'Hardcover']) }, { language: spec('Language', ['English', 'Hindi']), age: spec('Age group', ['Kids', 'Teens', 'Adults']) }],
  'action-figures': [['Toybox', 'HeroWorks', 'Playpen'], ['Superhero Figure', 'Robot Transformer', 'Dinosaur Set', 'Collectible Statue'], [299, 4999], { size: axis('Size', ['Small', 'Large']) }, { age: spec('Age', ['3+', '6+', '12+']), battery: spec('Needs batteries', ['Yes', 'No']) }],
  'board-games': [['Gamer Guild', 'Toybox', 'Playpen'], ['Strategy Game', 'Family Game', 'Card Game', 'Puzzle 1000 pc', 'Trivia Game'], [249, 3499], { edition: axis('Edition', ['Standard', 'Deluxe']) }, { players: spec('Players', ['2', '2-4', '2-6']), age: spec('Age', ['6+', '10+', '14+']) }],
  'learning-toys': [['Little Leaf', 'Toybox', 'BrightMind'], ['Alphabet Blocks', 'Science Kit', 'Building Bricks', 'Coding Robot', 'Art Set'], [199, 3999], { colour: axis('Colour', ['Multicolour', 'Pastel']) }, { age: spec('Age', ['3+', '6+', '9+']), skill: spec('Skill', ['Maths', 'Language', 'STEM', 'Creativity']) }],
  'outdoor-play': [['Playpen', 'Toybox', 'Velo'], ['Kids Cycle', 'Swing Set', 'Football', 'Badminton Set', 'Skateboard'], [249, 9999], { size: axis('Size', ['Small', 'Large']), colour: axis('Colour', ['Red', 'Blue', 'Green']) }, { age: spec('Age', ['3+', '6+', '12+']), material: spec('Material', ['Plastic', 'Metal', 'Wood']) }],
};

const ADJECTIVES = ['Classic', 'Premium', 'Everyday', 'Ultra', 'Essential', 'Signature', 'Pro', 'Lite'];
const TAGS = ['trending', 'gift-ideas', 'premium', 'eco-friendly'];
const COLOUR_HSL = { Black: [220, 8, 16], White: [210, 20, 92], Navy: [222, 55, 26], Olive: [80, 30, 34], Maroon: [350, 60, 30], Grey: [215, 10, 50], Blue: [214, 70, 45], Silver: [210, 8, 70], Red: [2, 70, 45], Green: [140, 45, 35], Brown: [25, 45, 30], 'Rose Gold': [12, 45, 65], Gold: [43, 75, 50], Purple: [270, 45, 40], Teal: [180, 55, 32], Pink: [335, 65, 60], Orange: [24, 85, 52], Beige: [38, 30, 78], Walnut: [25, 40, 28], Oak: [33, 45, 50], Nude: [22, 40, 70], Rose: [345, 50, 55], Berry: [330, 55, 32], Coral: [8, 75, 60] };

// ---------- categories ----------
const categories = [];
const leaves = [];
let order = 0;
for (const [top, children] of Object.entries(tree)) {
  const parent = { id: `cat-${slugify(top)}`, slug: slugify(top), name: top, order: ++order };
  categories.push(parent);
  children.forEach((name, i) => {
    const slug = slugify(name);
    const [, , , axes, specs] = T[slug];
    const attributeDefs = [
      ...Object.entries(axes).map(([key, a]) => ({ key, label: a.label, type: 'enum', filterable: true, variantAxis: true, values: a.values })),
      ...Object.entries(specs).map(([key, s]) => ({ key, label: s.label, type: 'enum', filterable: true, variantAxis: false, values: s.values })),
    ];
    const leaf = { id: `cat-${slug}`, slug, name, parentId: parent.id, order: i + 1, attributeDefs };
    categories.push(leaf);
    leaves.push({ leaf, parent });
  });
}

// ---------- images (SVG placeholders) ----------
rmSync(IMG_DIR, { recursive: true, force: true });
mkdirSync(IMG_DIR, { recursive: true });
mkdirSync(DATA_DIR, { recursive: true });

function hsl([h, s, l]) {
  return `hsl(${h} ${s}% ${l}%)`;
}
function writeSvg(file, w, h, base, label, sub, variant, withText = true) {
  const [bh, bs, bl] = base;
  const light = hsl([bh, Math.min(bs + 10, 80), Math.min(bl + 22, 88)]);
  const dark = hsl([(bh + 20) % 360, bs, Math.max(bl - 10, 10)]);
  const textColour = bl > 60 ? '#111827' : '#ffffff';
  const shapes = [
    `<circle cx="${w * 0.75}" cy="${h * 0.3}" r="${h * 0.28}" fill="#fff" fill-opacity="0.12"/>`,
    `<rect x="${w * 0.12}" y="${h * 0.55}" width="${w * 0.5}" height="${h * 0.3}" rx="${h * 0.04}" fill="#fff" fill-opacity="0.14"/>`,
    `<path d="M0 ${h * 0.8} Q ${w * 0.5} ${h * 0.55} ${w} ${h * 0.85} V ${h} H0Z" fill="#000" fill-opacity="0.12"/>`,
  ];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>${shapes.slice(0, 1 + (variant % 3)).join('')}${withText ? `<text x="50%" y="46%" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="${Math.round(h * 0.075)}" font-weight="700" fill="${textColour}">${esc(label.length > 26 ? label.slice(0, 25) + '…' : label)}</text><text x="50%" y="56%" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="${Math.round(h * 0.045)}" fill="${textColour}" fill-opacity="0.85">${esc(sub)}</text>` : ''}</svg>`;
  writeFileSync(`${IMG_DIR}/${file}`, svg);
}
const image = (file, alt, w, h) => ({ url: `/mock/img/${file}`, alt, width: w, height: h });

// ---------- brands ----------
const brandNames = [...new Set(Object.values(T).flatMap((t) => t[0]))].sort();
const brands = brandNames.map((name) => ({ id: `brand-${slugify(name)}`, slug: slugify(name), name }));

// ---------- products + reviews ----------
const products = [];
const reviews = [];
const REVIEW_TITLES = { 5: ['Absolutely love it', 'Worth every rupee', 'Excellent quality', 'Highly recommended'], 4: ['Very good', 'Good value', 'Happy with the purchase', 'Solid choice'], 3: ['Decent for the price', 'Average', 'Okay overall'], 2: ['Not as expected', 'Could be better'], 1: ['Disappointed', 'Poor quality'] };
const REVIEW_BODIES = { 5: ['Exactly as described and delivery was quick. Would buy again.', 'Build quality is superb and it looks great. My whole family likes it.'], 4: ['Works well and looks good. A small nitpick on packaging but nothing serious.', 'Good product overall, arrived on time.'], 3: ['It does the job but I expected slightly better finishing.', 'Fine for the price, nothing special.'], 2: ['Quality is below what the photos suggest.', 'Had an issue after a few days of use.'], 1: ['Did not match the description at all.', 'Stopped working quickly. Would not recommend.'] };
const AUTHORS = ['Aarav S.', 'Diya M.', 'Rohan K.', 'Ananya P.', 'Vihaan R.', 'Ishita G.', 'Kabir N.', 'Meera T.', 'Arjun D.', 'Sneha B.', 'Rahul V.', 'Priya L.'];

let counter = 0;
for (const { leaf, parent } of leaves) {
  const [brandList, types, [minP, maxP], axes, specs] = T[leaf.slug];
  for (let i = 0; i < PRODUCTS_PER_LEAF; i++) {
    counter++;
    const id = `p-${String(counter).padStart(4, '0')}`;
    const brandName = pick(brandList);
    const type = types[i % types.length];
    const attributes = {};
    const specParts = [];
    for (const [key, s] of Object.entries(specs)) {
      const value = pick(s.values);
      attributes[key] = value;
      if (['fit', 'material', 'finish', 'type', 'style'].includes(key) && specParts.length < 2) specParts.push(value);
    }
    const adjective = pick(ADJECTIVES);
    const productTitle = `${brandName} ${adjective} ${specParts.join(' ')} ${type}`.replace(/\s+/g, ' ').trim();
    const slug = `${slugify(productTitle)}-${counter}`;

    // variants: cartesian product of axes, capped at 8
    const axisKeys = Object.keys(axes);
    let combos = [{}];
    for (const key of axisKeys) combos = combos.flatMap((c) => axes[key].values.map((v) => ({ ...c, [key]: v })));
    combos = combos.sort(() => rnd() - 0.5).slice(0, 8);

    const basePrice = int(minP, maxP);
    const discountPct = chance(0.6) ? pick([10, 15, 20, 25, 30, 40]) : 0;
    const stockProfile = chance(0.08) ? 'out' : chance(0.15) ? 'low' : 'ok';
    const variants = combos.map((options, vi) => {
      const bump = 1 + vi * 0.02;
      const price = Math.max(9, Math.round((basePrice * bump) / 10) * 10 - 1);
      const stock = stockProfile === 'out' ? 0 : stockProfile === 'low' ? int(0, 4) : int(5, 120);
      const variant = { id: `${id}-v${vi + 1}`, sku: `${slugify(leaf.slug).toUpperCase().slice(0, 4)}-${counter}-${vi + 1}`, options, price: { amount: paise(price), currency: 'INR' }, stock };
      if (discountPct) variant.mrp = { amount: paise(Math.round(price / (1 - discountPct / 100) / 10) * 10), currency: 'INR' };
      return variant;
    });

    // images: 3 per product, tinted by the first variant colour when it has one
    const firstOpts = variants[0].options;
    const colourName = firstOpts.colour ?? firstOpts.shade;
    const base = COLOUR_HSL[colourName] ?? [int(0, 359), 45, 42];
    const images = [];
    for (let n = 1; n <= 3; n++) {
      const file = `${id}-${n}.svg`;
      writeSvg(file, 800, 800, base, productTitle, `${leaf.name} · view ${n}`, n);
      images.push(image(file, `${productTitle} - view ${n}`, 800, 800));
    }

    // reviews
    const reviewCount = chance(0.1) ? 0 : int(2, 14);
    const distribution = [0, 0, 0, 0, 0];
    let sum = 0;
    for (let r = 0; r < reviewCount; r++) {
      const roll = rnd();
      const rating = roll < 0.5 ? 5 : roll < 0.8 ? 4 : roll < 0.9 ? 3 : roll < 0.96 ? 2 : 1;
      distribution[rating - 1]++;
      sum += rating;
      reviews.push({ id: `r-${reviews.length + 1}`, productId: id, author: pick(AUTHORS), rating, title: pick(REVIEW_TITLES[rating]), body: pick(REVIEW_BODIES[rating]), createdAt: new Date(NOW - int(1, 540) * 86400000).toISOString(), verified: chance(0.8), helpful: int(0, 40) });
    }

    const tags = TAGS.filter(() => chance(0.22));
    if (basePrice > maxP * 0.7) tags.push('premium');
    const highlights = [`${title(brandName)} quality`, ...Object.entries(attributes).slice(0, 3).map(([k, v]) => `${specs[k].label}: ${v}`)];

    products.push({
      id,
      slug,
      title: productTitle,
      brandId: `brand-${slugify(brandName)}`,
      brandName,
      categoryId: leaf.id,
      categoryPath: [
        { id: parent.id, slug: parent.slug, name: parent.name },
        { id: leaf.id, slug: leaf.slug, name: leaf.name },
      ],
      description: `<p>The ${esc(productTitle)} brings dependable quality to your everyday ${esc(leaf.name.toLowerCase())} needs.</p><p>Designed for value, backed by our easy 7-day returns.</p>`,
      highlights,
      images,
      attributes,
      variantAxes: axisKeys,
      variants,
      rating: { average: reviewCount ? Math.round((sum / reviewCount) * 10) / 10 : 0, count: reviewCount, distribution },
      tags: [...new Set(tags)],
      createdAt: new Date(NOW - int(1, 300) * 86400000).toISOString(),
      popularity: Math.round(rnd() * rnd() * 1000),
      ...(chance(0.05) ? { slugHistory: [`old-${slug}`] } : {}),
    });
  }
}

// ---------- home content ----------
const heroBase = [[245, 70, 40], [340, 60, 40], [160, 55, 32], [30, 80, 45]];
const bannerDefs = [
  { title: 'Big Savings on Electronics', subtitle: 'Phones, laptops and audio at unbeatable prices', cta: 'Shop electronics', link: '/c/electronics' },
  { title: 'New Season Fashion', subtitle: 'Fresh styles for men, women and kids', cta: 'Explore fashion', link: '/c/fashion' },
  { title: 'Grocery, Delivered Fresh', subtitle: 'Daily essentials at your doorstep', cta: 'Shop grocery', link: '/c/grocery' },
  { title: 'Make Your Home Yours', subtitle: 'Furniture, decor and kitchen must-haves', cta: 'Shop home', link: '/c/home-and-kitchen' },
];
const banners = bannerDefs.map((b, i) => {
  const file = `hero-${i + 1}.svg`;
  writeSvg(file, 1600, 560, heroBase[i], b.title, b.subtitle, i + 1, false);
  return { id: `banner-${i + 1}`, ...b, image: image(file, b.title, 1600, 560) };
});
const categoryTiles = categories
  .filter((c) => !c.parentId)
  .map((c, i) => {
    const file = `cat-${c.slug}.svg`;
    writeSvg(file, 600, 400, [(i * 43) % 360, 50, 40], c.name, 'Shop now', i, false);
    return { slug: c.slug, name: c.name, image: image(file, c.name, 600, 400) };
  });
const collections = [
  { id: 'col-trending', slug: 'trending', name: 'Trending now', description: 'What shoppers are buying right now.', tag: 'trending' },
  { id: 'col-gift-ideas', slug: 'gift-ideas', name: 'Gift ideas', description: 'Thoughtful picks for every occasion.', tag: 'gift-ideas' },
  { id: 'col-premium', slug: 'premium', name: 'Premium picks', description: 'Top-of-the-line products.', tag: 'premium' },
  { id: 'col-eco-friendly', slug: 'eco-friendly', name: 'Eco-friendly', description: 'Better for you and the planet.', tag: 'eco-friendly' },
];

const write = (name, data) => writeFileSync(`${DATA_DIR}/${name}.json`, JSON.stringify(data) + '\n');
writeFileSync(`${DATA_DIR}/categories.json`, JSON.stringify(categories, null, 1) + '\n');
write('brands', brands);
write('collections', collections);
write('products', products);
write('reviews', reviews);
write('home', { banners, categoryTiles });

console.log(`categories ${categories.length}, leaves ${leaves.length}, brands ${brands.length}, products ${products.length}, reviews ${reviews.length}`);
