// Bus reference data: operators, coach types and their seat layouts, amenities,
// and boarding / dropping points for every city in BUS_CITIES (data/cities.js).
// Operator names from the live Delhi → Jaipur results plus well-known regional
// operators. Everything else (ratings, timings, fares) is simulated by engines/buses.js.

// ---------------------------------------------------------------- coach types
// layout: 'seater22' (single deck, 2 + 2), 'sleeper21' (lower + upper sleeper, 2 + 1),
//         'combo21' (lower deck seater 2 + 1, upper deck sleeper 2 + 1).
// rows = seat rows on a seater deck (sleeper decks always have 6 rows of berths).
export const BUS_TYPES = {
  'ac-sleeper-21': { label: 'AC Sleeper (2 + 1)', ac: true, layout: 'sleeper21', minKm: 150 },
  'ac-seater-sleeper-21': { label: 'AC Seater / Sleeper (2 + 1)', ac: true, layout: 'combo21', rows: [10, 11], minKm: 120, maxKm: 1400 },
  'ac-multiaxle-seater-sleeper-21': { label: 'AC Multiaxle Seater/Sleeper (2 + 1)', ac: true, layout: 'combo21', rows: [11, 11], minKm: 120, maxKm: 1400, speed: .97 },
  'nonac-seater-22': { label: 'Non-AC Seater (2 + 2)', ac: false, layout: 'seater22', rows: [10, 12], maxKm: 650, speed: 1.05 },
  'nonac-sleeper-21': { label: 'Non AC Sleeper (2 + 1)', ac: false, layout: 'sleeper21', minKm: 150, speed: 1.05 },
  'ac-seater-22': { label: 'AC Seater (2 + 2)', ac: true, layout: 'seater22', rows: [10, 11], maxKm: 600 },
  'ac-seater-electric-22': { label: 'AC Seater Electric (2 + 2)', ac: true, electric: true, layout: 'seater22', rows: [11, 11], maxKm: 450, speed: .98 },
  'volvo-semi-22': { label: 'Volvo Multi-Axle A/C Semi Sleeper (2 + 2)', ac: true, premium: true, semi: true, layout: 'seater22', rows: [11, 12], maxKm: 1200, speed: .95 },
  'benz-semi-sleeper-21': { label: 'Bharat Benz AC Semi Sleeper / Sleeper (2 + 1)', ac: true, premium: true, semi: true, layout: 'combo21', rows: [10, 10], minKm: 150 }
};

// ---------------------------------------------------------------- amenities
export const AMENITIES = {
  water: { label: 'Water bottle', icon: 'drop' },
  blanket: { label: 'Blanket', icon: 'bed' },
  charging: { label: 'Charging point', icon: 'plug' },
  light: { label: 'Reading light', icon: 'sun' },
  tracking: { label: 'Live tracking', icon: 'radar' },
  wifi: { label: 'Wi-Fi', icon: 'wifi' },
  cctv: { label: 'CCTV', icon: 'eye' },
  snacks: { label: 'Snacks', icon: 'coffee' },
  movie: { label: 'Entertainment', icon: 'tv' },
  safety: { label: 'Emergency contact & first aid', icon: 'shield' },
  electric: { label: 'Zero-emission electric', icon: 'zap' }
};

