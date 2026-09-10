export const FESTIVALS_DATA = [
  {
    id: 'fest-1',
    name: 'Falcon Festival Umrangso 2026',
    slug: 'falcon-festival-umrangso',
    tagline: 'Celebrating the Amur Falcon & Hills Tourism',
    dates: 'Nov 14 - Nov 17, 2026',
    venue: 'Golf Field Grounds & Kopili Lakefront, Umrangso',
    location: 'Umrangso, Dima Hasao, Assam',
    heroImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=80'
    ],
    organizer: 'Dima Hasao Autonomous Council (DHAC) & Tourism Department',
    description: 'The mega annual tourism and bird conservation festival of Assam. Featuring top international rock & indie headliners, traditional Dimasa ethnic fashion, lakeside kayaking, dirt bike racing, and bird observation trails for the migratory Amur Falcon.',
    highlights: [
      '3 Nights of live concerts featuring renowned Northeast and international music bands',
      'Amur Falcon conservation camps & sunrise guided birdwatching trails',
      'Lakeside camping, hot air ballooning, and Kopili water sports',
      'Grand Ethnic Food Village with over 60 traditional tribal cuisines'
    ],
    ticketCategories: [
      {
        id: 'tc-gen',
        name: 'Daily General Access Pass',
        price: 250,
        originalPrice: 350,
        totalTickets: 3000,
        soldTickets: 2180,
        remainingTickets: 820,
        isSoldOut: false,
        perks: ['Single Day Entry to Festival Grounds', 'Main Stage Lawn Access', 'Food & Craft Bazaar Access']
      },
      {
        id: 'tc-season',
        name: '3-Day All-Access Season Pass',
        price: 650,
        originalPrice: 900,
        totalTickets: 1500,
        soldTickets: 1290,
        remainingTickets: 210,
        isSoldOut: false,
        perks: ['All 3 Days Festival Entry', 'Express Entry Gate', 'Souvenir Festival Wristband', 'Rock Night Priority Lawn']
      },
      {
        id: 'tc-vip',
        name: 'VIP Hospitality & Backstage Pass',
        price: 1800,
        originalPrice: 2500,
        totalTickets: 200,
        soldTickets: 200,
        remainingTickets: 0,
        isSoldOut: true,
        perks: ['VIP Elevated Lounge Seating', 'Free Traditional Feast Dinner Buffet', 'Dedicated Bar & Hospitality', 'Reserved Front Parking']
      }
    ]
  },
  {
    id: 'fest-2',
    name: 'Busu Dima National Harvest Festival',
    slug: 'busu-dima-harvest-festival',
    tagline: 'The Grand Cultural & Folk Carnival of the Dimasa Tribe',
    dates: 'Jan 26 - Jan 29, 2027',
    venue: 'Haflong Central Cultural Complex & Maibang Heritage Grounds',
    location: 'Haflong & Maibang, Dima Hasao',
    heroImage: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80'
    ],
    organizer: 'Dimasa Cultural Society & Govt. of Assam',
    description: 'The most revered traditional post-harvest festival celebrated with vibrant tribal attire, hypnotic traditional Muri & Khram drum beats, community bamboo dancing (Baidima), traditional stone-lifting championships, and grand community feasts.',
    highlights: [
      'Authentic Baidima community folk dance with over 500 performers in traditional Rigu-Rikhauda attire',
      'Traditional Dimasa Indigenous Sports & Archery tournament',
      'Judima traditional brewing masterclass & cultural storytelling',
      'Free community feast (Gao-ba) for all visiting tourists'
    ],
    ticketCategories: [
      {
        id: 'tc-cultural-gen',
        name: 'General Tourist Entry & Cultural Pass',
        price: 150,
        originalPrice: 200,
        totalTickets: 2500,
        soldTickets: 1600,
        remainingTickets: 900,
        isSoldOut: false,
        perks: ['Entry to All Dance Arenas', 'Free Community Feast Tasting Token', 'Handloom Souvenir Bag']
      },
      {
        id: 'tc-cultural-special',
        name: 'Heritage Pass with Photography Permit',
        price: 450,
        originalPrice: 600,
        totalTickets: 500,
        soldTickets: 380,
        remainingTickets: 120,
        isSoldOut: false,
        perks: ['Special Front Arena Seating', 'DSLR & Drone Photography Permit', 'Dimasa Muffler (Phagri) Gift']
      }
    ]
  },
  {
    id: 'fest-3',
    name: 'Judima Tribal Festival & Culinary Expo',
    slug: 'judima-tribal-festival-haflong',
    tagline: 'A Celebration of Northeast Heritage Gastronomy',
    dates: 'Dec 18 - Dec 20, 2026',
    venue: 'Haflong Lake Amphitheatre, Haflong',
    location: 'Haflong, Dima Hasao',
    heroImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80'
    ],
    organizer: 'Youth Association of Dima Hasao',
    description: 'Dedicated to the world-renowned GI-tagged Judima traditional rice wine and organic hill foods. Features cooking masterclasses by tribal elders, live folk fusion bands, and handloom exhibitions.',
    highlights: [
      'Judima Sommelier Tasting Bar with over 20 artisanal brewing variants',
      'Masterclasses on organic smoking techniques and bamboo cooking',
      'Acoustic musical evenings under hanging bridge illumination'
    ],
    ticketCategories: [
      {
        id: 'tc-judima-tasting',
        name: 'Tasting & Entry Pass',
        price: 200,
        originalPrice: 300,
        totalTickets: 1200,
        soldTickets: 740,
        remainingTickets: 460,
        isSoldOut: false,
        perks: ['Festival Entry', '3 Tasting Coupons', 'Commemorative Clay Cup']
      }
    ]
  }
];
