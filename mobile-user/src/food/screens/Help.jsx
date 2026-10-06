import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronDown, ChevronRight, Clock, CreditCard, HelpCircle, Mail, MessageCircle, Package, Phone, Search, Shield, Truck, User } from 'lucide-react-native';
import { Press } from '../../components/ui';
import usePlatformSettings from '../../shared/hooks/usePlatformSettings';
import { navigateTo } from '../../lib/webRouter';
import { alert } from '../../lib/webShim';
import { poppins, tw } from '../../theme';
import { Card, HELP, HelpButton, HelpPage, helpText } from '../components/helpUi';

const GREEN = '#0a4d2b';
const helpCategories = [
  {
    id: 'ordering', title: 'Ordering', icon: Package, color: GREEN, bgColor: tw.orange50, description: 'Learn how to place and manage orders',
    topics: [
      { question: 'How do I place an order?', answer: 'To place an order, browse restaurants, add items to your cart, and proceed to checkout. Select your delivery address and payment method, then confirm your order.' },
      { question: 'Can I modify or cancel my order?', answer: 'You can modify or cancel your order within 5 minutes of placing it. After that, please contact support for assistance.' },
      { question: 'How do I track my order?', answer: "Go to 'My Orders' in your profile, select the order you want to track, and you'll see real-time updates on your order status." },
      { question: 'What is the minimum order amount?', answer: "The minimum order amount varies by restaurant, typically ranging from $10 to $15. This information is displayed on each restaurant's page." },
    ],
  },
  {
    id: 'payments', title: 'Payments', icon: CreditCard, color: GREEN, bgColor: tw.orange50, description: 'Payment methods and billing questions',
    topics: [
      { question: 'What payment methods do you accept?', answer: 'We accept all major credit cards, debit cards, digital wallets (Apple Pay, Google Pay), and cash on delivery in select areas.' },
      { question: 'Is my payment information secure?', answer: 'Yes, we use industry-standard encryption to protect your payment information. We never store your full card details.' },
      { question: 'Can I get a refund?', answer: 'Refunds are processed for cancelled orders, incorrect items, or quality issues. Contact support within 24 hours of delivery for assistance.' },
      { question: 'Why was my payment declined?', answer: 'Payment can be declined due to insufficient funds, incorrect card details, or bank restrictions. Please verify your payment method and try again.' },
    ],
  },
  {
    // the web's `text-#06381e` is not a valid class, so this icon keeps the default text colour
    id: 'delivery', title: 'Delivery', icon: Truck, color: HELP.fg, bgColor: tw.orange50, description: 'Delivery times, fees, and tracking',
    topics: [
      { question: 'What are your delivery times?', answer: 'Delivery times typically range from 30-60 minutes, depending on the restaurant and your location. Estimated time is shown before checkout.' },
      { question: 'How much is the delivery fee?', answer: 'Delivery fees vary by restaurant and distance, typically ranging from $2.99 to $5.99. The exact fee is shown before you place your order.' },
      { question: 'Can I schedule a delivery for later?', answer: 'Yes, you can schedule orders for up to 7 days in advance during checkout. Select your preferred delivery time.' },
      { question: 'What if my order is late?', answer: "If your order is significantly delayed, contact support. We'll investigate and may provide compensation or a refund." },
    ],
  },
  {
    id: 'account', title: 'Account & Profile', icon: User, color: GREEN, bgColor: tw.orange50, description: 'Manage your account and preferences',
    topics: [
      { question: 'How do I update my profile?', answer: "Go to 'Profile' in the menu, then select 'Edit Profile' to update your name, email, phone number, and other information." },
      { question: 'How do I change my password?', answer: "Go to Profile > Settings > Security to change your password. You'll need to verify your current password first." },
      { question: 'How do I manage my addresses?', answer: 'Navigate to Profile > Addresses to view, add, edit, or delete delivery addresses. Set a default address for faster checkout.' },
      { question: 'How do I save my favorite restaurants?', answer: 'Click the heart icon on any restaurant page to add it to your favorites. View all favorites in Profile > Favorites.' },
    ],
  },
  {
    id: 'refunds', title: 'Refunds & Returns', icon: Shield, color: GREEN, bgColor: tw.orange50, description: 'Refund policy and return process',
    topics: [
      { question: 'What is your refund policy?', answer: 'We offer full refunds for cancelled orders, incorrect items, or quality issues reported within 24 hours of delivery.' },
      { question: 'How long do refunds take?', answer: "Refunds are typically processed within 5-7 business days, depending on your payment method. You'll receive a confirmation email." },
      { question: 'Can I return food items?', answer: "Due to food safety regulations, we cannot accept returns of food items. However, we'll provide a full refund for quality issues." },
      { question: 'What if I received the wrong order?', answer: "Contact support immediately with your order number. We'll arrange a replacement or full refund, and you can keep the incorrect order." },
    ],
  },
  {
    id: 'general', title: 'General Questions', icon: HelpCircle, color: tw.gray600, bgColor: tw.gray50, description: 'Other frequently asked questions',
    topics: [
      { question: 'Do you offer discounts or promotions?', answer: "Yes! Check the 'Offers' section for current promotions, discount codes, and special deals from restaurants." },
      { question: 'How do I contact customer support?', answer: "You can contact us via phone, email, or live chat. Visit the 'Contact Support' section below for all contact options." },
      { question: 'Is there a mobile app?', answer: 'Yes, our mobile app is available for iOS and Android. Download it from the App Store or Google Play for the best experience.' },
      { question: 'Do you deliver to my area?', answer: "Enter your delivery address to see available restaurants in your area. We're constantly expanding our delivery zones." },
    ],
  },
];