// ---------------------------------------------------------------- operators
// regions: north · west · central · south · east. hubs: cities where the operator is strong
// (services touching a hub are more likely). maxKm limits smaller regional operators.
export const OPERATORS = [
  { id: 'maharani', name: 'Maharani Travels', short: 'MR', color: '#7b2d4f', rating: 4.3, weight: 1.4, regions: ['north'], hubs: ['Delhi', 'Jaipur', 'Udaipur', 'Jodhpur', 'Agra'], types: ['ac-multiaxle-seater-sleeper-21', 'ac-sleeper-21', 'ac-seater-sleeper-21', 'nonac-seater-22'], blurb: 'Multi-axle seater/sleepers across Rajasthan and Delhi NCR.' },
  { id: 'leafybus', name: 'LEAFYBUS Premium Business Class', short: 'LB', color: '#1d6b48', rating: 4.6, premium: true, regions: ['north'], hubs: ['Delhi', 'Jaipur', 'Manali', 'Dehradun', 'Chandigarh', 'Dharamshala'], types: ['ac-sleeper-21', 'benz-semi-sleeper-21'], blurb: 'Business-class sleepers with reading lights, Wi-Fi and snacks.' },
  { id: 'laxmi', name: 'Laxmi Holidays Pvt Ltd.', short: 'LH', color: '#a35b12', rating: 4.1, regions: ['north'], hubs: ['Delhi', 'Jaipur', 'Agra', 'Lucknow', 'Udaipur'], types: ['ac-seater-sleeper-21', 'ac-sleeper-21', 'volvo-semi-22'], blurb: 'Seater/sleepers and Volvo coaches on Rajasthan and UP routes.' },
  { id: 'nuego', name: 'NueGo', short: 'NG', color: '#1c9a6c', rating: 4.5, weight: 1.3, electric: true, maxKm: 450, regions: ['north', 'central', 'south'], hubs: ['Delhi', 'Jaipur', 'Agra', 'Dehradun', 'Haridwar', 'Rishikesh', 'Chandigarh', 'Lucknow', 'Kanpur', 'Indore', 'Bhopal', 'Bengaluru', 'Chennai', 'Tirupati', 'Hyderabad', 'Vijayawada', 'Pondicherry', 'Mysuru', 'Coimbatore'], types: ['ac-seater-electric-22'], blurb: 'Zero-emission electric AC coaches with women-friendly seating.' },
  { id: 'vikas', name: 'Vikas Travels Jaipur', short: 'VT', color: '#5b4a9e', rating: 3.9, maxKm: 800, regions: ['north'], hubs: ['Jaipur'], types: ['nonac-seater-22', 'nonac-sleeper-21', 'ac-seater-sleeper-21'], blurb: 'Budget seaters and sleepers out of Jaipur.' },
  { id: 'smmoga', name: 'S M Moga Travels', short: 'SM', color: '#2a5d8f', rating: 4.0, regions: ['north'], hubs: ['Delhi', 'Jaipur', 'Amritsar', 'Chandigarh', 'Katra'], types: ['ac-sleeper-21', 'ac-multiaxle-seater-sleeper-21', 'nonac-sleeper-21'], blurb: 'Overnight sleepers linking Punjab, Delhi and Rajasthan.' },
  { id: 'mahalaxmi', name: 'Mahalaxmi Travels', short: 'ML', color: '#b0413e', rating: 3.8, regions: ['north', 'west', 'central'], hubs: ['Delhi', 'Jaipur', 'Ahmedabad', 'Indore', 'Udaipur'], types: ['nonac-sleeper-21', 'ac-seater-sleeper-21', 'nonac-seater-22'], blurb: 'Long-distance sleepers from Delhi and Jaipur to Gujarat and MP.' },
  { id: 'shreeshakti', name: 'SHREE SHAKTI TRAVELS AND CARGO', short: 'SS', color: '#8a6d1d', rating: 3.7, maxKm: 800, regions: ['north'], hubs: ['Jaipur', 'Delhi', 'Jodhpur'], types: ['nonac-seater-22', 'nonac-sleeper-21', 'ac-seater-sleeper-21'], blurb: 'Passenger and cargo services across Rajasthan.' },
  { id: 'rc', name: 'RC Travels', short: 'RC', color: '#36627a', rating: 3.9, maxKm: 700, regions: ['north'], hubs: ['Delhi', 'Jaipur', 'Agra'], types: ['ac-seater-sleeper-21', 'ac-seater-22', 'nonac-seater-22'], blurb: 'Frequent seaters on the Golden Triangle.' },
  { id: 'shakti', name: 'SHAKTI TRAVELS', short: 'ST', color: '#6b5b3e', rating: 3.6, maxKm: 700, regions: ['north'], hubs: ['Jaipur', 'Delhi'], types: ['nonac-seater-22', 'nonac-sleeper-21'], blurb: 'Value non-AC services between Delhi and Jaipur.' },
  { id: 'deepak', name: 'Deepak Transport Company', short: 'DT', color: '#46705a', rating: 3.8, maxKm: 900, regions: ['north'], hubs: ['Delhi', 'Jaipur', 'Jodhpur', 'Udaipur'], types: ['nonac-seater-22', 'ac-seater-sleeper-21', 'nonac-sleeper-21'], blurb: 'Seater and sleeper coaches across Rajasthan.' },
  { id: 'zingbus', name: 'Zingbus', short: 'ZB', color: '#e0612b', rating: 4.4, weight: 1.3, regions: ['north', 'central'], hubs: ['Delhi', 'Manali', 'Dharamshala', 'Dehradun', 'Rishikesh', 'Haridwar', 'Katra', 'Lucknow', 'Jaipur', 'Chandigarh', 'Amritsar', 'Shimla', 'Nainital', 'Agra'], types: ['volvo-semi-22', 'ac-sleeper-21', 'benz-semi-sleeper-21'], blurb: 'Volvo and sleeper coaches to the hills, with live tracking.' },
  { id: 'intrcity', name: 'IntrCity SmartBus', short: 'IC', color: '#d2432e', rating: 4.5, weight: 1.2, premium: true, national: true, regions: ['north', 'west', 'central', 'south', 'east'], hubs: [], types: ['ac-sleeper-21', 'benz-semi-sleeper-21', 'volvo-semi-22'], blurb: 'Pan-India smart coaches with washrooms on select buses.' },
  { id: 'hans', name: 'Hans Travels', short: 'HT', color: '#3f4f8c', rating: 4.2, regions: ['north'], hubs: ['Delhi', 'Chandigarh', 'Amritsar', 'Katra', 'Manali', 'Shimla', 'Dharamshala'], types: ['volvo-semi-22', 'ac-sleeper-21', 'ac-seater-22'], blurb: 'Volvo services from Delhi to Punjab and Himachal.' },
  { id: 'neeta', name: 'Neeta Tours & Travels', short: 'NT', color: '#1f7a8c', rating: 4.2, weight: 1.3, regions: ['west'], hubs: ['Mumbai', 'Pune', 'Goa', 'Nashik', 'Shirdi', 'Ahmedabad', 'Surat'], types: ['volvo-semi-22', 'ac-sleeper-21', 'ac-seater-sleeper-21', 'nonac-seater-22'], blurb: 'Maharashtra’s most frequent Volvo and sleeper fleet.' },
  { id: 'paulo', name: 'Paulo Travels', short: 'PT', color: '#0f6e57', rating: 4.1, regions: ['west', 'south'], hubs: ['Goa', 'Mumbai', 'Pune', 'Bengaluru', 'Mangaluru'], types: ['ac-sleeper-21', 'nonac-sleeper-21', 'volvo-semi-22'], blurb: 'Goa’s own overnight sleepers to Mumbai, Pune and Bengaluru.' },
  { id: 'shrinath', name: 'Shrinath Travels', short: 'SR', color: '#8f3b76', rating: 3.9, regions: ['west', 'central', 'north'], hubs: ['Mumbai', 'Ahmedabad', 'Surat', 'Vadodara', 'Udaipur', 'Jaipur', 'Indore'], types: ['ac-sleeper-21', 'nonac-sleeper-21', 'ac-seater-sleeper-21'], blurb: 'Sleepers between Gujarat, Rajasthan and Maharashtra.' },
  { id: 'konduskar', name: 'Konduskar Travels', short: 'KT', color: '#c06c1a', rating: 4.0, regions: ['west', 'south'], hubs: ['Mumbai', 'Pune', 'Goa', 'Bengaluru', 'Hyderabad', 'Shirdi'], types: ['ac-sleeper-21', 'ac-seater-sleeper-21', 'nonac-seater-22'], blurb: 'Coastal and Deccan routes from Mumbai and Pune.' },
  { id: 'patel', name: 'Patel Tours & Travels', short: 'PL', color: '#4d6b2f', rating: 3.9, regions: ['west', 'central', 'north'], hubs: ['Ahmedabad', 'Surat', 'Vadodara', 'Mumbai', 'Udaipur', 'Indore', 'Jodhpur'], types: ['nonac-sleeper-21', 'ac-sleeper-21', 'ac-seater-sleeper-21'], blurb: 'Gujarat sleepers to Mumbai, Rajasthan and MP.' },
  { id: 'verma', name: 'Verma Travels', short: 'VM', color: '#6d3fa0', rating: 4.0, regions: ['central', 'west'], hubs: ['Indore', 'Bhopal', 'Pune', 'Mumbai', 'Ahmedabad', 'Nashik', 'Shirdi'], types: ['ac-sleeper-21', 'nonac-sleeper-21', 'ac-seater-22'], blurb: 'Overnight sleepers from Indore and Bhopal.' },
  { id: 'chartered', name: 'Chartered Bus', short: 'CB', color: '#b3261e', rating: 4.3, regions: ['central', 'west'], hubs: ['Indore', 'Bhopal', 'Ahmedabad', 'Vadodara'], types: ['volvo-semi-22', 'ac-seater-22', 'ac-sleeper-21'], blurb: 'Punctual AC coaches across Madhya Pradesh.' },
  { id: 'kallada', name: 'Kallada Travels', short: 'KL', color: '#9a2f2f', rating: 4.0, weight: 1.2, regions: ['south'], hubs: ['Kochi', 'Thiruvananthapuram', 'Bengaluru', 'Chennai', 'Coimbatore', 'Mangaluru'], types: ['ac-sleeper-21', 'volvo-semi-22', 'benz-semi-sleeper-21'], blurb: 'Kerala’s long-distance sleeper and Volvo specialist.' },
  { id: 'srs', name: 'SRS Travels', short: 'SRS', color: '#b8321f', rating: 4.0, weight: 1.2, regions: ['south', 'west'], hubs: ['Bengaluru', 'Hyderabad', 'Chennai', 'Mangaluru', 'Mysuru', 'Goa', 'Pune'], types: ['ac-sleeper-21', 'nonac-sleeper-21', 'volvo-semi-22', 'ac-seater-sleeper-21'], blurb: 'One of the largest fleets out of Bengaluru.' },
  { id: 'vrl', name: 'VRL Travels', short: 'VRL', color: '#e28413', rating: 4.3, weight: 1.3, regions: ['south', 'west'], hubs: ['Bengaluru', 'Mangaluru', 'Mumbai', 'Pune', 'Goa', 'Hyderabad', 'Mysuru'], types: ['ac-sleeper-21', 'nonac-sleeper-21', 'volvo-semi-22', 'benz-semi-sleeper-21'], blurb: 'Karnataka’s trusted fleet with Mumbai and Goa services.' },
  { id: 'orange', name: 'Orange Tours & Travels', short: 'OT', color: '#f07a1a', rating: 4.3, weight: 1.3, regions: ['south', 'west'], hubs: ['Hyderabad', 'Bengaluru', 'Chennai', 'Vijayawada', 'Visakhapatnam', 'Tirupati', 'Mumbai', 'Pune'], types: ['ac-sleeper-21', 'volvo-semi-22', 'benz-semi-sleeper-21'], blurb: 'Premium sleepers from Hyderabad to the South and West.' },
  { id: 'kpn', name: 'KPN Travels', short: 'KPN', color: '#2d6a9f', rating: 4.1, regions: ['south'], hubs: ['Chennai', 'Coimbatore', 'Madurai', 'Bengaluru', 'Pondicherry'], types: ['ac-sleeper-21', 'ac-seater-sleeper-21', 'nonac-seater-22'], blurb: 'Tamil Nadu’s go-to overnight operator.' },
  { id: 'parveen', name: 'Parveen Travels', short: 'PV', color: '#16706b', rating: 4.0, regions: ['south'], hubs: ['Chennai', 'Madurai', 'Coimbatore', 'Bengaluru', 'Kochi', 'Pondicherry', 'Tirupati'], types: ['ac-sleeper-21', 'nonac-sleeper-21', 'ac-seater-sleeper-21'], blurb: 'Sleepers linking Chennai with Kerala and Karnataka.' },
  { id: 'morningstar', name: 'Morning Star Travels', short: 'MS', color: '#c89211', rating: 4.2, regions: ['south'], hubs: ['Hyderabad', 'Vijayawada', 'Visakhapatnam', 'Tirupati', 'Chennai', 'Bengaluru'], types: ['ac-sleeper-21', 'volvo-semi-22'], blurb: 'Andhra and Telangana overnight coaches.' },
  { id: 'sugama', name: 'Sugama Tourist', short: 'SG', color: '#3b7d3a', rating: 4.1, regions: ['south'], hubs: ['Mangaluru', 'Bengaluru', 'Mysuru', 'Goa'], types: ['ac-sleeper-21', 'volvo-semi-22', 'nonac-seater-22'], blurb: 'Coastal Karnataka specialist.' },
  { id: 'shyamoli', name: 'Shyamoli Paribahan', short: 'SP', color: '#a8322d', rating: 4.0, regions: ['east'], hubs: ['Kolkata', 'Siliguri', 'Patna', 'Guwahati'], types: ['ac-seater-22', 'volvo-semi-22', 'nonac-seater-22', 'ac-sleeper-21'], blurb: 'Eastern India’s household name for AC coaches.' },
  { id: 'royalcruiser', name: 'Royal Cruiser', short: 'RY', color: '#2c4f8a', rating: 4.1, regions: ['east'], hubs: ['Siliguri', 'Guwahati', 'Kolkata'], types: ['volvo-semi-22', 'ac-sleeper-21'], blurb: 'Volvo coaches across the North-East corridor.' },
  { id: 'network', name: 'Network Travels', short: 'NW', color: '#5a6b7c', rating: 4.0, regions: ['east'], hubs: ['Guwahati', 'Siliguri', 'Kolkata', 'Patna'], types: ['ac-sleeper-21', 'nonac-seater-22', 'volvo-semi-22'], blurb: 'Guwahati-based sleepers to Bengal and Bihar.' },
  { id: 'greenline', name: 'Green Line Travels', short: 'GL', color: '#2f7d4a', rating: 4.2, regions: ['east'], hubs: ['Guwahati', 'Siliguri', 'Kolkata'], types: ['volvo-semi-22', 'ac-seater-22', 'ac-sleeper-21'], blurb: 'Comfortable AC coaches from Guwahati.' },
  { id: 'shatabdi', name: 'Shatabdi Travels', short: 'SB', color: '#7a5230', rating: 3.9, regions: ['north', 'east'], hubs: ['Lucknow', 'Kanpur', 'Varanasi', 'Patna', 'Delhi'], types: ['ac-sleeper-21', 'nonac-sleeper-21', 'ac-seater-sleeper-21'], blurb: 'Sleepers across UP and Bihar.' }
];
export const OPERATOR = Object.fromEntries(OPERATORS.map(o => [o.id, o]));
export const operatorByName = name => OPERATORS.find(o => o.name === name);

