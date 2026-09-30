// Hotel inventory banks used by engines/hotels.js: photographs, amenities,
// room types, name parts, streets and the real neighbourhoods (with
// coordinates) of every city in HOTEL_CITIES (data/cities.js).
// Property names are fictional; no real hotel chains are used.

export const PHOTO_FALLBACK = 'maldives-villas';
export const photoUrl = (id, w = 900) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

export const PHOTOS = {
  exterior: ['photo-1551016043-06ec2173531b', 'photo-1607320895054-c5c543e9a069', 'photo-1723465308831-29da05e011f3', 'photo-1661016630713-67e36bfc2285', 'photo-1668480441891-3744c25337a3', 'photo-1587870306141-4f19861e6c73', 'photo-1561501900-3701fa6a0864', 'photo-1571003123894-1f0594d2b5d9', 'photo-1520250497591-112f2f40a3f4', 'photo-1540541338287-41700207dee6', 'photo-1571896349842-33c89424de2d', 'photo-1623718649591-311775a30c43', 'photo-1549294413-26f195200c16', 'photo-1742171046853-0961eabdc7d4'],
  lobby: ['photo-1660557989695-14fac79c086d', 'photo-1637730827702-de34e9ae4ede', 'photo-1692153142524-60285a93c249'],
  room: ['photo-1618773928121-c32242e63f39', 'photo-1611892440504-42a792e24d32', 'photo-1629140727571-9b5c6f6267b4', 'photo-1631049307264-da0ec9d70304', 'photo-1582719478250-c89cae4dc85b', 'photo-1590490360182-c33d57733427', 'photo-1568495248636-6432b97bd949', 'photo-1631049552057-403cdb8f0658', 'photo-1549638441-b787d2e11f14', 'photo-1576354302919-96748cb8299e', 'photo-1725962479542-1be0a6b0d444', 'photo-1702014859878-5d4743176d28'],
  bath: ['photo-1542020186-c952a6c4045a', 'photo-1611971263575-ab653c31a5a9', 'photo-1664917555352-f3f66e57ccc2'],
  dining: ['photo-1551632436-cbf8dd35adfa', 'photo-1555244162-803834f70033', 'photo-1596701062351-8c2c14d1fdd0', 'photo-1695094411862-0e047fbddcb1']
};
export const PHOTO_LABEL = { exterior: 'Property', lobby: 'Lobby', room: 'Room', bath: 'Bathroom', dining: 'Dining' };

// id: [label, icon]
export const AMENITIES = {
  wifi: ['Free Wi-Fi', 'wifi'],
  ac: ['Air conditioning', 'snow'],
  heater: ['Room heating', 'flame'],
  breakfast: ['Breakfast available', 'coffee'],
  restaurant: ['Restaurant', 'meal'],
  cafe: ['Café', 'coffee'],
  roomservice: ['24-hour room service', 'clock'],
  pool: ['Swimming pool', 'pool'],
  gym: ['Fitness centre', 'gym'],
  spa: ['Spa & wellness', 'drop'],
  parking: ['Free parking', 'parking'],
  shuttle: ['Airport shuttle', 'car'],
  frontdesk: ['24-hour front desk', 'headset'],
  tv: ['Flat-screen TV', 'tv'],
  power: ['Power backup', 'zap'],
  laundry: ['Laundry service', 'sparkles'],
  lift: ['Elevator', 'building'],
  security: ['CCTV & security', 'shield'],
  luggage: ['Luggage storage', 'luggage'],
  bar: ['Bar & lounge', 'moon'],
  business: ['Business centre', 'printer'],
  meeting: ['Meeting rooms', 'users'],
  kids: ['Kids’ play area', 'baby'],
  garden: ['Garden', 'leaf'],
  terrace: ['Rooftop terrace', 'sun'],
  beach: ['Beach access', 'palm'],
  bonfire: ['Bonfire area', 'flame'],
  kitchen: ['Kitchenette', 'home'],
  yoga: ['Yoga deck', 'sunrise'],
  views: ['Scenic views', 'mountain'],
  tour: ['Tour desk', 'compass'],
  exchange: ['Currency exchange', 'wallet'],
  pets: ['Pet friendly', 'heart'],
  access: ['Accessible rooms', 'user-check'],
  ev: ['EV charging', 'plug']
};
// Order used when a card can only show a few amenities.
export const AMENITY_PRIORITY = ['pool', 'beach', 'spa', 'wifi', 'breakfast', 'restaurant', 'gym', 'parking', 'kitchen', 'shuttle', 'bonfire', 'views', 'ac', 'heater', 'bar', 'garden', 'terrace', 'yoga', 'kids', 'roomservice', 'frontdesk', 'tv', 'laundry', 'lift', 'power', 'security', 'luggage', 'cafe', 'business', 'meeting', 'tour', 'exchange', 'pets', 'access', 'ev'];

export const PROPERTY_TYPES = ['Hotel', 'Resort', 'Villa', 'Apartment', 'Aparthotel', 'Homestay', 'Bed & breakfast', 'GuestHouse', 'Inn', 'House', 'Hostel'];
export const TYPE_NOUN = { Hotel: 'hotel', Resort: 'resort', Villa: 'villa property', Apartment: 'serviced apartment', Aparthotel: 'aparthotel', Homestay: 'homestay', 'Bed & breakfast': 'bed & breakfast', GuestHouse: 'guest house', Inn: 'inn', House: 'holiday home', Hostel: 'hostel' };

// Relative share of property types by city kind.
export const TYPE_MIX = {
  metro: { Hotel: 58, Aparthotel: 5, Apartment: 7, GuestHouse: 7, Hostel: 5, 'Bed & breakfast': 5, Inn: 6, Homestay: 3, House: 2, Resort: 1, Villa: 1 },
  heritage: { Hotel: 52, GuestHouse: 9, Homestay: 8, Hostel: 6, Resort: 5, 'Bed & breakfast': 5, Inn: 5, House: 6, Apartment: 2, Aparthotel: 1, Villa: 1 },
  hill: { Hotel: 40, Resort: 12, Homestay: 15, GuestHouse: 9, Hostel: 6, Villa: 5, 'Bed & breakfast': 5, Inn: 3, House: 3, Apartment: 1, Aparthotel: 1 },
  beach: { Hotel: 34, Resort: 18, Villa: 10, GuestHouse: 8, Hostel: 7, Apartment: 6, Homestay: 6, 'Bed & breakfast': 5, Aparthotel: 3, Inn: 1, House: 2 },
  'intl-city': { Hotel: 60, Aparthotel: 10, Apartment: 9, Hostel: 7, 'Bed & breakfast': 5, Inn: 4, GuestHouse: 4, House: 1 },
  'intl-beach': { Hotel: 34, Resort: 24, Villa: 16, GuestHouse: 7, Hostel: 5, Apartment: 6, Homestay: 5, 'Bed & breakfast': 3 }
};
// Area tags nudge the mix: a airport · l upscale · u budget · b beach · h old town · w waterfront · m hills · x business · c central · n (keep out of names)
export const TAG_TYPE_BOOST = {
  u: { Hostel: 3, GuestHouse: 2, Homestay: 1.4, Resort: .3, Villa: .3, Aparthotel: .5 },
  l: { Hotel: 1.3, Resort: 1.5, Villa: 1.5, Hostel: .2, GuestHouse: .4, Inn: .6 },
  a: { Hotel: 1.7, Hostel: .3, Homestay: .2, Villa: .1, House: .3, Resort: .4 },
  x: { Hotel: 1.4, Aparthotel: 2, Apartment: 1.5, Hostel: .5, Homestay: .5, Resort: .3 },
  b: { Resort: 1.5, Villa: 1.4, Hostel: 1.2 },
  h: { Hostel: 1.4, House: 1.8, GuestHouse: 1.3, Homestay: 1.3 },
  m: { Homestay: 1.3, Resort: 1.3, Villa: 1.2 }
};
// Weights for 1–5 stars.
export const STAR_MIX = {
  Hotel: [6, 16, 38, 26, 14], Resort: [0, 0, 30, 40, 30], Hostel: [60, 40, 0, 0, 0], 'Bed & breakfast': [0, 45, 45, 10, 0],
  Homestay: [25, 45, 30, 0, 0], Inn: [0, 40, 50, 10, 0], Apartment: [0, 20, 50, 30, 0], Aparthotel: [0, 0, 45, 45, 10],
  GuestHouse: [35, 45, 20, 0, 0], House: [0, 30, 50, 20, 0], Villa: [0, 0, 25, 45, 30]
};
// Nightly room rate bands (INR, domestic) per star, before city / season adjustments.
export const STAR_BANDS = { 1: [900, 1600], 2: [1500, 2600], 3: [2500, 5200], 4: [5000, 9500], 5: [9000, 26000] };
export const TYPE_PRICE = { Hotel: 1, Resort: 1.12, Hostel: .85, 'Bed & breakfast': .95, Homestay: .9, Inn: .95, Apartment: 1.05, Aparthotel: 1.02, GuestHouse: .88, House: 1.1, Villa: 1.3 };
// Breakfast cost per person per night by star (INR); dinner and lunch derive from it.
export const MEAL_PP = { 1: 180, 2: 260, 3: 420, 4: 700, 5: 1100 };

