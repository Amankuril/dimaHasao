import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  Calendar, CheckCircle2, ChevronDown, ChevronUp, Clock, Clock4, ImagePlus, MessageSquare, Minus, Phone, Plus, Search, Sparkles, UploadCloud, Users, UtensilsCrossed, X,
} from 'lucide-react-native';
import Loader from '../../components/Loader';
import Img from '../../components/Img';
import { Button, Card, EmptyState, IconButton, SectionHeader, SegmentedControl, StatusBadge } from '../../components/ds';
import { Press } from '../../components/ui';
import { toast } from '../../lib/notify';
import { color, radii, space, type } from '../../theme';
import { useDiningReservations } from '../hooks/pages/useDiningReservations';
import { StatTile, sentenceCase } from './finance/financeUi';
import { Input, Notice, ScreenHeader, Switch } from './inventory/partnerKit';

const ACTIVE = ['pending', 'confirmed', 'accepted', 'checked-in'];

/** Booking status -> word + tone (DESIGN_SYSTEM.md state table). */
function statusBadge(status) {
  const key = String(status || '').toLowerCase();
  if (key === 'pending') return { tone: 'warning', label: 'Waiting' };
  if (key === 'accepted' || key === 'confirmed') return { tone: 'info', label: 'Confirmed' };
  if (key === 'checked-in') return { tone: 'info', label: sentenceCase(status) };
  if (key === 'completed') return { tone: 'success', label: sentenceCase(status) };
  return { tone: 'danger', label: sentenceCase(status) };
}

function UploadButton({ busy, disabled, onPress }) {
  return <Button title={busy ? 'Uploading...' : 'Add photos'} icon={UploadCloud} variant="secondary" loading={busy} disabled={disabled} fullWidth={false} onPress={onPress} accessibilityLabel={busy ? 'Uploading' : 'Add photos'} />;
}

function BookingCard({ booking, h }) {
  const key = String(booking.status || '').toLowerCase();
  const badge = statusBadge(booking.status);
  const name = h.getBookerName(booking);
  const phone = h.getBookerPhone(booking);
  const when = new Date(booking.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const isNew = h.isNewRequest(booking);
  const info = (Icon, text) => (
    <View style={styles.infoCell}>
      <Icon size={16} color={color.primary} />
      <Text style={styles.infoText} numberOfLines={1}>{text}</Text>
    </View>
  );
  return (
    <Card style={[styles.booking, isNew ? styles.bookingNew : null]}>
      <View style={styles.bookingHead}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(name.charAt(0) || '?').toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.guest} numberOfLines={1}>{name}</Text>
          <Text style={styles.bid} numberOfLines={1}>#{booking.bookingId}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: space.xs }}>
          <StatusBadge label={badge.label} tone={badge.tone} />
          {isNew ? <StatusBadge label="New request" tone="primary" icon={Sparkles} /> : null}
        </View>
      </View>

      <View style={styles.infoGrid}>
        {info(Calendar, when)}
        {info(Clock, booking.timeSlot)}
        {info(Users, `${booking.guests} Guests`)}
        {info(Phone, phone || 'No phone')}
      </View>

      {booking.specialRequest ? (
        <Notice tone="info" icon={MessageSquare}>{booking.specialRequest}</Notice>
      ) : null}

      {key === 'pending' || booking.status === 'accepted' || booking.status === 'checked-in' ? (
        <View style={styles.actions}>
          {key === 'pending' ? <Button title="Accept" onPress={() => h.handleStatusUpdate(booking._id, 'accepted')} accessibilityLabel="Accept" style={{ flex: 1 }} /> : null}
          {key === 'pending' ? <Button title="Decline" variant="outline" onPress={() => h.handleStatusUpdate(booking._id, 'cancelled')} accessibilityLabel="Decline" style={{ flex: 1 }} /> : null}
          {booking.status === 'accepted' ? <Button title="Check-in" onPress={() => h.handleStatusUpdate(booking._id, 'checked-in')} accessibilityLabel="Check-in" style={{ flex: 1 }} /> : null}
          {booking.status === 'checked-in' ? <Button title="Check-out" onPress={() => h.handleStatusUpdate(booking._id, 'completed')} accessibilityLabel="Check-out" style={{ flex: 1 }} /> : null}
        </View>
      ) : null}
    </Card>
  );
}

