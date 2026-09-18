// A small offline starter list, not an exhaustive city directory. Some entries
// (such as Bali) are travel areas rather than municipalities.
export const popularDestinations = {
  AU: ["Sydney", "Melbourne", "Brisbane", "Perth", "Gold Coast", "Adelaide"],
  BR: ["Rio de Janeiro", "São Paulo", "Salvador", "Brasília", "Florianópolis"],
  CA: ["Toronto", "Vancouver", "Montreal", "Québec City", "Calgary", "Ottawa"],
  CH: ["Zurich", "Geneva", "Lucerne", "Bern", "Basel", "Interlaken"],
  CN: ["Beijing", "Shanghai", "Guangzhou", "Shenzhen", "Chengdu", "Xi'an"],
  DE: ["Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne", "Dresden"],
  EG: ["Cairo", "Alexandria", "Luxor", "Aswan", "Hurghada"],
  ES: ["Madrid", "Barcelona", "Seville", "Valencia", "Málaga", "Granada"],
  FR: ["Paris", "Lyon", "Nice", "Marseille", "Bordeaux", "Strasbourg"],
  GB: ["London", "Edinburgh", "Manchester", "Liverpool", "Bath", "Oxford"],
  ID: ["Bali", "Jakarta", "Yogyakarta", "Bandung", "Surabaya", "Lombok"],
  IN: ["Mumbai", "Delhi", "Bengaluru", "Jaipur", "Goa", "Agra"],
  IT: ["Rome", "Milan", "Florence", "Venice", "Naples", "Bologna"],
  JP: ["Tokyo", "Osaka", "Kyoto", "Sapporo", "Fukuoka", "Hiroshima"],
  KH: ["Phnom Penh", "Siem Reap", "Battambang", "Kampot"],
  KR: ["Seoul", "Busan", "Jeju Island", "Incheon", "Daegu", "Gyeongju"],
  LA: ["Vientiane", "Luang Prabang", "Vang Vieng", "Pakse"],
  LK: ["Colombo", "Kandy", "Galle", "Ella", "Nuwara Eliya"],
  MM: ["Yangon", "Mandalay", "Bagan", "Naypyidaw"],
  MX: ["Mexico City", "Cancún", "Guadalajara", "Oaxaca City", "Tulum"],
  MY: ["Kuala Lumpur", "Penang", "Johor Bahru", "Langkawi", "Malacca", "Kota Kinabalu"],
  NL: ["Amsterdam", "Rotterdam", "Utrecht", "The Hague", "Haarlem"],
  NP: ["Kathmandu", "Pokhara", "Chitwan", "Bhaktapur"],
  NZ: ["Auckland", "Wellington", "Queenstown", "Christchurch", "Rotorua"],
  PH: ["Manila", "Cebu City", "Boracay", "Davao", "Baguio", "El Nido"],
  SG: ["Singapore"],
  TH: ["Bangkok", "Chiang Mai", "Phuket", "Pattaya", "Krabi", "Ayutthaya"],
  TR: ["Istanbul", "Ankara", "Antalya", "Izmir", "Cappadocia"],
  TW: ["Taipei", "Kaohsiung", "Taichung", "Tainan", "Hualien"],
  UA: ["Kyiv", "Lviv", "Odesa", "Kharkiv"],
  US: ["New York", "Los Angeles", "San Francisco", "Chicago", "Miami", "Las Vegas"],
  VN: ["Hanoi", "Ho Chi Minh City", "Da Nang", "Hoi An", "Nha Trang", "Hue"],
  ZA: ["Cape Town", "Johannesburg", "Durban", "Pretoria", "Stellenbosch"],
};

export function suggestionsForCountry(countryCode) {
  return popularDestinations[countryCode] ?? [];
}