// Room sets: [name, beds, sqftMin, sqftMax, maxAdults, maxGuests, price multiple]
// The last entry of every set sleeps a full family so every search has an option.
export const ROOM_SETS = {
  budget: [['Standard Room', '1 Double bed', 140, 180, 2, 3, 1], ['Deluxe Room', '1 Queen bed', 170, 220, 2, 3, 1.15], ['Deluxe Twin Room', '2 Single beds', 170, 220, 2, 3, 1.15], ['Triple Room', '1 Double + 1 Single bed', 220, 260, 3, 4, 1.35], ['Family Room', '2 Double beds', 260, 320, 4, 7, 1.62]],
  mid: [['Superior Room', '1 Queen bed', 200, 240, 2, 3, 1], ['Deluxe Room', '1 King bed', 240, 280, 2, 3, 1.14], ['Premier Room', '1 King bed', 280, 330, 3, 4, 1.3], ['Junior Suite', '1 King bed + Sofa bed', 380, 450, 3, 5, 1.65], ['Family Suite', '1 King + 2 Single beds', 450, 520, 4, 7, 1.95]],
  upper: [['Deluxe Room', '1 King bed', 280, 320, 2, 3, 1], ['Premier Room', '1 King bed', 320, 380, 2, 3, 1.15], ['Club Room', '1 King bed', 340, 400, 3, 4, 1.32], ['Executive Suite', '1 King bed + Sofa bed', 520, 650, 3, 5, 1.9], ['Family Suite', '2 Queen beds', 600, 720, 4, 7, 2.1]],
  lux: [['Deluxe Room', '1 King bed', 340, 400, 2, 3, 1], ['Premier Room', '1 King bed', 400, 460, 2, 3, 1.18], ['Luxury Club Room', '1 King bed', 440, 500, 3, 4, 1.4], ['Executive Suite', '1 King bed + Sofa bed', 700, 900, 3, 5, 2.2], ['Grand Suite', '1 King + 2 Single beds', 1100, 1500, 4, 7, 3.4]],
  hostel: [['Bed in 6-Bed Mixed Dormitory', '1 Bunk bed', 60, 80, 1, 1, .45], ['Bed in 4-Bed Female Dormitory', '1 Bunk bed', 55, 70, 1, 1, .5], ['Private Double Room', '1 Double bed', 140, 170, 2, 3, 1], ['Private Family Room', '1 Double + 1 Bunk bed', 220, 260, 4, 7, 1.5]],
  homestay: [['Cosy Double Room', '1 Double bed', 150, 190, 2, 3, 1], ['Garden-View Room', '1 Queen bed', 180, 230, 2, 3, 1.15], ['Attic Room', '1 Queen + 1 Single bed', 200, 250, 3, 4, 1.3], ['Family Room', '2 Double beds', 260, 320, 4, 7, 1.55]],
  bnb: [['Classic Double Room', '1 Queen bed', 170, 210, 2, 3, 1], ['Superior Room', '1 King bed', 210, 260, 2, 3, 1.18], ['Family Room', '1 Queen + 2 Single beds', 280, 340, 4, 7, 1.5]],
  apartment: [['Studio Apartment', '1 Queen bed', 320, 400, 2, 3, 1], ['One-Bedroom Apartment', '1 King bed + Sofa bed', 550, 700, 3, 5, 1.45], ['Two-Bedroom Apartment', '1 King + 2 Single beds', 900, 1200, 4, 7, 2.05]],
  aparthotel: [['Studio Suite', '1 Queen bed', 300, 360, 2, 3, 1], ['One-Bedroom Suite', '1 King bed + Sofa bed', 480, 600, 3, 5, 1.4], ['Two-Bedroom Suite', '1 King + 2 Single beds', 800, 1000, 4, 7, 1.95]],
  villa: [['Garden Villa', '1 King bed', 650, 850, 2, 3, 1], ['Pool Villa', '1 King bed', 900, 1200, 3, 4, 1.35], ['Two-Bedroom Pool Villa', '1 King + 2 Single beds', 1500, 2100, 4, 7, 2.1]],
  resort: [['Deluxe Room', '1 King bed', 320, 380, 2, 3, 1], ['Garden Cottage', '1 King bed', 380, 450, 3, 4, 1.18], ['Premium Pool-View Room', '1 King bed', 380, 440, 2, 3, 1.26], ['Private Pool Villa', '1 King bed + Sofa bed', 850, 1100, 3, 5, 2.2], ['Family Suite', '1 King + 2 Single beds', 650, 800, 4, 7, 1.9]],
  heritage: [['Heritage Room', '1 Queen bed', 220, 280, 2, 3, 1], ['Haveli Deluxe Room', '1 King bed', 280, 340, 2, 3, 1.2], ['Jharokha Suite', '1 King bed + Sofa bed', 420, 520, 3, 5, 1.65], ['Royal Family Suite', '1 King + 2 Single beds', 600, 750, 4, 7, 2.1]],
  house: [['Private Room in Home', '1 Queen bed', 180, 230, 2, 3, 1], ['Entire Home – 2 Bedrooms', '1 King + 1 Queen bed', 900, 1200, 4, 7, 1.9]]
};

export const MEALS = { RO: 'Room Only', BB: 'Breakfast', HB: 'Half Board', FB: 'Full Board' };
export const MEAL_DESC = { RO: 'Room only — no meals included', BB: 'Breakfast included for every guest in the room', HB: 'Breakfast and dinner included', FB: 'Breakfast, lunch and dinner included' };

// Name parts. {W} word · {A} area · {F} family name.
export const NAME_TEMPLATES = {
  Hotel: ['Hotel {W}', '{W} Residency', 'The {W} Hotel', '{W} Grand', '{W} Suites', '{W} Regency', 'Hotel {W} {A}', '{A} {W} Hotel', '{W} Plaza', '{W} Crown', '{W} Continental', 'The {W}'],
  Resort: ['{W} Resort & Spa', '{W} Retreat', 'The {W} Resort', '{W} Resort'],
  Hostel: ['{W} Backpackers', 'The {W} Hostel', '{W} Bunkhouse', '{W} Social Hostel', 'Nomad Nest {A}'],
  Homestay: ['{W} Homestay', '{F} Homestay', '{W} Cottage Homestay', 'The {F} Nest'],
  'Bed & breakfast': ['{W} Bed & Breakfast', '{W} B&B', 'The {W} B&B'],
  Inn: ['{W} Inn', 'The {W} Inn', '{A} Inn'],
  Apartment: ['{W} Serviced Apartments', '{W} Residences', '{W} Apartments'],
  Aparthotel: ['{W} Aparthotel', '{W} Suites & Apartments', '{W} Living'],
  GuestHouse: ['{W} Guest House', '{A} Guest House', '{W} Lodge'],
  House: ['{W} House', 'The {W} House'],
  Villa: ['Villa {W}', '{W} Villas', 'The {W} Villa']
};
export const KIND_TEMPLATES = {
  beach: { Resort: ['{W} Beach Resort', '{W} Beach Resort & Spa'], Hotel: ['{W} Beach Hotel'], Villa: ['{W} Pool Villas'] },
  'intl-beach': { Resort: ['{W} Beach Resort', '{W} Beach Resort & Spa'], Villa: ['{W} Pool Villas'] },
  hill: { Resort: ['{W} Hill Resort', '{W} Valley Resort'], House: ['{W} Bungalow', '{W} Cottage'], Hotel: ['{W} Mountain Lodge'] },
  heritage: { House: ['{W} Haveli'], Hotel: ['{W} Palace', '{W} Heritage Hotel'] }
};
export const LANG_TEMPLATES = {
  fr: { Hotel: ['Hôtel {W}', 'Maison {W}', 'Hôtel {W} {A}'], 'Bed & breakfast': ['Maison {W}'], Inn: ['Auberge {W}'] },
  ch: { Hotel: ['Hotel {W}', '{W} Boutique Hotel'], Inn: ['Gasthaus {W}'] },
  th: { Hotel: ['{W} Boutique Hotel', '{W} Hotel'], GuestHouse: ['Baan {W}'] },
  id: { Villa: ['Villa {W}', '{W} Villas'], Homestay: ['{W} Homestay', 'Rumah {W}'] },
  tr: { Hotel: ['{W} Hotel', '{W} Suites', 'Hotel {W}'] }
};

