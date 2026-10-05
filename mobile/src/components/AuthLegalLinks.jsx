import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { platformApi } from '../api/delivery';
import { openExternal } from '../lib/links';

/*
 * Port of shared/components/auth/AuthLegalLinks.jsx (text variant).
 * Privacy · Terms · Support from Global Settings; a link only shows when the
 * document exists. Silent on failure: the sign-in screen must still render.
 * Web opens /legal/:slug in a new tab; here it opens the in-app legal screen.
 */
export default function AuthLegalLinks({ module = 'platform', containerStyle, style, linkStyle }) {
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

  return (
    <View style={[styles.row, containerStyle]}>
      {items.map((item, index) => (
        <Text key={item.key} style={style}>
          {index > 0 ? <Text style={[style, styles.dot]}>{'  •  '}</Text> : null}
          <Text
            accessibilityRole="link"
            suppressHighlighting={false}
            onPress={() =>
              item.href ? openExternal(item.href) : router.push({ pathname: '/legal/[slug]', params: { slug: item.slug, module } })
            }
            style={linkStyle}
          >
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
});
