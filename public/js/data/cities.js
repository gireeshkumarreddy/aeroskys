// City lists for hotel and bus search. [name, region/state, country, lat, lon]

const H = [
  ['Delhi', 'Delhi NCR', 'India', 28.6139, 77.209], ['Mumbai', 'Maharashtra', 'India', 19.076, 72.8777],
  ['Bengaluru', 'Karnataka', 'India', 12.9716, 77.5946], ['Goa', 'Goa', 'India', 15.4909, 73.8278],
  ['Jaipur', 'Rajasthan', 'India', 26.9124, 75.7873], ['Hyderabad', 'Telangana', 'India', 17.385, 78.4867],
  ['Chennai', 'Tamil Nadu', 'India', 13.0827, 80.2707], ['Kolkata', 'West Bengal', 'India', 22.5726, 88.3639],
  ['Pune', 'Maharashtra', 'India', 18.5204, 73.8567], ['Ahmedabad', 'Gujarat', 'India', 23.0225, 72.5714],
  ['Kochi', 'Kerala', 'India', 9.9312, 76.2673], ['Udaipur', 'Rajasthan', 'India', 24.5854, 73.7125],
  ['Agra', 'Uttar Pradesh', 'India', 27.1767, 78.0081], ['Varanasi', 'Uttar Pradesh', 'India', 25.3176, 82.9739],
  ['Manali', 'Himachal Pradesh', 'India', 32.2432, 77.1892], ['Shimla', 'Himachal Pradesh', 'India', 31.1048, 77.1734],
  ['Srinagar', 'Jammu & Kashmir', 'India', 34.0837, 74.7973], ['Leh', 'Ladakh', 'India', 34.1526, 77.577],
  ['Darjeeling', 'West Bengal', 'India', 27.036, 88.2627], ['Gangtok', 'Sikkim', 'India', 27.3389, 88.6065],
  ['Rishikesh', 'Uttarakhand', 'India', 30.0869, 78.2676], ['Mussoorie', 'Uttarakhand', 'India', 30.4598, 78.0644],
  ['Nainital', 'Uttarakhand', 'India', 29.3919, 79.4542], ['Ooty', 'Tamil Nadu', 'India', 11.4102, 76.695],
  ['Munnar', 'Kerala', 'India', 10.0889, 77.0595], ['Alleppey', 'Kerala', 'India', 9.4981, 76.3388],
  ['Port Blair', 'Andaman & Nicobar', 'India', 11.6234, 92.7265], ['Amritsar', 'Punjab', 'India', 31.634, 74.8723],
  ['Tirupati', 'Andhra Pradesh', 'India', 13.6288, 79.4192], ['Lucknow', 'Uttar Pradesh', 'India', 26.8467, 80.9462],
  ['Dubai', 'Dubai', 'United Arab Emirates', 25.2048, 55.2708], ['Abu Dhabi', 'Abu Dhabi', 'United Arab Emirates', 24.4539, 54.3773],
  ['Singapore', 'Singapore', 'Singapore', 1.3521, 103.8198], ['Bangkok', 'Bangkok', 'Thailand', 13.7563, 100.5018],
  ['Phuket', 'Phuket', 'Thailand', 7.8804, 98.3923], ['Pattaya', 'Chonburi', 'Thailand', 12.9236, 100.8825],
  ['Bali', 'Bali', 'Indonesia', -8.3405, 115.092], ['Kuala Lumpur', 'Kuala Lumpur', 'Malaysia', 3.139, 101.6869],
  ['Kathmandu', 'Bagmati', 'Nepal', 27.7172, 85.324], ['Colombo', 'Western Province', 'Sri Lanka', 6.9271, 79.8612],
  ['Malé', 'Kaafu Atoll', 'Maldives', 4.1755, 73.5093], ['London', 'England', 'United Kingdom', 51.5072, -0.1276],
  ['Paris', 'Île-de-France', 'France', 48.8566, 2.3522], ['Zurich', 'Zurich', 'Switzerland', 47.3769, 8.5417],
  ['Istanbul', 'Istanbul', 'Turkey', 41.0082, 28.9784], ['Hanoi', 'Hanoi', 'Vietnam', 21.0278, 105.8342],
  ['New York', 'New York', 'United States', 40.7128, -74.006], ['Sydney', 'New South Wales', 'Australia', -33.8688, 151.2093]
];
export const HOTEL_CITIES = H.map(([name, region, country, lat, lon]) => ({ name, region, country, lat, lon, intl: country !== 'India' }));
export const hotelCity = name => HOTEL_CITIES.find(c => c.name.toLowerCase() === String(name || '').toLowerCase());

