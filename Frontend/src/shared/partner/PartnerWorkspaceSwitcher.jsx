/**
 * Hop between the two businesses one partner runs.
 *
 * A tab bar sat at the top of both dashboards and took a strip of layout from
 * screens that are already tight on a phone. This is a floating circle in the
 * bottom corner instead: it costs no layout, and because it hovers over content
 * it can be dragged out of the way of whatever it happens to cover.
 *
 * Icon only, so it stays small. Which dashboard it leads to is in the label and
 * the tooltip rather than on the face of it.
 *
 * Tap to switch, drag to move. Those are the same gesture until the pointer
 * travels far enough, so a drag is only a drag past DRAG_THRESHOLD — below
 * that it stays a tap, and a click that follows a real drag is swallowed.
 *
 * Renders only for partners who have both businesses; one business should
 * never see a control offering to switch to something it does not have.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftRight } from 'lucide-react';
import {
  hasBothProfiles,
  setActiveWorkspace,
  WORKSPACE,
  WORKSPACE_HOME,
} from './partnerSession';

/*
 * Screens this has no business appearing on.
 *
 * Signing in, verifying a code or working through an onboarding wizard is a
 * single-purpose flow: there is either no session to switch with yet, or
 * jumping to the other dashboard mid-wizard would throw away what has been
 * filled in. The control belongs on the dashboards and the pages under them.
 */
const FLOW_SCREENS = [
  '/login',
  '/otp',
  '/signup',
  '/forgot-password',
  '/pending-verification',
  '/onboarding',
  '/add-hotel',
  '/partner/join',
];

const isFlowScreen = (pathname = '') =>
  FLOW_SCREENS.some((fragment) => String(pathname).includes(fragment));

const POSITION_KEY = 'partner_switcher_position';

/** Below this, the pointer never left the button and it counts as a tap. */
const DRAG_THRESHOLD = 6;

const EDGE_MARGIN = 12;

/** Clear of the bottom navs both panels pin to the bottom of the screen. */
const DEFAULT_BOTTOM_GAP = 96;

const readStoredPosition = () => {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return typeof parsed?.x === 'number' && typeof parsed?.y === 'number' ? parsed : null;
  } catch {
    return null;
  }
};

export default function PartnerWorkspaceSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();

  const nodeRef = useRef(null);
  const dragRef = useRef(null);
  const positionRef = useRef(null);
  const suppressClickRef = useRef(false);

  const [position, setPosition] = useState(null);
  const [dragging, setDragging] = useState(false);

  const both = hasBothProfiles();
  const show = both && !isFlowScreen(location.pathname);

  /** Keep the pill fully on screen, whatever the viewport does. */
  const clamp = useCallback((x, y) => {
    const node = nodeRef.current;
    const width = node?.offsetWidth || 56;
    const height = node?.offsetHeight || 56;

    return {
      x: Math.min(Math.max(x, EDGE_MARGIN), window.innerWidth - width - EDGE_MARGIN),
      y: Math.min(Math.max(y, EDGE_MARGIN), window.innerHeight - height - EDGE_MARGIN),
    };
  }, []);

  const applyPosition = useCallback((next) => {
    positionRef.current = next;
    setPosition(next);
  }, []);

  // Place it once the button has a measurable size: stored spot, else bottom right.
  useEffect(() => {
    if (!show) return undefined;

    const place = () => {
      const node = nodeRef.current;
      if (!node) return;

      const stored = readStoredPosition();
      const fallback = {
        x: window.innerWidth - node.offsetWidth - EDGE_MARGIN,
        y: window.innerHeight - node.offsetHeight - DEFAULT_BOTTOM_GAP,
      };

      const spot = stored || fallback;
      applyPosition(clamp(spot.x, spot.y));
    };

    place();
    window.addEventListener('resize', place);

    return () => window.removeEventListener('resize', place);
  }, [show, clamp, applyPosition]);

  if (!show) return null;

  const active = location.pathname.startsWith('/hotel')
    ? WORKSPACE.HOTEL
    : WORKSPACE.RESTAURANT;

  const target = active === WORKSPACE.HOTEL ? WORKSPACE.RESTAURANT : WORKSPACE.HOTEL;
  const label = target === WORKSPACE.HOTEL ? 'Switch to Hotel' : 'Switch to Restaurant';

  const handlePointerDown = (event) => {
    const rect = nodeRef.current.getBoundingClientRect();

    dragRef.current = {
      grabX: event.clientX - rect.left,
      grabY: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };

    nodeRef.current.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag) return;

    const travelled = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.moved && travelled < DRAG_THRESHOLD) return;

    if (!drag.moved) {
      drag.moved = true;
      setDragging(true);
    }

    applyPosition(clamp(event.clientX - drag.grabX, event.clientY - drag.grabY));
  };

  const endDrag = (event) => {
    const drag = dragRef.current;
    dragRef.current = null;

    nodeRef.current?.releasePointerCapture?.(event.pointerId);

    if (!drag) return;

    if (drag.moved) {
      // The click that follows this pointerup is the tail of a drag, not a tap.
      suppressClickRef.current = true;
      setDragging(false);

      try {
        localStorage.setItem(POSITION_KEY, JSON.stringify(positionRef.current));
      } catch {
        /* the pill just returns to its default spot next time */
      }
    }
  };

  /** Click rather than pointerup, so Enter and Space work too. */
  const handleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    setActiveWorkspace(target);
    navigate(WORKSPACE_HOME[target]);
  };

  return (
    <button
      ref={nodeRef}
      type="button"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={handleClick}
      aria-label={`${label}. Drag to reposition.`}
      title={label}
      style={{
        position: 'fixed',
        left: position ? `${position.x}px` : undefined,
        top: position ? `${position.y}px` : undefined,
        // Hidden until measured, so it never flashes in the wrong corner.
        visibility: position ? 'visible' : 'hidden',
        touchAction: 'none',
        zIndex: 2147483000,
        cursor: dragging ? 'grabbing' : 'pointer',
        transition: dragging ? 'none' : 'transform 120ms ease',
        transform: dragging ? 'scale(1.04)' : 'scale(1)',
      }}
      className="flex h-14 w-14 select-none items-center justify-center rounded-full bg-slate-900 text-white shadow-xl shadow-slate-900/30 ring-1 ring-white/10"
    >
      <ArrowLeftRight size={20} strokeWidth={2.25} />
    </button>
  );
}
