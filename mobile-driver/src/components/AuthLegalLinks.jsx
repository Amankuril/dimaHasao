import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { platformApi } from '../api/platform';
import { openExternal } from '../lib/links';
import Fa from './Fa';
import { Press } from './ui';

/*
 * Port of shared/components/auth/AuthLegalLinks.jsx.
 * Privacy · Terms · Support from Global Settings; a link only shows when the
 * document exists. Silent on failure: the sign-in screen must still render.
 * Web opens /legal/:slug; here it opens the in-app legal screen.
 * variant 'text' renders the dotted line, 'icons' the three icon buttons.
 */
const ICON_BY_KEY = {
  privacy: 'fa-solid fa-lock',
  terms: 'fa-solid fa-file-contract',
  support: 'fa-solid fa-headset',
};

export default function AuthLegalLinks({ module = 'platform', variant = 'text', containerStyle, style, linkStyle, iconWrapStyle, iconColor = '#CAA83E', iconSize = 13, labelStyle }) {
  const [state, setState] = useState({ legal: { privacy: false, terms: false }, settings: null });

  useEffect(() => {
    let cancelled = false;
    platformApi
      .settings(module)
      .then((res) => {
        const body = res?.data;
        if (!cancelled && body?.success) setState({ legal: body.legal || {}, settings: body.settings || null });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [module]);

  const { legal, settings } = state;
  const supportHref =
    settings?.supportUrl ||
    (settings?.supportPhone ? `tel:${String(settings.supportPhone).replace(/\s+/g, '')}` : '') ||
    (settings?.supportEmail ? `mailto:${settings.supportEmail}` : '');

  const items = [
    legal?.privacy && { key: 'privacy', label: 'Privacy', slug: 'privacy' },
    legal?.terms && { key: 'terms', label: 'Terms', slug: 'terms' },
    supportHref && { key: 'support', label: 'Support', href: supportHref },
  ].filter(Boolean);

  if (!items.length) return null;

  const open = (item) =>
    item.href ? openExternal(item.href) : router.push({ pathname: '/legal/[slug]', params: { slug: item.slug, module } });

  if (variant === 'icons') {
    return (
      <View style={[styles.iconRow, containerStyle]}>
        {items.map((item) => (
          <Press key={item.key} onPress={() => open(item)} accessibilityRole="link" accessibilityLabel={item.label} style={styles.iconItem}>
            <View style={iconWrapStyle}>
              <Fa name={ICON_BY_KEY[item.key]} size={iconSize} color={iconColor} />
            </View>
            <Text style={labelStyle}>{item.label}</Text>
          </Press>
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.row, containerStyle]}>
      {items.map((item, index) => (
        <Text key={item.key} style={style}>
          {index > 0 ? <Text style={[style, styles.dot]}>{'  •  '}</Text> : null}
          <Text accessibilityRole="link" onPress={() => open(item)} style={linkStyle}>
            {item.label}
          </Text>
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  dot: { opacity: 0.5 },
  iconRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  iconItem: { alignItems: 'center', gap: 4 },
});
