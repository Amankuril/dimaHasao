import { useState } from 'react';
import { LayoutAnimation, StyleSheet, Text, View } from 'react-native';
import Fa from '../Fa';
import { Press } from '../ui';
import { color, elevation, radii, space, tw, type } from '../../theme';

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
 * caller through `renderControl` (a setting, not a destination). Every module
 * shares the heritage tint; identity comes from the icon.
 */
export function ModuleAccordion({ section, rows, defaultOpen = false, onNavigate, renderControl }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  if (!rows?.length) return null;

  return (
    <View style={styles.wrap}>
      <Press
        scale={1}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.create(180, 'easeInEaseOut', 'opacity'));
          setIsOpen((open) => !open);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        accessibilityLabel={`${section.title}, ${rows.length} items`}
        style={styles.head}
      >
        <View style={styles.icon}>
          <Fa name={section.icon} size={18} color={color.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title} numberOfLines={1}>
            {section.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {section.subtitle}
          </Text>
        </View>
        <View style={styles.count}>
          <Text style={styles.countText}>{rows.length}</Text>
        </View>
        <Fa name="fa-solid fa-chevron-down" size={14} color={isOpen ? color.primary : color.textMuted} style={isOpen ? { transform: [{ rotate: '180deg' }] } : null} />
      </Press>

      {isOpen ? (
        <View style={styles.body}>
          {rows.map((row) => {
            if (row.control) {
              return (
                <View key={row.control} style={{ paddingHorizontal: space.xs }}>
                  {renderControl?.(row)}
                </View>
              );
            }
            return (
              <Press key={row.path + row.label} scale={0.99} onPress={() => onNavigate(row.path)} style={styles.row} accessibilityLabel={`${row.label}. ${row.sub || ''}`}>
                <View style={styles.rowIcon}>
                  <Fa name={row.icon} size={16} color={color.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowLabel} numberOfLines={1}>
                    {row.label}
                  </Text>
                  {row.sub ? (
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {row.sub}
                    </Text>
                  ) : null}
                </View>
                <Fa name="fa-solid fa-chevron-right" size={14} color={color.textDisabled} />
              </Press>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, overflow: 'hidden', ...elevation.card },
  head: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  icon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.bodyStrong, color: color.text },
  subtitle: { ...type.caption, color: color.textMuted },
  count: { minWidth: 24, height: 24, paddingHorizontal: space.sm, borderRadius: radii.pill, backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  countText: { ...type.caption, color: color.textSecondary },
  body: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, padding: space.sm, gap: 2 },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.sm, paddingVertical: space.sm, borderRadius: radii.md },
  rowIcon: { width: 32, height: 32, borderRadius: radii.sm, backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { ...type.bodyStrong, color: color.text },
  rowSub: { ...type.caption, color: color.textMuted },
});
