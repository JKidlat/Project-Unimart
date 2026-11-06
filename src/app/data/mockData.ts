/**
 * ==============================================================================
 * MOCK DATA SEED STORE (mockData.ts)
 * ==============================================================================
 * This file contains seed data used across the Unimart application when testing,
 * running in offline demo mode, or when the database is empty.
 *
 * What is included:
 * 1. `categories`: Main marketplace categories (Electronics, Dorm, Clothing, Books)
 * 2. `products`: Realistic student listings with Ghana Cedi prices, photos, conditions,
 *    and student seller credentials.
 * 3. `universities`: List of top Ghanaian higher institutions supported by Unimart.
 * ==============================================================================
 */

// ==============================================================================
// 1. MARKETPLACE CATEGORIES
// ==============================================================================
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

// ==============================================================================
// 2. SEED PRODUCT LISTINGS
// ==============================================================================
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

// ==============================================================================
// 3. SUPPORTED GHANAIAN INSTITUTIONS
// ==============================================================================
export const universities = [
  'Academic City University (ACUC)',
  'Accra Business School (ABS)',
  'Accra Institute of Technology (AIT)',
  'Accra Metropolitan University (AMU)',
  'Accra Technical University (ATU)',
  'African University College of Communications (AUCC)',
  'Akenten Appiah-Menka University of Skills Training and Entrepreneurial Development (AAMUSTED)',
  'Akrofi-Christaller Institute of Theology, Mission and Culture (ACI)',
  'All Nations University (ANU)',
  'Anglican University College of Technology (ANGUTECH)',
  'Ashesi University (Ashesi)',
  'Bolgatanga Technical University (BTU)',
  'C. K. Tedam University of Technology and Applied Sciences (CKT-UTAS)',
  'Cape Coast Technical University (CCTU)',
  'Catholic University of Ghana (CUG)',
  'Central University (Central)',
  'Christian Service University (CSU)',
  'Christian University College (CUC)',
  'Dominion University College (DUC)',
  'Dr. Hilla Limann Technical University (DHLTU)',
  'Ensign Global University (Ensign)',
  'Evangelical Presbyterian University College (EPUC)',
  'Family Health University (FHUC)',
  'Garden City University (GCUC)',
  'Ghana Christian University College (GCUC-Ghana)',
  'Ghana Communication Technology University (GCTU)',
  'Ghana Institute of Management and Public Administration (GIMPA)',
  'Heritage Christian University (HCUC)',
  'Ho Technical University (HTU)',
  'KAAF University (KAAF)',
  'Klintaps University College of Health and Allied Sciences (KUCoHAS)',
  'Knutsford University (Knutsford)',
  'Koforidua Technical University (KTU)',
  'Kumasi Technical University (KsTU)',
  'Kwame Nkrumah University of Science and Technology (KNUST)',
  'Lancaster University Ghana (Lancaster)',
  'Maranatha University College (MUC)',
  'Methodist University Ghana (MUG)',
  'Mountcrest University College (MUCG)',
  'Nobel International Business University (NIBS)',
  'Pentecost University (PU)',
  'Presbyterian University (PUG)',
  'Radford University College (RUC)',
  'Regent University College of Science and Technology (Regent)',
  'Regentropfen University College (RUCG)',
  'Regional Maritime University (RMU)',
  'S. D. Dombo University of Business and Integrated Development Studies (SDD-UBIDS)',
  'Spiritan University College (SUC)',
  'Sunyani Technical University (STU)',
  'Takoradi Technical University (TTU)',
  'Tamale Technical University (TaTU)',
  'Trinity Theological Seminary (TTS)',
  'University for Development Studies (UDS)',
  'University of Cape Coast (UCC)',
  'University of Education, Winneba (UEW)',
  'University of Energy and Natural Resources (UENR)',
  'University of Environment and Sustainable Development (UESD)',
  'University of Ghana (UG)',
  'University of Gold Coast (UGC)',
  'University of Health and Allied Sciences (UHAS)',
  'University of Media, Arts and Communication (UniMAC)',
  'University of Mines and Technology (UMaT)',
  'University of Professional Studies, Accra (UPSA)',
  'Valley View University (VVU)',
  'West End University College (WEUC)',
  'Wisconsin International University College, Ghana (WIUC)',
  'Zenith University College (ZUC)'
];
