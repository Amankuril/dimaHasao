import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown } from 'lucide-react-native';
import { BottomSheet } from '../kit';
import { Press } from '../ui';
import { useKeyboardHeight } from '../../lib/useKeyboard';
import { display, shadow, tw } from '../../theme';

/*
 * Web: DeliveryV2/components/BottomPopup.jsx. A bottom sheet that springs up
 * (framer spring 300/30), dims the page, and is dismissed by dragging the
 * top 80 px down more than 100 px, tapping the backdrop, or (with
 * closeOnHandleClick) tapping the handle. Without it the handle collapses
 * the sheet to `collapsedContent` (max-height 120 px).
 *
 * Props match the web. `maxHeight` takes "86vh" style strings or a number.
 * `backdropBlocksInteraction={false}` cannot let touches through a native
 * Modal, so it only hides the backdrop. Text in the header is the web's h3:
 * Sora (theme), text-lg font-semibold.
 */

function resolveMax(maxHeight, windowHeight) {
  if (typeof maxHeight === 'number') return maxHeight;
  const m = String(maxHeight || '').match(/^([\d.]+)(vh|px)?$/);
  if (!m) return windowHeight * 0.86;
  return m[2] === 'px' ? Number(m[1]) : (windowHeight * Number(m[1])) / 100;
}

export default function BottomPopup({
  isOpen,
  onClose,
  children,
  title,
  showCloseButton = true,
  closeOnBackdropClick = true,
  maxHeight = '86vh',
  showHandle = true,
  disableSwipeToClose = false,
  collapsedContent = null,
  showBackdrop = true,
  backdropBlocksInteraction = true,
  closeOnHandleClick = false,
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const dragY = useRef(new Animated.Value(0)).current;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const swipeOff = useRef(disableSwipeToClose);
  swipeOff.current = disableSwipeToClose;

  // Reset drag / collapse when the popup closes.
  useEffect(() => {
    if (!isOpen) {
      dragY.setValue(0);
      setIsCollapsed(false);
    }
  }, [isOpen, dragY]);

  const handleClose = () => {
    dragY.setValue(0);
    closeRef.current?.();
  };

  // Swipe-down on the handle / header strip (the web's top 80 px).
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => !swipeOff.current && g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_e, g) => {
          if (g.dy > 0) dragY.setValue(g.dy);
        },
        onPanResponderRelease: (_e, g) => {
          if (g.dy > 100) {
            dragY.setValue(0);
            closeRef.current?.();
          } else {
            Animated.spring(dragY, { toValue: 0, stiffness: 300, damping: 30, mass: 1, useNativeDriver: true }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(dragY, { toValue: 0, stiffness: 300, damping: 30, mass: 1, useNativeDriver: true }).start();
        },
      }),
    [dragY],
  );

  const max = Math.min(resolveMax(maxHeight, height), height - keyboard - insets.top);
  const hasHeader = Boolean(title) || showCloseButton;

  return (
    <BottomSheet
      visible={Boolean(isOpen)}
      onClose={handleClose}
      backdrop={showBackdrop && backdropBlocksInteraction ? 'rgba(0,0,0,0.5)' : 'transparent'}
      closeOnBackdrop={closeOnBackdropClick}
      spring={{ stiffness: 300, damping: 30 }}
      panelStyle={{ marginBottom: keyboard }}
    >
      <Animated.View
        style={[
          styles.panel,
          shadow('2xl'),
          { maxHeight: isCollapsed ? 120 : max, transform: [{ translateY: dragY }] },
        ]}
      >
        <View {...pan.panHandlers}>
          {showHandle ? (
            <Pressable
              onPress={() => (closeOnHandleClick ? handleClose() : setIsCollapsed((c) => !c))}
              accessibilityRole="button"
              accessibilityLabel={closeOnHandleClick ? 'Close' : isCollapsed ? 'Expand' : 'Collapse'}
              style={styles.handle}
            >
              <ChevronDown size={24} color={tw.gray400} style={{ marginBottom: 4 }} />
              <View style={styles.bar} />
            </Pressable>
          ) : null}

          {hasHeader ? (
            <View style={[styles.header, !showHandle && { paddingTop: 20 }]}>
              {title ? <Text style={styles.title}>{title}</Text> : null}
              {showCloseButton ? (
                <Press onPress={handleClose} accessibilityLabel="Close" style={styles.close}>
                  <ChevronDown size={24} color={tw.gray600} />
                </Press>
              ) : null}
            </View>
          ) : null}
        </View>

        {!isCollapsed ? (
          <ScrollView
            style={styles.scroll}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12 + insets.bottom }}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 20 + insets.bottom }}>{collapsedContent}</View>
        )}
      </Animated.View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  handle: { alignItems: 'center', paddingTop: 12, paddingBottom: 8, width: '100%' },
  bar: { width: 48, height: 6, borderRadius: 3, backgroundColor: tw.gray300 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: tw.gray100,
  },
  title: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...display(600, 18) },
  close: { marginLeft: 'auto', padding: 8, borderRadius: 999 },
  scroll: { flexGrow: 0, flexShrink: 1 },
});
