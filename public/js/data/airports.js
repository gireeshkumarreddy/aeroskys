// Airport reference data: [code, city, airport, country, cc, lat, lon, utcOffsetHours]
// Standard-time offsets are used (daylight saving is not modelled in the prototype).
const A = [
  ['DEL', 'Delhi', 'Indira Gandhi International Airport', 'India', 'IN', 28.5562, 77.1, 5.5],
  ['BOM', 'Mumbai', 'Chhatrapati Shivaji Maharaj International Airport', 'India', 'IN', 19.0896, 72.8656, 5.5],
  ['BLR', 'Bengaluru', 'Kempegowda International Airport', 'India', 'IN', 13.1986, 77.7066, 5.5],
  ['CCU', 'Kolkata', 'Netaji Subhas Chandra Bose International Airport', 'India', 'IN', 22.6547, 88.4467, 5.5],
  ['MAA', 'Chennai', 'Chennai International Airport', 'India', 'IN', 12.9941, 80.1709, 5.5],
  ['HYD', 'Hyderabad', 'Rajiv Gandhi International Airport', 'India', 'IN', 17.2403, 78.4294, 5.5],
  ['GOI', 'Goa (South)', 'Dabolim Airport', 'India', 'IN', 15.3808, 73.8314, 5.5],
  ['GOX', 'Goa (North)', 'Manohar International Airport, Mopa', 'India', 'IN', 15.7442, 73.8606, 5.5],
  ['COK', 'Kochi', 'Cochin International Airport', 'India', 'IN', 10.152, 76.4019, 5.5],
  ['AMD', 'Ahmedabad', 'Sardar Vallabhbhai Patel International Airport', 'India', 'IN', 23.0772, 72.6347, 5.5],
  ['PNQ', 'Pune', 'Pune International Airport', 'India', 'IN', 18.5822, 73.9197, 5.5],
  ['JAI', 'Jaipur', 'Jaipur International Airport', 'India', 'IN', 26.8242, 75.8122, 5.5],
  ['LKO', 'Lucknow', 'Chaudhary Charan Singh International Airport', 'India', 'IN', 26.7606, 80.8893, 5.5],
  ['PAT', 'Patna', 'Jay Prakash Narayan International Airport', 'India', 'IN', 25.5913, 85.088, 5.5],
  ['SXR', 'Srinagar', 'Sheikh ul-Alam International Airport', 'India', 'IN', 33.9871, 74.7742, 5.5],
  ['IXL', 'Leh', 'Kushok Bakula Rimpochee Airport', 'India', 'IN', 34.1359, 77.5465, 5.5],
  ['IXJ', 'Jammu', 'Jammu Airport', 'India', 'IN', 32.6891, 74.8374, 5.5],
  ['ATQ', 'Amritsar', 'Sri Guru Ram Dass Jee International Airport', 'India', 'IN', 31.7096, 74.7973, 5.5],
  ['IXC', 'Chandigarh', 'Chandigarh International Airport', 'India', 'IN', 30.6735, 76.7885, 5.5],
  ['DED', 'Dehradun', 'Jolly Grant Airport', 'India', 'IN', 30.1897, 78.1803, 5.5],
  ['VNS', 'Varanasi', 'Lal Bahadur Shastri International Airport', 'India', 'IN', 25.4524, 82.8593, 5.5],
  ['AYJ', 'Ayodhya', 'Maharishi Valmiki International Airport', 'India', 'IN', 26.7519, 82.15, 5.5],
  ['IXD', 'Prayagraj', 'Prayagraj Airport', 'India', 'IN', 25.4401, 81.7339, 5.5],
  ['GOP', 'Gorakhpur', 'Gorakhpur Airport', 'India', 'IN', 26.7397, 83.4497, 5.5],
  ['GAU', 'Guwahati', 'Lokpriya Gopinath Bordoloi International Airport', 'India', 'IN', 26.1061, 91.5859, 5.5],
  ['IXB', 'Bagdogra', 'Bagdogra Airport (for Darjeeling & Sikkim)', 'India', 'IN', 26.6812, 88.3286, 5.5],
  ['BBI', 'Bhubaneswar', 'Biju Patnaik International Airport', 'India', 'IN', 20.2444, 85.8178, 5.5],
  ['IXR', 'Ranchi', 'Birsa Munda Airport', 'India', 'IN', 23.3143, 85.3217, 5.5],
  ['RPR', 'Raipur', 'Swami Vivekananda Airport', 'India', 'IN', 21.1804, 81.7388, 5.5],
  ['NAG', 'Nagpur', 'Dr. Babasaheb Ambedkar International Airport', 'India', 'IN', 21.0922, 79.0472, 5.5],
  ['IDR', 'Indore', 'Devi Ahilya Bai Holkar Airport', 'India', 'IN', 22.7218, 75.8011, 5.5],
  ['BHO', 'Bhopal', 'Raja Bhoj Airport', 'India', 'IN', 23.2875, 77.3374, 5.5],
  ['UDR', 'Udaipur', 'Maharana Pratap Airport', 'India', 'IN', 24.6177, 73.8961, 5.5],
  ['JDH', 'Jodhpur', 'Jodhpur Airport', 'India', 'IN', 26.2511, 73.0489, 5.5],
  ['IXZ', 'Port Blair', 'Veer Savarkar International Airport', 'India', 'IN', 11.6412, 92.7297, 5.5],
  ['AGX', 'Agatti', 'Agatti Aerodrome (Lakshadweep)', 'India', 'IN', 10.8237, 72.176, 5.5],
  ['TRV', 'Thiruvananthapuram', 'Trivandrum International Airport', 'India', 'IN', 8.4821, 76.9201, 5.5],
  ['CCJ', 'Kozhikode', 'Calicut International Airport', 'India', 'IN', 11.1368, 75.9553, 5.5],
  ['CJB', 'Coimbatore', 'Coimbatore International Airport', 'India', 'IN', 11.03, 77.0434, 5.5],
  ['IXM', 'Madurai', 'Madurai Airport', 'India', 'IN', 9.8345, 78.0934, 5.5],
  ['TRZ', 'Tiruchirappalli', 'Tiruchirappalli International Airport', 'India', 'IN', 10.7654, 78.7097, 5.5],
  ['TIR', 'Tirupati', 'Tirupati Airport', 'India', 'IN', 13.6325, 79.5433, 5.5],
  ['VTZ', 'Visakhapatnam', 'Visakhapatnam Airport', 'India', 'IN', 17.7212, 83.2245, 5.5],
  ['VGA', 'Vijayawada', 'Vijayawada International Airport', 'India', 'IN', 16.5304, 80.7968, 5.5],
  ['IXE', 'Mangaluru', 'Mangaluru International Airport', 'India', 'IN', 12.9613, 74.8901, 5.5],
  ['HBX', 'Hubballi', 'Hubballi Airport', 'India', 'IN', 15.3617, 75.0849, 5.5],
  ['IXA', 'Agartala', 'Maharaja Bir Bikram Airport', 'India', 'IN', 23.887, 91.2404, 5.5],
  ['IMF', 'Imphal', 'Bir Tikendrajit International Airport', 'India', 'IN', 24.76, 93.8967, 5.5],
  ['DIB', 'Dibrugarh', 'Dibrugarh Airport', 'India', 'IN', 27.4839, 95.0169, 5.5],
  ['STV', 'Surat', 'Surat International Airport', 'India', 'IN', 21.1141, 72.7418, 5.5],
  ['BDQ', 'Vadodara', 'Vadodara Airport', 'India', 'IN', 22.3362, 73.2263, 5.5],
  ['HSR', 'Rajkot', 'Rajkot International Airport', 'India', 'IN', 22.3786, 71.0272, 5.5],
  ['KUU', 'Kullu-Manali', 'Bhuntar Airport', 'India', 'IN', 31.8767, 77.1544, 5.5],
  ['DHM', 'Dharamshala', 'Kangra Airport', 'India', 'IN', 32.1651, 76.2634, 5.5],
  ['IXU', 'Aurangabad', 'Aurangabad Airport', 'India', 'IN', 19.8627, 75.3981, 5.5],
  ['KNU', 'Kanpur', 'Kanpur Airport', 'India', 'IN', 26.4043, 80.4101, 5.5],
  ['DXB', 'Dubai', 'Dubai International Airport', 'United Arab Emirates', 'AE', 25.2532, 55.3657, 4],
  ['AUH', 'Abu Dhabi', 'Zayed International Airport', 'United Arab Emirates', 'AE', 24.433, 54.6511, 4],
  ['SHJ', 'Sharjah', 'Sharjah International Airport', 'United Arab Emirates', 'AE', 25.3286, 55.5172, 4],
  ['DOH', 'Doha', 'Hamad International Airport', 'Qatar', 'QA', 25.2731, 51.6081, 3],
  ['BAH', 'Bahrain', 'Bahrain International Airport', 'Bahrain', 'BH', 26.2708, 50.6336, 3],
  ['MCT', 'Muscat', 'Muscat International Airport', 'Oman', 'OM', 23.5933, 58.2844, 4],
  ['KWI', 'Kuwait City', 'Kuwait International Airport', 'Kuwait', 'KW', 29.2266, 47.9689, 3],
  ['RUH', 'Riyadh', 'King Khalid International Airport', 'Saudi Arabia', 'SA', 24.9576, 46.6988, 3],
  ['JED', 'Jeddah', 'King Abdulaziz International Airport', 'Saudi Arabia', 'SA', 21.6796, 39.1565, 3],
  ['DMM', 'Dammam', 'King Fahd International Airport', 'Saudi Arabia', 'SA', 26.4712, 49.7979, 3],
  ['CAI', 'Cairo', 'Cairo International Airport', 'Egypt', 'EG', 30.1219, 31.4056, 2],
  ['IST', 'Istanbul', 'Istanbul Airport', 'Turkey', 'TR', 41.2753, 28.7519, 3],
  ['GYD', 'Baku', 'Heydar Aliyev International Airport', 'Azerbaijan', 'AZ', 40.4675, 50.0467, 4],
  ['TBS', 'Tbilisi', 'Tbilisi International Airport', 'Georgia', 'GE', 41.6692, 44.9547, 4],
  ['ALA', 'Almaty', 'Almaty International Airport', 'Kazakhstan', 'KZ', 43.3521, 77.0405, 5],
  ['NQZ', 'Astana', 'Nursultan Nazarbayev International Airport', 'Kazakhstan', 'KZ', 51.0222, 71.4669, 5],
  ['TAS', 'Tashkent', 'Islam Karimov Tashkent International Airport', 'Uzbekistan', 'UZ', 41.2579, 69.2812, 5],
  ['SIN', 'Singapore', 'Singapore Changi Airport', 'Singapore', 'SG', 1.3644, 103.9915, 8],
  ['KUL', 'Kuala Lumpur', 'Kuala Lumpur International Airport', 'Malaysia', 'MY', 2.7456, 101.7099, 8],
  ['BKK', 'Bangkok', 'Suvarnabhumi Airport', 'Thailand', 'TH', 13.69, 100.7501, 7],
  ['DMK', 'Bangkok', 'Don Mueang International Airport', 'Thailand', 'TH', 13.9126, 100.6068, 7],
  ['HKT', 'Phuket', 'Phuket International Airport', 'Thailand', 'TH', 8.1132, 98.3169, 7],
  ['KBV', 'Krabi', 'Krabi International Airport', 'Thailand', 'TH', 8.0986, 98.9862, 7],
  ['DPS', 'Bali (Denpasar)', 'I Gusti Ngurah Rai International Airport', 'Indonesia', 'ID', -8.7482, 115.1675, 8],
  ['CGK', 'Jakarta', 'Soekarno–Hatta International Airport', 'Indonesia', 'ID', -6.1256, 106.6559, 7],
  ['HAN', 'Hanoi', 'Noi Bai International Airport', 'Vietnam', 'VN', 21.2212, 105.8072, 7],
  ['SGN', 'Ho Chi Minh City', 'Tan Son Nhat International Airport', 'Vietnam', 'VN', 10.8188, 106.652, 7],
  ['SAI', 'Siem Reap', 'Siem Reap–Angkor International Airport', 'Cambodia', 'KH', 13.37, 104.224, 7],
  ['MNL', 'Manila', 'Ninoy Aquino International Airport', 'Philippines', 'PH', 14.5086, 121.0198, 8],
  ['MLE', 'Malé', 'Velana International Airport', 'Maldives', 'MV', 4.1918, 73.5291, 5],
  ['CMB', 'Colombo', 'Bandaranaike International Airport', 'Sri Lanka', 'LK', 7.1808, 79.8841, 5.5],
  ['KTM', 'Kathmandu', 'Tribhuvan International Airport', 'Nepal', 'NP', 27.6966, 85.3591, 5.75],
  ['DAC', 'Dhaka', 'Hazrat Shahjalal International Airport', 'Bangladesh', 'BD', 23.8433, 90.3978, 6],
  ['PBH', 'Paro', 'Paro International Airport', 'Bhutan', 'BT', 27.4032, 89.4246, 6],
  ['HKG', 'Hong Kong', 'Hong Kong International Airport', 'Hong Kong', 'HK', 22.308, 113.9185, 8],
  ['CAN', 'Guangzhou', 'Guangzhou Baiyun International Airport', 'China', 'CN', 23.3924, 113.2988, 8],
  ['PVG', 'Shanghai', 'Shanghai Pudong International Airport', 'China', 'CN', 31.1443, 121.8083, 8],
  ['PEK', 'Beijing', 'Beijing Capital International Airport', 'China', 'CN', 40.0799, 116.6031, 8],
  ['TPE', 'Taipei', 'Taiwan Taoyuan International Airport', 'Taiwan', 'TW', 25.0797, 121.2342, 8],
  ['NRT', 'Tokyo', 'Narita International Airport', 'Japan', 'JP', 35.772, 140.3929, 9],
  ['HND', 'Tokyo', 'Haneda Airport', 'Japan', 'JP', 35.5494, 139.7798, 9],
  ['ICN', 'Seoul', 'Incheon International Airport', 'South Korea', 'KR', 37.4602, 126.4407, 9],
  ['SYD', 'Sydney', 'Sydney Kingsford Smith Airport', 'Australia', 'AU', -33.9399, 151.1753, 10],
  ['MEL', 'Melbourne', 'Melbourne Airport', 'Australia', 'AU', -37.669, 144.841, 10],
  ['BNE', 'Brisbane', 'Brisbane Airport', 'Australia', 'AU', -27.3842, 153.1175, 10],
  ['PER', 'Perth', 'Perth Airport', 'Australia', 'AU', -31.9385, 115.9672, 8],
  ['AKL', 'Auckland', 'Auckland Airport', 'New Zealand', 'NZ', -37.0082, 174.785, 12],
  ['CHC', 'Christchurch', 'Christchurch Airport', 'New Zealand', 'NZ', -43.4894, 172.532, 12],
  ['ZQN', 'Queenstown', 'Queenstown Airport', 'New Zealand', 'NZ', -45.0211, 168.7392, 12],
  ['LHR', 'London', 'Heathrow Airport', 'United Kingdom', 'GB', 51.47, -0.4543, 0],
  ['LGW', 'London', 'Gatwick Airport', 'United Kingdom', 'GB', 51.1537, -0.1821, 0],
  ['STN', 'London', 'Stansted Airport', 'United Kingdom', 'GB', 51.886, 0.2389, 0],
  ['MAN', 'Manchester', 'Manchester Airport', 'United Kingdom', 'GB', 53.3537, -2.275, 0],
  ['BHX', 'Birmingham', 'Birmingham Airport', 'United Kingdom', 'GB', 52.4539, -1.748, 0],
  ['CDG', 'Paris', 'Charles de Gaulle Airport', 'France', 'FR', 49.0097, 2.5479, 1],
  ['FRA', 'Frankfurt', 'Frankfurt Airport', 'Germany', 'DE', 50.0379, 8.5622, 1],
  ['MUC', 'Munich', 'Munich Airport', 'Germany', 'DE', 48.3537, 11.775, 1],
  ['AMS', 'Amsterdam', 'Amsterdam Airport Schiphol', 'Netherlands', 'NL', 52.3105, 4.7683, 1],
  ['ZRH', 'Zurich', 'Zurich Airport', 'Switzerland', 'CH', 47.4582, 8.5555, 1],
  ['GVA', 'Geneva', 'Geneva Airport', 'Switzerland', 'CH', 46.2381, 6.109, 1],
  ['VIE', 'Vienna', 'Vienna International Airport', 'Austria', 'AT', 48.1103, 16.5697, 1],
  ['FCO', 'Rome', 'Leonardo da Vinci–Fiumicino Airport', 'Italy', 'IT', 41.8003, 12.2389, 1],
  ['MXP', 'Milan', 'Milan Malpensa Airport', 'Italy', 'IT', 45.6306, 8.7281, 1],
  ['MAD', 'Madrid', 'Adolfo Suárez Madrid–Barajas Airport', 'Spain', 'ES', 40.4983, -3.5676, 1],
  ['BCN', 'Barcelona', 'Josep Tarradellas Barcelona–El Prat Airport', 'Spain', 'ES', 41.2974, 2.0833, 1],
  ['PRG', 'Prague', 'Václav Havel Airport Prague', 'Czechia', 'CZ', 50.1008, 14.26, 1],
  ['CPH', 'Copenhagen', 'Copenhagen Airport', 'Denmark', 'DK', 55.618, 12.6508, 1],
  ['ATH', 'Athens', 'Athens International Airport', 'Greece', 'GR', 37.9364, 23.9445, 2],
  ['HEL', 'Helsinki', 'Helsinki Airport', 'Finland', 'FI', 60.3172, 24.9633, 2],
  ['RVN', 'Rovaniemi', 'Rovaniemi Airport', 'Finland', 'FI', 66.5648, 25.8304, 2],
  ['SVO', 'Moscow', 'Sheremetyevo International Airport', 'Russia', 'RU', 55.9726, 37.4146, 3],
  ['JFK', 'New York', 'John F. Kennedy International Airport', 'United States', 'US', 40.6413, -73.7781, -5],
  ['EWR', 'Newark', 'Newark Liberty International Airport', 'United States', 'US', 40.6895, -74.1745, -5],
  ['IAD', 'Washington', 'Washington Dulles International Airport', 'United States', 'US', 38.9531, -77.4565, -5],
  ['ORD', 'Chicago', "O'Hare International Airport", 'United States', 'US', 41.9742, -87.9073, -6],
  ['DFW', 'Dallas', 'Dallas Fort Worth International Airport', 'United States', 'US', 32.8998, -97.0403, -6],
  ['SFO', 'San Francisco', 'San Francisco International Airport', 'United States', 'US', 37.6213, -122.379, -8],
  ['LAX', 'Los Angeles', 'Los Angeles International Airport', 'United States', 'US', 33.9416, -118.4085, -8],
  ['YYZ', 'Toronto', 'Toronto Pearson International Airport', 'Canada', 'CA', 43.6777, -79.6248, -5],
  ['YUL', 'Montreal', 'Montréal–Trudeau International Airport', 'Canada', 'CA', 45.4706, -73.7408, -5],
  ['YVR', 'Vancouver', 'Vancouver International Airport', 'Canada', 'CA', 49.1967, -123.1815, -8],
  ['YXX', 'Abbotsford', 'Abbotsford International Airport', 'Canada', 'CA', 49.0253, -122.3608, -8],
  ['MRU', 'Mauritius', 'Sir Seewoosagur Ramgoolam International Airport', 'Mauritius', 'MU', -20.4302, 57.6836, 4],
  ['SEZ', 'Mahé', 'Seychelles International Airport', 'Seychelles', 'SC', -4.6743, 55.5218, 4],
  ['NBO', 'Nairobi', 'Jomo Kenyatta International Airport', 'Kenya', 'KE', -1.3192, 36.9278, 3],
  ['ADD', 'Addis Ababa', 'Addis Ababa Bole International Airport', 'Ethiopia', 'ET', 8.9779, 38.7993, 3],
  ['JNB', 'Johannesburg', 'O. R. Tambo International Airport', 'South Africa', 'ZA', -26.1392, 28.246, 2]
];

