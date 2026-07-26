export const categories = [
  {
    id: 'electronics',
    name: 'Electronics',
    icon: 'Smartphone',
    image: 'https://images.unsplash.com/photo-1650094983020-89c3dfa9ce0d',
    color: 'bg-blue-100',
  },
  {
    id: 'dorm-essentials',
    name: 'Dorm Essentials',
    icon: 'Lamp',
    image: 'https://images.unsplash.com/photo-1768077712695-25e3a69b4dc7',
    color: 'bg-purple-100',
  },
  {
    id: 'clothing',
    name: 'Clothing',
    icon: 'Shirt',
    image: 'https://images.unsplash.com/photo-1663044022557-7d5d4c1d5318',
    color: 'bg-pink-100',
  },
  {
    id: 'books-stationery',
    name: 'Books & Stationery',
    icon: 'BookOpen',
    image: 'https://images.unsplash.com/photo-1654785419449-7f0a9383a4fe',
    color: 'bg-yellow-100',
  },
];

export const products = [
  {
    id: '1',
    name: 'MacBook Air M2 (Used)',
    price: 8500,
    oldPrice: 9200,
    category: 'electronics',
    image: 'https://images.unsplash.com/photo-1650094983020-89c3dfa9ce0d',
    discount: 8,
    university: 'UG - Legon',
    condition: 'Like New',
    seller: {
      name: 'Kofi Mensah',
      rating: 4.8,
      verified: true
    },
    description: 'Selling my MacBook Air M2. Used for only one semester. Comes with all accessories and box. Perfect for computer science students.'
  },
  {
    id: '2',
    name: 'Rechargeable Study Lamp',
    price: 150,
    oldPrice: 180,
    category: 'dorm-essentials',
    image: 'https://images.unsplash.com/photo-1534073828943-f801091bb270',
    discount: 16,
    university: 'KNUST',
    condition: 'New',
    seller: {
      name: 'Ama Serwaa',
      rating: 4.5,
      verified: true
    },
    description: 'Very bright study lamp with 3 brightness levels. Built-in battery that lasts 6 hours on full charge.'
  },
  {
    id: '3',
    name: 'Oversized Uni Hoodie',
    price: 250,
    category: 'clothing',
    image: 'https://images.unsplash.com/photo-1663044022557-7d5d4c1d5318',
    university: 'UCC',
    condition: 'New',
    seller: {
      name: 'Style Haven',
      rating: 4.9,
      verified: true
    },
    description: 'Premium quality oversized hoodie. Available in all sizes. Perfect for cold mornings on campus.'
  },
  {
    id: '4',
    name: 'Scientific Calculator fx-991EX',
    price: 320,
    oldPrice: 350,
    category: 'books-stationery',
    image: 'https://images.unsplash.com/photo-1654785419449-7f0a9383a4fe',
    discount: 9,
    university: 'UPSA',
    condition: 'Good',
    seller: {
      name: 'Kwame Tech',
      rating: 4.2,
      verified: false
    },
    description: 'Standard engineering calculator. Used for two years but works perfectly fine.'
  },
  {
    id: '5',
    name: 'Sony WH-1000XM4 Headphones',
    price: 2200,
    oldPrice: 2500,
    category: 'electronics',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
    discount: 12,
    university: 'UG - Legon',
    condition: 'Like New',
    seller: {
      name: 'John Doe',
      rating: 4.7,
      verified: true
    },
    description: 'Industry-leading noise canceling headphones. Great for studying in noisy dorms.'
  },
  {
    id: '6',
    name: 'Electric Kettle (1.8L)',
    price: 120,
    category: 'dorm-essentials',
    image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5',
    university: 'KNUST',
    condition: 'Used - Good',
    seller: {
      name: 'Serwaa Appiah',
      rating: 4.3,
      verified: true
    },
    description: 'Fast boiling electric kettle. Essential for your morning coffee or noodles.'
  }
];

export const universities = [
  'University of Ghana (UG)',
  'KNUST',
  'University of Cape Coast (UCC)',
  'UPSA',
  'Ashesi University',
  'Central University',
  'GIJ'
];
