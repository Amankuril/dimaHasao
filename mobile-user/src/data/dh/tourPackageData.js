export const TOUR_PACKAGES_DATA = [
  {
    id: 'pkg-1',
    title: 'Haflong & Jatinga Bird Phenomenon Tour',
    slug: 'haflong-jatinga-bird-tour',
    subtitle: 'Misty Hilltops, Sunset Viewpoints & Sacred Temples',
    duration: '2 Days / 1 Night',
    type: 'Weekend Escapade',
    difficulty: 'Easy',
    groupSize: 'Min 2 People',
    rating: 4.9,
    reviewCount: 88,
    pricePerPerson: 4200,
    originalPrice: 5200,
    heroImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80'
    ],
    destinations: ['Haflong Lake', 'Jatinga Viewpoint', 'Shivrai Temple', 'Hanging Bridge'],
    highlights: [
      'Sunset at the iconic "I Love Dima Hasao" viewpoint in Jatinga',
      'Boat ride across Haflong Lake & walk on the British-era hanging bridge',
      'Authentic tribal dinner with traditional bamboo-smoked delicacies',
      'Dedicated private taxi and local certified Dimasa guide'
    ],
    includes: [
      { id: 'cab', label: 'Dedicated Private Cab (Haflong Station Pickup/Drop)', included: true },
      { id: 'stay', label: '1 Night Luxury Resort Stay with Hill View', included: true },
      { id: 'meals', label: 'Breakfast & Traditional Ethnic Dinner Included', included: true },
      { id: 'guide', label: 'Certified Dimasa Storyteller & Guide', included: true },
      { id: 'entry', label: 'All Viewpoint & Temple Entry Passes', included: true }
    ],
    exclusions: ['Personal shopping & alcoholic drinks', 'Train or flight tickets to Haflong'],
    itinerary: [
      {
        day: 1,
        title: 'Haflong Lake, Hanging Bridge & Sunset at Jatinga',
        activities: [
          'Arrival at Haflong Railway Station (Pickup by private cab)',
          'Check-in at scenic hill resort & relax with welcome drink',
          'Afternoon stroll at historic Haflong Lake and hanging footbridge',
          'Evening transfer to Jatinga Ridge for sunset photography & bird observatory lore',
          'Traditional Dimasa bonfire dinner with smoked chicken & sticky rice'
        ],
        mealPlan: 'Welcome Drink & Dinner'
      },
      {
        day: 2,
        title: 'Sunrise at Silaikul Foothills & Heritage Market',
        activities: [
          'Early morning sunrise watch over mist valleys',
          'Hearty organic hill breakfast',
          'Visit Shivrai Temple and local tribal handicraft weaving stalls',
          'Drop-off at Haflong Station with memories & local organic tea gift box'
        ],
        mealPlan: 'Buffet Breakfast'
      }
    ]
  },
  {
    id: 'pkg-2',
    title: 'Silaikul Summit Trek & Borail Rainforest Camp',
    slug: 'silaikul-summit-trek-borail',
    duration: '2 Days / 1 Night',
    type: 'Trekking & Adventure',
    difficulty: 'Moderate',
    groupSize: 'Min 2, Max 10',
    rating: 5.0,
    reviewCount: 62,
    pricePerPerson: 3600,
    originalPrice: 4500,
    heroImage: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80'
    ],
    destinations: ['Silaikul Summit', 'Borail Rainforest Trails', 'Secret Valley Waterfall'],
    highlights: [
      'Trek through virgin Borail evergreen jungles to Silaikul summit (1,800m)',
      'Campfire night under pristine starlit skies with forest barbecue',
      'Swim in secret hidden emerald rock pools & waterfalls',
      'Trek lead by expert Dimasa forest survivalists'
    ],
    includes: [
      { id: 'cab', label: 'Off-Road 4x4 Transportation to Trailhead', included: true },
      { id: 'stay', label: 'All-Weather Camping Tents, Sleeping Bags & Mats', included: true },
      { id: 'meals', label: 'Trail Snacks, Campfire BBQ Dinner & Camp Breakfast', included: true },
      { id: 'guide', label: '2 Wilderness First-Aid Certified Local Guides', included: true },
      { id: 'entry', label: 'Forest Department Permits & Eco-Cess', included: true }
    ],
    exclusions: ['Trekking poles and personal boots', 'Any emergency medical evacuation charges'],
    itinerary: [
      {
        day: 1,
        title: 'Trailhead Ascent, Waterfall Swim & Summit Camp',
        activities: [
          'Pickup at 8:00 AM in 4x4 vehicle to the Borail Sanctuary base',
          'Begin 4-hour scenic ascent through moss-draped evergreen canopies',
          'Packed lunch at the pristine cascading Rock Pool',
          'Pitch alpine tents on the ridge; witness sunset above cloud ocean',
          'Night barbecue, tribal drum folk stories around campfire'
        ],
        mealPlan: 'Trail Lunch & Campfire BBQ Dinner'
      },
      {
        day: 2,
        title: 'Sunrise Ridge Walk & Descent',
        activities: [
          'Golden hour 360-degree photography of Assam-Meghalaya borders',
          'Hot mountain porridge, tea & scrambled eggs at camp',
          'Descend through cardamom plantations and bamboo groves',
          'Return transfer to Haflong town by 2:00 PM'
        ],
        mealPlan: 'Camp Breakfast'
      }
    ]
  },
  {
    id: 'pkg-3',
    title: 'Umrangso Kopili Golf & Falcon Festival Tour',
    slug: 'umrangso-golf-falcon-festival-tour',
    duration: '3 Days / 2 Nights',
    type: 'Wildlife & Nature',
    difficulty: 'Easy',
    groupSize: 'Min 2 People',
    rating: 4.8,
    reviewCount: 94,
    pricePerPerson: 6800,
    originalPrice: 8500,
    heroImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1200&q=80'
    ],
    destinations: ['Umrangso Lake', 'Kopili River Dam', 'Amur Falcon Roosting Groves', 'Scenic Golf Course'],
    highlights: [
      'Witness thousands of migratory Amur Falcons in their natural habitat',
      'Lake kayaking and sunset boating on emerald Kopili reservoir',
      'Stroll across India’s most scenic hillside golf course',
      'Stay in riverside wooden cottages with morning bird songs'
    ],
    includes: [
      { id: 'cab', label: 'AC SUV for Haflong-Umrangso roundtrip', included: true },
      { id: 'stay', label: '2 Nights Riverside Lodge Accommodation', included: true },
      { id: 'meals', label: 'All Meals (2 Breakfasts, 2 Lunches, 2 Dinners)', included: true },
      { id: 'guide', label: 'Ornithologist & Nature Photography Guide', included: true },
      { id: 'entry', label: 'Kayaking Gear & Dam Permitted Passes', included: true }
    ],
    exclusions: ['Golf club rental fees', 'Personal laundry and tips'],
    itinerary: [
      {
        day: 1,
        title: 'Scenic Drive to Umrangso & Kopili Lake Cruise',
        activities: [
          'Depart Haflong via scenic mountain highway crossing Mahur river',
          'Arrive at Umrangso waterfront lodge & fresh organic lunch',
          'Evening kayak cruise on turquoise Kopili reservoir',
          'Riverside fish barbecue and tribal musical evening'
        ],
        mealPlan: 'Lunch & Dinner'
      },
      {
        day: 2,
        title: 'Falcon Roosting Sites & Golf Course Walks',
        activities: [
          'Dawn bird watching expedition at prime Amur Falcon groves',
          'Breakfast overlooking the pine hills',
          'Afternoon leisure strolls at the scenic natural golf course',
          'Local Dimasa cultural performance at festival grounds'
        ],
        mealPlan: 'Breakfast, Lunch & Dinner'
      },
      {
        day: 3,
        title: 'Waterfalls Exploration & Return to Haflong',
        activities: [
          'Visit Panimur cascade waterfalls en route',
          'Traditional roadside thali lunch',
          'Drop-off at Haflong Railway Station by evening'
        ],
        mealPlan: 'Breakfast & Lunch'
      }
    ]
  },
  {
    id: 'pkg-4',
    title: 'The Grand Dimasa Heritage & Kingdom Trail',
    slug: 'grand-dimasa-heritage-trail',
    duration: '4 Days / 3 Nights',
    type: 'Cultural Heritage',
    difficulty: 'Easy',
    groupSize: 'Min 2 People',
    rating: 4.9,
    reviewCount: 52,
    pricePerPerson: 9200,
    originalPrice: 11500,
    heroImage: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=80'
    ],
    destinations: ['Maibang Ancient Ruins', 'Stone House (Rajbari)', 'Asalu Fort', 'Haflong Town', 'Jatinga'],
    highlights: [
      'Explore the 16th-century stone monolithic palace of the Dimasa Kings in Maibang',
      'Visit the ancient British-Dimasa border fort at Asalu',
      'Learn traditional backstrap loom silk weaving from master weavers',
      'Authentic Judima rice wine brewing workshop with village elders'
    ],
    includes: [
      { id: 'cab', label: 'All Inter-District Private Transportation', included: true },
      { id: 'stay', label: '3 Nights (1 Night Heritage Homestay + 2 Nights Hill Resort)', included: true },
      { id: 'meals', label: 'All Meals with Royal Dimasa Feasts', included: true },
      { id: 'guide', label: 'Senior Historian & Cultural Guide', included: true },
      { id: 'entry', label: 'Archaeological Survey Entry & Workshop Passes', included: true }
    ],
    exclusions: ['Traditional handloom silk purchases', 'Personal room service'],
    itinerary: [
      {
        day: 1,
        title: 'Haflong Arrival & Cultural Orientation',
        activities: ['Pickup, orientation at Museum of Dimasa Heritage, check-in, lakeside dinner'],
        mealPlan: 'Dinner'
      },
      {
        day: 2,
        title: 'Maibang: The Ancient Monolithic Capital',
        activities: ['Full-day excursion to Maibang stone palace ruins on Mahur riverbank, traditional feast'],
        mealPlan: 'Breakfast, Lunch & Dinner'
      },
      {
        day: 3,
        title: 'Asalu Fort & Village Weaving Experience',
        activities: ['Trek to historic Asalu hill fort, hands-on loom weaving & Judima preparation session'],
        mealPlan: 'Breakfast, Lunch & Dinner'
      },
      {
        day: 4,
        title: 'Jatinga Sunrise & Farewell Drop',
        activities: ['Sunrise view at Jatinga, souvenir shopping at Haflong market, station drop'],
        mealPlan: 'Breakfast'
      }
    ]
  }
];
