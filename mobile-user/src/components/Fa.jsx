import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

/*
 * The tourism shell draws its icons with Font Awesome 6 class strings
 * (`<i className="fa-solid fa-leaf">`). This takes the same string, so
 * data that carries an icon (menus, amenities, API tags) ports unchanged.
 */
export default function Fa({ name = '', size = 14, color = '#fff', style }) {
  const parts = String(name).split(/\s+/).filter(Boolean);
  const regular = parts.includes('fa-regular');
  const brand = parts.includes('fa-brands');
  const glyph = parts
    .filter((p) => p.startsWith('fa-') && !['fa-solid', 'fa-regular', 'fa-brands'].includes(p))
    .map((p) => p.slice(3))[0];
  if (!glyph) return null;
  return <FontAwesome6 name={glyph} size={size} color={color} solid={!regular && !brand} regular={regular} brand={brand} style={style} />;
}
