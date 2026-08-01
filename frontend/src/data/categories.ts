export interface CategoryDefinition {
  id: string;
  name: string;
  subcategories: string[];
}

export const CATEGORIES_DATA: CategoryDefinition[] = [
  {
    id: 'mobiles',
    name: 'Mobiles',
    subcategories: [
      'Smartphones',
      'Feature Phones',
      'Refurbished Mobiles',
      'Mobile Accessories',
      'Cases & Covers',
      'Screen Guards',
      'Chargers',
      'Power Banks',
      'Cables',
      'Selfie Sticks',
      'Mobile Holders',
      'Smart Watches',
      'Fitness Bands'
    ]
  },
  {
    id: 'electronics',
    name: 'Electronics',
    subcategories: [
      'Laptops',
      'Desktop PCs',
      'Computer Components',
      'Monitors',
      'Printers',
      'Storage Devices',
      'Pen Drives',
      'SSD',
      'HDD',
      'Routers',
      'Networking Devices',
      'Projectors',
      'Tablets',
      'Cameras',
      'Camera Accessories',
      'Drones',
      'Headphones',
      'Earbuds',
      'Speakers',
      'Soundbars',
      'Microphones',
      'Gaming Consoles',
      'Gaming Accessories'
    ]
  },
  {
    id: 'tv-appliances',
    name: 'TV & Appliances',
    subcategories: [
      'Smart TVs',
      'LED TVs',
      'Android TVs',
      'Refrigerators',
      'Washing Machines',
      'Air Conditioners',
      'Air Coolers',
      'Water Purifiers',
      'Water Heaters',
      'Chimneys',
      'Microwave Ovens',
      'OTGs',
      'Dishwashers',
      'Vacuum Cleaners',
      'Fans',
      'Inverters',
      'Stabilizers'
    ]
  },
  {
    id: 'fashion',
    name: 'Fashion',
    subcategories: [
      'Men T-Shirts',
      'Men Shirts',
      'Men Jeans',
      'Men Trousers',
      'Men Shorts',
      'Men Jackets',
      'Men Hoodies',
      'Ethnic Wear',
      'Blazers',
      'Men Innerwear',
      'Nightwear',
      'Sarees',
      'Kurtas',
      'Kurtis',
      'Dresses',
      'Tops',
      'Women Jeans',
      'Leggings',
      'Ethnic Sets',
      'Skirts',
      'Boys Clothing',
      'Girls Clothing',
      'Baby Clothing',
      'School Uniforms'
    ]
  },
  {
    id: 'footwear',
    name: 'Footwear',
    subcategories: [
      "Men's Shoes",
      "Women's Shoes",
      'Kids Shoes',
      'Sneakers',
      'Sports Shoes',
      'Formal Shoes',
      'Casual Shoes',
      'Sandals',
      'Slippers',
      'Boots'
    ]
  },
  {
    id: 'beauty-personal-care',
    name: 'Beauty & Personal Care',
    subcategories: [
      'Makeup',
      'Skincare',
      'Hair Care',
      'Bath & Body',
      'Perfumes',
      'Grooming',
      'Beard Care',
      'Shaving Products',
      'Oral Care',
      'Feminine Hygiene'
    ]
  },
  {
    id: 'home-kitchen',
    name: 'Home & Kitchen',
    subcategories: [
      'Kitchen Tools',
      'Cookware',
      'Dinnerware',
      'Storage Containers',
      'Home Decor',
      'Lighting',
      'Curtains',
      'Bedsheets',
      'Pillows',
      'Blankets',
      'Carpets',
      'Wall Decor',
      'Clocks',
      'Bathroom Accessories',
      'Cleaning Supplies'
    ]
  },
  {
    id: 'furniture',
    name: 'Furniture',
    subcategories: [
      'Sofas',
      'Beds',
      'Mattresses',
      'Dining Tables',
      'Chairs',
      'Office Chairs',
      'Study Tables',
      'Wardrobes',
      'TV Units',
      'Shoe Racks',
      'Bookshelves',
      'Bean Bags'
    ]
  },
  {
    id: 'grocery',
    name: 'Grocery',
    subcategories: [
      'Rice',
      'Atta',
      'Pulses',
      'Oil',
      'Ghee',
      'Tea',
      'Coffee',
      'Snacks',
      'Biscuits',
      'Chocolates',
      'Dry Fruits',
      'Beverages',
      'Dairy',
      'Spices',
      'Instant Foods',
      'Household Essentials'
    ]
  },
  {
    id: 'baby-care',
    name: 'Baby Care',
    subcategories: [
      'Baby Food',
      'Diapers',
      'Baby Clothing',
      'Baby Toys',
      'Baby Bath',
      'Feeding Accessories',
      'Strollers',
      'Baby Furniture'
    ]
  },
  {
    id: 'toys-games',
    name: 'Toys & Games',
    subcategories: [
      'Educational Toys',
      'Soft Toys',
      'Action Figures',
      'Dolls',
      'Building Blocks',
      'Board Games',
      'RC Toys',
      'Outdoor Toys',
      'Puzzles'
    ]
  },
  {
    id: 'sports-fitness',
    name: 'Sports & Fitness',
    subcategories: [
      'Gym Equipment',
      'Dumbbells',
      'Yoga Mats',
      'Cricket',
      'Football',
      'Badminton',
      'Cycling',
      'Running',
      'Sports Nutrition',
      'Camping',
      'Trekking'
    ]
  },
  {
    id: 'books-media',
    name: 'Books & Media',
    subcategories: [
      'Fiction',
      'Non-fiction',
      'Academic Books',
      'Competitive Exam Books',
      "Children's Books",
      'Comics',
      'Magazines',
      'E-books'
    ]
  },
  {
    id: 'automotive',
    name: 'Automotive',
    subcategories: [
      'Car Accessories',
      'Bike Accessories',
      'Helmets',
      'Car Care',
      'Lubricants',
      'Tyre Accessories',
      'Riding Gear'
    ]
  },
  {
    id: 'jewellery',
    name: 'Jewellery',
    subcategories: [
      'Gold Jewellery',
      'Silver Jewellery',
      'Artificial Jewellery',
      'Necklaces',
      'Rings',
      'Earrings',
      'Bracelets',
      'Anklets'
    ]
  },
  {
    id: 'watches',
    name: 'Watches',
    subcategories: [
      "Men's Watches",
      "Women's Watches",
      'Smart Watches',
      'Kids Watches',
      'Luxury Watches'
    ]
  },
  {
    id: 'bags-wallets-luggage',
    name: 'Bags, Wallets & Luggage',
    subcategories: [
      'Backpacks',
      'Handbags',
      'Wallets',
      'Laptop Bags',
      'Duffel Bags',
      'Suitcases',
      'Travel Accessories'
    ]
  },
  {
    id: 'pet-supplies',
    name: 'Pet Supplies',
    subcategories: [
      'Dog Food',
      'Cat Food',
      'Fish Food',
      'Pet Grooming',
      'Pet Toys',
      'Pet Beds',
      'Pet Medicines'
    ]
  },
  {
    id: 'musical-instruments',
    name: 'Musical Instruments',
    subcategories: [
      'Guitar',
      'Keyboard',
      'Piano',
      'Drum Set',
      'Violin',
      'Microphones',
      'DJ Equipment'
    ]
  },
  {
    id: 'office-supplies',
    name: 'Office Supplies',
    subcategories: [
      'Stationery',
      'Calculators',
      'Whiteboards',
      'Files',
      'Office Furniture',
      'Office Electronics'
    ]
  },
  {
    id: 'health-care',
    name: 'Health Care',
    subcategories: [
      'Vitamins',
      'Supplements',
      'Medical Devices',
      'Blood Pressure Monitors',
      'Glucometers',
      'Thermometers',
      'Orthopedic Supports'
    ]
  },
  {
    id: 'food-nutrition',
    name: 'Food & Nutrition',
    subcategories: [
      'Protein Powder',
      'Mass Gainers',
      'Energy Drinks',
      'Healthy Snacks',
      'Organic Food',
      'Herbal Products'
    ]
  },
  {
    id: 'garden-outdoor',
    name: 'Garden & Outdoor',
    subcategories: [
      'Plants',
      'Pots',
      'Seeds',
      'Fertilizers',
      'Garden Tools',
      'Outdoor Furniture'
    ]
  },
  {
    id: 'industrial-scientific',
    name: 'Industrial & Scientific',
    subcategories: [
      'Lab Equipment',
      'Safety Equipment',
      'Measuring Tools',
      'Industrial Tools'
    ]
  },
  {
    id: 'gift-items',
    name: 'Gift Items',
    subcategories: [
      'Greeting Cards',
      'Gift Hampers',
      'Personalized Gifts',
      'Home Gifts',
      'Festival Gifts'
    ]
  },
  {
    id: 'art-craft',
    name: 'Art & Craft',
    subcategories: [
      'Paintings',
      'Drawing Supplies',
      'Craft Kits',
      'DIY Kits',
      'Canvas',
      'Sketchbooks'
    ]
  },
  {
    id: 'religious-spiritual',
    name: 'Religious & Spiritual',
    subcategories: [
      'Idols',
      'Incense',
      'Diyas',
      'Prayer Accessories',
      'Holy Books'
    ]
  },
  {
    id: 'software-digital',
    name: 'Software & Digital Products',
    subcategories: [
      'Antivirus',
      'Software Licenses',
      'Online Courses',
      'Gift Cards'
    ]
  },
  {
    id: 'egift-cards',
    name: 'E-Gift Cards',
    subcategories: [
      'Shopping Gift Cards',
      'Gaming Gift Cards',
      'Entertainment Gift Cards',
      'Brand Gift Cards'
    ]
  },
  {
    id: 'services',
    name: 'Services',
    subcategories: [
      'Installation',
      'Extended Warranty',
      'Device Protection',
      'Repairs'
    ]
  }
];

export const CATEGORIES_WITH_ALL = ['All', ...CATEGORIES_DATA.map(c => c.name)];

export function getSubcategoriesForCategory(categoryName: string): string[] {
  const cat = CATEGORIES_DATA.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
  return cat ? cat.subcategories : [];
}

export function getAllSubcategories(): string[] {
  return CATEGORIES_DATA.flatMap(c => c.subcategories);
}