export const WORDS = {
  in: ['Saffron', 'Peepal', 'Silver Oak', 'Peacock', 'Marigold', 'Sandalwood', 'Tamarind', 'Emerald', 'Sapphire', 'Ivory', 'Amber', 'Crescent', 'Horizon', 'Skyline', 'Riverstone', 'Moonstone', 'Kesar', 'Chandni', 'Rangoli', 'Zenith', 'Aurum', 'Solace', 'Kasturi', 'Tulsi', 'Aangan', 'Kadamba', 'Parijat', 'Gulmohar', 'Ashoka', 'Sitara', 'Nakshatra', 'Vasant', 'Hornbill', 'Firefly', 'Indus', 'Kaveri', 'Mogra', 'Urban Nest', 'Blue Lotus', 'Mulberry'],
  hill: ['Pine Crest', 'Snow Peak', 'Deodar', 'Cedar Ridge', 'Mist Valley', 'Apple Orchard', 'Rhododendron', 'Silver Fir', 'Cloud Nine', 'Mountain Breeze', 'Alpine Rose', 'Glacier View', 'Pine Cone', 'Valley Bloom', 'Hilltop', 'Wildflower', 'Juniper', 'Moss Hollow', 'Stargazer', 'Oak Leaf', 'Snowberry', 'Morning Mist'],
  beach: ['Sea Breeze', 'Palm Grove', 'Coral Bay', 'Sandcastle', 'Blue Lagoon', 'Shoreline', 'Tidewater', 'Driftwood', 'Seashell', 'Sunset Bay', 'Casa Azul', 'Coconut Palms', 'Salt & Sand', 'Wavecrest', 'Konkan Tide', 'Laguna', 'Casa Sol', 'Bougainvillea', 'Estrela', 'Mar Azul'],
  raj: ['Rajmahal', 'Chandra Mahal', 'Jharokha', 'Rajputana', 'Sheesh Mahal', 'Kesar Bagh', 'Moti Bagh', 'Suraj Pol', 'Lal Kothi', 'Hawa Bagh', 'Rang Niwas', 'Surya Garh', 'Padmini', 'Aravali', 'Mehfil', 'Diwan-e-Khas', 'Jal Mahal View', 'Kunj', 'Dhola Maru', 'Neel Kamal'],
  ker: ['Backwater', 'Kettuvallam', 'Spice Route', 'Malabar Coast', 'Lagoon Crest', 'Pepper Vine', 'Monsoon', 'Coconut Grove', 'Tea Valley', 'Cardamom Hills', 'Kerala Nest', 'Emerald Isle', 'Vembanad', 'Periyar', 'Nila', 'Kumarakom Tide'],
  holy: ['Ganga View', 'Shanti', 'Sai Krupa', 'Balaji', 'Govinda', 'Bodhi', 'Om Niwas', 'Aarti', 'Kashi', 'Satsang', 'Anand', 'Sangam', 'Tirth', 'Sadhana', 'Prasad', 'Guru Kripa'],
  kas: ['Chinar', 'Shikara', 'Zabarwan', 'Lala Rookh', 'Kesar Valley', 'Walnut Grove', 'Pashmina', 'Himalayan Dawn', 'Snow Lotus', 'Nishat Bloom', 'Houseboat Heritage', 'Tulip Valley', 'Mountain Echo', 'Prayer Flag'],
  ae: ['Pearl Creek', 'Dune Crest', 'Falcon', 'Oasis', 'Sahara', 'Zahra', 'Noor', 'Jewel of the Creek', 'Sidra', 'Majlis', 'Sadaf', 'Al Waha', 'Rimal', 'Layali', 'Samar', 'Desert Rose'],
  sg: ['Merlion', 'Straits', 'Peranakan', 'Kampong', 'Jade', 'Harbourfront', 'Tanjong', 'Shophouse', 'Lion City', 'Raintree', 'Kopi', 'Garden Isle'],
  th: ['Siam Garden', 'Lanna', 'Chada', 'Sabai', 'Mali', 'Kanok', 'Ruen Thai', 'Sukjai', 'Chaba', 'Nara', 'Lotus Pond', 'Tamarind Tree'],
  id: ['Taman', 'Udara', 'Segara', 'Puri', 'Bale', 'Tirta', 'Surya', 'Kayu', 'Lembah', 'Frangipani', 'Rice Terrace', 'Kembang'],
  my: ['Bukit', 'Melati', 'Cempaka', 'Tropika', 'Seri', 'Mutiara', 'Hibiscus', 'Rainforest', 'Twin Lights', 'Kasturi Walk'],
  np: ['Himalaya View', 'Sherpa', 'Rhododendron', 'Kailash', 'Prayer Flag', 'Mandala', 'Dhaulagiri', 'Kasthamandap', 'Bodhi Tree', 'Thamel Courtyard'],
  lk: ['Lanka', 'Ceylon Sapphire', 'Serendib Bay', 'Lotus Pond', 'Ruhuna', 'Kandyan', 'Nelum', 'Sigiri', 'Tea Leaf', 'Ocean Breeze'],
  mv: ['Coral', 'Lagoon', 'Atoll', 'Maakana', 'Reef', 'Veli', 'Hiyala', 'Kandu', 'Blue Horizon', 'Sandbank'],
  gb: ['Albion', 'Hawthorn', 'Bramble', 'Ashdown', 'Wren', 'Lantern', 'Primrose', 'Mulberry', 'Harcourt', 'Whitcombe', 'Kingsgate', 'Ashgrove'],
  fr: ['Lumière', 'des Ateliers', 'Rivoli', 'Clair de Lune', 'Petit Jardin', 'Mistral', 'Belle Époque', 'Colombe', 'Seine Rive', 'Lilas', 'Étoile Blanche'],
  ch: ['Alpenblick', 'Seeblick', 'Edelweiss', 'Limmat', 'Uetliberg', 'Lindenhof', 'Bergsicht', 'Rosengarten', 'Glacier', 'Altstadt'],
  tr: ['Bosphorus Breeze', 'Galata Lights', 'Sultan', 'Lale', 'Nar', 'Mavi', 'Pera', 'Yıldız', 'Kervan', 'Golden Horn'],
  vn: ['Hoa Sen', 'Sen Viet', 'Bamboo', 'Jade Lake', 'Red River', 'Golden Lotus', 'Lantern', 'Old Town', 'Ha Noi Lantern', 'Lotus Garden'],
  us: ['Hudson Row', 'Liberty', 'Bowery Lane', 'Brownstone', 'Greenwich Lane', 'Madison Row', 'Union', 'Empire Row', 'Chelsea Pier', 'Parkside', 'Knickerbocker Lane'],
  au: ['Harbourside', 'Wattle', 'Jacaranda', 'Southern Cross', 'Banksia', 'Waratah', 'Kookaburra', 'Eucalypt', 'Coogee Sands', 'Sandstone'],
  // Shared by every international city so names stay varied.
  global: ['Cityscape', 'Harbourlight', 'Silverleaf', 'Northstar', 'Bluebird', 'Sandpiper', 'Evergreen', 'Crestview', 'Maplewood', 'Linden', 'Aster', 'Magnolia', 'Cobalt', 'Copperleaf', 'Ivy Lane', 'Lumen', 'Atlas', 'Beacon', 'Keystone', 'Parkview', 'Skylark', 'Juniper', 'Wayfarer', 'Meadowlark', 'Solstice', 'Nova']
};

export const FAMILY = {
  def: ['Sharma', 'Kapoor', 'Iyer', 'Joshi', 'Rao', 'Das', 'Mehra', 'Pillai'],
  goa: ['D’Souza', 'Fernandes', 'Pinto', 'Gomes', 'Rodrigues', 'Almeida'],
  hill: ['Negi', 'Thakur', 'Rana', 'Rawat', 'Bisht', 'Chauhan'],
  ne: ['Bhutia', 'Lepcha', 'Tamang', 'Gurung', 'Rai'],
  ladakh: ['Namgyal', 'Wangchuk', 'Dolma', 'Stanzin'],
  ker: ['Menon', 'Nair', 'Kurian', 'Thomas', 'Varghese'],
  kas: ['Wani', 'Bhat', 'Mir', 'Dar'],
  raj: ['Rathore', 'Shekhawat', 'Singh', 'Mehta']
};

export const INDIA_STREETS = ['Main Road', 'Link Road', 'Station Road', 'Market Road', 'Temple Road', 'Club Road', 'Church Road', 'Park Road', 'Service Road', 'Cross Road', 'Hospital Road', 'College Road'];
export const TAG_STREETS = { b: ['Beach Road', 'Beach Road'], m: ['Mall Road', 'Cart Road', 'Hill Road'], w: ['Lake Road', 'Riverside Road', 'Ghat Road'], a: ['Airport Road', 'NH Service Road'] };

export const ROOM_FEATURES = {
  base: ['Free Wi-Fi', 'Flat-screen TV', 'Wardrobe', 'Toiletries'],
  mid: ['Tea & coffee maker', 'Work desk', 'In-room safe', 'Hairdryer'],
  upper: ['Minibar', 'Rain shower', 'Bathrobes', 'Iron & ironing board', 'Blackout curtains'],
  lux: ['Bathtub', 'Espresso machine', 'Pillow menu', 'Evening turndown'],
  suite: ['Separate living area'],
  club: ['Club lounge access'],
  kitchen: ['Kitchenette', 'Microwave', 'Dining area'],
  pool: ['Private plunge pool', 'Sun deck', 'Outdoor shower'],
  dorm: ['Personal locker', 'Reading light', 'Charging point', 'Shared bathroom']
};
export const RATE_PERKS = ['Welcome drink on arrival', 'Early check-in subject to availability', '10% off on food & beverages', 'Late check-out until 1 PM on request', 'Complimentary evening snacks'];