// ---------------------------------------------------------------- cities
// code (used in bus ids), region, tier (1 small · 2 city · 3 metro), hill, points.
// Point: [name, landmark, direction from centre, km from centre, weight]
// Direction + distance let the engine order stops along the direction of travel.
const C = {
  Delhi: ['DEL', 'north', 3, 0, [
    ['Anand Vihar ISBT', 'Near EDM Mall, Opp Footover Bridge', 'E', 12, 6], ['Kashmere Gate ISBT', 'Kashmiri Gate Metro Station Gate No 3', 'N', 6, 6],
    ['Majnu Ka Tilla', 'Near Tibetan Market, Outer Ring Road', 'N', 10, .5], ['Karol Bagh', 'Pusa Road, Near Karol Bagh Metro Station', 'W', 5],
    ['Dhaula Kuan', 'Metro Station / Foot Over Bridge', 'SW', 9, 2.5], ['Mahipalpur', 'Near Airport, Mahipalpur Flyover', 'SW', 15],
    ['Zero Point Greater Noida', 'Pari Chowk Road, Near Metro Depot', 'SE', 32, .3], ['Akshardham', 'Opp Akshardham Metro Station Gate No 2', 'E', 8, .8]]],
  Jaipur: ['JAI', 'north', 2, 0, [
    ['Sindhi Camp Bus Stand', 'Station Road, Near Sindhi Camp Metro', 'W', 1.5, 6], ['Polo Victory Cinema', 'Opp Polo Victory Cinema, Sindhi Camp', 'W', 1],
    ['Transport Nagar', 'Agra Road, Near Transport Nagar Chauraha', 'E', 6, 2.5], ['Narayan Singh Circle', 'Near SMS Hospital, Tonk Road', 'E', 2],
    ['200 Feet Bypass', 'Ajmer Road, Near Heerapura Power House', 'W', 9], ['Durgapura', 'Tonk Road, Near Durgapura Flyover', 'S', 8],
    ['Chandpole', 'Near Chandpole Metro Station', 'NW', 2]]],
  Agra: ['AGR', 'north', 2, 0, [
    ['Idgah Bus Stand', 'Near Agra Cantt Railway Station', 'S', 3, 6], ['ISBT Agra', 'Transport Nagar, Sikandra', 'NW', 8],
    ['Bhagwan Talkies', 'NH 19, Near Bhagwan Talkies Crossing', 'N', 4], ['Water Works Chauraha', 'Near Yamuna Bridge', 'NE', 3],
    ['Taj Ganj', 'Near Taj Mahal East Gate Parking', 'E', 4], ['Khandari', 'Near Khandari Crossing', 'N', 5]]],
  Chandigarh: ['CHD', 'north', 2, 0, [
    ['ISBT Sector 43', 'Dakshin Marg, Sector 43', 'SW', 4, 6], ['ISBT Sector 17', 'Near Piccadily Square, Sector 17', 'C', 0.5],
    ['Tribune Chowk', 'Near Tribune Flyover', 'SE', 5], ['Zirakpur', 'Chandigarh–Ambala Highway, Near McDonald’s', 'SE', 13],
    ['Mohali Phase 8', 'Near YPS Chowk', 'W', 7], ['Panchkula Sector 5', 'Near Majri Chowk', 'E', 8]]],
  Manali: ['MNL', 'north', 1, 1, [
    ['Manali Private Bus Stand', 'Near Mall Road, Model Town', 'C', 0.5, 6], ['Aleo', 'Near Aleo Bridge, Left Bank Road', 'S', 2],
    ['Vashisht Chowk', 'Near Beas Bridge', 'N', 2], ['Patlikuhal', 'NH 3, Near Patlikuhal Market', 'S', 16],
    ['Kullu Bus Stand', 'Dhalpur, Near Kullu Maidan', 'S', 40], ['Bhuntar', 'Near Bhuntar Airport Road', 'S', 50]]],
  Shimla: ['SML', 'north', 1, 1, [
    ['ISBT Tutikandi', 'Cart Road, Tutikandi', 'W', 3, 6], ['Old Bus Stand', 'Cart Road, Near Lakkar Bazaar Lift', 'C', 0.5],
    ['Victory Tunnel', 'Near Victory Tunnel, Cart Road', 'C', 1], ['Shoghi', 'Kalka–Shimla Highway', 'S', 13],
    ['Dhalli', 'Near Dhalli Tunnel', 'E', 6]]],
  Dharamshala: ['DHM', 'north', 1, 1, [
    ['Dharamshala Bus Stand', 'Near Kotwali Bazaar', 'C', 0.5, 6], ['McLeod Ganj', 'McLeod Ganj Bus Stand, Near Main Square', 'N', 8, 2.5],
    ['Kachehri Adda', 'Near Deputy Commissioner Office', 'S', 2], ['Kangra', 'Kangra Bus Stand, Near Kangra Fort Road', 'S', 17],
    ['Gaggal', 'Near Gaggal Airport', 'SW', 13]]],
  Dehradun: ['DDN', 'north', 2, 0, [
    ['ISBT Dehradun', 'Saharanpur Road, Near Majra', 'SW', 6, 6], ['Clock Tower', 'Near Ghanta Ghar, Rajpur Road', 'C', 0.5],
    ['Prince Chowk', 'Near Dehradun Railway Station', 'S', 1.5], ['Rispana Pul', 'Haridwar Road, Near Rispana Bridge', 'SE', 5],
    ['Mohkampur', 'Near Mohkampur Flyover', 'SE', 8]]],
  Haridwar: ['HWR', 'north', 2, 0, [
    ['Haridwar Bus Stand', 'Opp Haridwar Railway Station', 'C', 0.5, 6], ['Har Ki Pauri', 'Near Har Ki Pauri Parking', 'N', 2],
    ['Shankaracharya Chowk', 'Near Chandi Devi Ropeway Road', 'S', 3], ['Jwalapur', 'Near Jwalapur Railway Crossing', 'S', 5],
    ['Bahadrabad', 'Delhi–Haridwar Highway', 'SW', 12]]],
  Rishikesh: ['RSK', 'north', 1, 0, [
    ['Rishikesh ISBT', 'Near Chandrabhaga Bridge', 'C', 0.5, 6], ['Natraj Chowk', 'Haridwar Road, Near Natraj Chowk', 'S', 2],
    ['Ram Jhula', 'Near Ram Jhula Taxi Stand', 'N', 4], ['Tapovan', 'Near Laxman Jhula Road', 'N', 6],
    ['Nepali Farm', 'Haridwar–Rishikesh Highway', 'SW', 10]]],
  Nainital: ['NTL', 'north', 1, 1, [
    ['Tallital Bus Stand', 'Near Tallital Rickshaw Stand', 'S', 1, 6], ['Mallital', 'Near Flats Ground', 'N', 1],
    ['Bhowali', 'Bhowali Bus Stand, Near Bhowali Market', 'E', 10], ['Kathgodam', 'Opp Kathgodam Railway Station', 'S', 32],
    ['Haldwani Bus Stand', 'Nainital Road, Haldwani', 'S', 38]]],
  Lucknow: ['LKO', 'north', 2, 0, [
    ['Alambagh Bus Terminal', 'Kanpur Road, Alambagh', 'S', 6, 6], ['Charbagh', 'Opp Charbagh Railway Station', 'S', 4],
    ['Kaisarbagh Bus Stand', 'Near Kaisarbagh Chauraha', 'C', 0.5], ['Polytechnic Chauraha', 'Faizabad Road, Near Polytechnic Metro', 'E', 9],
    ['Awadh Chauraha', 'Near Awadh Hospital, Alambagh', 'SW', 7], ['Kamta', 'Faizabad Road, Near Kamta Chauraha', 'E', 13]]],
  Kanpur: ['KNP', 'north', 2, 0, [
    ['Jhakarkati Bus Stand', 'Near Jhakarkati Chauraha', 'S', 4, 6], ['Rawatpur', 'Near Rawatpur Crossing', 'N', 4],
    ['Rama Devi Chauraha', 'NH 19, Near Rama Devi', 'SE', 8], ['Fazalganj', 'Near Fazalganj Chauraha', 'W', 4],
    ['Tatmil Chauraha', 'Near Tatmil Crossing', 'E', 3]]],
  Varanasi: ['VNS', 'north', 2, 0, [
    ['Varanasi Cantt Bus Stand', 'Opp Varanasi Junction Railway Station', 'N', 3, 6], ['Chaukaghat', 'Near Chaukaghat Flyover', 'N', 2],
    ['Maldahiya', 'Near Maldahiya Chauraha', 'C', 1], ['Lanka', 'Near BHU Main Gate', 'S', 5],
    ['Mughalsarai', 'Pt. DDU Junction, GT Road', 'E', 16]]],
  Amritsar: ['ASR', 'north', 2, 0, [
    ['ISBT Amritsar', 'GT Road, Near Golden Gate', 'N', 2, 6], ['Golden Temple', 'Near Golden Temple Plaza', 'C', 1],
    ['Bhandari Bridge', 'Near Bhandari Bridge, Hall Bazaar', 'C', 1], ['Putlighar', 'Near Putlighar Chowk', 'W', 3],
    ['Verka Bypass', 'Near Verka Milk Plant', 'NE', 6]]],
  Katra: ['KTR', 'north', 1, 0, [
    ['Katra Main Bus Stand', 'Near Tourist Reception Centre', 'C', 0.5, 6], ['Banganga', 'Near Banganga Yatra Registration', 'N', 2],
    ['Katra Railway Station', 'Near SMVD Katra Station', 'S', 2], ['Jammu Bus Stand', 'General Bus Stand, BC Road, Jammu', 'S', 45],
    ['Jammu Tawi Railway Station', 'Near Jammu Tawi Station Parking', 'S', 43]]],
  Mumbai: ['MUM', 'west', 3, 0, [
    ['Dadar TT Circle', 'Opp Swaminarayan Temple, Dadar East', 'S', 10, 6], ['Sion', 'Near Sion Circle, Opp Gandhi Market', 'S', 6],
    ['Chembur', 'Near Chembur Naka', 'E', 5], ['Vashi', 'Near Vashi Plaza, Navi Mumbai', 'E', 14, 2.5],
    ['Andheri East', 'Near Chakala Metro Station, WEH', 'N', 6], ['Borivali East', 'National Park, Western Express Highway', 'N', 20, 2.5],
    ['Thane Kapurbawdi', 'Near Kapurbawdi Junction, Ghodbunder Road', 'NE', 16], ['Panvel', 'Near Panvel Bus Depot, Old Mumbai–Pune Highway', 'SE', 35]]],
  Pune: ['PUN', 'west', 3, 0, [
    ['Swargate', 'Near Swargate Bus Station, Shankarsheth Road', 'S', 3, 6], ['Shivaji Nagar', 'Near Shivaji Nagar Bus Stand', 'C', 1, 2.5],
    ['Wakad Bridge', 'Mumbai–Bangalore Highway, Wakad', 'NW', 14], ['Nigdi', 'Near Bhakti Shakti Chowk', 'NW', 18],
    ['Chandni Chowk', 'Paud Road, Kothrud', 'W', 10], ['Katraj', 'Near Katraj Bus Stop, Satara Road', 'S', 9],
    ['Hadapsar', 'Near Hadapsar Gadital', 'E', 9]]],
  Nashik: ['NSK', 'west', 2, 0, [
    ['Nashik CBS', 'Central Bus Stand, Near Shalimar', 'C', 0.5, 6], ['Mumbai Naka', 'Near Mumbai Naka Circle', 'S', 3],
    ['Dwarka Circle', 'Near Dwarka Flyover', 'E', 2], ['Nashik Road', 'Near Nashik Road Railway Station', 'E', 8],
    ['Adgaon Naka', 'Near Adgaon Naka Chowk', 'NE', 6]]],
  Shirdi: ['SDI', 'west', 1, 0, [
    ['Shirdi Bus Stand', 'Near Sai Baba Temple Gate No 4', 'C', 0.5, 6], ['Pimpalwadi Road', 'Near Sai Prasadalaya', 'W', 1],
    ['Nagar–Manmad Road', 'Near Shirdi Police Station', 'S', 1], ['Kopargaon', 'Kopargaon Bus Stand', 'N', 15]]],
  Goa: ['GOA', 'west', 2, 0, [
    ['Panjim Kadamba Bus Stand', 'Near Patto Bridge, Panaji', 'C', 0.5, 6], ['Mapusa', 'Mapusa Bus Stand, Near Market', 'N', 13, 2.5],
    ['Porvorim', 'Near Porvorim Circle, NH 66', 'N', 6], ['Calangute', 'Near Calangute Circle', 'NW', 15],
    ['Margao', 'Margao KTC Bus Stand, Near Kadamba Depot', 'S', 30, 2.5], ['Vasco', 'Vasco Bus Stand, Near Railway Station', 'SW', 25],
    ['Ponda', 'Ponda Bus Stand', 'SE', 25]]],
  Ahmedabad: ['AMD', 'west', 3, 0, [
    ['Paldi', 'Near Paldi Char Rasta', 'W', 3, 6], ['Geeta Mandir', 'GSRTC Central Bus Station', 'S', 3],
    ['Iskcon Cross Road', 'SG Highway, Near Iskcon Temple', 'W', 8, 2.5], ['Nehru Nagar', 'Near Nehru Nagar Circle', 'W', 4],
    ['Naroda Patiya', 'Near Naroda GIDC', 'NE', 11], ['CTM Cross Road', 'NH 48, Near CTM Char Rasta', 'SE', 9],
    ['Sabarmati', 'Near Sabarmati Railway Station', 'N', 8]]],
  Surat: ['SUR', 'west', 2, 0, [
    ['Surat Central Bus Stand', 'Near Surat Railway Station', 'C', 1, 6], ['Adajan Patiya', 'Near Adajan Gam Circle', 'W', 5],
    ['Varachha', 'Near Hirabaug Circle', 'E', 5], ['Kamrej', 'NH 48, Near Kamrej Char Rasta', 'NE', 18],
    ['Udhna Darwaja', 'Near Udhna Darwaja Bridge', 'S', 4], ['Sachin', 'Near Sachin GIDC', 'S', 14]]],
  Vadodara: ['VAD', 'west', 2, 0, [
    ['Vadodara Central Bus Station', 'Near Vadodara Railway Station', 'C', 1, 6], ['Akota', 'Near Akota Stadium', 'SW', 4],
    ['Golden Chokdi', 'NH 48, Near Golden Chokdi', 'NE', 8], ['Waghodia Crossing', 'Near Waghodia Chokdi', 'E', 6],
    ['Chhani Jakat Naka', 'Near Chhani Octroi Naka', 'N', 7]]],
  Udaipur: ['UDR', 'north', 2, 0, [
    ['Udaipur City Bus Stand', 'Udaipole, Near Roadways Depot', 'C', 1, 6], ['Surajpole', 'Near Surajpole Chauraha', 'C', 1],
    ['Pratap Nagar', 'Near Pratap Nagar Chauraha', 'E', 5], ['Sukher', 'NH 48, Near Sukher Chauraha', 'N', 8],
    ['Goverdhan Vilas', 'Near Goverdhan Vilas Police Station', 'S', 5]]],
  Jodhpur: ['JDH', 'north', 2, 0, [
    ['Raika Bagh Bus Stand', 'Near Raika Bagh Railway Station', 'E', 2, 6], ['Paota Circle', 'Near Paota Chauraha', 'N', 2],
    ['Jalori Gate', 'Near Jalori Gate Circle', 'W', 1], ['Basni', 'Near Basni Industrial Area', 'S', 8],
    ['Banar Road', 'Near AIIMS Road Junction', 'E', 8]]],
  Indore: ['IDR', 'central', 2, 0, [
    ['Sarwate Bus Stand', 'Near Indore Railway Station', 'C', 1, 6], ['Vijay Nagar', 'Near Vijay Nagar Square, AB Road', 'NE', 7, 2.5],
    ['Navlakha Bus Stand', 'Near Navlakha Square', 'S', 3], ['Rajiv Gandhi Square', 'AB Road, Near Rajiv Gandhi Circle', 'S', 8],
    ['Dewas Naka', 'AB Road, Near Dewas Naka Square', 'NE', 10], ['Bhawarkuan', 'Near Bhawarkuan Square', 'S', 5]]],
  Bhopal: ['BPL', 'central', 2, 0, [
    ['ISBT Bhopal', 'Hoshangabad Road, Near Habibganj', 'SE', 6, 6], ['Nadra Bus Stand', 'Near Bhopal Railway Station', 'N', 2],
    ['Board Office Square', 'Near MP Nagar Zone 1', 'S', 3], ['Lalghati', 'Near Lalghati Square, Airport Road', 'NW', 6],
    ['Rani Kamlapati Station', 'Near Habibganj Railway Station', 'S', 5]]],
  Bengaluru: ['BLR', 'south', 3, 0, [
    ['Majestic', 'Kempegowda Bus Station, Near Platform 17', 'W', 2, 6], ['Anand Rao Circle', 'Near Anand Rao Circle Flyover', 'W', 2],
    ['Kalasipalya', 'Near Kalasipalya Bus Stand', 'C', 2], ['Madiwala', 'Near Silk Board Junction, Hosur Road', 'SE', 7, 2.5],
    ['Electronic City', 'Near Infosys Gate, Hosur Road', 'SE', 18], ['Hebbal', 'Near Hebbal Flyover, Bellary Road', 'N', 8],
    ['Yeshwanthpur', 'Near Yeshwanthpur Metro Station', 'NW', 7], ['Marathahalli', 'Near Marathahalli Bridge, ORR', 'E', 12],
    ['Nelamangala', 'NH 48, Near Nelamangala Toll', 'NW', 25]]],
  Mysuru: ['MYS', 'south', 2, 0, [
    ['Mysuru Sub-urban Bus Stand', 'Near KSRTC Suburban Bus Stand', 'C', 1, 6], ['Bannimantap', 'Near Bannimantap Bus Depot', 'N', 3],
    ['Hunsur Road', 'Near Hinkal Flyover', 'W', 5], ['Nanjangud Road', 'Near JSS Hospital', 'S', 5],
    ['Srirangapatna', 'Bengaluru–Mysuru Highway', 'NE', 15]]],
  Mangaluru: ['MLR', 'south', 2, 0, [
    ['Mangaluru Bus Stand', 'KSRTC Bus Stand, Bejai', 'C', 1, 6], ['Hampankatta', 'Near Hampankatta Circle', 'C', 1],
    ['Pumpwell Circle', 'NH 66, Near Pumpwell Flyover', 'S', 3], ['Nanthoor', 'Near Nanthoor Circle', 'E', 3],
    ['Surathkal', 'NH 66, Near NITK', 'N', 16], ['BC Road', 'Bantwal Cross Road, NH 75', 'SE', 23]]],
  Hyderabad: ['HYD', 'south', 3, 0, [
    ['MGBS', 'Mahatma Gandhi Bus Station, Afzalgunj', 'S', 2, 6], ['Lakdi-ka-pul', 'Near Lakdi-ka-pul Bridge', 'C', 2],
    ['Ameerpet', 'Near Ameerpet Metro Station', 'NW', 6, 2.5], ['Kukatpally', 'KPHB Colony, Near JNTU', 'NW', 12],
    ['Miyapur', 'Near Miyapur Metro Station', 'NW', 18], ['Mehdipatnam', 'Near Mehdipatnam Bus Depot', 'W', 6],
    ['Dilsukhnagar', 'Near Dilsukhnagar Bus Stand', 'SE', 7], ['LB Nagar', 'Near LB Nagar Metro Station', 'SE', 10],
    ['Secunderabad', 'Near Paradise Circle', 'N', 8]]],
  Vijayawada: ['VJA', 'south', 2, 0, [
    ['Pandit Nehru Bus Station', 'Bus Stand Road, Near Krishna River', 'C', 1, 6], ['Benz Circle', 'Near Benz Circle Flyover', 'E', 3],
    ['Ramavarappadu Ring', 'NH 16, Near Ring Road', 'E', 7], ['Gollapudi', 'Near Gollapudi Market', 'W', 5],
    ['Auto Nagar', 'Near Auto Nagar Gate', 'E', 5]]],
  Visakhapatnam: ['VSK', 'south', 2, 0, [
    ['Dwaraka Bus Station', 'RTC Complex, Dwaraka Nagar', 'C', 1, 6], ['Maddilapalem', 'Near Maddilapalem Junction', 'N', 3],
    ['NAD Junction', 'Near NAD Flyover', 'W', 7], ['Gajuwaka', 'Near Gajuwaka Junction', 'SW', 12],
    ['Madhurawada', 'Near Madhurawada Junction, NH 16', 'NE', 13]]],
  Tirupati: ['TPT', 'south', 2, 0, [
    ['Tirupati Central Bus Station', 'APSRTC Bus Stand, Near Railway Station', 'C', 1, 6], ['Alipiri', 'Near Alipiri Footpath Gate', 'N', 4],
    ['Leela Mahal Circle', 'Near Leela Mahal Junction', 'C', 1], ['Renigunta', 'Near Renigunta Railway Station', 'E', 12],
    ['Chandragiri', 'Near Chandragiri Fort Road', 'W', 12]]],
  Chennai: ['CHN', 'south', 3, 0, [
    ['Koyambedu CMBT', 'Chennai Mofussil Bus Terminus', 'W', 7, 6], ['Kilambakkam KCBT', 'GST Road, Kilambakkam', 'SW', 30, 2.5],
    ['Guindy', 'Near Guindy Kathipara Junction', 'SW', 9], ['Tambaram', 'Near Tambaram Sanatorium, GST Road', 'SW', 24],
    ['Porur', 'Near Porur Junction', 'W', 12], ['Ashok Pillar', 'Near Ashok Nagar Metro Station', 'SW', 6],
    ['Poonamallee', 'Near Poonamallee Bus Depot', 'W', 20], ['Perungalathur', 'GST Road, Near Perungalathur Bus Stop', 'SW', 22]]],
  Coimbatore: ['CBE', 'south', 2, 0, [
    ['Gandhipuram Omni Bus Stand', 'Near Gandhipuram Central Bus Stand', 'C', 1, 6], ['Ukkadam', 'Near Ukkadam Bus Stand', 'S', 3],
    ['Singanallur', 'Near Singanallur Bus Stand', 'E', 8], ['Avinashi Road', 'Near Hope College Junction', 'NE', 6],
    ['Saravanampatti', 'Near Sathy Road Junction', 'N', 10], ['Karumathampatti', 'NH 544, Near Karumathampatti', 'E', 22]]],
  Madurai: ['MDU', 'south', 2, 0, [
    ['Mattuthavani Bus Stand', 'MGR Integrated Bus Terminus', 'NE', 4, 6], ['Periyar Bus Stand', 'Town Hall Road', 'C', 1],
    ['Arapalayam', 'Near Arapalayam Bus Stand', 'W', 3], ['Kalavasal', 'Near Kalavasal Junction', 'W', 3],
    ['Thirumangalam', 'NH 44, Thirumangalam Bus Stand', 'SW', 18]]],
  Pondicherry: ['PDY', 'south', 1, 0, [
    ['Pondicherry New Bus Stand', 'Maraimalai Adigal Salai', 'W', 1, 6], ['Indira Gandhi Square', 'Near Indira Gandhi Statue', 'W', 2],
    ['Rajiv Gandhi Square', 'East Coast Road Junction', 'N', 2], ['Muthialpet', 'Near Muthialpet Market', 'N', 3],
    ['Mission Street', 'Near Heritage Town', 'C', 0.5]]],
  Kochi: ['COK', 'south', 2, 0, [
    ['Vyttila Mobility Hub', 'Near Vyttila Junction', 'E', 5, 6], ['Ernakulam South', 'Near KSRTC Bus Stand, MG Road', 'C', 1],
    ['Kaloor', 'Near Kaloor Stadium', 'N', 4], ['Edappally', 'Near Lulu Mall, Edappally Junction', 'N', 8, 2.5],
    ['Palarivattom', 'Near Palarivattom Bypass', 'NE', 6], ['Kakkanad', 'Near Infopark Road', 'E', 10],
    ['Aluva', 'Near Aluva KSRTC Bus Stand', 'N', 20]]],
  Thiruvananthapuram: ['TVM', 'south', 2, 0, [
    ['Thampanoor Central Bus Station', 'Opp Central Railway Station', 'C', 1, 6], ['East Fort', 'Near Padmanabhaswamy Temple', 'C', 1],
    ['Pattom', 'Near Pattom Junction', 'N', 3], ['Kazhakkoottam', 'NH 66, Near Technopark', 'N', 13],
    ['Kovalam Junction', 'Near Kovalam Bypass', 'S', 14]]],
  Kolkata: ['KOL', 'east', 3, 0, [
    ['Esplanade', 'Dharmatala Bus Stand, Near New Market', 'C', 1, 6], ['Karunamoyee', 'Salt Lake Central Park Bus Stand', 'E', 8],
    ['Howrah Station', 'Near Howrah Bus Stand', 'W', 3], ['Ultadanga', 'Near Ultadanga Crossing, VIP Road', 'NE', 5],
    ['Airport Gate No 1', 'Jessore Road, Near Airport', 'NE', 15], ['Babughat', 'Near Babughat Bus Stand, Strand Road', 'W', 2],
    ['Sealdah', 'Near Sealdah Station Flyover', 'E', 2]]],
  Siliguri: ['SLG', 'east', 2, 0, [
    ['Tenzing Norgay Bus Terminus', 'Hill Cart Road, Siliguri', 'C', 1, 6], ['Siliguri Junction', 'Near Siliguri Junction Station', 'N', 2],
    ['Sevoke Road', 'Near Sevoke More', 'NE', 3], ['New Jalpaiguri', 'Near NJP Railway Station', 'S', 5, 2.5],
    ['Bagdogra', 'Near Bagdogra Airport', 'W', 12]]],
  Patna: ['PAT', 'east', 2, 0, [
    ['Patliputra ISBT Bairiya', 'NH 30, Bairiya', 'S', 8, 6], ['Mithapur Bus Stand', 'Near Mithapur Flyover', 'S', 3],
    ['Gandhi Maidan', 'Near Gandhi Maidan Bus Stand', 'N', 2], ['Kankarbagh', 'Near Kankarbagh Main Road', 'SE', 4],
    ['Bailey Road', 'Near Raja Bazar, Bailey Road', 'W', 6]]],
  Guwahati: ['GAU', 'east', 2, 0, [
    ['ISBT Guwahati', 'NH 37, Betkuchi', 'SW', 10, 6], ['Paltan Bazaar', 'Near Guwahati Railway Station', 'C', 1, 2.5],
    ['Khanapara', 'Near Khanapara Veterinary College', 'SE', 10], ['Ganeshguri', 'Near Ganeshguri Flyover', 'SE', 6],
    ['Jalukbari', 'Near Jalukbari Flyover, NH 17', 'W', 11], ['Adabari', 'Near Adabari Bus Stand', 'W', 8]]]
};

