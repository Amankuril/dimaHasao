import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { platformApi } from '../../api/platform';
import HtmlContent from '../../components/HtmlContent';
import Skeleton from '../../components/Skeleton';
import { poppins, shadow, tw } from '../../theme';

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

  return (
    <ScrollView style={styles.page} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 40 + insets.top, paddingBottom: 40 + insets.bottom }}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Dima Hasao Tourism</Text>
          <Text style={styles.title}>{doc?.title || (status === 'loading' ? 'Loading…' : 'Not available')}</Text>
          {doc?.updatedAt ? (
            <Text style={styles.updated}>
              Last updated {new Date(doc.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          ) : null}
        </View>

        {status === 'loading' ? (
          <View style={{ gap: 12 }}>
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} style={{ height: 12, borderRadius: 4, backgroundColor: tw.gray100, width: `${90 - i * 7}%` }} />
            ))}
          </View>
        ) : null}

        {status === 'empty' ? <Text style={styles.empty}>{message}</Text> : null}

        {status === 'ready' ? (
          looksLikeHtml(doc.content) ? (
            // prose classes are inert; text-gray-700 is the one class that applies.
            <HtmlContent html={doc.content} font="poppins" soraHeadings={false} color="#364153" />
          ) : (
            <Text style={styles.pre}>{doc.content}</Text>
          )
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FAF6ED' },
  card: { width: '100%', borderRadius: 16, borderWidth: 1, borderColor: '#E5DDC3', backgroundColor: '#fff', padding: 24, ...shadow('sm') },
  header: { marginBottom: 24, borderBottomWidth: 1, borderBottomColor: '#E5DDC3', paddingBottom: 20 },
  kicker: { fontSize: 11, lineHeight: 16.5, letterSpacing: 2.2, textTransform: 'uppercase', color: '#0A4D2B', ...poppins(700) },
  title: { marginTop: 6, fontSize: 24, lineHeight: 32, color: tw.gray900, ...poppins(900) },
  updated: { marginTop: 4, fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  empty: { paddingVertical: 32, fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) },
  // font-sans: Tailwind's system stack, so the platform font.
  pre: { fontSize: 14, lineHeight: 22.75, color: tw.gray700 },
});