// ---------------------------------------------------------------- Cities
// [code, kind, price multiple, name words, family names, PIN prefix, view word,
//  airport [name, lat, lon], sights [[name, lat, lon]], areas [[name, lat, lon, tags, pin]], streets?]
const IN1 = {
  Delhi: ['del', 'metro', 1, 'in', 'def', '1100', 'City View', ['IGI Airport T3', 28.5562, 77.087], [['India Gate', 28.6129, 77.2295], ['New Delhi Railway Station', 28.643, 77.2194]], [
    ['Aerocity', 28.5494, 77.12, 'alx', '110037'], ['Mahipalpur', 28.545, 77.13, 'au', '110037'], ['Karol Bagh', 28.6519, 77.1909, 'uc', '110005'], ['Paharganj', 28.6448, 77.2167, 'uh', '110055'],
    ['Connaught Place', 28.6315, 77.2167, 'lcx', '110001'], ['Chanakyapuri', 28.596, 77.186, 'l', '110021'], ['Saket', 28.5245, 77.2066, 'c', '110017'], ['Lajpat Nagar', 28.5677, 77.2433, 'c', '110024'],
    ['Greater Kailash', 28.5482, 77.238, 'l', '110048'], ['Nehru Place', 28.5491, 77.2513, 'x', '110019'], ['Dwarka', 28.5921, 77.046, 'a', '110075'], ['Janakpuri', 28.6219, 77.0878, '', '110058'], ['Chandni Chowk', 28.6506, 77.2303, 'uh', '110006']]],
  Mumbai: ['mum', 'metro', 1.18, 'in', 'def', '4000', 'Sea View', ['Mumbai Airport T2', 19.0896, 72.8656], [['Gateway of India', 18.922, 72.8347], ['CSMT Station', 18.9398, 72.8355]], [
    ['Andheri East', 19.1136, 72.8697, 'ax', '400069'], ['Juhu', 19.1075, 72.8263, 'lbw', '400049'], ['Bandra West', 19.0596, 72.8295, 'lc', '400050'], ['Colaba', 18.9067, 72.8147, 'hw', '400005'],
    ['Fort', 18.934, 72.835, 'hx', '400001'], ['Powai', 19.1176, 72.906, 'xw', '400076'], ['Lower Parel', 18.995, 72.83, 'x', '400013'], ['Santacruz', 19.0843, 72.8411, 'a', '400055'],
    ['Bandra Kurla Complex', 19.066, 72.868, 'lxn', '400051'], ['Marine Drive', 18.944, 72.823, 'lw', '400020'], ['Worli', 19.0176, 72.817, 'lw', '400018'], ['Vile Parle', 19.099, 72.844, 'a', '400057']]],
  Bengaluru: ['blr', 'metro', 1.05, 'in', 'def', '5600', 'City View', ['Kempegowda International Airport', 13.1986, 77.7066], [['Cubbon Park', 12.9763, 77.5929], ['KSR Bengaluru City Station', 12.9784, 77.5695]], [
    ['MG Road', 12.9756, 77.6066, 'lc', '560001'], ['Indiranagar', 12.9784, 77.6408, 'c', '560038'], ['Koramangala', 12.9352, 77.6245, 'c', '560034'], ['Whitefield', 12.9698, 77.75, 'x', '560066'],
    ['Electronic City', 12.8452, 77.6602, 'x', '560100'], ['Hebbal', 13.0358, 77.597, 'w', '560024'], ['Yeshwanthpur', 13.028, 77.54, '', '560022'], ['Richmond Town', 12.96, 77.6, 'l', '560025'],
    ['Malleshwaram', 13.0035, 77.571, 'h', '560003'], ['Jayanagar', 12.925, 77.5938, '', '560041'], ['Devanahalli', 13.248, 77.712, 'a', '562110']]],
  Goa: ['goa', 'beach', 1.12, 'beach', 'goa', '403', 'Sea View', ['Dabolim Airport', 15.3808, 73.8314], [['Calangute Beach', 15.544, 73.755], ['Basilica of Bom Jesus', 15.5009, 73.9116]], [
    ['Calangute', 15.5439, 73.7553, 'bc', '403516'], ['Baga', 15.5553, 73.7517, 'bu', '403516'], ['Candolim', 15.518, 73.762, 'bl', '403515'], ['Panaji', 15.4989, 73.8278, 'hcw', '403001'],
    ['Anjuna', 15.5733, 73.74, 'bu', '403509'], ['Vagator', 15.599, 73.744, 'bu', '403509'], ['Arpora', 15.562, 73.765, '', '403518'], ['Colva', 15.2793, 73.9225, 'b', '403708'],
    ['Benaulim', 15.25, 73.928, 'bl', '403716'], ['Majorda', 15.308, 73.911, 'bl', '403713'], ['Dona Paula', 15.456, 73.804, 'lw', '403004'], ['Morjim', 15.629, 73.733, 'b', '403512'],
    ['Palolem', 15.01, 74.023, 'bu', '403702'], ['Mapusa', 15.5937, 73.8142, 'c', '403507']]],
  Jaipur: ['jai', 'heritage', .98, 'raj', 'raj', '3020', 'Fort View', ['Jaipur International Airport', 26.8242, 75.8122], [['Hawa Mahal', 26.9239, 75.8267], ['Jaipur Junction', 26.9196, 75.7878]], [
    ['MI Road', 26.917, 75.805, 'c', '302001'], ['C-Scheme', 26.906, 75.801, 'lc', '302001'], ['Bani Park', 26.929, 75.795, 'h', '302016'], ['Malviya Nagar', 26.853, 75.812, '', '302017'],
    ['Amer Road', 26.955, 75.837, 'hl', '302002'], ['Vaishali Nagar', 26.911, 75.743, '', '302021'], ['Tonk Road', 26.86, 75.8, 'a', '302018'], ['Sindhi Camp', 26.923, 75.8, 'u', '302001'],
    ['Civil Lines', 26.91, 75.788, 'l', '302006'], ['Raja Park', 26.902, 75.829, 'u', '302004'], ['Old City', 26.9239, 75.8267, 'hu', '302002']]],
  Hyderabad: ['hyd', 'metro', 1, 'in', 'def', '5000', 'Lake View', ['Rajiv Gandhi International Airport', 17.2403, 78.4294], [['Charminar', 17.3616, 78.4747], ['Hussain Sagar', 17.4239, 78.4738]], [
    ['Banjara Hills', 17.4156, 78.4347, 'l', '500034'], ['Jubilee Hills', 17.43, 78.407, 'l', '500033'], ['HITEC City', 17.4474, 78.3762, 'x', '500081'], ['Gachibowli', 17.4401, 78.3489, 'x', '500032'],
    ['Madhapur', 17.4483, 78.3915, 'x', '500081'], ['Kondapur', 17.469, 78.357, '', '500084'], ['Begumpet', 17.444, 78.463, 'c', '500016'], ['Secunderabad', 17.4399, 78.4983, 'c', '500003'],
    ['Abids', 17.392, 78.475, 'uh', '500001'], ['Shamshabad', 17.2403, 78.4294, 'a', '501218']]],
  Chennai: ['che', 'metro', .98, 'in', 'def', '6000', 'Sea View', ['Chennai International Airport', 12.9941, 80.1709], [['Marina Beach', 13.05, 80.2824], ['Chennai Central', 13.0827, 80.2757]], [
    ['T. Nagar', 13.0418, 80.2341, 'c', '600017'], ['Egmore', 13.0732, 80.2609, 'hu', '600008'], ['Nungambakkam', 13.0569, 80.2425, 'l', '600034'], ['Guindy', 13.0067, 80.2206, 'x', '600032'],
    ['Mylapore', 13.0368, 80.2676, 'h', '600004'], ['Anna Nagar', 13.085, 80.2101, '', '600040'], ['OMR', 12.901, 80.2279, 'xn', '600097'], ['Adyar', 13.0012, 80.2565, 'w', '600020'],
    ['Besant Nagar', 13.0003, 80.2667, 'bw', '600090'], ['Meenambakkam', 12.9941, 80.1709, 'a', '600027']]],
  Kolkata: ['ccu', 'metro', .95, 'in', 'def', '7000', 'River View', ['Kolkata Airport', 22.6547, 88.4467], [['Victoria Memorial', 22.5448, 88.3426], ['Howrah Station', 22.5839, 88.3425]], [
    ['Park Street', 22.5535, 88.3522, 'lc', '700016'], ['Sudder Street', 22.558, 88.352, 'u', '700016'], ['Esplanade', 22.5646, 88.351, 'c', '700069'], ['Salt Lake', 22.5867, 88.4171, 'x', '700091'],
    ['New Town', 22.576, 88.479, 'x', '700156'], ['Ballygunge', 22.527, 88.365, 'l', '700019'], ['Alipore', 22.527, 88.33, 'l', '700027'], ['Howrah', 22.5958, 88.2636, 'uw', '711101'],
    ['Dum Dum', 22.642, 88.431, 'a', '700028'], ['EM Bypass', 22.515, 88.4, 'xn', '700107']]],
  Pune: ['pnq', 'metro', .95, 'in', 'def', '4110', 'Hill View', ['Pune Airport', 18.5822, 73.9197], [['Shaniwar Wada', 18.5195, 73.8553], ['Pune Junction', 18.5286, 73.8743]], [
    ['Koregaon Park', 18.5362, 73.894, 'l', '411001'], ['Viman Nagar', 18.5679, 73.9143, 'a', '411014'], ['Kalyani Nagar', 18.5463, 73.9033, 'l', '411006'], ['Hinjewadi', 18.5913, 73.7389, 'x', '411057'],
    ['Kharadi', 18.551, 73.94, 'x', '411014'], ['Baner', 18.559, 73.7868, '', '411045'], ['Wakad', 18.599, 73.76, '', '411057'], ['Shivajinagar', 18.5308, 73.8475, 'c', '411005'],
    ['Camp', 18.513, 73.878, 'hcn', '411001'], ['Deccan Gymkhana', 18.516, 73.841, 'c', '411004']]],
  Ahmedabad: ['amd', 'metro', .92, 'in', 'def', '3800', 'River View', ['Ahmedabad Airport', 23.0734, 72.6266], [['Sabarmati Ashram', 23.0608, 72.5809], ['Kalupur Railway Station', 23.0268, 72.601]], [
    ['Ashram Road', 23.0395, 72.57, 'cw', '380009'], ['SG Highway', 23.03, 72.507, 'lx', '380054'], ['Navrangpura', 23.0365, 72.5611, 'c', '380009'], ['CG Road', 23.03, 72.558, 'c', '380006'],
    ['Prahlad Nagar', 23.012, 72.51, 'x', '380015'], ['Satellite', 23.03, 72.525, '', '380015'], ['Vastrapur', 23.037, 72.529, 'w', '380015'], ['Paldi', 23.012, 72.562, '', '380007'],
    ['Hansol', 23.073, 72.626, 'a', '382475'], ['Relief Road', 23.0258, 72.5873, 'hu', '380001']]],
  Kochi: ['cok', 'heritage', .95, 'ker', 'ker', '6820', 'Harbour View', ['Cochin International Airport', 10.152, 76.4019], [['Chinese Fishing Nets', 9.968, 76.242], ['Ernakulam Junction', 9.969, 76.291]], [
    ['Fort Kochi', 9.9658, 76.2421, 'hw', '682001'], ['Mattancherry', 9.958, 76.259, 'hu', '682002'], ['Marine Drive', 9.979, 76.275, 'lw', '682031'], ['MG Road', 9.97, 76.285, 'c', '682016'],
    ['Edappally', 10.0261, 76.308, 'c', '682024'], ['Kakkanad', 10.0159, 76.3419, 'x', '682030'], ['Willingdon Island', 9.95, 76.27, 'w', '682003'], ['Kaloor', 9.994, 76.299, '', '682017'],
    ['Vyttila', 9.968, 76.318, '', '682019'], ['Nedumbassery', 10.152, 76.392, 'a', '683585']]],
  Udaipur: ['udr', 'heritage', 1.08, 'raj', 'raj', '3130', 'Lake View', ['Maharana Pratap Airport', 24.6177, 73.8961], [['City Palace', 24.5764, 73.6835], ['Udaipur City Station', 24.57, 73.702]], [
    ['Lake Pichola', 24.572, 73.679, 'lhw', '313001'], ['Lal Ghat', 24.579, 73.682, 'hwu', '313001'], ['Gangaur Ghat', 24.58, 73.683, 'hw', '313001'], ['City Palace Road', 24.5764, 73.6835, 'h', '313001'],
    ['Fateh Sagar', 24.6, 73.677, 'lw', '313001'], ['Ambamata', 24.593, 73.677, '', '313004'], ['Hiran Magri', 24.56, 73.713, 'u', '313002'], ['Chetak Circle', 24.589, 73.695, 'c', '313001'],
    ['Sukher', 24.635, 73.701, 'l', '313004']]],
  Agra: ['agr', 'heritage', .9, 'raj', 'def', '2820', 'Taj View', ['Agra Airport', 27.1558, 77.9609], [['Taj Mahal', 27.1751, 78.0421], ['Agra Fort', 27.1795, 78.0211]], [
    ['Taj Ganj', 27.17, 78.042, 'hu', '282001'], ['Taj East Gate Road', 27.168, 78.05, 'lwn', '282001'], ['Fatehabad Road', 27.162, 78.046, 'l', '282001'], ['Sadar Bazaar', 27.16, 78.01, 'c', '282001'],
    ['Agra Cantt', 27.158, 77.992, '', '282001'], ['Civil Lines', 27.195, 78.01, '', '282002'], ['Sikandra', 27.22, 77.95, '', '282007'], ['Kamla Nagar', 27.21, 78.02, '', '282005']]],
  Varanasi: ['vns', 'heritage', .88, 'holy', 'def', '2210', 'Ganga View', ['Varanasi Airport', 25.4524, 82.8593], [['Kashi Vishwanath Temple', 25.3109, 83.0107], ['Dashashwamedh Ghat', 25.3066, 83.0104]], [
    ['Assi Ghat', 25.286, 83.006, 'hw', '221005'], ['Dashashwamedh', 25.3066, 83.0104, 'hwu', '221001'], ['Godowlia', 25.309, 83.006, 'hu', '221001'], ['Bhelupur', 25.296, 82.999, '', '221010'],
    ['Sigra', 25.318, 82.986, 'c', '221010'], ['Cantonment', 25.335, 82.98, 'l', '221002'], ['Lanka', 25.28, 82.999, 'u', '221005'], ['Sarnath', 25.381, 83.024, 'h', '221007']]],
  Manali: ['kuu', 'hill', 1, 'hill', 'hill', '1751', 'Mountain View', ['Bhuntar Airport', 31.8767, 77.1544], [['Hadimba Temple', 32.2486, 77.1805], ['Mall Road', 32.2432, 77.1892]], [
    ['Old Manali', 32.256, 77.178, 'mu', '175131'], ['Mall Road', 32.243, 77.189, 'c', '175131'], ['Vashisht', 32.264, 77.188, 'mu', '175103'], ['Aleo', 32.233, 77.19, 'm', '175131'],
    ['Log Huts Area', 32.248, 77.18, 'mln', '175131'], ['Hadimba Road', 32.247, 77.181, 'm', '175131'], ['Solang Valley', 32.317, 77.158, 'ml', '175131'], ['Prini', 32.21, 77.193, 'ml', '175131']]],
  Shimla: ['sml', 'hill', 1.02, 'hill', 'hill', '1710', 'Valley View', ['Shimla Airport', 31.0818, 77.068], [['The Ridge', 31.1043, 77.1753], ['Shimla Railway Station', 31.103, 77.152]], [
    ['The Mall', 31.104, 77.172, 'cmn', '171001'], ['Lakkar Bazaar', 31.106, 77.178, 'u', '171001'], ['Chotta Shimla', 31.095, 77.183, 'm', '171002'], ['Jakhoo', 31.101, 77.184, 'm', '171001'],
    ['Circular Road', 31.1, 77.165, 'mn', '171003'], ['Sanjauli', 31.106, 77.192, 'u', '171006'], ['Kufri', 31.0977, 77.2674, 'ml', '171012'], ['Mashobra', 31.131, 77.227, 'ml', '171007'], ['Shoghi', 31.05, 77.12, 'm', '171219']]],
  Srinagar: ['sxr', 'hill', 1.02, 'kas', 'kas', '1900', 'Lake View', ['Srinagar International Airport', 33.9871, 74.7742], [['Dal Lake', 34.11, 74.86], ['Shalimar Bagh', 34.15, 74.87]], [
    ['Dal Lake', 34.11, 74.86, 'wm', '190001'], ['Boulevard Road', 34.09, 74.835, 'lwn', '190001'], ['Nigeen Lake', 34.118, 74.837, 'wl', '190006'], ['Rajbagh', 34.07, 74.82, 'l', '190008'],
    ['Lal Chowk', 34.07, 74.81, 'cu', '190001'], ['Sonwar', 34.066, 74.826, '', '190004'], ['Nishat', 34.125, 74.88, 'mw', '191121'], ['Shalimar', 34.145, 74.874, 'm', '191121']]]
};

