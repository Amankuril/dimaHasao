import { useState } from 'react';
import { LayoutAnimation, StyleSheet, Text, View } from 'react-native';
import Fa from '../Fa';
import { Press } from '../ui';
import { dh, montserrat, poppins, shadow, tw } from '../../theme';

/** 'bg-rose-50 text-rose-600' -> { bg, fg } */
export function tint(classes = '') {
  const pick = (prefix) => {
    const m = String(classes).match(new RegExp(`${prefix}-([a-z]+)-(\\d{2,3})`));
    return m ? tw[`${m[1]}${m[2]}`] : null;
  };
  return { bg: pick('bg') || tw.gray100, fg: pick('text') || tw.gray700 };
}

/*
 * Port of DimaHasao/components/layout/ModuleAccordion.jsx: one module's
 * sub-section, collapsed by default. A row with `control` is rendered by the
 * caller through `renderControl` (a setting, not a destination).
 */
export function ModuleAccordion({ section, rows, defaultOpen = false, onNavigate, renderControl }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  if (!rows?.length) return null;
  const t = tint(section.tint);

  return (
    <View style={styles.wrap}>
      <Press
        scale={1}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.create(180, 'easeInEaseOut', 'opacity'));
          setIsOpen((open) => !open);
        }}
        accessibilityState={{ expanded: isOpen }}
        accessibilityLabel={`${section.title}, ${rows.length} items`}
        style={styles.head}
      >
        <View style={[styles.icon, { backgroundColor: t.bg }]}>
          <Fa name={section.icon} size={14} color={t.fg} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title} numberOfLines={1}>{section.title}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{section.subtitle}</Text>
        </View>
        <Text style={styles.count}>{rows.length}</Text>
        <Fa name="fa-solid fa-chevron-down" size={10} color={isOpen ? tw.emerald800 : tw.gray400} style={isOpen ? { transform: [{ rotate: '180deg' }] } : null} />
      </Press>

      {isOpen ? (
        <View style={styles.body}>
          {rows.map((row) => {
            if (row.control) {
              return (
                <View key={row.control} style={{ paddingHorizontal: 4 }}>
                  {renderControl?.(row)}
                </View>
              );
            }
            return (
              <Press key={row.path + row.label} scale={0.99} onPress={() => onNavigate(row.path)} style={styles.row} accessibilityLabel={`${row.label}. ${row.sub || ''}`}>
                <View style={{ width: 16, alignItems: 'center' }}>
                  <Fa name={row.icon} size={12} color={tw.emerald800} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowLabel} numberOfLines={1}>{row.label}</Text>
                  {row.sub ? <Text style={styles.rowSub} numberOfLines={1}>{row.sub}</Text> : null}
                </View>
                <Fa name="fa-solid fa-chevron-right" size={10} color={tw.gray300} />
              </Press>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: dh.border, overflow: 'hidden', ...shadow('xs') },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 12, lineHeight: 16, color: tw.gray900, ...montserrat(700) },
  subtitle: { fontSize: 10, lineHeight: 13.75, color: tw.gray500, marginTop: 2, ...poppins(400) },
  count: { fontSize: 9, lineHeight: 13.5, color: tw.emerald800, backgroundColor: tw.emerald50, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden', ...poppins(700) },
  body: { borderTopWidth: 1, borderTopColor: 'rgba(229,221,195,0.7)', padding: 8, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12 },
  rowLabel: { fontSize: 12, lineHeight: 16, color: tw.gray800, ...poppins(600) },
  rowSub: { fontSize: 10, lineHeight: 13.75, color: tw.gray500, ...poppins(400) },
});
