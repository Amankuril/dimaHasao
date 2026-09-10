export const RESTAURANTS_DATA = [
  {
    id: 'r1',
    name: 'Dimasa Ethnic Kitchen & Judima Lounge',
    slug: 'dimasa-ethnic-kitchen-haflong',
    cuisine: ['Authentic Dimasa', 'Tribal Smoked', 'Assamese'],
    rating: 4.9,
    reviewCount: 230,
    deliveryTime: '25-35 min',
    minOrder: 150,
    priceForTwo: 450,
    address: 'Near Old Circuit House, Upper Bagetar, Haflong',
    isOpen: true,
    isVegOnly: false,
    heroImage: 'https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=1000&q=80',
    categories: ['Bestsellers', 'Dimasa Specialties', 'Smoked Delicacies', 'Rice & Breads', 'Traditional Beverages'],
    menu: [
      {
        id: 'r1-m1',
        name: 'Muri Bamboo Smoked Pork with Khorisa',
        category: 'Bestsellers',
        price: 320,
        originalPrice: 380,
        isVeg: false,
        isSpicy: true,
        isBestseller: true,
        description: 'Tender country pork slow-roasted inside hollow bamboo over wood embers with fermented bamboo shoot (khorisa) and wild local herbs.',
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80'
      },
      {
        id: 'r1-m2',
        name: 'Mai-ju Sticky Rice (Wrapped in Banana Leaf)',
        category: 'Rice & Breads',
        price: 80,
        isVeg: true,
        isSpicy: false,
        isBestseller: true,
        description: 'Aromatic tribal sticky rice harvested from the Jatinga hills, steamed in fresh banana leaves.',
        image: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=600&q=80'
      },
      {
        id: 'r1-m3',
        name: 'Khari Local Chicken Curry with Mountain Greens',
        category: 'Dimasa Specialties',
        price: 280,
        originalPrice: 320,
        isVeg: false,
        isSpicy: false,
        isBestseller: false,
        description: 'Free-range country chicken slow-cooked with traditional alkaline water (Khar) and fresh wild fiddlehead ferns.',
        image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&q=80'
      },
      {
        id: 'r1-m4',
        name: 'Crispy River Fish with Roasted Sesame & Herbs',
        category: 'Smoked Delicacies',
        price: 240,
        isVeg: false,
        isSpicy: true,
        isBestseller: true,
        description: 'Fresh local river fish pan-fried with roasted black sesame paste, crushed ginger, and fiery bird eye chillies.',
        image: 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?auto=format&fit=crop&w=600&q=80'
      },
      {
        id: 'r1-m5',
        name: 'Traditional Judima Tasting Carafe (GI Tagged)',
        category: 'Traditional Beverages',
        price: 180,
        isVeg: true,
        isSpicy: false,
        isBestseller: true,
        description: 'Famous Dimasa natural sweet rice wine brewed using traditional herbs (Thembra bark). Served chilled in earthen cups.',
        image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80'
      }
    ]
  },
  {
    id: 'r2',
    name: 'Haflong View Cafe & Bakery',
    slug: 'haflong-view-cafe-bakery',
    cuisine: ['Cafe', 'Artisan Bakery', 'Continental', 'Beverages'],
    rating: 4.8,
    reviewCount: 185,
    deliveryTime: '20-30 min',
    minOrder: 100,
    priceForTwo: 350,
    address: 'Near Haflong Lake Hanging Footbridge, Haflong',
    isOpen: true,
    isVegOnly: false,
    heroImage: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1000&q=80',
    categories: ['Coffee & Tea', 'Fresh Bakes', 'Burgers & Sandwiches', 'Desserts'],
    menu: [
      {
        id: 'r2-m1',
        name: 'Hill Estate Organic Hand-Drip Coffee',
        category: 'Coffee & Tea',
        price: 120,
        isVeg: true,
        isSpicy: false,
        isBestseller: true,
        description: 'Single-origin Arabica coffee beans harvested from the southern hills of Dima Hasao, freshly ground and brewed.',
        image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80'
      },
      {
        id: 'r2-m2',
        name: 'Smoked Chicken & Cheese Sourdough Sandwich',
        category: 'Burgers & Sandwiches',
        price: 210,
        originalPrice: 250,
        isVeg: false,
        isSpicy: false,
        isBestseller: true,
        description: 'In-house smoked chicken breast layered with melted cheddar, organic tomato slices, and honey mustard.',
        image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80'
      },
      {
        id: 'r2-m3',
        name: 'Warm Apple Cinnamon Crumble Tart',
        category: 'Desserts',
        price: 160,
        isVeg: true,
        isSpicy: false,
        isBestseller: false,
        description: 'Baked fresh daily with hill-grown apples, cinnamon, and a buttery oat crumble topping.',
        image: 'https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?auto=format&fit=crop&w=600&q=80'
      }
    ]
  },
  {
    id: 'r3',
    name: 'Cloud 9 Momos & Himalayan Kitchen',
    slug: 'cloud-9-momos-haflong',
    cuisine: ['Tibetan', 'Chinese', 'Fast Food'],
    rating: 4.7,
    reviewCount: 310,
    deliveryTime: '15-25 min',
    minOrder: 100,
    priceForTwo: 280,
    address: 'Station Road Market, Haflong Town',
    isOpen: true,
    isVegOnly: false,
    heroImage: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=1000&q=80',
    categories: ['Steamed Momos', 'Crispy Kothey Momos', 'Thukpa & Soups', 'Noodles & Fried Rice'],
    menu: [
      {
        id: 'r3-m1',
        name: 'Steamed Juicy Pork Momos (8 Pcs)',
        category: 'Steamed Momos',
        price: 140,
        isVeg: false,
        isSpicy: true,
        isBestseller: true,
        description: 'Thin-skinned dumplings filled with spiced minced pork, spring onions, and coriander. Served with fiery Dalle chilli chutney.',
        image: 'https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?auto=format&fit=crop&w=600&q=80'
      },
      {
        id: 'r3-m2',
        name: 'Steamed Cottage Cheese & Mountain Herb Momos',
        category: 'Steamed Momos',
        price: 120,
        isVeg: true,
        isSpicy: false,
        isBestseller: false,
        description: 'Filled with fresh paneer, finely chopped cabbage, carrots, and wild Himalayan chives.',
        image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80'
      },
      {
        id: 'r3-m3',
        name: 'Himalayan Chicken Thukpa Noodle Soup',
        category: 'Thukpa & Soups',
        price: 180,
        isVeg: false,
        isSpicy: true,
        isBestseller: true,
        description: 'Steaming bowl of handmade egg noodles, shredded roast chicken, bok choy, and ginger-infused broth.',
        image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80'
      }
    ]
  },
  {
    id: 'r4',
    name: 'Kalyan Heritage Pure Veg & Thali House',
    slug: 'kalyan-pure-veg-thali-haflong',
    cuisine: ['Pure Veg', 'North Indian', 'Assamese Veg Thali', 'Sweets'],
    rating: 4.6,
    reviewCount: 160,
    deliveryTime: '25-35 min',
    minOrder: 150,
    priceForTwo: 300,
    address: 'Main Bazaar Road, Near Town Hall, Haflong',
    isOpen: true,
    isVegOnly: true,
    heroImage: 'https://images.unsplash.com/photo-1613292443284-c770c01d4a0a?auto=format&fit=crop&w=1000&q=80',
    categories: ['Special Thalis', 'Curries & Paneer', 'Tandoori Breads', 'Traditional Sweets'],
    menu: [
      {
        id: 'r4-m1',
        name: 'Royal Assamese Organic Veg Thali',
        category: 'Special Thalis',
        price: 220,
        originalPrice: 260,
        isVeg: true,
        isSpicy: false,
        isBestseller: true,
        description: 'Includes Joha rice, Mati Mahor Daal, Boror Tenga curry, Aloo Pitika, Khar dish, Papadam, and Payas dessert.',
        image: 'https://images.unsplash.com/photo-1613292443284-c770c01d4a0a?auto=format&fit=crop&w=600&q=80'
      },
      {
        id: 'r4-m2',
        name: 'Paneer Butter Masala with 2 Butter Naans',
        category: 'Curries & Paneer',
        price: 250,
        isVeg: true,
        isSpicy: false,
        isBestseller: true,
        description: 'Fresh cottage cheese cubes simmered in rich creamy butter tomato gravy.',
        image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80'
      }
    ]
  }
];