export default function Help() {
  const platform = usePlatformSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const q = searchQuery.toLowerCase();
  const filtered = helpCategories.filter((c) => c.title.toLowerCase().includes(q) || c.topics.some((t) => t.question.toLowerCase().includes(q) || t.answer.toLowerCase().includes(q)));

  const quick = [
    { Icon: Package, bg: tw.yellow100, title: 'Track Your Order', sub: 'View order status', onPress: () => navigateTo('/user/orders') },
    { Icon: User, bg: tw.orange100, title: 'Manage Account', sub: 'Update profile & settings', onPress: () => navigateTo('/user/profile') },
    { Icon: MessageCircle, bg: tw.orange100, title: 'Contact Support', sub: 'Get help from our team' },
  ];

  return (
    <HelpPage>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Text style={helpText.h1}>Help Center</Text>
          <Text style={[helpText.muted, { fontSize: 16, textAlign: 'center' }]}>Find answers to common questions or contact our support team</Text>
        </View>

        <Card>
          <View style={{ padding: 16 }}>
            <View style={{ justifyContent: 'center' }}>
              <View style={{ position: 'absolute', left: 12, zIndex: 1 }}>
                <Search size={20} color={HELP.muted} />
              </View>
              <TextInput
                placeholder="Search for help topics, questions, or keywords..."
                placeholderTextColor={HELP.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                numberOfLines={1}
                style={styles.input}
              />
            </View>
          </View>
        </Card>

        <View style={{ gap: 16 }}>
          {quick.map(({ Icon, bg, title, sub, onPress }) => (
            <Press key={title} scale={0.98} onPress={onPress} disabled={!onPress} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ padding: 8, backgroundColor: bg, borderRadius: 8 }}>
                <Icon size={20} color={GREEN} />
              </View>
              <View>
                <Text style={[helpText.title, { fontSize: 14 }]}>{title}</Text>
                <Text style={[helpText.muted, { fontSize: 12 }]}>{sub}</Text>
              </View>
            </Press>
          ))}
        </View>

        <View style={{ gap: 16 }}>
          <Text style={{ fontSize: 20, color: HELP.fg, ...poppins(700) }}>Browse by Category</Text>
          {filtered.length === 0 ? (
            <Card>
              <View style={{ paddingVertical: 48, alignItems: 'center', paddingHorizontal: 16 }}>
                <HelpCircle size={64} color={HELP.muted} />
                <Text style={{ fontSize: 18, color: HELP.fg, marginTop: 16, marginBottom: 8, ...poppins(600) }}>No results found</Text>
                <Text style={[helpText.muted, { marginBottom: 16 }]}>Try searching with different keywords</Text>
                <HelpButton onPress={() => setSearchQuery('')}>
                  <Text style={helpText.btn}>Clear Search</Text>
                </HelpButton>
              </View>
            </Card>
          ) : (
            filtered.map((category) => {
              const Icon = category.icon;
              const isExpanded = expandedCategory === category.id;
              return (
                <Card key={category.id}>
                  <Press
                    scale={0.99}
                    onPress={() => {
                      setExpandedCategory(isExpanded ? null : category.id);
                      setExpandedQuestion(null);
                    }}
                    style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                      <View style={{ padding: 8, backgroundColor: category.bgColor, borderRadius: 8 }}>
                        <Icon size={20} color={category.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 18, color: HELP.fg, ...poppins(600) }}>{category.title}</Text>
                        <Text style={[helpText.muted, { fontSize: 14 }]}>{category.description}</Text>
                      </View>
                    </View>
                    {isExpanded ? <ChevronDown size={20} color={HELP.muted} /> : <ChevronRight size={20} color={HELP.muted} />}
                  </Press>
                  {isExpanded ? (
                    <View style={{ padding: 16, paddingTop: 0, gap: 12 }}>
                      {category.topics.map((topic, i) => {
                        const key = `${category.id}-${i}`;
                        const open = expandedQuestion === key;
                        return (
                          <View key={key} style={styles.topic}>
                            <Press scale={1} onPress={() => setExpandedQuestion(open ? null : key)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 }}>
                              <Text style={{ flex: 1, paddingRight: 16, color: HELP.fg, ...poppins(600) }}>{topic.question}</Text>
                              {open ? <ChevronDown size={16} color={HELP.muted} /> : <ChevronRight size={16} color={HELP.muted} />}
                            </Press>
                            {open ? (
                              <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: HELP.border, backgroundColor: 'rgba(245,243,236,0.3)' }}>
                                <Text style={[helpText.muted, { fontSize: 16 }]}>{topic.answer}</Text>
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
        </View>

        <Card gold>
          <View style={{ padding: 16, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MessageCircle size={20} color={GREEN} />
              <Text style={{ fontSize: 20, color: HELP.fg, ...poppins(600) }}>Still Need Help?</Text>
            </View>
            <Text style={[helpText.muted, { fontSize: 14 }]}>Our support team is here to assist you 24/7</Text>
          </View>
          <View style={{ padding: 16, gap: 16 }}>
            <View style={styles.contact}>
              <View style={styles.contactIcon}><Phone size={20} color={GREEN} /></View>
              <View>
                <Text style={[helpText.title, { marginBottom: 4 }]}>Phone Support</Text>
                <Text style={[helpText.muted, { fontSize: 14, marginBottom: 8 }]}>Call us anytime</Text>
                <Press scale={0.98} onPress={() => Linking.openURL('tel:+1-800-123-4567').catch(() => {})}>
                  <Text style={styles.linkText}>+1 (800) 123-4567</Text>
                </Press>
              </View>
            </View>
            <View style={styles.contact}>
              <View style={styles.contactIcon}><Mail size={20} color={GREEN} /></View>
              <View style={{ flex: 1 }}>
                <Text style={[helpText.title, { marginBottom: 4 }]}>Email Support</Text>
                <Text style={[helpText.muted, { fontSize: 14, marginBottom: 8 }]}>We&apos;ll respond within 24 hours</Text>
                {platform.supportEmail ? (
                  <Press scale={0.98} onPress={() => Linking.openURL(`mailto:${platform.supportEmail}`).catch(() => {})}>
                    <Text style={styles.linkText}>{platform.supportEmail}</Text>
                  </Press>
                ) : (
                  <Text style={[helpText.muted, { fontSize: 14 }]}>Not configured yet</Text>
                )}
              </View>
            </View>
            <View style={styles.contact}>
              <View style={styles.contactIcon}><MessageCircle size={20} color={GREEN} /></View>
              <View>
                <Text style={[helpText.title, { marginBottom: 4 }]}>Live Chat</Text>
                <Text style={[helpText.muted, { fontSize: 14, marginBottom: 8 }]}>Available 24/7</Text>
                <HelpButton style={{ alignSelf: 'flex-start', minHeight: 32, paddingHorizontal: 12, marginTop: 4 }} onPress={() => alert('Live chat would open here')}>
                  <Text style={[helpText.btn, { fontSize: 13 }]}>Start Chat</Text>
                </HelpButton>
              </View>
            </View>
            <View style={{ paddingTop: 16, borderTopWidth: 1, borderTopColor: tw.yellow200 }}>
              <Text style={[helpText.muted, { fontSize: 14 }]}>
                <Clock size={16} color={HELP.muted} /> Average response time: Less than 5 minutes
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </HelpPage>
  );
}

const styles = StyleSheet.create({
  input: { height: 48, paddingVertical: 0, borderWidth: 1, borderColor: HELP.border, borderRadius: 8, paddingLeft: 40, paddingRight: 12, fontSize: 16, color: HELP.fg, backgroundColor: 'transparent', ...poppins(400) },
  topic: { borderWidth: 1, borderColor: HELP.border, borderRadius: 8, overflow: 'hidden' },
  contact: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, backgroundColor: '#fff', borderRadius: 8 },
  contactIcon: { padding: 8, backgroundColor: tw.orange100, borderRadius: 8 },
  linkText: { fontSize: 14, color: HELP.primary, ...poppins(500) },
});