const B = [
  ['Delhi', 'Delhi', 28.6139, 77.209], ['Jaipur', 'Rajasthan', 26.9124, 75.7873], ['Agra', 'Uttar Pradesh', 27.1767, 78.0081],
  ['Chandigarh', 'Chandigarh', 30.7333, 76.7794], ['Manali', 'Himachal Pradesh', 32.2432, 77.1892], ['Shimla', 'Himachal Pradesh', 31.1048, 77.1734],
  ['Dharamshala', 'Himachal Pradesh', 32.219, 76.3234], ['Dehradun', 'Uttarakhand', 30.3165, 78.0322], ['Haridwar', 'Uttarakhand', 29.9457, 78.1642],
  ['Rishikesh', 'Uttarakhand', 30.0869, 78.2676], ['Nainital', 'Uttarakhand', 29.3919, 79.4542], ['Lucknow', 'Uttar Pradesh', 26.8467, 80.9462],
  ['Kanpur', 'Uttar Pradesh', 26.4499, 80.3319], ['Varanasi', 'Uttar Pradesh', 25.3176, 82.9739], ['Amritsar', 'Punjab', 31.634, 74.8723],
  ['Katra', 'Jammu & Kashmir', 32.9916, 74.9319], ['Mumbai', 'Maharashtra', 19.076, 72.8777], ['Pune', 'Maharashtra', 18.5204, 73.8567],
  ['Nashik', 'Maharashtra', 19.9975, 73.7898], ['Shirdi', 'Maharashtra', 19.7645, 74.4762], ['Goa', 'Goa', 15.4909, 73.8278],
  ['Ahmedabad', 'Gujarat', 23.0225, 72.5714], ['Surat', 'Gujarat', 21.1702, 72.8311], ['Vadodara', 'Gujarat', 22.3072, 73.1812],
  ['Udaipur', 'Rajasthan', 24.5854, 73.7125], ['Jodhpur', 'Rajasthan', 26.2389, 73.0243], ['Indore', 'Madhya Pradesh', 22.7196, 75.8577],
  ['Bhopal', 'Madhya Pradesh', 23.2599, 77.4126], ['Bengaluru', 'Karnataka', 12.9716, 77.5946], ['Mysuru', 'Karnataka', 12.2958, 76.6394],
  ['Mangaluru', 'Karnataka', 12.9141, 74.856], ['Hyderabad', 'Telangana', 17.385, 78.4867], ['Vijayawada', 'Andhra Pradesh', 16.5062, 80.648],
  ['Visakhapatnam', 'Andhra Pradesh', 17.6868, 83.2185], ['Tirupati', 'Andhra Pradesh', 13.6288, 79.4192], ['Chennai', 'Tamil Nadu', 13.0827, 80.2707],
  ['Coimbatore', 'Tamil Nadu', 11.0168, 76.9558], ['Madurai', 'Tamil Nadu', 9.9252, 78.1198], ['Pondicherry', 'Puducherry', 11.9416, 79.8083],
  ['Kochi', 'Kerala', 9.9312, 76.2673], ['Thiruvananthapuram', 'Kerala', 8.5241, 76.9366], ['Kolkata', 'West Bengal', 22.5726, 88.3639],
  ['Siliguri', 'West Bengal', 26.7271, 88.3953], ['Patna', 'Bihar', 25.5941, 85.1376], ['Guwahati', 'Assam', 26.1445, 91.7362]
];
export const BUS_CITIES = B.map(([name, state, lat, lon]) => ({ name, state, lat, lon }));
export const busCity = name => BUS_CITIES.find(c => c.name.toLowerCase() === String(name || '').toLowerCase());

export const NATIONALITIES = [['IN', 'India'], ['AE', 'United Arab Emirates'], ['GB', 'United Kingdom'], ['US', 'United States'], ['CA', 'Canada'], ['AU', 'Australia'], ['SG', 'Singapore'], ['NP', 'Nepal'], ['LK', 'Sri Lanka'], ['BD', 'Bangladesh'], ['MY', 'Malaysia'], ['DE', 'Germany'], ['FR', 'France']];
