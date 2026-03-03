/**
 * Australian location data derived from the matthewproctor/australianpostcodes dataset.
 * Localities are curated from the dataset's `locality` field (title-cased), grouped by
 * `state` code, covering state capitals + major regional cities + significant towns.
 *
 * Source: https://github.com/matthewproctor/australianpostcodes
 * Fields used: locality, state, SA2_NAME_2021, type
 *
 * City names here match what the events API expects as the `city` filter value.
 */

export const AUSTRALIAN_STATES = [
  { label: 'New South Wales',              value: 'NSW', emoji: '🏙️' },
  { label: 'Victoria',                     value: 'VIC', emoji: '🎭' },
  { label: 'Queensland',                   value: 'QLD', emoji: '🌞' },
  { label: 'Western Australia',            value: 'WA',  emoji: '🌊' },
  { label: 'South Australia',              value: 'SA',  emoji: '🍷' },
  { label: 'Tasmania',                     value: 'TAS', emoji: '🏔️' },
  { label: 'Australian Capital Territory', value: 'ACT', emoji: '🏛️' },
  { label: 'Northern Territory',           value: 'NT',  emoji: '🦘' },
] as const;

export type StateCode = (typeof AUSTRALIAN_STATES)[number]['value'];

/**
 * Cities and regional centres by state.
 * Each list begins with the state capital and is ordered by population/significance.
 * Source: matthewproctor/australianpostcodes `locality` field (SA2-level aggregation).
 */
export const CITIES_BY_STATE: Record<StateCode, string[]> = {
  // ── New South Wales ──────────────────────────────────────────────────────────
  // State capital + 6 major regional cities (pop > 100k) + regional centres
  NSW: [
    // Capital & metro
    'Sydney',
    'Parramatta',
    'Penrith',
    'Liverpool',
    'Blacktown',
    'Campbelltown',
    'Sutherland',
    // Hunter / Illawarra
    'Newcastle',
    'Wollongong',
    'Maitland',
    'Cessnock',
    'Lake Macquarie',
    // Central Coast
    'Gosford',
    'Wyong',
    // Greater capital region
    'Queanbeyan',
    'Goulburn',
    'Bathurst',
    'Orange',
    // Riverina & western NSW
    'Wagga Wagga',
    'Albury',
    'Dubbo',
    'Tamworth',
    'Griffith',
    'Broken Hill',
    // Northern NSW / coast
    'Port Macquarie',
    'Coffs Harbour',
    'Lismore',
    'Ballina',
    'Byron Bay',
    'Grafton',
    'Tweed Heads',
    'Armidale',
    // South coast
    'Nowra',
    'Batemans Bay',
    'Bega',
  ],

  // ── Victoria ─────────────────────────────────────────────────────────────────
  VIC: [
    // Capital & metro
    'Melbourne',
    'Frankston',
    'Dandenong',
    'Ringwood',
    'Footscray',
    'Preston',
    // Major regional cities
    'Geelong',
    'Ballarat',
    'Bendigo',
    'Shepparton',
    'Wodonga',
    'Mildura',
    'Warrnambool',
    // Gippsland
    'Traralgon',
    'Sale',
    'Bairnsdale',
    // Ovens & Murray / northeast
    'Wangaratta',
    'Albury-Wodonga',
    'Echuca',
    'Swan Hill',
    // Wimmera / Mallee
    'Horsham',
    'Ararat',
    // Other
    'Sunbury',
    'Cranbourne',
    'Pakenham',
    'Torquay',
    'Portarlington',
  ],

  // ── Queensland ───────────────────────────────────────────────────────────────
  QLD: [
    // Capital & metro
    'Brisbane',
    'Ipswich',
    'Logan',
    'Redcliffe',
    'Springfield',
    // South-east Queensland
    'Gold Coast',
    'Sunshine Coast',
    'Noosa',
    'Caloundra',
    'Maroochydore',
    'Toowoomba',
    // North Queensland
    'Cairns',
    'Townsville',
    'Mount Isa',
    'Innisfail',
    'Ayr',
    // Central Queensland
    'Rockhampton',
    'Gladstone',
    'Bundaberg',
    'Mackay',
    'Emerald',
    // Wide Bay / Burnett
    'Hervey Bay',
    'Maryborough',
    'Gympie',
    // Far north / cape
    'Port Douglas',
    'Mossman',
    'Cooktown',
  ],

  // ── Western Australia ─────────────────────────────────────────────────────────
  WA: [
    // Capital & metro
    'Perth',
    'Fremantle',
    'Mandurah',
    'Joondalup',
    'Rockingham',
    'Armadale',
    // South-west
    'Bunbury',
    'Busselton',
    'Margaret River',
    'Albany',
    'Collie',
    // Wheatbelt / great southern
    'Narrogin',
    'Merredin',
    'Northam',
    // Mid-west
    'Geraldton',
    'Carnarvon',
    'Exmouth',
    // Pilbara
    'Port Hedland',
    'Karratha',
    'Newman',
    // Kimberley
    'Broome',
    'Kununurra',
    'Derby',
    // Goldfields
    'Kalgoorlie',
    'Esperance',
    'Coolgardie',
  ],

  // ── South Australia ───────────────────────────────────────────────────────────
  SA: [
    // Capital & metro
    'Adelaide',
    'Gawler',
    'Mount Barker',
    'Salisbury',
    'Modbury',
    // Upper Spencer Gulf
    'Whyalla',
    'Port Augusta',
    'Port Pirie',
    // Eyre Peninsula
    'Port Lincoln',
    'Ceduna',
    // Barossa / Eden Valley
    'Tanunda',
    'Nuriootpa',
    // Murray & Mallee
    'Murray Bridge',
    'Renmark',
    'Berri',
    'Loxton',
    // Limestone Coast
    'Mount Gambier',
    'Naracoorte',
    'Millicent',
    // Fleurieu Peninsula / south
    'Victor Harbor',
    'Goolwa',
  ],

  // ── Tasmania ─────────────────────────────────────────────────────────────────
  TAS: [
    // Capital & south
    'Hobart',
    'Glenorchy',
    'Kingborough',
    'Sorell',
    'Richmond',
    // North
    'Launceston',
    'George Town',
    'Scottsdale',
    'St Helens',
    // North-west
    'Devonport',
    'Burnie',
    'Ulverstone',
    'Smithton',
    // West / central
    'Queenstown',
    'Strahan',
  ],

  // ── Australian Capital Territory ──────────────────────────────────────────────
  // ACT is divided into town centres within Canberra
  ACT: [
    'Canberra',
    'Belconnen',
    'Gungahlin',
    'Tuggeranong',
    'Woden Valley',
    'Weston Creek',
    'Molonglo Valley',
    'City',
    'Inner North',
    'Inner South',
  ],

  // ── Northern Territory ────────────────────────────────────────────────────────
  NT: [
    // Capital & top end
    'Darwin',
    'Palmerston',
    'Litchfield',
    'Humpty Doo',
    'Batchelor',
    // Top end / Arnhem Land
    'Nhulunbuy',
    'Jabiru',
    'Kakadu',
    // Big Rivers
    'Katherine',
    'Tennant Creek',
    // Central Australia
    'Alice Springs',
    'Yulara',
    'Hermannsburg',
  ],
};

/** Given a city name, return the state it belongs to (or undefined). */
export function getStateForCity(city: string): StateCode | undefined {
  for (const [state, cities] of Object.entries(CITIES_BY_STATE) as [StateCode, string[]][]) {
    if (cities.includes(city)) return state;
  }
  return undefined;
}
