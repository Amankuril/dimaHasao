export const HOTELS_DATA = [
  {
    id: 'h1',
    name: 'The Landmark Hills Resort & Spa',
    slug: 'the-landmark-hills-resort-haflong',
    type: 'Resort',
    badge: 'Luxury Stay',
    location: 'Upper Bagetar, Haflong',
    address: 'Near Circuit House, Upper Bagetar, Haflong, Dima Hasao, Assam 788819',
    distanceFromStation: '4.2 km',
    travelTime: '12 min',
    rating: 4.8,
    reviewCount: 142,
    startingPrice: 3800,
    originalPrice: 4800,
    taxRate: 0.12,
    heroImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80'
    ],
    description: 'Perched on the highest ridge of Haflong, The Landmark Hills Resort offers breathtaking 360-degree panoramic views of mist-covered Borail mountains and emerald valleys. Features fine ethnic dining, heated showers, and tranquil gardens.',
    aboutDetails: [
      'Ideal for couples and families looking for premium comfort in the lap of nature.',
      'Features a private viewpoint terrace where the sun rises above a sea of clouds.',
      'Multi-cuisine restaurant serving authentic Dimasa dishes along with Indian and Continental menus.'
    ],
    amenities: [
      { id: 'wifi', icon: 'fa-solid fa-wifi', label: 'High-Speed Wi-Fi' },
      { id: 'view', icon: 'fa-solid fa-mountain', label: 'Panoramic Valley View' },
      { id: 'food', icon: 'fa-solid fa-utensils', label: 'Fine Dining Restaurant' },
      { id: 'geyser', icon: 'fa-solid fa-temperature-arrow-up', label: '24/7 Hot Water' },
      { id: 'parking', icon: 'fa-solid fa-square-parking', label: 'Free Secured Parking' },
      { id: 'bonfire', icon: 'fa-solid fa-fire', label: 'Evening Bonfire' },
      { id: 'backup', icon: 'fa-solid fa-bolt', label: '100% Power Backup' },
      { id: 'service', icon: 'fa-solid fa-bell-concierge', label: '24h Room Service' }
    ],
    checkInTime: '12:00 PM',
    checkOutTime: '11:00 AM',
    cancellationPolicy: 'Free cancellation up to 48 hours before check-in. 50% refund thereafter.',
    rooms: [
      {
        id: 'h1-r1',
        name: 'Deluxe Valley View Room',
        category: 'Deluxe',
        price: 3800,
        originalPrice: 4800,
        maxGuests: 2,
        bedType: 'King Size Bed',
        size: '320 sq.ft',
        image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
        amenities: ['Private Balcony', 'Hill View', 'Complimentary Breakfast', 'Smart TV', 'Tea/Coffee Maker', 'Geyser'],
        availableRooms: 4,
        isPopular: true
      },
      {
        id: 'h1-r2',
        name: 'Royal Borail Panoramic Suite',
        category: 'Suite',
        price: 6200,
        originalPrice: 7500,
        maxGuests: 3,
        bedType: 'Super King Bed + Sofa Bed',
        size: '520 sq.ft',
        image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
        amenities: ['Wraparound Balcony', 'Jacuzzi Tub', 'Living Room Area', 'Free Breakfast & High Tea', 'Mini Fridge', 'Personal Butler Service'],
        availableRooms: 2,
        isPopular: false
      }
    ],
    reviews: [
      {
        id: 'rev-1',
        author: 'Ananya Roy',
        rating: 5,
        date: '2 weeks ago',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
        comment: 'Mesmerizing sunrise view from the room balcony! The Dimasa smoked pork and Mai-ju rice served for dinner was authentic and scrumptious.'
      },
      {
        id: 'rev-2',
        author: 'Debashis Paul',
        rating: 4.8,
        date: '1 month ago',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
        comment: 'Cleanest resort in Haflong. Staff organized a taxi for our Jatinga tour promptly at 5 AM. Highly recommended!'
      }
    ]
  },
  {
    id: 'h2',
    name: 'Nhunza Traditional Dimasa Homestay',
    slug: 'nhunza-dimasa-homestay-jatinga',
    type: 'Homestay',
    badge: 'Cultural Choice',
    location: 'Jatinga Valley, Dima Hasao',
    address: 'Near Jatinga Bird Watch Tower, Jatinga, Dima Hasao, Assam 788819',
    distanceFromStation: '2.5 km',
    travelTime: '8 min',
    rating: 4.9,
    reviewCount: 98,
    startingPrice: 1650,
    originalPrice: 2200,
    taxRate: 0.05,
    heroImage: 'https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80'
    ],
    description: 'Experience genuine tribal hospitality with the Daulagupu family. Wooden cottages set among organic orange orchards, serving home-cooked organic farm food and homemade Judima.',
    aboutDetails: [
      'Authentic bamboo and hardwood cottage architecture with modern ensuite bathrooms.',
      'Farm-to-table organic meals prepared on traditional earthen hearths.',
      'Night bird watching and forest walking trails organized with local family elders.'
    ],
    amenities: [
      { id: 'food', icon: 'fa-solid fa-bowl-food', label: 'Authentic Home Cooked Meals' },
      { id: 'garden', icon: 'fa-solid fa-tree', label: 'Organic Orange Orchard' },
      { id: 'geyser', icon: 'fa-solid fa-temperature-arrow-up', label: 'Hot Water Geyser' },
      { id: 'bonfire', icon: 'fa-solid fa-fire-burner', label: 'Campfire & Cultural Lore' },
      { id: 'guide', icon: 'fa-solid fa-compass', label: 'Free Local Guided Trails' },
      { id: 'parking', icon: 'fa-solid fa-square-parking', label: 'Free Parking' }
    ],
    checkInTime: '11:00 AM',
    checkOutTime: '10:00 AM',
    cancellationPolicy: 'Free cancellation up to 24 hours before arrival.',
    rooms: [
      {
        id: 'h2-r1',
        name: 'Orchard Bamboo Cottage',
        category: 'Cottage',
        price: 1650,
        originalPrice: 2200,
        maxGuests: 2,
        bedType: 'Queen Bamboo Bed',
        size: '260 sq.ft',
        image: 'https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=800&q=80',
        amenities: ['Orchard View', 'Farm Breakfast Included', 'Attached Bathroom', 'Hot Water', 'Patio Seating'],
        availableRooms: 3,
        isPopular: true
      },
      {
        id: 'h2-r2',
        name: 'Tribal Family Treehouse Cottage',
        category: 'Family Cottage',
        price: 2800,
        originalPrice: 3500,
        maxGuests: 4,
        bedType: '2 Double Beds',
        size: '420 sq.ft',
        image: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=800&q=80',
        amenities: ['Forest Canopy View', 'Private Wooden Deck', 'Traditional Welcome Drink', 'All Meals Option Available'],
        availableRooms: 1,
        isPopular: false
      }
    ],
    reviews: [
      {
        id: 'rev-3',
        author: 'Priyanka Sharma',
        rating: 5,
        date: '3 days ago',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
        comment: 'Staying with Uncle Ramen and family was the highlight of our Assam trip. The warm bonfire, freshly brewed Judima and folk tales were unforgettable.'
      }
    ]
  },
  {
    id: 'h3',
    name: 'Haflong Lake Heritage Hotel',
    slug: 'haflong-lake-heritage-hotel',
    type: 'Hotel',
    badge: 'Lake Front',
    location: 'Lake Road, Haflong Town',
    address: 'Near Haflong Lake Hanging Bridge, Haflong, Dima Hasao, Assam 788819',
    distanceFromStation: '3.0 km',
    travelTime: '10 min',
    rating: 4.6,
    reviewCount: 115,
    startingPrice: 2400,
    originalPrice: 3000,
    taxRate: 0.12,
    heroImage: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80'
    ],
    description: 'Located right next to the historic Haflong Lake and the iconic hanging footbridge. Enjoy morning boat rides and evening lakeside strolls just 50 meters from your doorstep.',
    aboutDetails: [
      'Direct lake-view rooms with spacious glass balconies overlooking boating piers.',
      'In-house restaurant "The Fishermans Deck" with authentic fish curry and river crabs.',
      'Within walking distance to Haflong Central Market and Local Craft Centers.'
    ],
    amenities: [
      { id: 'view', icon: 'fa-solid fa-water', label: 'Direct Lakefront View' },
      { id: 'wifi', icon: 'fa-solid fa-wifi', label: 'Complimentary Wi-Fi' },
      { id: 'food', icon: 'fa-solid fa-utensils', label: 'Lakeside Café' },
      { id: 'geyser', icon: 'fa-solid fa-temperature-arrow-up', label: 'Hot Water Geyser' },
      { id: 'parking', icon: 'fa-solid fa-square-parking', label: 'Covered Parking' },
      { id: 'ac', icon: 'fa-solid fa-snowflake', label: 'Climate Control' }
    ],
    checkInTime: '12:00 PM',
    checkOutTime: '11:00 AM',
    cancellationPolicy: 'Free cancellation up to 48 hours before check-in.',
    rooms: [
      {
        id: 'h3-r1',
        name: 'Lakeview Deluxe Room',
        category: 'Deluxe',
        price: 2400,
        originalPrice: 3000,
        maxGuests: 2,
        bedType: 'King Size Bed',
        size: '290 sq.ft',
        image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
        amenities: ['Lake View Balcony', 'Tea Maker', 'Breakfast Included', 'Work Desk', 'Smart TV'],
        availableRooms: 5,
        isPopular: true
      },
      {
        id: 'h3-r2',
        name: 'Executive Lake Panorama Suite',
        category: 'Suite',
        price: 4200,
        originalPrice: 5200,
        maxGuests: 3,
        bedType: 'King Bed + Daybed',
        size: '460 sq.ft',
        image: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80',
        amenities: ['Corner Lake View', 'Bathtub', 'Complimentary Breakfast', 'Mini Fridge', 'Living Area'],
        availableRooms: 2,
        isPopular: false
      }
    ],
    reviews: [
      {
        id: 'rev-4',
        author: 'Kunal Singha',
        rating: 4.6,
        date: '3 weeks ago',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
        comment: 'Walking on the hanging bridge in the morning mist right outside the hotel was pure bliss. Rooms are super cozy and clean.'
      }
    ]
  },
  {
    id: 'h4',
    name: 'Borail Cloud Mist Eco Resort',
    slug: 'borail-cloud-mist-eco-resort',
    type: 'Resort',
    badge: 'Nature Retreat',
    location: 'Silaikul Hills, Dima Hasao',
    address: 'Silaikul Peak Road, Near Mahur, Dima Hasao, Assam 788830',
    distanceFromStation: '14.0 km',
    travelTime: '35 min',
    rating: 4.9,
    reviewCount: 76,
    startingPrice: 3200,
    originalPrice: 4000,
    taxRate: 0.12,
    heroImage: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=80'
    ],
    description: 'Surrounded by the pristine rainforests of Borail Wildlife Sanctuary. Wooden chalets built along cloud ridges with infinity views, bird trails, and waterfall excursions.',
    aboutDetails: [
      '100% eco-friendly solar powered luxury chalets overlooking evergreen valleys.',
      'Organized guided treks to hidden waterfalls and Hornbill nesting trees.',
      'Organic tribal buffet with bamboo shoot chicken and mountain wild greens.'
    ],
    amenities: [
      { id: 'view', icon: 'fa-solid fa-cloud-sun', label: 'Cloud-level Ridge Views' },
      { id: 'trek', icon: 'fa-solid fa-person-hiking', label: 'Guided Waterfall Treks' },
      { id: 'bonfire', icon: 'fa-solid fa-fire', label: 'Night Star Gazing & Campfire' },
      { id: 'food', icon: 'fa-solid fa-utensils', label: 'Organic Hill Dining' },
      { id: 'geyser', icon: 'fa-solid fa-temperature-arrow-up', label: 'Solar Hot Water' },
      { id: 'parking', icon: 'fa-solid fa-square-parking', label: 'Free Parking' }
    ],
    checkInTime: '01:00 PM',
    checkOutTime: '11:00 AM',
    cancellationPolicy: 'Free cancellation up to 72 hours before check-in.',
    rooms: [
      {
        id: 'h4-r1',
        name: 'Forest Canopy Wood Chalet',
        category: 'Eco Chalet',
        price: 3200,
        originalPrice: 4000,
        maxGuests: 2,
        bedType: 'King Hardwood Bed',
        size: '340 sq.ft',
        image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
        amenities: ['Panoramic Glass Windows', 'Private Verandah', 'Trek Guide Included', 'Organic Breakfast Included'],
        availableRooms: 4,
        isPopular: true
      },
      {
        id: 'h4-r2',
        name: 'Cloud Valley Villa',
        category: 'Luxury Villa',
        price: 5400,
        originalPrice: 6500,
        maxGuests: 4,
        bedType: '2 King Beds',
        size: '600 sq.ft',
        image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=800&q=80',
        amenities: ['Private Sunrise Deck', 'Living Room', 'All Meals Included', 'Private Bonfire Pit', 'Birding Telescope'],
        availableRooms: 2,
        isPopular: false
      }
    ],
    reviews: [
      {
        id: 'rev-5',
        author: 'Rajarshi Sen',
        rating: 5,
        date: '1 week ago',
        avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=120&q=80',
        comment: 'Waking up inside clouds literally! The sound of birds in the morning and the campfire under starry skies was magic. Will definitely return.'
      }
    ]
  },
  {
    id: 'h5',
    name: 'Kopili Riverfront Lodge & Camping',
    slug: 'kopili-riverfront-lodge-umrangso',
    type: 'Lodge',
    badge: 'River Adventure',
    location: 'Umrangso, Dima Hasao',
    address: 'Near Kopili Dam & Golf Course, Umrangso, Dima Hasao, Assam 788931',
    distanceFromStation: '110 km from Haflong',
    travelTime: '3h 15 min',
    rating: 4.7,
    reviewCount: 64,
    startingPrice: 1950,
    originalPrice: 2500,
    taxRate: 0.05,
    heroImage: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=1200&q=80'
    ],
    description: 'Situated near the emerald waters of Kopili Lake and scenic golf fields of Umrangso. Famous for hosting Falcon Festival visitors with river kayaking, angling, and glamping tents.',
    aboutDetails: [
      'Prime spot for bird enthusiasts visiting during the Amur Falcon migration season.',
      'Kayaking, boating, and riverside angling equipment available on rent.',
      'Spacious alpine camping tents with solid wooden flooring and hot water baths.'
    ],
    amenities: [
      { id: 'water', icon: 'fa-solid fa-sailboat', label: 'River Boating & Kayaking' },
      { id: 'food', icon: 'fa-solid fa-utensils', label: 'Riverside Barbecue' },
      { id: 'bonfire', icon: 'fa-solid fa-fire', label: 'Night Campfire' },
      { id: 'geyser', icon: 'fa-solid fa-temperature-arrow-up', label: 'Hot Water Facility' },
      { id: 'parking', icon: 'fa-solid fa-square-parking', label: 'Free Parking' }
    ],
    checkInTime: '12:00 PM',
    checkOutTime: '10:30 AM',
    cancellationPolicy: 'Free cancellation up to 24 hours before check-in.',
    rooms: [
      {
        id: 'h5-r1',
        name: 'Riverside Glamping Tent',
        category: 'Glamping Tent',
        price: 1950,
        originalPrice: 2500,
        maxGuests: 2,
        bedType: 'Double Mattress on Wood Platform',
        size: '220 sq.ft',
        image: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=800&q=80',
        amenities: ['Riverfront Deck', 'Campfire Included', 'Attached Private Bathroom', 'Warm Blankets & Geyser'],
        availableRooms: 6,
        isPopular: true
      },
      {
        id: 'h5-r2',
        name: 'Umrangso Stone Cottage',
        category: 'Stone Cottage',
        price: 2700,
        originalPrice: 3400,
        maxGuests: 3,
        bedType: 'King Bed + Extra Mattress',
        size: '310 sq.ft',
        image: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=800&q=80',
        amenities: ['Lake View', 'Solid Stone Wall Insulation', 'Breakfast Included', 'Hot Water Geyser'],
        availableRooms: 3,
        isPopular: false
      }
    ],
    reviews: [
      {
        id: 'rev-6',
        author: 'Arindam Goswami',
        rating: 4.8,
        date: '2 months ago',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
        comment: 'Great hospitality during Falcon festival. Kayaking in the morning on Kopili lake was breathtaking.'
      }
    ]
  }
];
