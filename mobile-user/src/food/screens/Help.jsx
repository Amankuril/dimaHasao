import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import { NAV_CLEARANCE, isImmersiveRoute } from '../../components/dh/AppBottomNav';
import { ChevronDown, Clock, CreditCard, HelpCircle, Mail, MessageCircle, Package, Phone, Search, Shield, Truck, User } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { Button, EmptyState, SectionHeader } from '../../components/ds';
import usePlatformSettings from '../../shared/hooks/usePlatformSettings';
import { navigateTo } from '../../lib/webRouter';
import { alert } from '../../lib/webShim';
import { color, radii, space, type } from '../../theme';
import { Card, HelpPage, HelpRow, helpText } from '../components/helpUi';
import { Field } from '../components/cart/parts';

const helpCategories = [
  {
    id: 'ordering', title: 'Ordering', icon: Package, description: 'Learn how to place and manage orders',
    topics: [
      { question: 'How do I place an order?', answer: 'To place an order, browse restaurants, add items to your cart, and proceed to checkout. Select your delivery address and payment method, then confirm your order.' },
      { question: 'Can I modify or cancel my order?', answer: 'You can modify or cancel your order within 5 minutes of placing it. After that, please contact support for assistance.' },
      { question: 'How do I track my order?', answer: "Go to 'My Orders' in your profile, select the order you want to track, and you'll see real-time updates on your order status." },
      { question: 'What is the minimum order amount?', answer: "The minimum order amount varies by restaurant, typically ranging from $10 to $15. This information is displayed on each restaurant's page." },
    ],
  },
  {
    id: 'payments', title: 'Payments', icon: CreditCard, description: 'Payment methods and billing questions',
    topics: [
      { question: 'What payment methods do you accept?', answer: 'We accept all major credit cards, debit cards, digital wallets (Apple Pay, Google Pay), and cash on delivery in select areas.' },
      { question: 'Is my payment information secure?', answer: 'Yes, we use industry-standard encryption to protect your payment information. We never store your full card details.' },
      { question: 'Can I get a refund?', answer: 'Refunds are processed for cancelled orders, incorrect items, or quality issues. Contact support within 24 hours of delivery for assistance.' },
      { question: 'Why was my payment declined?', answer: 'Payment can be declined due to insufficient funds, incorrect card details, or bank restrictions. Please verify your payment method and try again.' },
    ],
  },
  {
    id: 'delivery', title: 'Delivery', icon: Truck, description: 'Delivery times, fees, and tracking',
    topics: [
      { question: 'What are your delivery times?', answer: 'Delivery times typically range from 30-60 minutes, depending on the restaurant and your location. Estimated time is shown before checkout.' },
      { question: 'How much is the delivery fee?', answer: 'Delivery fees vary by restaurant and distance, typically ranging from $2.99 to $5.99. The exact fee is shown before you place your order.' },
      { question: 'Can I schedule a delivery for later?', answer: 'Yes, you can schedule orders for up to 7 days in advance during checkout. Select your preferred delivery time.' },
      { question: 'What if my order is late?', answer: "If your order is significantly delayed, contact support. We'll investigate and may provide compensation or a refund." },
    ],
  },
  {
    id: 'account', title: 'Account & Profile', icon: User, description: 'Manage your account and preferences',
    topics: [
      { question: 'How do I update my profile?', answer: "Go to 'Profile' in the menu, then select 'Edit Profile' to update your name, email, phone number, and other information." },
      { question: 'How do I change my password?', answer: "Go to Profile > Settings > Security to change your password. You'll need to verify your current password first." },
      { question: 'How do I manage my addresses?', answer: 'Navigate to Profile > Addresses to view, add, edit, or delete delivery addresses. Set a default address for faster checkout.' },
      { question: 'How do I save my favorite restaurants?', answer: 'Click the heart icon on any restaurant page to add it to your favorites. View all favorites in Profile > Favorites.' },
    ],
  },
  {
    id: 'refunds', title: 'Refunds & Returns', icon: Shield, description: 'Refund policy and return process',
    topics: [
      { question: 'What is your refund policy?', answer: 'We offer full refunds for cancelled orders, incorrect items, or quality issues reported within 24 hours of delivery.' },
      { question: 'How long do refunds take?', answer: "Refunds are typically processed within 5-7 business days, depending on your payment method. You'll receive a confirmation email." },
      { question: 'Can I return food items?', answer: "Due to food safety regulations, we cannot accept returns of food items. However, we'll provide a full refund for quality issues." },
      { question: 'What if I received the wrong order?', answer: "Contact support immediately with your order number. We'll arrange a replacement or full refund, and you can keep the incorrect order." },
    ],
  },
  {
    id: 'general', title: 'General Questions', icon: HelpCircle, description: 'Other frequently asked questions',
    topics: [
      { question: 'Do you offer discounts or promotions?', answer: "Yes! Check the 'Offers' section for current promotions, discount codes, and special deals from restaurants." },
      { question: 'How do I contact customer support?', answer: "You can contact us via phone, email, or live chat. Visit the 'Contact Support' section below for all contact options." },
      { question: 'Is there a mobile app?', answer: 'Yes, our mobile app is available for iOS and Android. Download it from the App Store or Google Play for the best experience.' },
      { question: 'Do you deliver to my area?', answer: "Enter your delivery address to see available restaurants in your area. We're constantly expanding our delivery zones." },
    ],
  },
];