const IN2 = {
  Leh: ['ixl', 'hill', 1.08, 'hill', 'ladakh', '1941', 'Mountain View', ['Leh Airport', 34.1359, 77.5465], [['Leh Palace', 34.165, 77.584], ['Shanti Stupa', 34.1735, 77.575]], [
    ['Changspa', 34.169, 77.575, 'mu', '194101'], ['Main Bazaar', 34.165, 77.585, 'cu', '194101'], ['Fort Road', 34.162, 77.583, 'c', '194101'], ['Skara', 34.153, 77.569, 'm', '194101'],
    ['Karzoo', 34.172, 77.583, 'm', '194101'], ['Sankar', 34.176, 77.579, 'm', '194101'], ['Old Leh Road', 34.16, 77.59, 'n', '194101'], ['Choglamsar', 34.111, 77.603, 'mw', '194104']]],
  Darjeeling: ['dar', 'hill', .95, 'hill', 'ne', '7341', 'Kanchenjunga View', ['Bagdogra Airport', 26.6812, 88.3286], [['Chowrasta', 27.044, 88.266], ['Tiger Hill', 26.998, 88.28]], [
    ['Chowrasta', 27.044, 88.266, 'cm', '734101'], ['Gandhi Road', 27.038, 88.263, 'm', '734101'], ['Hill Cart Road', 27.04, 88.262, 'un', '734101'], ['Laden La Road', 27.041, 88.264, 'u', '734101'],
    ['Lebong', 27.058, 88.271, 'm', '734105'], ['Ghoom', 27.011, 88.248, 'm', '734102'], ['Jalapahar', 27.034, 88.272, 'ml', '734101'], ['Dr Zakir Hussain Road', 27.039, 88.268, 'mn', '734101']]],
  Gangtok: ['gtk', 'hill', .95, 'hill', 'ne', '7371', 'Kanchenjunga View', ['Pakyong Airport', 27.2255, 88.5864], [['MG Marg', 27.329, 88.612], ['Rumtek Monastery', 27.2889, 88.5611]], [
    ['MG Marg', 27.329, 88.612, 'c', '737101'], ['Tibet Road', 27.331, 88.613, 'u', '737101'], ['Development Area', 27.333, 88.613, 'n', '737101'], ['Deorali', 27.319, 88.604, 'm', '737102'],
    ['Tadong', 27.31, 88.597, 'm', '737102'], ['Arithang', 27.328, 88.609, 'u', '737101'], ['Sichey', 27.338, 88.617, 'm', '737101'], ['Ranipool', 27.293, 88.589, 'mw', '737135']]],
  Rishikesh: ['rsk', 'hill', .95, 'holy', 'hill', '2492', 'River View', ['Jolly Grant Airport', 30.1897, 78.1803], [['Laxman Jhula', 30.126, 78.329], ['Triveni Ghat', 30.103, 78.295]], [
    ['Tapovan', 30.13, 78.325, 'mu', '249192'], ['Laxman Jhula', 30.126, 78.329, 'wu', '249302'], ['Ram Jhula', 30.122, 78.315, 'w', '249304'], ['Swarg Ashram', 30.12, 78.317, 'hw', '249304'],
    ['Muni Ki Reti', 30.116, 78.31, 'w', '249137'], ['Shivpuri', 30.137, 78.389, 'mw', '249192'], ['Haridwar Road', 30.08, 78.27, 'cn', '249201'], ['Neelkanth Road', 30.115, 78.34, 'ml', '249302']]],
  Mussoorie: ['mss', 'hill', 1.02, 'hill', 'hill', '2481', 'Valley View', ['Jolly Grant Airport', 30.1897, 78.1803], [['Gun Hill', 30.458, 78.075], ['Kempty Falls', 30.488, 78.034]], [
    ['Mall Road', 30.457, 78.077, 'cm', '248179'], ['Kulri Bazaar', 30.456, 78.08, 'u', '248179'], ['Library Chowk', 30.457, 78.066, 'c', '248179'], ['Landour', 30.459, 78.099, 'mhl', '248179'],
    ['Company Garden', 30.47, 78.059, 'm', '248179'], ['Kempty Road', 30.465, 78.05, 'm', '248179'], ['Camel’s Back Road', 30.461, 78.073, 'mn', '248179'], ['Happy Valley', 30.453, 78.054, 'm', '248179']]],
  Nainital: ['nai', 'hill', .98, 'hill', 'hill', '2630', 'Lake View', ['Pantnagar Airport', 29.0334, 79.4737], [['Naini Lake', 29.3919, 79.4542], ['Snow View Point', 29.399, 79.461]], [
    ['Mall Road', 29.389, 79.456, 'cwm', '263001'], ['Mallital', 29.395, 79.452, 'cw', '263001'], ['Tallital', 29.38, 79.461, 'uw', '263002'], ['Sukhatal', 29.397, 79.448, 'm', '263001'],
    ['Ayarpatta', 29.384, 79.445, 'ml', '263001'], ['Snow View', 29.399, 79.461, 'm', '263001'], ['Bhowali Road', 29.378, 79.47, 'mn', '263002'], ['Kilbury', 29.421, 79.454, 'ml', '263001']]],
  Ooty: ['oty', 'hill', .95, 'hill', 'def', '6430', 'Valley View', ['Coimbatore International Airport', 11.03, 77.0434], [['Ooty Lake', 11.405, 76.693], ['Government Botanical Garden', 11.418, 76.711]], [
    ['Charing Cross', 11.412, 76.704, 'c', '643001'], ['Fern Hill', 11.4, 76.69, 'ml', '643004'], ['Elk Hill', 11.405, 76.716, 'm', '643006'], ['Lovedale', 11.38, 76.71, 'm', '643003'],
    ['Lake Road', 11.405, 76.693, 'wn', '643001'], ['Havelock Road', 11.41, 76.699, 'h', '643001'], ['Coonoor Road', 11.39, 76.72, 'mn', '643002'], ['Kotagiri Road', 11.415, 76.735, 'mn', '643002']]],
  Munnar: ['mnr', 'hill', 1, 'ker', 'ker', '6856', 'Tea Valley View', ['Cochin International Airport', 10.152, 76.4019], [['Eravikulam National Park', 10.15, 77.06], ['Mattupetty Dam', 10.106, 77.124]], [
    ['Old Munnar', 10.085, 77.06, 'c', '685612'], ['Chithirapuram', 10.05, 77.047, 'm', '685565'], ['Pallivasal', 10.048, 77.05, 'ml', '685612'], ['Anachal', 10.02, 77.01, 'm', '685565'],
    ['Pothamedu', 10.077, 77.062, 'ml', '685612'], ['Devikulam Road', 10.07, 77.105, 'mn', '685613'], ['Chinnakanal', 10.057, 77.16, 'mw', '685618']]],
  Alleppey: ['alp', 'beach', 1.05, 'ker', 'ker', '6880', 'Backwater View', ['Cochin International Airport', 10.152, 76.4019], [['Alleppey Beach', 9.493, 76.317], ['Punnamada Lake', 9.507, 76.348]], [
    ['Punnamada', 9.507, 76.348, 'wl', '688006'], ['Finishing Point', 9.501, 76.342, 'wn', '688013'], ['Alleppey Beach', 9.493, 76.317, 'bn', '688012'], ['Kainakary', 9.483, 76.39, 'w', '688501'],
    ['Kuttanad', 9.4, 76.42, 'w', '688502'], ['Mararikulam', 9.6, 76.3, 'bl', '688549'], ['Pallathuruthy', 9.48, 76.36, 'w', '688011'], ['Mullakkal', 9.498, 76.337, 'cu', '688011']]],
  'Port Blair': ['ixz', 'beach', 1.12, 'beach', 'def', '7441', 'Sea View', ['Veer Savarkar International Airport', 11.6412, 92.7297], [['Cellular Jail', 11.673, 92.748], ['Corbyn’s Cove Beach', 11.648, 92.75]], [
    ['Aberdeen Bazaar', 11.668, 92.738, 'cu', '744101'], ['Marine Hill', 11.673, 92.744, 'w', '744101'], ['Corbyn’s Cove', 11.648, 92.75, 'bl', '744101'], ['Phoenix Bay', 11.675, 92.73, 'w', '744101'],
    ['Junglighat', 11.659, 92.73, 'u', '744103'], ['Haddo', 11.679, 92.721, 'w', '744102'], ['Delanipur', 11.66, 92.728, 'm', '744102'], ['Middle Point', 11.67, 92.733, 'c', '744101']]],
  Amritsar: ['atq', 'heritage', .9, 'holy', 'def', '1430', 'Temple View', ['Amritsar International Airport', 31.7096, 74.7973], [['Golden Temple', 31.62, 74.8765], ['Jallianwala Bagh', 31.6207, 74.8801]], [
    ['Golden Temple Area', 31.62, 74.8765, 'hun', '143006'], ['Heritage Street', 31.6215, 74.877, 'hn', '143006'], ['Ranjit Avenue', 31.648, 74.86, 'l', '143001'], ['Lawrence Road', 31.64, 74.872, 'c', '143001'],
    ['Mall Road', 31.638, 74.868, 'l', '143001'], ['Queens Road', 31.632, 74.868, 'c', '143001'], ['GT Road', 31.63, 74.89, 'n', '143001'], ['Majitha Road', 31.655, 74.882, '', '143001'], ['Airport Road', 31.68, 74.82, 'an', '143101']]],
  Tirupati: ['tir', 'heritage', .85, 'holy', 'def', '5175', 'Hill View', ['Tirupati Airport', 13.6325, 79.5433], [['Alipiri', 13.651, 79.405], ['Tirupati Railway Station', 13.628, 79.419]], [
    ['Alipiri', 13.651, 79.405, 'm', '517501'], ['Tiruchanoor', 13.61, 79.45, 'h', '517503'], ['Renigunta Road', 13.635, 79.44, 'an', '517501'], ['Balaji Colony', 13.638, 79.41, 'u', '517502'],
    ['KT Road', 13.63, 79.42, 'cn', '517501'], ['Leela Mahal Circle', 13.626, 79.423, 'cn', '517501'], ['Karakambadi Road', 13.64, 79.44, 'n', '517520']]],
  Lucknow: ['lko', 'metro', .9, 'in', 'def', '2260', 'City View', ['Lucknow Airport', 26.7606, 80.8893], [['Bara Imambara', 26.869, 80.913], ['Charbagh Railway Station', 26.832, 80.923]], [
    ['Hazratganj', 26.85, 80.947, 'lc', '226001'], ['Gomti Nagar', 26.85, 81, 'x', '226010'], ['Vibhuti Khand', 26.86, 81.007, 'x', '226010'], ['Aminabad', 26.845, 80.928, 'hu', '226018'],
    ['Charbagh', 26.832, 80.923, 'u', '226004'], ['Alambagh', 26.813, 80.902, '', '226005'], ['Kapoorthala', 26.887, 80.948, '', '226024'], ['Aliganj', 26.89, 80.945, '', '226024'], ['Amausi', 26.77, 80.88, 'a', '226009']]]
};

