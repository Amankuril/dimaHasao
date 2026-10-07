import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import { ArrowLeftRight } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { localStore } from '../../lib/storage';
import { useNavigate } from '../../lib/webRouter';
import { WORKSPACE, WORKSPACE_HOME, hasBothProfiles, setActiveWorkspace } from '../utils/partnerSession';

/*
 * Port of Frontend/src/shared/partner/PartnerWorkspaceSwitcher.jsx.
 *
 * Hop between the two businesses one partner runs. A floating circle in the
 * bottom corner (no layout cost) that can be dragged out of the way. Tap to
 * switch, drag to move; a drag only counts past DRAG_THRESHOLD. Renders only
 * for partners who hold both a restaurant and a hotel session, and never on a
 * single-purpose flow (sign-in, onboarding, wizards).
 */
const FLOW_SCREENS = ['/login', '/otp', '/signup', '/forgot-password', '/pending-verification', '/onboarding', '/add-hotel', '/partner/join', '/under-review'];
const isFlowScreen = (pathname = '') => FLOW_SCREENS.some((fragment) => String(pathname).includes(fragment));

const POSITION_KEY = 'partner_switcher_position';
const SIZE = 56;
const DRAG_THRESHOLD = 6;
const EDGE_MARGIN = 12;
const DEFAULT_BOTTOM_GAP = 96;

const readStoredPosition = () => {
  try {
    const parsed = JSON.parse(localStore.getItem(POSITION_KEY) || 'null');
    return typeof parsed?.x === 'number' && typeof parsed?.y === 'number' ? parsed : null;
  } catch {
    return null;
  }
};

export default function PartnerWorkspaceSwitcher() {
  const navigate = useNavigate();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  // Subscribes to both halves of the session; the check itself is the web's hasBothProfiles() (live token, not just listed).
  useAuth();
  const both = hasBothProfiles();
  const show = both && !isFlowScreen(pathname);

  const clamp = (x, y) => ({
    x: Math.min(Math.max(x, EDGE_MARGIN), width - SIZE - EDGE_MARGIN),
    y: Math.min(Math.max(y, EDGE_MARGIN + insets.top), height - SIZE - EDGE_MARGIN - insets.bottom),
  });

  const pos = useRef(new Animated.ValueXY({ x: -200, y: -200 })).current;
  const current = useRef({ x: 0, y: 0 });
  const start = useRef({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const placed = useRef(false);

  // Place it once: stored spot, else bottom right clear of the bottom navs.
  useEffect(() => {
    if (!show || placed.current) return;
    const spot = readStoredPosition() || { x: width - SIZE - EDGE_MARGIN, y: height - SIZE - DEFAULT_BOTTOM_GAP - insets.bottom };
    const next = clamp(spot.x, spot.y);
    current.current = next;
    pos.setValue(next);
    placed.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const active = pathname.startsWith('/hotel') ? WORKSPACE.HOTEL : WORKSPACE.RESTAURANT;
  const target = active === WORKSPACE.HOTEL ? WORKSPACE.RESTAURANT : WORKSPACE.HOTEL;
  const label = target === WORKSPACE.HOTEL ? 'Switch to Hotel' : 'Switch to Restaurant';

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          start.current = { ...current.current };
        },
        onPanResponderMove: (_, g) => {
          if (Math.hypot(g.dx, g.dy) < DRAG_THRESHOLD) return;
          setDragging(true);
          const next = clamp(start.current.x + g.dx, start.current.y + g.dy);
          current.current = next;
          pos.setValue(next);
        },
        onPanResponderRelease: (_, g) => {
          if (Math.hypot(g.dx, g.dy) < DRAG_THRESHOLD) {
            setActiveWorkspace(target);
            navigate(WORKSPACE_HOME[target]);
          } else {
            localStore.setItem(POSITION_KEY, JSON.stringify(current.current));
          }
          setDragging(false);
        },
        onPanResponderTerminate: () => setDragging(false),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [target, width, height, insets.top, insets.bottom],
  );

  if (!show) return null;
  return (
    <Animated.View
      {...responder.panHandlers}
      accessibilityRole="button"
      accessibilityLabel={`${label}. Drag to reposition.`}
      style={[styles.btn, { transform: [...pos.getTranslateTransform(), { scale: dragging ? 1.04 : 1 }] }]}
    >
      <ArrowLeftRight size={20} color="#fff" strokeWidth={2.25} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
    zIndex: 1000,
    shadowColor: '#0f172a',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
});