export default function Help() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const bottomPad = (isImmersiveRoute(pathname) ? 0 : NAV_CLEARANCE) + insets.bottom + space.xxl;
  const platform = usePlatformSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const q = searchQuery.toLowerCase();
  const filtered = helpCategories.filter((c) => c.title.toLowerCase().includes(q) || c.topics.some((t) => t.question.toLowerCase().includes(q) || t.answer.toLowerCase().includes(q)));

  const quick = [
    { Icon: Package, title: 'Track your order', sub: 'View order status', onPress: () => navigateTo('/user/orders') },
    { Icon: User, title: 'Manage account', sub: 'Update profile & settings', onPress: () => navigateTo('/user/profile') },
    { Icon: MessageCircle, title: 'Contact support', sub: 'Get help from our team' },
  ];

  return (
    <HelpPage>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: bottomPad }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: space.xs, marginBottom: space.sm }}>
          <Text style={[type.heroSerif, { color: color.primary }]} accessibilityRole="header">
            Help centre
          </Text>
          <Text style={helpText.muted}>Find answers to common questions or contact our support team</Text>
        </View>

        <View style={{ justifyContent: 'center' }}>
          <Search size={20} color={color.textMuted} style={styles.searchIcon} />
          <Field
            placeholder="Search help topics or keywords..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessibilityLabel="Search help topics"
            returnKeyType="search"
            inputStyle={{ paddingLeft: 44 }}
          />
        </View>

        <Card style={{ overflow: 'hidden' }}>
          {quick.map(({ Icon, title, sub, onPress }, i) => (
            <HelpRow key={title} icon={Icon} title={title} subtitle={sub} onPress={onPress} last={i === quick.length - 1} />
          ))}
        </Card>

        <SectionHeader title="Browse by category" style={{ marginTop: space.lg, marginBottom: 0 }} />
        {filtered.length === 0 ? (
          <Card>
            <EmptyState icon={HelpCircle} title="No results found" message="Try searching with different keywords" actionLabel="Clear search" onAction={() => setSearchQuery('')} />
          </Card>
        ) : (
          filtered.map((category) => {
            const Icon = category.icon;
            const isExpanded = expandedCategory === category.id;
            return (
              <Card key={category.id} style={{ overflow: 'hidden' }}>
                <Press
                  scale={0.99}
                  onPress={() => {
                    setExpandedCategory(isExpanded ? null : category.id);
                    setExpandedQuestion(null);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isExpanded }}
                  accessibilityLabel={category.title}
                  style={styles.catRow}
                >
                  <View style={styles.iconTile}>
                    <Icon size={20} color={color.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[type.subheading, { color: color.text }]}>{category.title}</Text>
                    <Text style={helpText.muted}>{category.description}</Text>
                  </View>
                  <ChevronDown size={20} color={color.textMuted} style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }} />
                </Press>
                {isExpanded ? (
                  <View style={{ paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.sm }}>
                    {category.topics.map((topic, i) => {
                      const key = `${category.id}-${i}`;
                      const open = expandedQuestion === key;
                      return (
                        <View key={key} style={styles.topic}>
                          <Press
                            scale={1}
                            onPress={() => setExpandedQuestion(open ? null : key)}
                            accessibilityRole="button"
                            accessibilityState={{ expanded: open }}
                            accessibilityLabel={topic.question}
                            style={styles.topicHead}
                          >
                            <Text style={[type.bodyStrong, { flex: 1, color: color.text }]}>{topic.question}</Text>
                            <ChevronDown size={18} color={color.textMuted} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
                          </Press>
                          {open ? (
                            <View style={styles.answer}>
                              <Text style={[type.body, { color: color.textSecondary }]}>{topic.answer}</Text>
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </Card>
            );
          })
        )}

        <Card gold style={{ marginTop: space.lg, padding: space.lg, gap: space.md }}>
          <View style={{ gap: space.xs }}>
            <Text style={[type.heading, { color: color.text }]} accessibilityRole="header">
              Still need help?
            </Text>
            <Text style={[type.small, { color: color.textSecondary }]}>Our support team is here to assist you 24/7</Text>
          </View>
          <Card style={{ overflow: 'hidden' }}>
            <HelpRow
              icon={Phone}
              title="Phone support"
              subtitle="Call us anytime · +1 (800) 123-4567"
              onPress={() => Linking.openURL('tel:+1-800-123-4567').catch(() => {})}
            />
            <HelpRow
              icon={Mail}
              title="Email support"
              subtitle={platform.supportEmail ? `We'll respond within 24 hours · ${platform.supportEmail}` : "We'll respond within 24 hours · Not configured yet"}
              onPress={platform.supportEmail ? () => Linking.openURL(`mailto:${platform.supportEmail}`).catch(() => {}) : undefined}
            />
            <HelpRow
              icon={MessageCircle}
              title="Live chat"
              subtitle="Available 24/7"
              last
              right={<Button title="Start chat" size="sm" variant="secondary" fullWidth={false} onPress={() => alert('Live chat would open here')} />}
            />
          </Card>
          <View style={styles.row}>
            <Clock size={16} color={color.textSecondary} />
            <Text style={[type.small, { color: color.textSecondary, flex: 1 }]}>Average response time: Less than 5 minutes</Text>
          </View>
        </Card>
      </ScrollView>
    </HelpPage>
  );
}

const styles = StyleSheet.create({
  searchIcon: { position: 'absolute', left: space.md + 2, zIndex: 1, top: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, minHeight: 72 },
  iconTile: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  topic: { borderWidth: 1, borderColor: color.border, borderRadius: radii.md, overflow: 'hidden' },
  topicHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, minHeight: 48 },
  answer: { padding: space.md, borderTopWidth: 1, borderTopColor: color.border, backgroundColor: color.surfaceMuted },
});