export const AIRPORTS = A.map(([code, city, name, country, cc, lat, lon, tz]) => ({ code, city, name, country, cc, lat, lon, tz }));
export const AIRPORT = Object.fromEntries(AIRPORTS.map(a => [a.code, a]));

export const POPULAR_FROM = ['DEL', 'BOM', 'BLR', 'CCU', 'HYD', 'MAA', 'GOI', 'COK', 'AMD', 'PNQ'];
export const POPULAR_TO = ['BOM', 'DEL', 'BLR', 'GOI', 'DXB', 'SIN', 'BKK', 'MLE', 'LHR', 'KTM'];

export const REGION = {
  IN: 'india', AE: 'gulf', QA: 'gulf', BH: 'gulf', OM: 'gulf', KW: 'gulf', SA: 'gulf', EG: 'africa',
  SG: 'sea', MY: 'sea', TH: 'sea', ID: 'sea', VN: 'sea', KH: 'sea', PH: 'sea',
  MV: 'south', LK: 'south', NP: 'south', BD: 'south', BT: 'south',
  HK: 'eastasia', CN: 'eastasia', TW: 'eastasia', JP: 'eastasia', KR: 'eastasia',
  GB: 'europe', FR: 'europe', DE: 'europe', NL: 'europe', CH: 'europe', AT: 'europe', IT: 'europe', ES: 'europe', CZ: 'europe', DK: 'europe', GR: 'europe', FI: 'europe', TR: 'europe', RU: 'europe',
  AZ: 'centralasia', GE: 'centralasia', KZ: 'centralasia', UZ: 'centralasia',
  US: 'namerica', CA: 'namerica', AU: 'oceania', NZ: 'oceania',
  MU: 'africa', SC: 'africa', KE: 'africa', ET: 'africa', ZA: 'africa'
};

