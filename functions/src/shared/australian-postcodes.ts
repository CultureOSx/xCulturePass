export interface PostcodeData {
  postcode: number;
  place_name: string;
  state_name: string;
  state_code: string;
  latitude: number;
  longitude: number;
  accuracy: number;
}

export const australianPostcodes: PostcodeData[] = [
  { postcode: 2000, place_name: 'Sydney', state_name: 'New South Wales', state_code: 'NSW', latitude: -33.8688, longitude: 151.2093, accuracy: 5 },
  { postcode: 2010, place_name: 'Barangaroo', state_name: 'New South Wales', state_code: 'NSW', latitude: -33.8603, longitude: 151.2031, accuracy: 5 },
  { postcode: 2015, place_name: 'Darling Harbour', state_name: 'New South Wales', state_code: 'NSW', latitude: -33.8737, longitude: 151.1996, accuracy: 5 },
  { postcode: 2021, place_name: 'Paddington', state_name: 'New South Wales', state_code: 'NSW', latitude: -33.8903, longitude: 151.2218, accuracy: 5 },
  { postcode: 2037, place_name: 'Parramatta', state_name: 'New South Wales', state_code: 'NSW', latitude: -33.8129, longitude: 151.0038, accuracy: 5 },
  { postcode: 2046, place_name: 'Cronulla', state_name: 'New South Wales', state_code: 'NSW', latitude: -34.0331, longitude: 151.1437, accuracy: 5 },
  { postcode: 2050, place_name: 'Newcastle', state_name: 'New South Wales', state_code: 'NSW', latitude: -32.9271, longitude: 151.7802, accuracy: 5 },
  { postcode: 3000, place_name: 'Melbourne', state_name: 'Victoria', state_code: 'VIC', latitude: -37.8136, longitude: 144.9631, accuracy: 5 },
  { postcode: 3004, place_name: 'Melbourne', state_name: 'Victoria', state_code: 'VIC', latitude: -37.8265, longitude: 144.9627, accuracy: 4 },
  { postcode: 3066, place_name: 'Fitzroy', state_name: 'Victoria', state_code: 'VIC', latitude: -37.8009, longitude: 144.9897, accuracy: 5 },
  { postcode: 3056, place_name: 'Southbank', state_name: 'Victoria', state_code: 'VIC', latitude: -37.8244, longitude: 144.9759, accuracy: 5 },
  { postcode: 3167, place_name: 'St Kilda', state_name: 'Victoria', state_code: 'VIC', latitude: -37.8671, longitude: 144.9685, accuracy: 5 },
  { postcode: 4000, place_name: 'Brisbane', state_name: 'Queensland', state_code: 'QLD', latitude: -27.4679, longitude: 153.0281, accuracy: 5 },
  { postcode: 4101, place_name: 'South Brisbane', state_name: 'Queensland', state_code: 'QLD', latitude: -27.4849, longitude: 153.0163, accuracy: 5 },
  { postcode: 4067, place_name: 'Mount Coot-tha', state_name: 'Queensland', state_code: 'QLD', latitude: -27.4829, longitude: 153.0235, accuracy: 4 },
  { postcode: 6000, place_name: 'Perth', state_name: 'Western Australia', state_code: 'WA', latitude: -31.9505, longitude: 115.8605, accuracy: 5 },
  { postcode: 6009, place_name: 'Fremantle', state_name: 'Western Australia', state_code: 'WA', latitude: -32.0533, longitude: 115.7444, accuracy: 5 },
  { postcode: 5000, place_name: 'Adelaide', state_name: 'South Australia', state_code: 'SA', latitude: -34.9285, longitude: 138.6007, accuracy: 5 },
  { postcode: 7000, place_name: 'Hobart', state_name: 'Tasmania', state_code: 'TAS', latitude: -42.8821, longitude: 147.3271, accuracy: 5 },
  { postcode: 2600, place_name: 'Canberra', state_name: 'Australian Capital Territory', state_code: 'ACT', latitude: -35.2809, longitude: 149.13, accuracy: 5 },
  { postcode: 800, place_name: 'Darwin', state_name: 'Northern Territory', state_code: 'NT', latitude: -12.4634, longitude: 130.8456, accuracy: 5 },
];

const postcodesByState = new Map<string, PostcodeData[]>();
const postcodesByPostcode = new Map<number, PostcodeData>();
const postcodesByPlace = new Map<string, PostcodeData[]>();

australianPostcodes.forEach((data) => {
  if (!postcodesByState.has(data.state_code)) {
    postcodesByState.set(data.state_code, []);
  }
  postcodesByState.get(data.state_code)?.push(data);
  postcodesByPostcode.set(data.postcode, data);

  const place = data.place_name.toLowerCase();
  if (!postcodesByPlace.has(place)) {
    postcodesByPlace.set(place, []);
  }
  postcodesByPlace.get(place)?.push(data);
});

export function getPostcodesByState(stateCode: string): PostcodeData[] {
  return postcodesByState.get(stateCode) ?? [];
}

export function getPostcodeData(postcode: number): PostcodeData | undefined {
  return postcodesByPostcode.get(postcode);
}

export function getPostcodesByPlace(placeName: string): PostcodeData[] {
  return postcodesByPlace.get(placeName.toLowerCase()) ?? [];
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const radius = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return radius * c;
}

export function findNearestPostcodes(
  latitude: number,
  longitude: number,
  count: number = 5,
): PostcodeData[] {
  return australianPostcodes
    .map((postcode) => ({
      ...postcode,
      distance: calculateDistance(latitude, longitude, postcode.latitude, postcode.longitude),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count)
    .map(({ distance, ...rest }) => rest);
}

export function filterByProximity<T extends { latitude: number; longitude: number }>(
  items: T[],
  userLatitude: number,
  userLongitude: number,
  radiusKm: number = 50,
): T[] {
  return items.filter((item) => {
    const distance = calculateDistance(userLatitude, userLongitude, item.latitude, item.longitude);
    return distance <= radiusKm;
  });
}
