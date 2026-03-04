export const SEED_EVENT_CITIES = [
  { city: 'Sydney', state: 'NSW' },
  { city: 'Melbourne', state: 'VIC' },
  { city: 'Brisbane', state: 'QLD' },
  { city: 'Perth', state: 'WA' },
  { city: 'Adelaide', state: 'SA' },
] as const;

export const SEED_EVENT_NAMES = [
  'Cultural Street Food Carnival',
  'Global Community Film Night',
  'First Nations Art & Story Evening',
  'Desi Fusion Music Live',
  'Multicultural Youth Fest',
  'Asian Makers Night Market',
  'African Rhythm Showcase',
  'Latin Heritage Dance Social',
  'Middle Eastern Music Circle',
  'Pacific Islands Community Day',
] as const;

export const SEED_COUNTS = {
  businesses: 5,
  artists: 10,
  communities: 5,
  venues: 5,
  services: 5,
  movies: 5,
} as const;