export function distanceKm(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const ALIASES = { bangalore: 'BLR', bombay: 'BOM', calcutta: 'CCU', madras: 'MAA', cochin: 'COK', trivandrum: 'TRV', calicut: 'CCJ', mangalore: 'IXE', vizag: 'VTZ', gurgaon: 'DEL', 'new delhi': 'DEL', noida: 'DEL', manali: 'KUU', darjeeling: 'IXB', siliguri: 'IXB', gangtok: 'IXB', lakshadweep: 'AGX', andaman: 'IXZ', bali: 'DPS', 'new york': 'JFK', nyc: 'JFK', london: 'LHR', dubai: 'DXB', paris: 'CDG', mopa: 'GOX', dabolim: 'GOI' };

export function searchAirports(q, limit = 12) {
  const s = norm(q.trim());
  if (!s) return [];
  const out = [];
  for (const a of AIRPORTS) {
    const code = a.code.toLowerCase(), city = norm(a.city), name = norm(a.name), country = norm(a.country);
    let score = 0;
    if (code === s) score = 100;
    else if (city.startsWith(s)) score = 80;
    else if (code.startsWith(s)) score = 70;
    else if (city.includes(s)) score = 55;
    else if (name.includes(s)) score = 40;
    else if (country.startsWith(s)) score = 30;
    if (ALIASES[s] === a.code || Object.entries(ALIASES).some(([k, v]) => v === a.code && k.startsWith(s) && s.length > 2)) score = Math.max(score, 85);
    if (score) out.push([score + (a.cc === 'IN' ? 3 : 0), a]);
  }
  return out.sort((x, y) => y[0] - x[0]).slice(0, limit).map(x => x[1]);
}
