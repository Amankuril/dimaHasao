import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { FileText } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { platformApi } from '../../api/delivery';
import HtmlContent from '../../components/HtmlContent';
import Skeleton from '../../components/Skeleton';
import { Card, ScreenHeader } from '../../components/ds';
import { color, radii, space, type } from '../../theme';

// Web: shared/pages/LegalDocumentPage.jsx (/legal/:slug?module=).

const looksLikeHtml = (value) => /<\/?[a-z][\s\S]*>/i.test(String(value || ''));

export default function LegalDocumentPage() {
  const { slug = 'privacy', module = 'platform' } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState({ status: 'loading', document: null, message: '' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', document: null, message: '' });
    platformApi
      .legal(slug, module)
      .then((res) => {
        if (cancelled) return;
        const body = res?.data;
        if (body?.document) setState({ status: 'ready', document: body.document, message: '' });
        else setState({ status: 'empty', document: null, message: body?.message || 'This document has not been published yet.' });
      })
      .catch((err) => {
        if (cancelled) return;
        // Web: a non-OK response shows the body's message; a network failure the generic line.
        const msg = err?.response ? err.response.data?.message || 'This document has not been published yet.' : 'Could not load this document.';
        setState({ status: 'empty', document: null, message: msg });
      });
    return () => {
      cancelled = true;
    };
  }, [slug, module]);

  const { status, document: doc, message } = state;

  const title = doc?.title || (status === 'loading' ? 'Loading…' : 'Not available');

  return (
    <View style={styles.page}>
      {/* No stack header on this route; the back arrow mirrors the system back gesture. */}
      <ScreenHeader title="Dima Hasao Tourism" subtitle="Legal" onBack={router.canGoBack() ? () => router.back() : undefined} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: space.xxxl + insets.bottom }]}>
        <Card style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            {doc?.updatedAt ? (
              <Text style={styles.updated}>
                Last updated {new Date(doc.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            ) : null}
          </View>

          {status === 'loading' ? (
            <View style={{ gap: space.md }} accessibilityLabel="Loading document">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} style={{ height: 14, borderRadius: radii.sm, backgroundColor: color.surfaceMuted, width: `${90 - i * 7}%` }} />
              ))}
            </View>
          ) : null}

          {status === 'empty' ? (
            <View style={styles.empty}>
              <FileText size={28} color={color.textMuted} strokeWidth={1.8} />
              <Text style={styles.emptyText}>{message}</Text>
            </View>
          ) : null}

          {status === 'ready' ? (
            looksLikeHtml(doc.content) ? (
              // prose classes are inert; text-gray-700 is the one class that applies.
              <HtmlContent html={doc.content} font="poppins" soraHeadings={false} color={color.textSecondary} />
            ) : (
              <Text style={styles.pre}>{doc.content}</Text>
            )
          ) : null}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  content: { padding: space.lg },
  card: { padding: space.xl },
  header: { marginBottom: space.xl, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border, paddingBottom: space.lg },
  title: { ...type.title, color: color.text },
  updated: { ...type.caption, marginTop: space.xs, color: color.textMuted },
  empty: { alignItems: 'center', gap: space.md, paddingVertical: space.xxxl },
  emptyText: { ...type.body, color: color.textSecondary, textAlign: 'center' },
  pre: { ...type.body, color: color.textSecondary },
});