const DIRS = { N: [0, 1], NE: [.707, .707], E: [1, 0], SE: [.707, -.707], S: [0, -1], SW: [-.707, -.707], W: [-1, 0], NW: [-.707, .707], C: [0, 0] };

export const CITY_META = Object.fromEntries(Object.entries(C).map(([name, [code, region, tier, hill]]) => [name, { name, code, region, tier, hill: !!hill }]));
export const CITY_BY_CODE = Object.fromEntries(Object.values(CITY_META).map(m => [m.code, m.name]));

/** Boarding / dropping points per city with an approximate position (km east, km north of centre). */
export const BUS_POINTS = Object.fromEntries(Object.entries(C).map(([name, row]) => [name, row[4].map(([pname, landmark, dir, km, w]) => {
  const d = DIRS[dir] || DIRS.C;
  return { name: pname, landmark, x: d[0] * km, y: d[1] * km, w: w || 1 };
})]));

/** Points list for autocomplete: "Delhi (All boarding points)" plus each named point. */
export const pointsFor = city => (BUS_POINTS[city] || []).map(p => ({ name: p.name, landmark: p.landmark }));

// ---------------------------------------------------------------- route popularity
// Extra daily services on well-known corridors (key = the two city names sorted, joined by |).
export const CORRIDORS = {
  'Agra|Delhi': 20, 'Chandigarh|Delhi': 26, 'Dehradun|Delhi': 24, 'Delhi|Haridwar': 20, 'Delhi|Jaipur': 30, 'Delhi|Katra': 16,
  'Delhi|Lucknow': 18, 'Delhi|Manali': 25, 'Delhi|Shimla': 18, 'Amritsar|Delhi': 16, 'Delhi|Dharamshala': 14, 'Delhi|Rishikesh': 14,
  'Delhi|Nainital': 12, 'Delhi|Kanpur': 10, 'Chandigarh|Manali': 14, 'Chandigarh|Shimla': 12, 'Jaipur|Udaipur': 14, 'Jaipur|Jodhpur': 12,
  'Agra|Jaipur': 10, 'Ahmedabad|Udaipur': 14, 'Ahmedabad|Mumbai': 20, 'Ahmedabad|Surat': 16, 'Ahmedabad|Vadodara': 16, 'Ahmedabad|Jaipur': 10,
  'Mumbai|Pune': 30, 'Goa|Mumbai': 22, 'Mumbai|Shirdi': 18, 'Mumbai|Nashik': 18, 'Mumbai|Surat': 16, 'Hyderabad|Mumbai': 16,
  'Bengaluru|Mumbai': 10, 'Indore|Mumbai': 12, 'Goa|Pune': 16, 'Hyderabad|Pune': 14, 'Bengaluru|Pune': 12, 'Pune|Shirdi': 12,
  'Nashik|Pune': 12, 'Bhopal|Indore': 18, 'Bengaluru|Chennai': 28, 'Bengaluru|Hyderabad': 22, 'Bengaluru|Mysuru': 18,
  'Bengaluru|Mangaluru': 18, 'Bengaluru|Kochi': 18, 'Bengaluru|Goa': 16, 'Bengaluru|Coimbatore': 16, 'Bengaluru|Tirupati': 14,
  'Bengaluru|Madurai': 12, 'Bengaluru|Pondicherry': 10, 'Chennai|Madurai': 20, 'Chennai|Coimbatore': 20, 'Chennai|Pondicherry': 16,
  'Chennai|Tirupati': 16, 'Chennai|Hyderabad': 16, 'Chennai|Kochi': 10, 'Chennai|Thiruvananthapuram': 8, 'Hyderabad|Vijayawada': 22,
  'Hyderabad|Visakhapatnam': 14, 'Hyderabad|Tirupati': 14, 'Vijayawada|Visakhapatnam': 12, 'Kochi|Thiruvananthapuram': 14,
  'Coimbatore|Kochi': 10, 'Coimbatore|Madurai': 10, 'Kolkata|Siliguri': 16, 'Guwahati|Siliguri': 12, 'Kolkata|Patna': 8,
  'Kanpur|Lucknow': 10, 'Lucknow|Varanasi': 12, 'Haridwar|Rishikesh': 8, 'Dehradun|Haridwar': 8, 'Amritsar|Chandigarh': 10,
  'Amritsar|Katra': 8, 'Delhi|Varanasi': 6, 'Mangaluru|Mysuru': 8, 'Goa|Mangaluru': 8, 'Madurai|Thiruvananthapuram': 6
};

