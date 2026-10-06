import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Calendar, CheckCircle2, ChevronDown, ChevronUp, Clock, Clock4, ImagePlus, MessageSquare, Phone, Search, Sparkles, UploadCloud, Users, UtensilsCrossed, X,
} from 'lucide-react-native';
import Loader from '../../components/Loader';
import Img from '../../components/Img';
import { Press } from '../../components/ui';
import { toast } from '../../lib/notify';
import { poppins, shadow, tw } from '../../theme';
import { useDiningReservations } from '../hooks/pages/useDiningReservations';
import { RT, RT_GRADIENT } from '../theme';

const grad = { colors: RT_GRADIENT, start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };
const ACTIVE = ['pending', 'confirmed', 'accepted', 'checked-in'];

/** The web `Badge` colours for a booking status (mobile card variant). */
function statusBadge(status) {
  const key = String(status || '').toLowerCase();
  if (key === 'pending') return { bg: tw.amber50, fg: tw.amber600, border: tw.amber200, label: 'WAITING' };
  if (key === 'accepted' || key === 'confirmed') return { bg: '#DCFCE7', fg: '#15803D', border: '#BBF7D0', label: 'CONFIRMED' };
  if (key === 'checked-in') return { bg: tw.orange100, fg: tw.orange700, label: status };
  if (key === 'completed') return { bg: tw.blue100, fg: tw.blue700, label: status };
  return { bg: '#FEE2E2', fg: '#B91C1C', border: '#FCA5A5', label: status };
}

function Tab({ on, label, onPress, small }) {
  return (
    <Press scale={1} onPress={onPress} accessibilityLabel={label} accessibilityState={{ selected: on }} style={{ flex: small ? undefined : 1 }}>
      {on ? (
        <LinearGradient {...grad} style={small ? styles.segSmall : styles.seg}>
          <Text style={[small ? styles.segSmallText : styles.segText, { color: '#fff' }]}>{label}</Text>
        </LinearGradient>
      ) : (
        <View style={small ? styles.segSmall : styles.seg}>
          <Text style={[small ? styles.segSmallText : styles.segText, { color: small ? tw.slate500 : tw.slate600 }]}>{label}</Text>
        </View>
      )}
    </Press>
  );
}

