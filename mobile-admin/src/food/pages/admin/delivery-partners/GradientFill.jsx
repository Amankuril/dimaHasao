/* Local helper: the tw bridge drops `bg-gradient-to-*` / `from-*` / `to-*`, so a gradient
   surface would render with no background at all. Drop this in as the first child of the
   element that carried the gradient classes (give that element `overflow-hidden`). */
import { LinearGradient } from 'expo-linear-gradient';

const DIRECTIONS = {
  r: { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } },
  br: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
};

export default function GradientFill({ colors, direction = 'r' }) {
  const { start, end } = DIRECTIONS[direction] || DIRECTIONS.r;
  return (
    <LinearGradient
      colors={colors}
      start={start}
      end={end}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    />
  );
}