/** How easily two regions are connected by road services (1 = same region). */
export const REGION_AFFINITY = {
  'north|north': 1, 'west|west': 1, 'central|central': 1, 'south|south': 1, 'east|east': 1,
  'north|west': .7, 'central|north': .7, 'central|west': .8, 'south|west': .7, 'central|south': .55,
  'east|north': .55, 'east|south': .45, 'east|west': .4, 'north|south': .4, 'central|east': .5
};

// ---------------------------------------------------------------- landing page content
export const FEATURED_ROUTES = [
  { from: 'Delhi', to: 'Jaipur', img: 'jaipur', note: 'The Pink City, overnight or by morning' },
  { from: 'Delhi', to: 'Manali', img: 'himalayas', note: 'Volvo sleepers into the Kullu valley' },
  { from: 'Mumbai', to: 'Goa', img: 'goa', note: 'Coastal sleepers down the Konkan' },
  { from: 'Bengaluru', to: 'Kochi', img: 'kerala', note: 'Overnight into God’s Own Country' }
];

export const POPULAR_BUS_ROUTES = [
  ['Mumbai', 'Pune'], ['Bengaluru', 'Chennai'], ['Hyderabad', 'Bengaluru'], ['Delhi', 'Dehradun'],
  ['Chennai', 'Madurai'], ['Ahmedabad', 'Udaipur'], ['Kolkata', 'Siliguri'], ['Delhi', 'Katra'],
  ['Pune', 'Goa'], ['Delhi', 'Chandigarh'], ['Hyderabad', 'Vijayawada'], ['Jaipur', 'Udaipur']
];

