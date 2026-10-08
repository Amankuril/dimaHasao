/*
 * framer-motion, as far as the admin web uses it: `motion.div` / `motion.button`
 * / `motion.span` ... and <AnimatePresence>.
 *
 * Each motion element is the matching components/web.jsx primitive. Its
 * entrance animation is kept in intent: when `initial` sets opacity / x / y /
 * scale and `animate` settles them, the element fades / slides / scales in on
 * mount (once). Exit animations, layout animations, hover and tap effects are
 * dropped: there is no hover on a phone, and AnimatePresence unmounts at once.
 */
import { forwardRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { Button, Div, Li, Section, Span, Ul, Header, Aside, Nav, P, H1, H2, H3, Form, Img } from '../components/web';
import { useAnimatedValue } from './useAnimatedValue';

const num = (v, d) => (typeof v === 'number' ? v : d);

function useEntrance(initial, animate, transition) {
  const from = initial && typeof initial === 'object' ? initial : null;
  const to = animate && typeof animate === 'object' ? animate : {};
  const p = useAnimatedValue(from ? 0 : 1);
  useEffect(() => {
    if (!from) return;
    const ms = Math.round(num(transition?.duration, 0.3) * 1000);
    const delay = Math.round(num(transition?.delay, 0) * 1000);
    Animated.timing(p, { toValue: 1, duration: ms, delay, useNativeDriver: true }).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!from) return null;
  const style = {};
  const transform = [];
  if (from.opacity != null) style.opacity = p.interpolate({ inputRange: [0, 1], outputRange: [num(from.opacity, 1), num(to.opacity, 1)] });
  if (from.x != null) transform.push({ translateX: p.interpolate({ inputRange: [0, 1], outputRange: [num(from.x, 0), num(to.x, 0)] }) });
  if (from.y != null) transform.push({ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [num(from.y, 0), num(to.y, 0)] }) });
  if (from.scale != null) transform.push({ scale: p.interpolate({ inputRange: [0, 1], outputRange: [num(from.scale, 1), num(to.scale, 1)] }) });
  if (transform.length) style.transform = transform;
  return style;
}

const MOTION_PROPS = ['initial', 'animate', 'exit', 'transition', 'variants', 'whileHover', 'whileTap', 'whileInView', 'whileFocus', 'layout', 'layoutId', 'drag', 'dragConstraints', 'viewport', 'custom', 'onAnimationComplete', 'onAnimationStart'];

function make(Base) {
  const M = forwardRef(function Motion(props, ref) {
    const { initial, animate, transition, variants } = props;
    const resolvedInitial = typeof initial === 'string' && variants ? variants[initial] : initial;
    const resolvedAnimate = typeof animate === 'string' && variants ? variants[animate] : animate;
    const entrance = useEntrance(resolvedInitial === false ? null : resolvedInitial, resolvedAnimate, transition || resolvedAnimate?.transition);
    const rest = {};
    Object.keys(props).forEach((k) => {
      if (!MOTION_PROPS.includes(k)) rest[k] = props[k];
    });
    if (!entrance) return <Base ref={ref} {...rest} />;
    return (
      <Animated.View style={entrance}>
        <Base ref={ref} {...rest} />
      </Animated.View>
    );
  });
  return M;
}

export const motion = {
  div: make(Div),
  section: make(Section),
  header: make(Header),
  aside: make(Aside),
  nav: make(Nav),
  form: make(Form),
  ul: make(Ul),
  li: make(Li),
  button: make(Button),
  span: make(Span),
  p: make(P),
  h1: make(H1),
  h2: make(H2),
  h3: make(H3),
  img: make(Img),
  tr: make(Div),
};

export function AnimatePresence({ children }) {
  return <>{children}</>;
}

export default motion;