const INTL = {
  Dubai: ['dxb', 'intl-city', 2.2, 'ae', '', '', 'Sea View', ['Dubai International Airport', 25.2532, 55.3657], [['Burj Khalifa', 25.1972, 55.2744], ['Dubai Mall', 25.1985, 55.2796]], [
    ['Deira', 25.271, 55.307, 'cu'], ['Bur Dubai', 25.253, 55.297, 'hc'], ['Al Karama', 25.246, 55.303, 'u'], ['Downtown', 25.1972, 55.2744, 'l'], ['Business Bay', 25.185, 55.265, 'x'], ['DIFC', 25.213, 55.282, 'lxn'],
    ['Jumeirah', 25.21, 55.25, 'lbn'], ['Al Barsha', 25.11, 55.2, 'c'], ['Dubai Marina', 25.08, 55.14, 'lw'], ['JBR', 25.078, 55.133, 'bn'], ['Palm Jumeirah', 25.1124, 55.139, 'lbn'], ['Al Qusais', 25.28, 55.38, 'a']],
    ['Sheikh Zayed Road', 'Al Rigga Street', 'Khalid Bin Al Waleed Road', 'Al Mankhool Road', 'Al Wasl Road', 'Al Sufouh Road', 'Baniyas Road', 'Al Khail Road'],
    'A Tourism Dirham fee is charged per room, per night and is payable directly at the hotel.'],
  'Abu Dhabi': ['auh', 'intl-city', 2.1, 'ae', '', '', 'Sea View', ['Zayed International Airport', 24.433, 54.6511], [['Sheikh Zayed Grand Mosque', 24.4128, 54.475], ['Louvre Abu Dhabi', 24.5338, 54.3983]], [
    ['Corniche', 24.475, 54.35, 'lbw'], ['Al Maryah Island', 24.5, 54.39, 'lxw'], ['Al Reem Island', 24.496, 54.405, 'xw'], ['Saadiyat Island', 24.545, 54.435, 'lb'],
    ['Yas Island', 24.49, 54.607, 'la'], ['Khalifa City', 24.42, 54.58, 'a'], ['Tourist Club Area', 24.494, 54.377, 'cun'], ['Al Bateen', 24.457, 54.335, 'l']],
    ['Corniche Road', 'Khalifa Street', 'Hamdan Street', 'Airport Road', 'Al Falah Street', 'Yas Leisure Drive'],
    'A municipality fee and a tourism fee are charged per night and are payable directly at the hotel.'],
  Singapore: ['sin', 'intl-city', 2.6, 'sg', '', '', 'Bay View', ['Changi Airport', 1.3644, 103.9915], [['Marina Bay Sands', 1.2834, 103.8607], ['Gardens by the Bay', 1.2816, 103.8636]], [
    ['Marina Bay', 1.283, 103.86, 'lw', '018956'], ['Orchard', 1.3048, 103.8318, 'lc', '238801'], ['Chinatown', 1.283, 103.844, 'hu', '058357'], ['Little India', 1.3066, 103.8518, 'hu', '209924'],
    ['Bugis', 1.3, 103.855, 'c', '188021'], ['Clarke Quay', 1.29, 103.846, 'w', '179024'], ['Sentosa', 1.2494, 103.8303, 'lb', '098269'], ['Kallang', 1.31, 103.865, '', '339407'],
    ['Geylang', 1.318, 103.887, 'u', '389458'], ['Changi', 1.345, 103.983, 'a', '486038']],
    ['Orchard Road', 'Beach Road', 'Bencoolen Street', 'River Valley Road', 'Serangoon Road', 'South Bridge Road', 'Tanjong Pagar Road', 'Kitchener Road'], ''],
  Bangkok: ['bkk', 'intl-city', 1.8, 'th', '', '', 'River View', ['Suvarnabhumi Airport', 13.69, 100.7501], [['Grand Palace', 13.75, 100.4913], ['Siam Paragon', 13.7462, 100.5347]], [
    ['Sukhumvit', 13.737, 100.56, 'c', '10110'], ['Silom', 13.725, 100.53, 'x', '10500'], ['Siam', 13.746, 100.534, 'lc', '10330'], ['Khao San Road', 13.759, 100.497, 'hu', '10200'],
    ['Riverside', 13.723, 100.513, 'lw', '10600'], ['Pratunam', 13.752, 100.54, 'u', '10400'], ['Sathorn', 13.72, 100.529, 'lx', '10120'], ['Ratchada', 13.77, 100.573, '', '10310'],
    ['Ari', 13.78, 100.545, '', '10400'], ['Suvarnabhumi', 13.69, 100.75, 'an', '10540']],
    ['Sukhumvit Soi 11', 'Silom Road', 'Rama I Road', 'Phetchaburi Road', 'Charoen Krung Road', 'Sathorn Road', 'Ratchadaphisek Road', 'Phahonyothin Road'], ''],
  Phuket: ['hkt', 'intl-beach', 1.9, 'th', '', '', 'Ocean View', ['Phuket International Airport', 8.1132, 98.3169], [['Patong Beach', 7.896, 98.296], ['Big Buddha', 7.8278, 98.3129]], [
    ['Patong', 7.896, 98.296, 'bcu', '83150'], ['Kata', 7.82, 98.298, 'b', '83100'], ['Karon', 7.847, 98.294, 'b', '83100'], ['Kamala', 7.95, 98.283, 'bl', '83150'],
    ['Phuket Town', 7.884, 98.392, 'hu', '83000'], ['Rawai', 7.779, 98.325, 'b', '83100'], ['Bang Tao', 7.996, 98.295, 'bl', '83110'], ['Chalong', 7.844, 98.338, '', '83130'],
    ['Surin', 7.975, 98.279, 'bl', '83110'], ['Mai Khao', 8.15, 98.298, 'ab', '83110']],
    ['Thaweewong Road', 'Rat-U-Thit 200 Pee Road', 'Kata Road', 'Patak Road', 'Thepkrasattri Road', 'Viset Road'], ''],
  Pattaya: ['utp', 'intl-beach', 1.8, 'th', '', '', 'Ocean View', ['U-Tapao Airport', 12.6799, 101.005], [['Walking Street', 12.927, 100.872], ['Sanctuary of Truth', 12.9727, 100.889]], [
    ['Central Pattaya', 12.93, 100.88, 'bc', '20150'], ['Walking Street', 12.927, 100.872, 'un', '20150'], ['Jomtien', 12.885, 100.87, 'b', '20150'], ['Naklua', 12.965, 100.89, 'w', '20150'],
    ['Pratumnak Hill', 12.915, 100.865, 'lm', '20150'], ['Wongamat', 12.97, 100.885, 'lb', '20150'], ['North Pattaya', 12.95, 100.888, 'c', '20150'], ['Na Jomtien', 12.82, 100.905, 'bl', '20250']],
    ['Beach Road', 'Second Road', 'Thappraya Road', 'Jomtien Beach Road', 'Naklua Road', 'Pattaya Klang Road'], ''],
  Bali: ['dps', 'intl-beach', 1.9, 'id', '', '', 'Ocean View', ['Ngurah Rai International Airport', -8.7482, 115.1675], [['Tanah Lot', -8.6212, 115.0868], ['Ubud Monkey Forest', -8.5188, 115.2585]], [
    ['Seminyak', -8.69, 115.168, 'lb', '80361'], ['Kuta', -8.718, 115.169, 'bu', '80361'], ['Legian', -8.705, 115.168, 'b', '80361'], ['Ubud', -8.5069, 115.2625, 'mh', '80571'],
    ['Canggu', -8.6478, 115.1385, 'bu', '80351'], ['Nusa Dua', -8.8, 115.23, 'lb', '80363'], ['Jimbaran', -8.77, 115.17, 'ba', '80361'], ['Sanur', -8.69, 115.262, 'b', '80228'], ['Uluwatu', -8.829, 115.085, 'lbm', '80364']],
    ['Kayu Aya', 'Pantai Kuta', 'Monkey Forest', 'Raya Ubud', 'Batu Bolong', 'Pratama', 'Danau Tamblingan', 'Raya Uluwatu'],
    'International visitors pay a one-time Bali tourism levy before arrival; it is not included in the room price.'],
  'Kuala Lumpur': ['kul', 'intl-city', 1.8, 'my', '', '', 'Tower View', ['Kuala Lumpur International Airport', 2.7456, 101.7099], [['Petronas Twin Towers', 3.1579, 101.7116], ['Batu Caves', 3.2379, 101.684]], [
    ['Bukit Bintang', 3.1466, 101.7108, 'c', '55100'], ['KLCC', 3.1579, 101.7123, 'lxn', '50088'], ['Chinatown', 3.144, 101.698, 'hu', '50000'], ['Bangsar', 3.13, 101.67, 'l', '59100'],
    ['Brickfields', 3.131, 101.686, 'u', '50470'], ['Chow Kit', 3.165, 101.698, 'u', '50350'], ['Mont Kiara', 3.17, 101.65, 'x', '50480'], ['Titiwangsa', 3.179, 101.704, 'w', '53200'], ['Sepang', 2.7456, 101.7099, 'a', '64000']],
    ['Bukit Bintang', 'Sultan Ismail', 'Ampang', 'Petaling', 'Tun Sambanthan', 'Raja Laut', 'Kiara', 'Tuanku Abdul Rahman'], ''],
  Kathmandu: ['ktm', 'intl-city', 1.8, 'np', '', '', 'Himalaya View', ['Tribhuvan International Airport', 27.6966, 85.3591], [['Kathmandu Durbar Square', 27.7045, 85.307], ['Boudhanath Stupa', 27.7215, 85.362]], [
    ['Thamel', 27.7154, 85.3123, 'uc', '44600'], ['Durbar Marg', 27.712, 85.318, 'l', '44600'], ['Lazimpat', 27.723, 85.32, 'l', '44600'], ['Boudha', 27.7215, 85.362, 'h', '44600'],
    ['Patan', 27.6727, 85.325, 'h', '44700'], ['Baluwatar', 27.729, 85.33, '', '44600'], ['Jhamsikhel', 27.68, 85.308, '', '44700'], ['Sinamangal', 27.696, 85.35, 'a', '44600']],
    ['Thamel Marg', 'Durbar Marg', 'Lazimpat Road', 'Boudha Road', 'Jhamsikhel Road', 'Tridevi Marg'], ''],
  Colombo: ['cmb', 'intl-city', 1.8, 'lk', '', '', 'Ocean View', ['Bandaranaike International Airport', 7.1808, 79.8841], [['Galle Face Green', 6.927, 79.845], ['Gangaramaya Temple', 6.9166, 79.8563]], [
    ['Kollupitiya', 6.91, 79.85, 'lc', '00300'], ['Fort', 6.935, 79.843, 'hx', '00100'], ['Bambalapitiya', 6.89, 79.856, 'c', '00400'], ['Wellawatte', 6.875, 79.86, 'u', '00600'],
    ['Dehiwala', 6.851, 79.865, 'b', '10350'], ['Mount Lavinia', 6.839, 79.865, 'bl', '10370'], ['Slave Island', 6.925, 79.853, 'wn', '00200'], ['Cinnamon Gardens', 6.91, 79.865, 'ln', '00700'], ['Negombo', 7.2083, 79.8358, 'ab', '11500']],
    ['Galle Road', 'Duplication Road', 'Marine Drive', 'Union Place', 'Ward Place', 'Hospital Street'], ''],
  'Malé': ['mle', 'intl-beach', 2.5, 'mv', '', '', 'Ocean View', ['Velana International Airport', 4.1918, 73.5291], [['Malé Friday Mosque', 4.178, 73.51], ['Artificial Beach', 4.176, 73.516]], [
    ['Malé City', 4.1755, 73.5093, 'cun', '20026'], ['Hulhumalé', 4.217, 73.54, 'ab', '23000'], ['Hulhulé', 4.192, 73.529, 'an', '22000'], ['Villingili', 4.173, 73.485, 'bu', '20008'],
    ['Maafushi', 3.94, 73.49, 'bu', '08090'], ['North Malé Atoll', 4.4, 73.5, 'lbn', ''], ['South Malé Atoll', 3.95, 73.45, 'lbn', '']],
    ['Majeedhee Magu', 'Boduthakurufaanu Magu', 'Orchid Magu', 'Nirolhu Magu', 'Ameenee Magu'],
    'A green tax per guest, per night applies in the Maldives and is payable at the property.'],
  London: ['lon', 'intl-city', 2.6, 'gb', '', '', 'River View', ['Heathrow Airport', 51.47, -0.4543], [['Buckingham Palace', 51.5014, -0.1419], ['British Museum', 51.5194, -0.127]], [
    ['Kensington', 51.499, -0.1938, 'l', 'W8'], ['Paddington', 51.5154, -0.1755, 'c', 'W2'], ['Westminster', 51.4975, -0.1357, 'lh', 'SW1P'], ['Covent Garden', 51.5117, -0.124, 'c', 'WC2E'],
    ['Bloomsbury', 51.522, -0.125, 'h', 'WC1B'], ['Mayfair', 51.509, -0.148, 'ln', 'W1K'], ['Shoreditch', 51.526, -0.078, 'u', 'EC2A'], ['King’s Cross', 51.53, -0.124, 'c', 'N1C'],
    ['Canary Wharf', 51.5054, -0.0235, 'xw', 'E14'], ['Earl’s Court', 51.492, -0.193, 'u', 'SW5'], ['Heathrow', 51.47, -0.4543, 'a', 'TW6']],
    ['Cromwell Road', 'Praed Street', 'Belgrave Road', 'Long Acre', 'Great Russell Street', 'Brook Street', 'Curtain Road', 'York Way', 'Westferry Circus', 'Earls Court Road'], ''],
  Paris: ['par', 'intl-city', 2.6, 'fr', '', '', 'Eiffel Tower View', ['Charles de Gaulle Airport', 49.0097, 2.5479], [['Eiffel Tower', 48.8584, 2.2945], ['Louvre Museum', 48.8606, 2.3376]], [
    ['Le Marais', 48.859, 2.362, 'h', '75004'], ['Saint-Germain-des-Prés', 48.854, 2.333, 'lh', '75006'], ['Montmartre', 48.8867, 2.3431, 'hm', '75018'], ['Champs-Élysées', 48.8698, 2.3078, 'l', '75008'],
    ['Latin Quarter', 48.849, 2.347, 'hu', '75005'], ['Opéra', 48.871, 2.332, 'c', '75009'], ['Bastille', 48.853, 2.369, 'u', '75011'], ['Eiffel Tower', 48.857, 2.298, 'lwn', '75007'],
    ['Montparnasse', 48.842, 2.321, 'c', '75014'], ['La Défense', 48.892, 2.236, 'x', '92400']],
    ['rue de Rivoli', 'boulevard Saint-Germain', 'rue Lepic', 'avenue George V', 'rue Mouffetard', 'boulevard Haussmann', 'rue de la Roquette', 'avenue de Suffren', 'boulevard du Montparnasse'],
    'A city tax (taxe de séjour) per guest, per night is payable at the property.'],
  Zurich: ['zrh', 'intl-city', 2.6, 'ch', '', '', 'Lake View', ['Zurich Airport', 47.4582, 8.5555], [['Zürich HB', 47.3779, 8.5403], ['Bürkliplatz, Lake Zurich', 47.3667, 8.541]], [
    ['Altstadt', 47.3717, 8.5423, 'h', '8001'], ['Niederdorf', 47.374, 8.544, 'hu', '8001'], ['Enge', 47.362, 8.53, 'lw', '8002'], ['Seefeld', 47.356, 8.555, 'lw', '8008'],
    ['Zurich West', 47.389, 8.516, 'c', '8005'], ['Wiedikon', 47.37, 8.518, '', '8003'], ['Oerlikon', 47.411, 8.544, 'x', '8050'], ['Kloten', 47.45, 8.585, 'a', '8302']],
    ['Bahnhofstrasse', 'Limmatquai', 'Seefeldstrasse', 'Badenerstrasse', 'Niederdorfstrasse', 'Schaffhauserstrasse', 'Dufourstrasse'],
    'A local city tax per guest, per night is payable at the property.'],
  Istanbul: ['ist', 'intl-city', 2, 'tr', '', '', 'Bosphorus View', ['Istanbul Airport', 41.2753, 28.7519], [['Hagia Sophia', 41.0086, 28.9802], ['Galata Tower', 41.0256, 28.9741]], [
    ['Sultanahmet', 41.0055, 28.9769, 'hu', '34122'], ['Taksim', 41.037, 28.985, 'c', '34435'], ['Galata', 41.0256, 28.9742, 'h', '34421'], ['Karaköy', 41.022, 28.977, 'w', '34425'],
    ['Beşiktaş', 41.043, 29.005, 'lw', '34353'], ['Nişantaşı', 41.05, 28.993, 'l', '34367'], ['Şişli', 41.06, 28.987, 'x', '34381'], ['Kadıköy', 40.99, 29.025, 'u', '34710'], ['Fatih', 41.019, 28.94, 'h', '34080']],
    ['Divanyolu Caddesi', 'İstiklal Caddesi', 'Galip Dede Caddesi', 'Kemankeş Caddesi', 'Barbaros Bulvarı', 'Halaskargazi Caddesi', 'Moda Caddesi'], ''],
  Hanoi: ['han', 'intl-city', 1.8, 'vn', '', '', 'Lake View', ['Noi Bai International Airport', 21.2212, 105.8072], [['Hoan Kiem Lake', 21.0285, 105.8522], ['Temple of Literature', 21.0294, 105.8355]], [
    ['Old Quarter', 21.034, 105.85, 'hu'], ['Hoan Kiem', 21.0285, 105.8522, 'cw'], ['French Quarter', 21.024, 105.856, 'lh'], ['Tay Ho', 21.068, 105.819, 'lw'],
    ['Ba Dinh', 21.035, 105.834, 'h'], ['Dong Da', 21.013, 105.827, ''], ['Cau Giay', 21.033, 105.79, 'x'], ['Long Bien', 21.045, 105.885, ''], ['Soc Son', 21.2212, 105.8072, 'an']],
    ['Hang Bac', 'Hang Gai', 'Ma May', 'Trang Tien', 'Xuan Dieu', 'Hang Trong', 'Ly Thuong Kiet'], ''],
  'New York': ['nyc', 'intl-city', 2.6, 'us', '', '', 'Skyline View', ['JFK International Airport', 40.6413, -73.7781], [['Times Square', 40.758, -73.9855], ['Central Park', 40.7829, -73.9654]], [
    ['Midtown', 40.7549, -73.984, 'lcx', '10019'], ['Times Square', 40.758, -73.9855, 'cn', '10036'], ['Chelsea', 40.7465, -74.0014, '', '10011'], ['SoHo', 40.7233, -74.003, 'l', '10012'],
    ['Financial District', 40.7075, -74.0113, 'xw', '10004'], ['Upper West Side', 40.787, -73.9754, 'l', '10024'], ['Williamsburg', 40.7081, -73.9571, 'u', '11211'], ['Long Island City', 40.7447, -73.9485, 'w', '11101'], ['Jamaica', 40.6915, -73.806, 'a', '11435']],
    ['West 44th Street', 'Lexington Avenue', 'Eighth Avenue', 'Broadway', 'Water Street', 'Amsterdam Avenue', 'Bedford Avenue', 'Jackson Avenue', 'Seventh Avenue'],
    'Some properties charge a daily destination or facility fee, payable at the property.'],
  Sydney: ['syd', 'intl-city', 2.4, 'au', '', '', 'Harbour View', ['Sydney Airport', -33.9399, 151.1753], [['Sydney Opera House', -33.8568, 151.2153], ['Bondi Beach', -33.8915, 151.2767]], [
    ['The Rocks', -33.8599, 151.209, 'lh', '2000'], ['Circular Quay', -33.861, 151.211, 'lw', '2000'], ['Darling Harbour', -33.8748, 151.2008, 'w', '2000'], ['Surry Hills', -33.885, 151.211, 'c', '2010'],
    ['Bondi Beach', -33.8915, 151.2767, 'b', '2026'], ['Manly', -33.7969, 151.284, 'b', '2095'], ['Potts Point', -33.87, 151.225, 'u', '2011'], ['Pyrmont', -33.87, 151.194, 'x', '2009'],
    ['Mascot', -33.924, 151.187, 'a', '2020'], ['Coogee', -33.92, 151.258, 'b', '2034']],
    ['George Street', 'Pitt Street', 'Crown Street', 'Campbell Parade', 'The Corso', 'Macleay Street', 'Harris Street', 'O’Riordan Street', 'Arden Street'], '']
};