export const TOP_OPERATORS = ['nuego', 'intrcity', 'zingbus', 'leafybus', 'vrl', 'orange', 'neeta', 'kallada'];

export const BUS_WHY = [
  { icon: 'seat', title: 'Choose your exact seat', text: 'Live seat maps for lower and upper decks, with ladies seats and single berths clearly marked.' },
  { icon: 'pin', title: 'Boarding points that suit you', text: 'Pick from every boarding and dropping point on the route, with timings and landmarks.' },
  { icon: 'shield', title: 'Flexible cancellation', text: 'Cancel at least 6 hours before departure for a partial or full refund, as per the operator’s policy.' },
  { icon: 'headset', title: '24/7 support', text: 'Need help with your ticket? Call or email us any time, day or night.' }
];

export const BUS_FAQ = [
  ['Can I change my boarding point after booking?', 'Boarding points cannot be changed online once a ticket is issued. Call the operator number on your m-ticket or our 24/7 support at least 12 hours before departure — changes depend on the operator’s approval and the bus route. Please reach your boarding point 15 minutes before the scheduled time.'],
  ['What are ladies seats?', 'Seats marked ♀ are reserved for female passengers, and a seat next to a woman is offered only to another woman. Seats marked ♂ are available for male passengers only. The passenger’s gender is checked against the seat while you book.'],
  ['What is the cancellation policy?', 'Cancellations made at least 6 hours before departure may qualify for a partial or full refund, depending on the operator’s policy: typically 10% is deducted more than 48 hours before departure, 25% between 24 and 48 hours, and 50% between 6 and 24 hours. Cancellations within 6 hours of departure or after departure are typically non-refundable.'],
  ['When will I get my refund?', 'Refunds, where applicable, are processed to the original payment method within 7–14 business days of the cancellation. Payment-gateway convenience fees are non-refundable.'],
  ['Do I need to carry an ID or a printed ticket?', 'An m-ticket on your phone is accepted by all operators. Carry a valid government photo ID — the operator may ask for it at boarding.'],
  ['How much luggage can I carry?', 'Most operators allow one piece of luggage (up to about 15 kg) in the boot plus a small bag on board. Excess or commercial luggage may be charged by the operator.'],
  ['How do I track my bus?', 'Buses with Live tracking share a tracking link by SMS about an hour before departure. For other buses, call the conductor or operator number printed on your m-ticket.']
];
