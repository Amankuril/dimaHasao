/**
 * Places a rider can pick from when Google Places is unavailable.
 *
 * The list this replaces was fifteen Indore landmarks — Vijay Nagar, Rajwada,
 * Bhawarkua — with a default pickup of "Pipaliyahana, Indore", carried over
 * from the previous product. A rider in Dima Hasao opening the drop picker saw
 * a different state's suburbs.
 *
 * These are the district's own towns and landmarks. They are the fallback when
 * the Maps key is missing or Places returns nothing; with a key configured,
 * autocomplete takes over and this list only backs the "popular" shortcuts.
 *
 * Coordinates are [longitude, latitude], matching GeoJSON and the rest of the
 * ride payload.
 */
export const DISTRICT_PLACES = [
  { title: 'Haflong', address: 'Haflong, Dima Hasao, Assam', coords: [93.0167, 25.1667] },
  { title: 'Haflong Lake', address: 'Haflong Lake, Haflong, Dima Hasao', coords: [93.0151, 25.1642] },
  { title: 'Jatinga', address: 'Jatinga, Dima Hasao, Assam', coords: [93.0206, 25.0997] },
  { title: 'New Haflong', address: 'New Haflong, Dima Hasao, Assam', coords: [93.0244, 25.1856] },
  { title: 'Maibang', address: 'Maibang, Dima Hasao, Assam', coords: [93.1333, 25.3000] },
  { title: 'Umrangso', address: 'Umrangso, Dima Hasao, Assam', coords: [92.7000, 25.5500] },
  { title: 'Harangajao', address: 'Harangajao, Dima Hasao, Assam', coords: [92.9000, 25.2167] },
  { title: 'Mahur', address: 'Mahur, Dima Hasao, Assam', coords: [93.1167, 25.3833] },
  { title: 'Langting', address: 'Langting, Dima Hasao, Assam', coords: [93.1833, 25.5167] },
  { title: 'Diyungbra', address: 'Diyungbra, Dima Hasao, Assam', coords: [92.8500, 25.4333] },
  { title: 'Panimoor Falls', address: 'Panimoor Falls, Dima Hasao, Assam', coords: [92.7833, 25.5167] },
  { title: 'Haflong Railway Station', address: 'New Haflong Railway Station, Dima Hasao', coords: [93.0261, 25.1839] },
  { title: 'Haflong Bus Stand', address: 'Haflong Bus Stand, Dima Hasao, Assam', coords: [93.0179, 25.1654] },
  { title: 'District Hospital Haflong', address: 'District Hospital, Haflong, Dima Hasao', coords: [93.0193, 25.1681] },
  { title: 'Fiangpui', address: 'Fiangpui, Haflong, Dima Hasao', coords: [93.0122, 25.1598] },
];

/** The district headquarters — the sensible default pickup. */
export const DEFAULT_PLACE = DISTRICT_PLACES[0];

export const DEFAULT_COORDS = DEFAULT_PLACE.coords;

export const DISTRICT_PLACE_COORDS = Object.fromEntries(
  DISTRICT_PLACES.map((place) => [place.title, place.coords]),
);

/** Coordinates for a known place name, falling back to the headquarters. */
export const coordsForPlace = (title, fallback = DEFAULT_COORDS) =>
  DISTRICT_PLACE_COORDS[title] || fallback;