/** Port of Food/pages/restaurant/DiningReservations.jsx (/food/restaurant/reservations). The web's wide table is `hidden` at every width, so only the card list is drawn. */
export default function DiningReservations() {
  const insets = useSafeAreaInsets();
  const h = useDiningReservations();
  const { bookings, filteredBookings, pendingRequest, diningType } = h;

  /* <input type="file" multiple>: the system picker hands the same { target: { files } } shape to the page's handlers. */
  const pickPhotos = async (handler) => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast.error('Photo library permission is required');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.8, exif: false });
      if (res.canceled || !res.assets?.length) return;
      const files = res.assets.map((asset, i) => {
        const type = asset.mimeType || 'image/jpeg';
        const ext = type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
        return { uri: asset.uri, name: asset.fileName || `photo-${Date.now()}-${i}.${ext}`, type, width: asset.width, height: asset.height };
      });
      await handler({ target: { files, value: '' } });
    } catch {
      toast.error('Could not open gallery');
    }
  };

  if (h.loading) return <Loader />;

  const toggleDining = () => {
    if (pendingRequest) return;
    const next = !h.diningEnabled;
    h.setDiningEnabled(next);
    if (!next) h.setMaxGuestsLimit(0);
    else if (h.maxGuestsLimit === 0) h.setMaxGuestsLimit(6);
  };

  const stepper = (label, onPress) => (
    <IconButton
      icon={label === '+' ? Plus : Minus}
      label={label === '+' ? 'Increase guest limit' : 'Decrease guest limit'}
      variant="soft"
      onPress={onPress}
      disabled={!!pendingRequest}
      iconColor={color.primary}
      style={styles.step}
    />
  );

  const reservations = h.activeSection === 'reservations';
  const media = h.activeSection === 'media';

  const header = (
    <View>
      <View style={styles.stats}>
        <StatTile icon={Users} tone="primary" label="Total bookings" value={bookings.length} />
        <StatTile icon={CheckCircle2} tone="info" label="Active" value={bookings.filter((b) => ACTIVE.includes(String(b.status || '').toLowerCase())).length} />
        <StatTile icon={Clock4} tone="gold" label="Today's bookings" value={bookings.filter((b) => new Date(b.date).toDateString() === new Date().toDateString()).length} />
      </View>

      {media ? (
        <Card onPress={() => h.setShowMediaPanel((prev) => !prev)} accessibilityLabel="Photos and menu manager" style={styles.mediaToggle}>
          <View style={styles.mediaToggleIcon}>
            <ImagePlus size={20} color={color.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.cardTitle}>Photos & menu manager</Text>
            <Text style={styles.cardSub}>Upload restaurant and menu images only when needed.</Text>
          </View>
          {h.showMediaPanel ? <ChevronUp size={20} color={color.textMuted} /> : <ChevronDown size={20} color={color.textMuted} />}
        </Card>
      ) : null}

      {media && h.showMediaPanel ? (
        <View style={{ gap: space.lg, marginBottom: space.xxl }}>
          <Card>
            <View style={styles.panelHead}>
              <View style={{ flex: 1, minWidth: 180 }}>
                <Text style={styles.cardTitle}>Restaurant photos</Text>
                <Text style={styles.cardSub}>Add multiple restaurant photos. The first one will be used as the main preview.</Text>
              </View>
              <UploadButton busy={h.uploadingRestaurantPhoto} disabled={h.uploadingRestaurantPhoto || h.removingRestaurantPhoto} onPress={() => pickPhotos(h.handleRestaurantPhotoUpload)} />
            </View>

            <View style={styles.hero}>
              {h.restaurantPhoto ? (
                <Img source={{ uri: h.restaurantPhoto }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel={h.restaurant?.restaurantName || h.restaurant?.name || 'Restaurant'} />
              ) : (
                <View style={styles.noPhoto}>
                  <ImagePlus size={28} color={color.textDisabled} />
                  <Text style={styles.noPhotoText}>No restaurant photo added yet</Text>
                </View>
              )}
            </View>

            {h.restaurantPhotos.length > 0 ? (
              <View style={styles.grid}>
                {h.restaurantPhotos.map((photo, index) => {
                  const main = h.restaurantPhoto === photo.url;
                  return (
                    <View key={`${photo.url}-${index}`} style={styles.cell3}>
                      <Press scale={1} onPress={() => h.setRestaurantPhoto(photo.url)} accessibilityLabel={`Restaurant photo ${index + 1}`} accessibilityState={{ selected: main }} style={[styles.thumb, main ? styles.thumbMain : null]}>
                        <Img source={{ uri: photo.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        <View style={[styles.thumbTag, main ? { backgroundColor: color.primary } : null]}>
                          <Text style={styles.thumbTagText} numberOfLines={1}>{main ? 'Main' : `Photo ${index + 1}`}</Text>
                        </View>
                      </Press>
                      <IconButton icon={X} label="Remove photo" size={32} iconSize={16} variant="danger" onPress={() => h.handleRemoveRestaurantPhoto(photo.url)} style={styles.remove} />
                    </View>
                  );
                })}
              </View>
            ) : null}
          </Card>

          <Card>
            <View style={styles.panelHead}>
              <View style={{ flex: 1, minWidth: 180 }}>
                <Text style={styles.cardTitle}>Menu photos</Text>
                <Text style={styles.cardSub}>Add menu photos and view previously uploaded photos.</Text>
              </View>
              <UploadButton busy={h.uploadingMenuPhotos} disabled={h.uploadingMenuPhotos || h.removingMenuPhoto} onPress={() => pickPhotos(h.handleMenuPhotosUpload)} />
            </View>

            {h.menuPhotos.length > 0 ? (
              <View style={styles.grid}>
                {h.menuPhotos.map((photo, index) => (
                  <View key={`${photo.url}-${index}`} style={styles.cell2}>
                    <View style={styles.menuThumb}>
                      <Img source={{ uri: photo.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel={`Menu photo ${index + 1}`} />
                    </View>
                    <IconButton icon={X} label="Remove menu photo" size={32} iconSize={16} variant="danger" disabled={h.removingMenuPhoto} onPress={() => h.handleRemoveMenuPhoto(photo.url)} style={styles.remove} />
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noMenu}>
                <ImagePlus size={24} color={color.textDisabled} />
                <Text style={styles.noPhotoText}>No menu photos added yet</Text>
              </View>
            )}
          </Card>
        </View>
      ) : null}

      {reservations ? (
        <Card style={styles.controls}>
          <Text style={styles.overline}>Dining controls</Text>
          <Text style={styles.controlsTitle}>Manage dining availability and booking limit</Text>
          <Text style={styles.cardSub}>These settings update the same dining profile the guest booking flow reads, so restaurant changes are reflected on the user side too.</Text>

          <View style={styles.switchRow}>
            <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
              <Text style={styles.rowLabel}>Turn dining on/off</Text>
              <StatusBadge label={h.diningEnabled ? 'Dining enabled' : 'Dining paused'} tone={h.diningEnabled ? 'success' : 'warning'} />
            </View>
            <Switch value={h.diningEnabled} onValueChange={toggleDining} disabled={!!pendingRequest} accessibilityLabel="Turn dining on or off" />
          </View>

          <View style={styles.block}>
            <View style={styles.blockHead}>
              <Sparkles size={16} color={color.goldText} />
              <Text style={styles.rowLabel}>Choose dining categories (pick multiple)</Text>
            </View>
            <View style={styles.catGrid}>
              {h.availableCategories.map((cat) => {
                const selected = Array.isArray(diningType) && diningType.includes(cat.slug);
                return (
                  <View key={cat._id} style={styles.catCell}>
                    <Press
                      scale={selected ? 1 : 0.97}
                      onPress={() => {
                        if (pendingRequest) return;
                        h.setDiningType(selected ? diningType.filter((s) => s !== cat.slug) : [...diningType, cat.slug]);
                      }}
                      disabled={!!pendingRequest}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected, disabled: !!pendingRequest }}
                      accessibilityLabel={cat.name}
                      style={[styles.cat, selected ? styles.catOn : null, pendingRequest ? { opacity: 0.7 } : null]}
                    >
                      <View style={styles.catImg}>
                        {cat.imageUrl ? (
                          <Img source={{ uri: cat.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel={cat.name} />
                        ) : (
                          <View style={styles.catImgEmpty}>
                            <UtensilsCrossed size={22} color={color.textDisabled} />
                          </View>
                        )}
                      </View>
                      <Text style={[styles.catName, { color: selected ? color.primary : color.text }]} numberOfLines={2}>{cat.name}</Text>
                      {selected ? (
                        <View style={styles.catCheck}>
                          <CheckCircle2 size={14} color={color.onPrimary} />
                        </View>
                      ) : null}
                    </Press>
                  </View>
                );
              })}
            </View>
            {h.availableCategories.length === 0 ? (
              <View style={styles.noCats}>
                <Text style={[styles.cardSub, { textAlign: 'center' }]}>No categories available. Please contact support.</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.block}>
            <View style={styles.limitRow}>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={styles.rowLabel}>Maximum guest limit</Text>
                <Text style={styles.caption}>Guests allowed per reservation</Text>
              </View>
              <View style={styles.stepper}>
                {stepper('−', () => {
                  if (pendingRequest) return;
                  h.setMaxGuestsLimit(Math.max(0, h.maxGuestsLimit - 1));
                })}
                <Text style={styles.limitValue} accessibilityLabel={`Guest limit ${h.maxGuestsLimit}`}>{h.maxGuestsLimit}</Text>
                {stepper('+', () => {
                  if (pendingRequest) return;
                  h.setMaxGuestsLimit(parseInt(h.maxGuestsLimit) + 1);
                })}
              </View>
            </View>

            <Button
              title={h.savingDiningSettings ? 'Saving...' : pendingRequest ? 'Approval pending' : 'Save settings'}
              size="lg"
              loading={h.savingDiningSettings}
              disabled={h.savingDiningSettings || !!pendingRequest}
              onPress={h.handleSaveDiningSettings}
              accessibilityLabel="Save settings"
              style={{ marginTop: space.lg }}
            />
          </View>

          {pendingRequest ? (
            <Notice tone="warning" icon={Clock4} style={{ marginTop: space.lg }}>
              Your recent changes are waiting for admin approval. You cannot make new changes until the current request is processed.
            </Notice>
          ) : null}

          {h.diningSettingsMessage || h.diningSettingsError ? (
            <Notice tone={h.diningSettingsError ? 'danger' : 'primary'} style={{ marginTop: space.lg }}>
              {h.diningSettingsError || h.diningSettingsMessage}
            </Notice>
          ) : null}
        </Card>
      ) : null}

      {h.uploadMessage || h.uploadError ? (
        <Notice tone={h.uploadError ? 'danger' : 'primary'} style={{ marginBottom: space.xxl }}>
          {h.uploadError || h.uploadMessage}
        </Notice>
      ) : null}

      {reservations ? (
        <View style={{ gap: space.md, marginBottom: space.md }}>
          <SectionHeader title="Reservation queue" style={{ marginBottom: 0 }} />
          <SegmentedControl
            value={h.activeView}
            onChange={h.setActiveView}
            options={[
              { value: 'priority', label: 'Priority' },
              { value: 'new', label: 'New', count: h.newRequestsCount },
              { value: 'today', label: 'Today' },
            ]}
          />
          {h.newRequestsCount > 0 ? (
            <Notice tone="primary" icon={Sparkles}>
              {`${h.newRequestsCount} new reservation request${h.newRequestsCount > 1 ? 's' : ''} waiting for quick action.`}
            </Notice>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.page}>
      <ScreenHeader title="Table reservations" subtitle="Live queue management" onBack={h.goBack} />

      <View style={styles.toolbar}>
        <Input value={h.searchTerm} onChangeText={h.setSearchTerm} placeholder="Search guests..." accessibilityLabel="Search guests" left={<Search size={18} color={color.textMuted} />} />
        <SegmentedControl
          value={h.activeSection}
          onChange={h.setActiveSection}
          options={[
            { value: 'reservations', label: 'Reservations' },
            { value: 'media', label: 'Photos & menu' },
          ]}
        />
      </View>

      <FlatList
        data={reservations ? filteredBookings : []}
        keyExtractor={(booking, index) => String(booking._id ?? index)}
        renderItem={({ item }) => <BookingCard booking={item} h={h} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          reservations ? (
            <Card padded={false}>
              <EmptyState icon={Calendar} title="No reservations found" message="When guests book a table, they will appear here in your live queue." />
            </Card>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  toolbar: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm, gap: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  overline: { ...type.overline, color: color.goldText },
  caption: { ...type.caption, color: color.textMuted },
  cardTitle: { ...type.subheading, color: color.text },
  cardSub: { ...type.small, color: color.textMuted, marginTop: 2 },
  rowLabel: { ...type.bodyStrong, color: color.text, flexShrink: 1 },

  stats: { flexDirection: 'row', gap: space.sm, marginBottom: space.xxl },

  mediaToggle: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg },
  mediaToggleIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  panelHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  hero: { marginTop: space.lg, aspectRatio: 16 / 9, borderRadius: radii.md, overflow: 'hidden', borderWidth: 1, borderColor: color.border, backgroundColor: color.surfaceMuted },
  noPhoto: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.sm },
  noPhotoText: { ...type.small, color: color.textMuted },
  grid: { marginTop: space.md, flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space.xs },
  cell3: { width: '33.333%', padding: space.xs },
  cell2: { width: '50%', padding: space.xs },
  thumb: { height: 88, borderRadius: radii.sm, overflow: 'hidden', borderWidth: 1, borderColor: color.border, backgroundColor: color.surfaceMuted },
  thumbMain: { borderColor: color.primary, borderWidth: 2 },
  thumbTag: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.xs, paddingVertical: 2, backgroundColor: color.overlay },
  thumbTagText: { ...type.caption, color: color.textInverse },
  remove: { position: 'absolute', right: space.sm, top: space.sm, backgroundColor: color.surface },
  menuThumb: { height: 112, borderRadius: radii.sm, overflow: 'hidden', borderWidth: 1, borderColor: color.border, backgroundColor: color.surfaceMuted },
  noMenu: { marginTop: space.lg, height: 112, borderRadius: radii.md, borderWidth: 1, borderStyle: 'dashed', borderColor: color.borderStrong, backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center', gap: space.sm },

  controls: { marginBottom: space.xxl },
  controlsTitle: { ...type.heading, color: color.text, marginTop: space.xs },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.lg, padding: space.md, borderRadius: radii.md, backgroundColor: color.surfaceMuted },
  block: { marginTop: space.xl, paddingTop: space.xl, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.md },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space.xs },
  catCell: { width: '50%', padding: space.xs },
  cat: { alignItems: 'center', gap: space.sm, padding: space.md, minHeight: 120, borderRadius: radii.md, borderWidth: 1.5, borderColor: color.border, backgroundColor: color.surface },
  catOn: { borderColor: color.primary, backgroundColor: color.primarySoft },
  catImg: { width: 56, height: 56, borderRadius: radii.md, overflow: 'hidden', borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  catImgEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surfaceMuted },
  catName: { ...type.label, textAlign: 'center' },
  catCheck: { position: 'absolute', top: space.sm, right: space.sm, backgroundColor: color.primary, borderRadius: radii.pill, padding: 3 },
  noCats: { paddingVertical: space.xxl, paddingHorizontal: space.lg, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: color.borderStrong, borderRadius: radii.md, backgroundColor: color.surfaceMuted },
  limitRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.md },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.xs, padding: space.xs, borderRadius: radii.md, backgroundColor: color.surfaceMuted, borderWidth: 1, borderColor: color.border },
  step: { borderRadius: radii.md, backgroundColor: color.surface },
  limitValue: { minWidth: 36, textAlign: 'center', ...type.price, color: color.text },

  booking: { gap: space.md },
  bookingNew: { borderWidth: 2, borderColor: color.primary },
  bookingHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...type.subheading, color: color.primary },
  guest: { ...type.subheading, color: color.text },
  bid: { ...type.caption, color: color.textMuted, marginTop: 2 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: space.md, backgroundColor: color.surfaceMuted, borderRadius: radii.md, rowGap: space.md },
  infoCell: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingRight: space.xs },
  infoText: { flexShrink: 1, ...type.label, color: color.text },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