const toMeta = (name, a) => ({
  name, code: a[0], kind: a[1], mult: a[2], words: a[3], fam: a[4] || 'def', pin: a[5] || '', view: a[6],
  airport: { name: a[7][0], lat: a[7][1], lon: a[7][2] },
  sights: a[8].map(([n, lat, lon]) => ({ name: n, lat, lon })),
  areas: a[9].map(([n, lat, lon, tags = '', pin = '']) => ({ name: n, lat, lon, tags, pin })),
  streets: a[10] || null,
  note: a[11] || ''
});

/** Hotel meta by city name (keys match HOTEL_CITIES names). */
export const HOTEL_META = Object.fromEntries(Object.entries({ ...IN1, ...IN2, ...INTL }).map(([k, v]) => [k, toMeta(k, v)]));
export const HOTEL_META_BY_CODE = Object.fromEntries(Object.values(HOTEL_META).map(m => [m.code, m]));

// Local photographs (assets/img/<name>.webp) for destination tiles on the hotels landing page.
export const CITY_PHOTO = {
  Delhi: 'delhi', Goa: 'goa', Jaipur: 'jaipur', Manali: 'himalayas', Srinagar: 'kashmir', Munnar: 'kerala', Kochi: 'kerala', Alleppey: 'kerala',
  Leh: 'ladakh', 'Port Blair': 'andaman', Mussoorie: 'mussoorie', Nainital: 'nainital', Tirupati: 'tirupati', Rishikesh: 'chardham',
  Dubai: 'dubai', Singapore: 'singapore', Bangkok: 'bangkok', Phuket: 'thailand', 'Malé': 'maldives-villas', Colombo: 'sri-lanka', Hanoi: 'vietnam', Zurich: 'switzerland'
};
export const POPULAR_HOTEL_CITIES = {
  domestic: ['Goa', 'Delhi', 'Jaipur', 'Manali', 'Srinagar', 'Munnar', 'Leh', 'Port Blair'],
  international: ['Dubai', 'Singapore', 'Bangkok', 'Phuket', 'Malé', 'Colombo', 'Hanoi', 'Zurich']
};