function Stat({ icon: Icon, color, tint, label, value, gradient }) {
  return (
    <View style={styles.stat}>
      <View style={[styles.statCorner, { backgroundColor: tint }]} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        {gradient ? (
          <LinearGradient {...grad} style={styles.statIcon}>
            <Icon size={24} color="#fff" />
          </LinearGradient>
        ) : (
          <View style={[styles.statIcon, { backgroundColor: color }]}>
            <Icon size={24} color="#fff" />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
          <Text style={styles.statValue}>{value}</Text>
        </View>
      </View>
    </View>
  );
}

function UploadButton({ busy, disabled, onPress }) {
  return (
    <Press onPress={onPress} disabled={disabled} accessibilityLabel={busy ? 'Uploading' : 'Add Photos'} style={{ opacity: disabled ? 0.6 : 1 }}>
      <LinearGradient {...grad} style={styles.upload}>
        <UploadCloud size={16} color="#fff" />
        <Text style={styles.uploadText}>{busy ? 'Uploading...' : 'Add Photos'}</Text>
      </LinearGradient>
    </Press>
  );
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
      <Icon size={16} color={tw.blue500} />
      <Text style={styles.infoText} numberOfLines={1}>{text}</Text>
    </View>
  );
  return (
    <View style={[styles.booking, isNew ? { borderWidth: 2, borderColor: tw.amber400 } : null]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <LinearGradient {...grad} style={styles.avatar}>
            <Text style={styles.avatarText}>{(name.charAt(0) || '?').toUpperCase()}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.guest} numberOfLines={1}>{name}</Text>
            <Text style={styles.bid}>#{booking.bookingId}</Text>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border || 'transparent', borderWidth: badge.border ? 1 : 0 }]}>
          <Text style={[styles.badgeText, { color: badge.fg }]}>{String(badge.label).toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.infoGrid}>
        {info(Calendar, when)}
        {info(Clock, booking.timeSlot)}
        {info(Users, `${booking.guests} Guests`)}
        {info(Phone, phone || 'No phone')}
      </View>

      {booking.specialRequest ? (
        <View style={styles.request}>
          <MessageSquare size={16} color={tw.blue700} style={{ marginTop: 2 }} />
          <Text style={styles.requestText}>{booking.specialRequest}</Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {key === 'pending' ? (
          <Press onPress={() => h.handleStatusUpdate(booking._id, 'accepted')} accessibilityLabel="Accept" style={{ flex: 1 }}>
            <LinearGradient {...grad} style={styles.action}>
              <Text style={[styles.actionText, { color: '#fff' }]}>ACCEPT</Text>
            </LinearGradient>
          </Press>
        ) : null}
        {key === 'pending' ? (
          <Press onPress={() => h.handleStatusUpdate(booking._id, 'cancelled')} accessibilityLabel="Decline" style={[styles.action, { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.rose200 }]}>
            <Text style={[styles.actionText, { color: tw.slate600 }]}>DECLINE</Text>
          </Press>
        ) : null}
        {booking.status === 'accepted' ? (
          <Press onPress={() => h.handleStatusUpdate(booking._id, 'checked-in')} accessibilityLabel="Check-in" style={[styles.action, { flex: 1, backgroundColor: tw.orange600 }]}>
            <Text style={[styles.actionText, { color: '#fff' }]}>CHECK-IN</Text>
          </Press>
        ) : null}
        {booking.status === 'checked-in' ? (
          <Press onPress={() => h.handleStatusUpdate(booking._id, 'completed')} accessibilityLabel="Check-out" style={{ flex: 1 }}>
            <LinearGradient {...grad} style={styles.action}>
              <Text style={[styles.actionText, { color: '#fff' }]}>CHECK-OUT</Text>
            </LinearGradient>
          </Press>
        ) : null}
      </View>
    </View>
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
    <Press onPress={onPress} disabled={!!pendingRequest} accessibilityLabel={label === '+' ? 'Increase guest limit' : 'Decrease guest limit'} style={[styles.step, pendingRequest ? { opacity: 0.5 } : null]}>
      <Text style={styles.stepText}>{label}</Text>
    </Press>
  );

  const reservations = h.activeSection === 'reservations';
  const media = h.activeSection === 'media';

  return (
    <View style={{ flex: 1, backgroundColor: tw.slate50 }}>
      <View style={[styles.header, { paddingTop: 16 + insets.top }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Press onPress={h.goBack} accessibilityLabel="Back to explore" style={styles.back}>
            <ArrowLeft size={20} color={tw.slate500} />
          </Press>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
            <Text style={styles.title} accessibilityRole="header">Table Reservations</Text>
            <View style={styles.pulse} />
          </View>
          <Text style={styles.tagline}>LIVE QUEUE MANAGEMENT</Text>
        </View>

        <View style={{ gap: 12 }}>
          <View style={{ justifyContent: 'center' }}>
            <View style={styles.searchIcon} pointerEvents="none">
              <Search size={16} color={tw.slate400} />
            </View>
            <TextInput
              value={h.searchTerm}
              onChangeText={h.setSearchTerm}
              placeholder="Search guests..."
              placeholderTextColor={tw.slate400}
              accessibilityLabel="Search guests"
              style={styles.search}
            />
          </View>
          <View style={styles.queueTabs}>
            {[['reservations', 'Queue'], ['media', 'Media']].map(([id, label]) => {
              const on = h.activeSection === id;
              return (
                <Press key={id} scale={1} onPress={() => h.setActiveSection(id)} accessibilityLabel={label} accessibilityState={{ selected: on }} style={[styles.queueTab, on ? styles.queueTabOn : null]}>
                  <Text style={[styles.queueTabText, { color: on ? tw.slate900 : tw.slate400 }]}>{label.toUpperCase()}</Text>
                </Press>
              );
            })}
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 80 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 16, marginBottom: 32 }}>
          <Stat gradient icon={Users} tint="rgba(239,246,255,0.5)" label="Total Bookings" value={bookings.length} />
          <Stat icon={CheckCircle2} color={tw.emerald600} tint="rgba(240,253,244,0.5)" label="Active" value={bookings.filter((b) => ACTIVE.includes(String(b.status || '').toLowerCase())).length} />
          <Stat icon={Clock4} color={tw.orange600} tint="rgba(255,247,237,0.5)" label="Today's Bookings" value={bookings.filter((b) => new Date(b.date).toDateString() === new Date().toDateString()).length} />
        </View>

        <View style={styles.sections}>
          <Tab on={reservations} label="Reservations" onPress={() => h.setActiveSection('reservations')} />
          <Tab on={media} label="Photos & Menu" onPress={() => h.setActiveSection('media')} />
        </View>

        {media ? (
          <Press scale={1} onPress={() => h.setShowMediaPanel((prev) => !prev)} accessibilityLabel="Photos and menu manager" accessibilityState={{ expanded: h.showMediaPanel }} style={styles.mediaToggle}>
            <View style={{ flex: 1 }}>
              <Text style={styles.mediaToggleTitle}>Photos & Menu Manager</Text>
              <Text style={styles.mediaToggleSub}>Upload restaurant and menu images only when needed.</Text>
            </View>
            {h.showMediaPanel ? <ChevronUp size={20} color={tw.slate500} /> : <ChevronDown size={20} color={tw.slate500} />}
          </Press>
        ) : null}

        {media && h.showMediaPanel ? (
          <View style={{ gap: 24, marginBottom: 32 }}>
            <View style={styles.panel}>
              <View style={styles.panelHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.panelTitle}>Restaurant Photos</Text>
                  <Text style={styles.panelSub}>Add multiple restaurant photos. The first one will be used as the main preview.</Text>
                </View>
                <UploadButton busy={h.uploadingRestaurantPhoto} disabled={h.uploadingRestaurantPhoto || h.removingRestaurantPhoto} onPress={() => pickPhotos(h.handleRestaurantPhotoUpload)} />
              </View>

              <View style={styles.hero}>
                {h.restaurantPhoto ? (
                  <Img source={{ uri: h.restaurantPhoto }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel={h.restaurant?.restaurantName || h.restaurant?.name || 'Restaurant'} />
                ) : (
                  <View style={styles.noPhoto}>
                    <ImagePlus size={32} color={tw.slate400} style={{ marginBottom: 8 }} />
                    <Text style={styles.noPhotoText}>No restaurant photo added yet</Text>
                  </View>
                )}
              </View>

              {h.restaurantPhotos.length > 0 ? (
                <View style={styles.grid3}>
                  {h.restaurantPhotos.map((photo, index) => {
                    const main = h.restaurantPhoto === photo.url;
                    return (
                      <View key={`${photo.url}-${index}`} style={styles.cell3}>
                        <Press scale={1} onPress={() => h.setRestaurantPhoto(photo.url)} accessibilityLabel={`Restaurant photo ${index + 1}`} style={[styles.thumb, main ? { borderColor: tw.slate900, borderWidth: 2 } : null]}>
                          <Img source={{ uri: photo.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                          <View style={styles.thumbTag}>
                            <Text style={styles.thumbTagText}>{main ? 'Main' : `Photo ${index + 1}`}</Text>
                          </View>
                        </Press>
                        <Press onPress={() => h.handleRemoveRestaurantPhoto(photo.url)} accessibilityLabel="Remove photo" hitSlop={6} style={styles.remove}>
                          <X size={14} color={tw.rose600} />
                        </Press>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>

            <View style={styles.panel}>
              <View style={styles.panelHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.panelTitle}>Menu Photos</Text>
                  <Text style={styles.panelSub}>Add menu photos and view previously uploaded photos.</Text>
                </View>
                <UploadButton busy={h.uploadingMenuPhotos} disabled={h.uploadingMenuPhotos || h.removingMenuPhoto} onPress={() => pickPhotos(h.handleMenuPhotosUpload)} />
              </View>

              {h.menuPhotos.length > 0 ? (
                <View style={styles.grid2}>
                  {h.menuPhotos.map((photo, index) => (
                    <View key={`${photo.url}-${index}`} style={styles.cell2}>
                      <View style={styles.menuThumb}>
                        <Img source={{ uri: photo.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel={`Menu photo ${index + 1}`} />
                      </View>
                      <Press onPress={() => h.handleRemoveMenuPhoto(photo.url)} disabled={h.removingMenuPhoto} accessibilityLabel="Remove menu photo" hitSlop={6} style={styles.remove}>
                        <X size={14} color={tw.rose600} />
                      </Press>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.noMenu}>
                  <ImagePlus size={28} color={tw.slate400} style={{ marginBottom: 8 }} />
                  <Text style={styles.noPhotoText}>No menu photos added yet</Text>
                </View>
              )}
            </View>
          </View>
        ) : null}

        {reservations ? (
          <View style={styles.controls}>
            <Text style={styles.eyebrow}>DINING CONTROLS</Text>
            <Text style={styles.controlsTitle}>Manage dining availability and booking limit</Text>
            <Text style={styles.controlsSub}>
              These settings update the same dining profile the guest booking flow reads, so restaurant changes are reflected on the user side too.
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginTop: 24, marginBottom: 32 }}>
              <View style={styles.statePill}>
                <View style={[styles.stateDot, { backgroundColor: h.diningEnabled ? tw.emerald500 : tw.rose500 }]} />
                <Text style={styles.stateText}>{h.diningEnabled ? 'Dining enabled' : 'Dining paused'}</Text>
              </View>
              <View style={styles.switchPill}>
                <Text style={styles.switchLabel}>Turn dining on/off</Text>
                <Press
                  scale={1}
                  onPress={toggleDining}
                  disabled={!!pendingRequest}
                  accessibilityRole="switch"
                  accessibilityLabel="Turn dining on or off"
                  accessibilityState={{ checked: h.diningEnabled, disabled: !!pendingRequest }}
                  style={[styles.switchTrack, { backgroundColor: h.diningEnabled ? tw.emerald600 : tw.slate300 }, pendingRequest ? { opacity: 0.5 } : null]}
                >
                  <View style={[styles.switchThumb, { left: h.diningEnabled ? 24 : 4 }]} />
                </Press>
              </View>
            </View>

            <View style={styles.catBlock}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Sparkles size={16} color={RT.primary} />
                <Text style={styles.catHeading}>Choose Dining Categories (Pick Multiple)</Text>
              </View>
              <View style={styles.catGrid}>
                {h.availableCategories.map((cat) => {
                  const selected = Array.isArray(diningType) && diningType.includes(cat.slug);
                  return (
                    <View key={cat._id} style={styles.catCell}>
                      <Press
                        scale={selected ? 1 : 0.95}
                        onPress={() => {
                          if (pendingRequest) return;
                          h.setDiningType(selected ? diningType.filter((s) => s !== cat.slug) : [...diningType, cat.slug]);
                        }}
                        disabled={!!pendingRequest}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected, disabled: !!pendingRequest }}
                        accessibilityLabel={cat.name}
                        style={[styles.cat, selected ? { borderColor: RT.primary, backgroundColor: RT.primarySoft, ...shadow('md') } : null, pendingRequest ? { opacity: 0.8 } : null]}
                      >
                        <View style={[styles.catImg, selected ? { borderColor: RT.accentBorder } : null]}>
                          {cat.imageUrl ? (
                            <Img source={{ uri: cat.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel={cat.name} />
                          ) : (
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tw.slate50 }}>
                              <UtensilsCrossed size={24} color={tw.slate300} />
                            </View>
                          )}
                        </View>
                        <Text style={[styles.catName, { color: selected ? RT.primary : tw.slate600 }]}>{cat.name}</Text>
                        {selected ? (
                          <View style={styles.catCheck}>
                            <CheckCircle2 size={14} color="#fff" />
                          </View>
                        ) : null}
                      </Press>
                    </View>
                  );
                })}
              </View>
              {h.availableCategories.length === 0 ? (
                <View style={styles.noCats}>
                  <Text style={styles.noCatsText}>No categories available. Please contact support.</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.limitBlock}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.limitLabel}>Maximum Guest Limit</Text>
                  <Text style={styles.limitSub}>Guests allowed per reservation</Text>
                </View>
                <View style={styles.stepper}>
                  {stepper('−', () => {
                    if (pendingRequest) return;
                    h.setMaxGuestsLimit(Math.max(0, h.maxGuestsLimit - 1));
                  })}
                  <Text style={styles.limitValue}>{h.maxGuestsLimit}</Text>
                  {stepper('+', () => {
                    if (pendingRequest) return;
                    h.setMaxGuestsLimit(parseInt(h.maxGuestsLimit) + 1);
                  })}
                </View>
              </View>

              <Press onPress={h.handleSaveDiningSettings} disabled={h.savingDiningSettings || !!pendingRequest} accessibilityLabel="Save settings" style={{ opacity: h.savingDiningSettings || pendingRequest ? 0.6 : 1 }}>
                <LinearGradient {...grad} style={styles.save}>
                  <Text style={styles.saveText}>{(h.savingDiningSettings ? 'Saving...' : pendingRequest ? 'Approval Pending' : 'Save settings').toUpperCase()}</Text>
                </LinearGradient>
              </Press>
            </View>

            {pendingRequest ? (
              <View style={styles.pending}>
                <Clock4 size={16} color={tw.amber800} style={{ marginTop: 2 }} />
                <Text style={styles.pendingText}>Your recent changes are waiting for admin approval. You cannot make new changes until the current request is processed.</Text>
              </View>
            ) : null}

            {h.diningSettingsMessage || h.diningSettingsError ? (
              <View style={[styles.msg, h.diningSettingsError ? styles.msgErr : styles.msgOk]}>
                <Text style={[styles.msgText, { color: h.diningSettingsError ? tw.rose700 : tw.emerald700 }]}>{h.diningSettingsError || h.diningSettingsMessage}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {h.uploadMessage || h.uploadError ? (
          <View style={[styles.msg, { marginTop: 0, marginBottom: 24 }, h.uploadError ? { backgroundColor: tw.red50, borderColor: tw.red200 } : { backgroundColor: tw.green50, borderColor: tw.green200 }]}>
            <Text style={[styles.msgText, { color: h.uploadError ? tw.red700 : tw.green700 }]}>{h.uploadError || h.uploadMessage}</Text>
          </View>
        ) : null}

        {reservations ? (
          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
              <Text style={styles.queueTitle}>Reservation Queue</Text>
              <View style={styles.views}>
                <Tab small on={h.activeView === 'priority'} label="Priority" onPress={() => h.setActiveView('priority')} />
                <Tab small on={h.activeView === 'new'} label={`New (${h.newRequestsCount})`} onPress={() => h.setActiveView('new')} />
                <Tab small on={h.activeView === 'today'} label="Today" onPress={() => h.setActiveView('today')} />
              </View>
            </View>

            {h.newRequestsCount > 0 ? (
              <View style={styles.newBanner}>
                <Sparkles size={16} color={tw.amber800} />
                <Text style={styles.newBannerText}>
                  {h.newRequestsCount} new reservation request{h.newRequestsCount > 1 ? 's' : ''} waiting for quick action.
                </Text>
              </View>
            ) : null}

            {filteredBookings.length > 0 ? (
              <View style={{ gap: 16 }}>
                {filteredBookings.map((booking) => <BookingCard key={booking._id} booking={booking} h={h} />)}
              </View>
            ) : (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Calendar size={40} color={tw.slate300} />
                </View>
                <Text style={styles.emptyTitle}>No reservations found</Text>
                <Text style={styles.emptySub}>When guests book a table, they will appear here in your live queue.</Text>
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: 'rgba(255,255,255,0.8)', borderBottomWidth: 1, borderBottomColor: tw.slate100, paddingHorizontal: 24, paddingBottom: 16, gap: 16 },
  back: { backgroundColor: tw.slate100, padding: 8, borderRadius: 12, borderWidth: 1, borderColor: tw.slate200 },
  title: { flexShrink: 1, fontSize: 24, lineHeight: 32, letterSpacing: -0.6, color: tw.slate900, ...poppins(800) },
  pulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: tw.emerald500 },
  tagline: { flexShrink: 1, fontSize: 12, lineHeight: 16, letterSpacing: 1.8, color: tw.slate400, marginTop: 4, ...poppins(700) },
  searchIcon: { position: 'absolute', left: 16, zIndex: 1 },
  search: { height: 44, paddingLeft: 44, paddingRight: 16, backgroundColor: 'rgba(241,245,249,0.5)', borderWidth: 2, borderColor: 'transparent', borderRadius: 16, fontSize: 14, color: tw.slate900, ...poppins(700) },
  queueTabs: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(241,245,249,0.5)', padding: 4, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(226,232,240,0.5)' },
  queueTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  queueTabOn: { backgroundColor: '#fff', ...shadow('md') },
  queueTabText: { fontSize: 12, lineHeight: 16, letterSpacing: 1.8, ...poppins(800) },

  stat: { backgroundColor: '#fff', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: tw.slate100, overflow: 'hidden', ...shadow('sm') },
  statCorner: { position: 'absolute', top: -32, right: -32, width: 96, height: 96, borderBottomLeftRadius: 48 },
  statIcon: { padding: 12, borderRadius: 12, ...shadow('lg') },
  statLabel: { fontSize: 14, lineHeight: 20, letterSpacing: 0.7, color: tw.slate500, ...poppins(600) },
  statValue: { fontSize: 16, lineHeight: 16, color: tw.slate900, marginTop: 4, ...poppins(800) },

  sections: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 4, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.slate200, marginBottom: 24 },
  seg: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segText: { fontSize: 12, lineHeight: 16, ...poppins(600) },
  segSmall: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  segSmallText: { fontSize: 12, lineHeight: 16, ...poppins(600) },

  mediaToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: tw.slate200, paddingHorizontal: 20, paddingVertical: 16, marginBottom: 32 },
  mediaToggleTitle: { fontSize: 16, lineHeight: 24, color: tw.slate900, ...poppins(700) },
  mediaToggleSub: { fontSize: 14, lineHeight: 20, color: tw.slate500, ...poppins(400) },

  panel: { backgroundColor: '#fff', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: tw.slate100, ...shadow('sm') },
  panelHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  panelTitle: { fontSize: 18, lineHeight: 28, color: tw.slate900, ...poppins(700) },
  panelSub: { fontSize: 14, lineHeight: 20, color: tw.slate500, marginTop: 4, ...poppins(400) },
  upload: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  uploadText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(600) },
  hero: { marginTop: 16, height: 224, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: tw.slate200, backgroundColor: tw.slate50 },
  noPhoto: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noPhotoText: { fontSize: 14, lineHeight: 20, color: tw.slate400, ...poppins(500) },
  grid3: { marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  cell3: { width: '33.333%', padding: 6 },
  thumb: { height: 80, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: tw.slate200, backgroundColor: tw.slate50 },
  thumbTag: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(6,56,30,0.45)', paddingHorizontal: 4, paddingVertical: 2 },
  thumbTagText: { fontSize: 10, lineHeight: 15, color: '#fff', ...poppins(600) },
  remove: { position: 'absolute', right: 10, top: 10, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  grid2: { marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  cell2: { width: '50%', padding: 6 },
  menuThumb: { height: 96, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: tw.slate200, backgroundColor: tw.slate50 },
  noMenu: { marginTop: 16, height: 112, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: tw.slate300, backgroundColor: tw.slate50, alignItems: 'center', justifyContent: 'center' },

  controls: { marginBottom: 24, borderRadius: 16, borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff', padding: 20, ...shadow('sm') },
  eyebrow: { fontSize: 12, lineHeight: 16, letterSpacing: 2.6, color: tw.slate400, ...poppins(700) },
  controlsTitle: { marginTop: 4, fontSize: 18, lineHeight: 28, color: tw.slate900, ...poppins(800) },
  controlsSub: { marginTop: 4, fontSize: 14, lineHeight: 20, color: tw.slate500, ...poppins(400) },
  statePill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, borderWidth: 1, borderColor: tw.slate200, backgroundColor: tw.slate50, paddingHorizontal: 12, paddingVertical: 8 },
  stateDot: { width: 10, height: 10, borderRadius: 5 },
  stateText: { fontSize: 14, lineHeight: 20, color: tw.slate700, ...poppins(600) },
  switchPill: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 999, borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8 },
  switchLabel: { fontSize: 14, lineHeight: 20, color: tw.slate700, ...poppins(500) },
  switchTrack: { width: 48, height: 28, borderRadius: 14, justifyContent: 'center' },
  switchThumb: { position: 'absolute', top: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', ...shadow('sm') },

  catBlock: { marginTop: 8, borderTopWidth: 1, borderTopColor: tw.slate100, paddingTop: 24 },
  catHeading: { flex: 1, fontSize: 14, lineHeight: 20, color: tw.slate900, ...poppins(700) },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 },
  catCell: { width: '50%', padding: 8 },
  cat: { alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 2, borderColor: tw.slate100, backgroundColor: '#fff' },
  catImg: { width: 64, height: 64, borderRadius: 16, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: tw.slate100, backgroundColor: '#fff', ...shadow('sm') },
  catName: { fontSize: 13, lineHeight: 16, textAlign: 'center', ...poppins(700) },
  catCheck: { position: 'absolute', top: 8, right: 8, backgroundColor: RT.primary, borderRadius: 999, padding: 4, ...shadow('sm') },
  noCats: { paddingVertical: 40, alignItems: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: tw.slate100, borderRadius: 16, backgroundColor: 'rgba(248,250,252,0.5)' },
  noCatsText: { fontSize: 14, lineHeight: 20, color: tw.slate400, textAlign: 'center', ...poppins(500) },

  limitBlock: { marginTop: 32, gap: 24, borderTopWidth: 1, borderTopColor: tw.slate100, paddingTop: 24 },
  limitLabel: { fontSize: 14, lineHeight: 20, color: tw.slate900, ...poppins(700) },
  limitSub: { fontSize: 12, lineHeight: 16, color: tw.slate500, ...poppins(500) },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(241,245,249,0.8)', padding: 6, borderRadius: 16, borderWidth: 1, borderColor: tw.slate200 },
  step: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#fff', ...shadow('sm') },
  stepText: { fontSize: 20, lineHeight: 28, color: tw.slate600, ...poppins(800) },
  limitValue: { width: 32, textAlign: 'center', fontSize: 18, lineHeight: 28, color: tw.slate800, ...poppins(800) },
  save: { borderRadius: 999, paddingHorizontal: 40, paddingVertical: 16, alignItems: 'center', ...shadow('xl') },
  saveText: { fontSize: 14, lineHeight: 20, letterSpacing: 0.7, color: '#fff', ...poppins(800) },

  pending: { marginTop: 24, flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: tw.amber200, backgroundColor: tw.amber50, paddingHorizontal: 16, paddingVertical: 12 },
  pendingText: { flex: 1, fontSize: 14, lineHeight: 20, color: tw.amber800, ...poppins(600) },
  msg: { marginTop: 16, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  msgErr: { borderColor: tw.rose200, backgroundColor: tw.rose50 },
  msgOk: { borderColor: tw.emerald200, backgroundColor: tw.emerald50 },
  msgText: { fontSize: 14, lineHeight: 20, ...poppins(500) },

  queueTitle: { flexShrink: 1, fontSize: 16, lineHeight: 24, color: tw.slate800, ...poppins(700) },
  views: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.slate200, padding: 4 },
  newBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 16, borderWidth: 1, borderColor: tw.amber200, backgroundColor: tw.amber50, paddingHorizontal: 16, paddingVertical: 12 },
  newBannerText: { flex: 1, fontSize: 14, lineHeight: 20, color: tw.amber800, ...poppins(600) },

  booking: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: tw.slate100, ...shadow('sm') },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(800) },
  guest: { fontSize: 16, lineHeight: 16, color: tw.slate900, ...poppins(800) },
  bid: { fontSize: 10, lineHeight: 15, letterSpacing: 1, color: tw.slate400, marginTop: 4, ...poppins(700) },
  badge: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999, marginLeft: 8 },
  badgeText: { fontSize: 9, lineHeight: 14, letterSpacing: 0.45, ...poppins(800) },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, backgroundColor: tw.slate50, borderRadius: 12, marginBottom: 16, rowGap: 12 },
  infoCell: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 6 },
  infoText: { flexShrink: 1, fontSize: 12, lineHeight: 16, color: tw.slate700, ...poppins(700) },
  request: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, backgroundColor: tw.blue50, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: tw.blue100 },
  requestText: { flex: 1, fontSize: 12, lineHeight: 16, color: tw.blue700, ...poppins(500) },
  action: { paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  actionText: { fontSize: 12, lineHeight: 16, letterSpacing: 1.8, ...poppins(800) },

  empty: { backgroundColor: '#fff', borderRadius: 24, padding: 64, alignItems: 'center', borderWidth: 1, borderColor: tw.slate100, ...shadow('sm') },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: tw.slate50, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 24, lineHeight: 32, color: tw.slate800, textAlign: 'center', ...poppins(800) },
  emptySub: { marginTop: 8, maxWidth: 320, fontSize: 16, lineHeight: 24, color: tw.slate500, textAlign: 'center', ...poppins(400) },
});
