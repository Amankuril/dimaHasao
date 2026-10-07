import { ActivityIndicator, KeyboardAvoidingView, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, ArrowLeft, Edit, LogOut, MapPin, Search, ShoppingBag, Store, Trash2, User, UserRound, X } from 'lucide-react-native';
import { authAPI, restaurantAPI } from '../../api/restaurant';
import { showAccountDeletedToast } from '../../components/customToasts';
import Img from '../../components/Img';
import { Dialog } from '../../components/kit';
import { Button, Card, EmptyState, IconButton, ListRow, SectionHeader, StatusBadge, formatINR } from '../../components/ds';
import { Press } from '../../components/ui';
import { toast } from '../../lib/notify';
import { useLocation } from '../../lib/webRouter';
import { color, elevation, radii, space, type } from '../../theme';
import BottomNavOrders, { BOTTOM_NAV_HEIGHT } from '../components/BottomNavOrders';
import { useExploreMore } from '../hooks/pages/useExploreMore';
import { clearModuleAuth } from '../utils/auth';
import { Input, ScreenHeader, Switch } from './inventory/partnerKit';

function Avatar({ image, size }) {
  const uri = image?.url || (typeof image === 'string' ? image : '');
  return (
    <View style={[styles.avatar, { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2 }]}>
      {uri ? (
        <Img source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} resizeMode="cover" accessibilityLabel="Profile" />
      ) : (
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <User size={size / 2} color={color.primary} />
        </View>
      )}
    </View>
  );
}

/** The two logout buttons and Cancel shared by the logout dialog and the profile dialog. */
function LogoutActions({ isLoggingOut, onLogout, onLogoutAll, onCancel }) {
  return (
    <View style={{ alignSelf: 'stretch', gap: space.md }}>
      <Button title={isLoggingOut ? 'Logging out…' : 'Log out'} variant="danger" icon={LogOut} onPress={onLogout} disabled={isLoggingOut} />
      <Button title={isLoggingOut ? 'Logging out…' : 'Log out from all devices'} variant="dangerSoft" onPress={onLogoutAll} disabled={isLoggingOut} />
      <Button title="Cancel" variant="ghost" onPress={onCancel} disabled={isLoggingOut} />
    </View>
  );
}

/*
 * Port of Food/pages/restaurant/ExploreMore.jsx (/food/restaurant/explore).
 * The web file also carries the "Schedule off" sheets (reason, dates and times,
 * success, existing schedule). They open only from a card with id 5, and no
 * section holds that card, so they can never appear and are not built.
 */
export default function ExploreMore() {
  const insets = useSafeAreaInsets();
  const location = useLocation();
  const {
    navigate, profileOpen, setProfileOpen, searchOpen, setSearchOpen, searchQuery, setSearchQuery,
    takeawayModalOpen, setTakeawayModalOpen, tempTakeawayEnabled, setTempTakeawayEnabled, isTakeawayUpdating, setIsTakeawayUpdating,
    deleteConfirmOpen, setDeleteConfirmOpen, deleteCaptcha, setDeleteCaptcha, isDeleting, setIsDeleting, showBalanceWarning, setShowBalanceWarning, balanceData, isCheckingBalance, handleDeleteAccountClick,
    isLoggingOut, logoutConfirmOpen, setLogoutConfirmOpen, restaurantData, setRestaurantData, loadingRestaurant, restaurantDisplayAddress, userData, restaurantDisplayName,
    handleLogout, handleLogoutAllDevices, getFilteredSections,
  } = useExploreMore();
  const sections = getFilteredSections();

  const openItem = (item) => {
    if (item.id === 6) {
      setTempTakeawayEnabled(restaurantData?.isTakeawayEnabled || false);
      setTakeawayModalOpen(true);
    } else if (item.route) {
      navigate(item.route, { state: { from: location.pathname } });
    }
  };
  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
  };

  const saveTakeaway = async () => {
    if (isTakeawayUpdating) return;
    setIsTakeawayUpdating(true);
    try {
      await restaurantAPI.updateTakeawaySettings({ isEnabled: tempTakeawayEnabled });
      setRestaurantData((prev) => ({ ...prev, isTakeawayEnabled: tempTakeawayEnabled }));
      setTakeawayModalOpen(false);
      toast.success(`Takeaway ${tempTakeawayEnabled ? 'enabled' : 'disabled'} successfully`, { duration: 2000 });
    } catch {
      toast.error('Failed to update takeaway status', { duration: 2000 });
    } finally {
      setIsTakeawayUpdating(false);
    }
  };

  const deleteAccount = async () => {
    if (isDeleting || deleteCaptcha !== 'DELETE') return;
    setIsDeleting(true);
    try {
      await authAPI.deleteAccount('restaurant');
      showAccountDeletedToast();
      clearModuleAuth('restaurant');
      navigate('/food/restaurant/login', { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete account');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  const noResults = <EmptyState icon={Search} title="No results found" message="Try searching with different keywords." />;

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScreenHeader
        title="Explore more"
        onBack={() => navigate('/food/restaurant')}
        right={
          <View style={{ flexDirection: 'row' }}>
            <IconButton icon={Search} label="Search" variant="inverse" onPress={() => setSearchOpen(true)} style={{ backgroundColor: 'transparent' }} />
            <IconButton icon={UserRound} label="Profile" variant="inverse" onPress={() => setProfileOpen(true)} />
          </View>
        }
      />

      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.xxl, paddingBottom: space.xxxl + BOTTOM_NAV_HEIGHT + insets.bottom }}>
        <Card style={styles.restaurantCard}>
          <View style={styles.storeIcon}>
            <Store size={22} color={color.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={[type.subheading, { color: color.text }]} numberOfLines={2}>{restaurantDisplayName}</Text>
            {restaurantDisplayAddress ? (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.xs }}>
                <MapPin size={14} color={color.goldText} style={{ marginTop: 3 }} />
                <Text style={[type.small, { flex: 1, color: color.textSecondary }]} numberOfLines={2}>{restaurantDisplayAddress}</Text>
              </View>
            ) : null}
          </View>
        </Card>

        {sections.length > 0
          ? sections.map((section) => (
              <View key={section.key}>
                <SectionHeader title={section.title} />
                <Card padded={false} style={{ overflow: 'hidden' }}>
                  {section.items.map((item, index) => (
                    <ListRow
                      key={item.id}
                      icon={item.icon}
                      title={item.label}
                      onPress={() => openItem(item)}
                      divider={index < section.items.length - 1}
                      right={item.id === 6 && section.key === 'manage-outlet' ? <StatusBadge label={restaurantData?.isTakeawayEnabled ? 'On' : 'Off'} tone={restaurantData?.isTakeawayEnabled ? 'primary' : 'neutral'} style={{ alignSelf: 'center' }} /> : null}
                    />
                  ))}
                </Card>
              </View>
            ))
          : noResults}

        <View>
          <SectionHeader title="Account" />
          <Card padded={false} style={{ overflow: 'hidden' }}>
            <ListRow icon={LogOut} tone="danger" title="Log out" subtitle="Log out from this device" onPress={() => setLogoutConfirmOpen(true)} divider />
            <ListRow
              icon={isCheckingBalance ? () => <ActivityIndicator size="small" color={color.danger} /> : Trash2}
              tone="danger"
              title="Delete account"
              subtitle="Permanently delete your restaurant account"
              onPress={isCheckingBalance ? undefined : handleDeleteAccountClick}
              chevron
            />
          </Card>
        </View>
      </ScrollView>

      {/* Logout confirmation */}
      <Dialog visible={logoutConfirmOpen} onClose={() => !isLoggingOut && setLogoutConfirmOpen(false)} backdrop={color.overlay} panelStyle={styles.panel}>
        <Avatar image={userData.profileImage} size={72} />
        <Text style={[type.heading, styles.center, { marginTop: space.md }]} numberOfLines={2}>{userData.name || 'Restaurant'}</Text>
        {userData.phone ? <Text style={[type.small, styles.center, { color: color.textSecondary }]}>{userData.phone}</Text> : null}
        {userData.email && userData.email !== 'N/A' ? <Text style={[type.small, styles.center, { color: color.textMuted }]} numberOfLines={1}>{userData.email}</Text> : null}
        <View style={{ height: space.xl }} />
        <LogoutActions isLoggingOut={isLoggingOut} onLogout={handleLogout} onLogoutAll={handleLogoutAllDevices} onCancel={() => setLogoutConfirmOpen(false)} />
      </Dialog>

      {/* Search */}
      <Modal visible={searchOpen} animationType="slide" onRequestClose={closeSearch} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: color.bg, paddingTop: insets.top }}>
          <View style={styles.searchHeader}>
            <IconButton icon={ArrowLeft} label="Close search" onPress={closeSearch} />
            <Input
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search features"
              accessibilityLabel="Search features"
              autoFocus
              style={{ flex: 1 }}
              left={<Search size={18} color={color.textMuted} />}
              right={
                searchQuery ? (
                  <Press onPress={() => setSearchQuery('')} accessibilityLabel="Clear search" style={styles.clearBtn}>
                    <X size={18} color={color.textMuted} />
                  </Press>
                ) : null
              }
            />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg, gap: space.xxl, paddingBottom: space.xxxl + insets.bottom }}>
            {searchQuery.trim() ? (
              sections.length > 0 ? (
                sections.map((section) => (
                  <View key={section.key}>
                    <SectionHeader title={section.title} plain />
                    <Card padded={false} style={{ overflow: 'hidden' }}>
                      {section.items.map((item, index) => (
                        <ListRow
                          key={item.id}
                          icon={item.icon}
                          title={item.label}
                          divider={index < section.items.length - 1}
                          onPress={() => {
                            if (item.route) navigate(item.route, { state: { from: location.pathname } });
                            closeSearch();
                          }}
                        />
                      ))}
                    </Card>
                  </View>
                ))
              ) : (
                noResults
              )
            ) : (
              <EmptyState icon={Search} title="Search for features" message="Type to find outlet settings, orders and more." />
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* My profile */}
      <Dialog visible={profileOpen} onClose={() => setProfileOpen(false)} backdrop={color.overlay} panelStyle={[styles.panel, { alignItems: 'stretch' }]}>
        <View style={styles.profileHeader}>
          <Text style={[type.heading, { flex: 1, color: color.text }]} accessibilityRole="header">My profile</Text>
          <IconButton icon={X} label="Close" onPress={() => setProfileOpen(false)} />
        </View>
        <View style={styles.profileRow}>
          <Avatar image={userData.profileImage?.url ? userData.profileImage : null} size={56} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[type.subheading, { color: color.text }]} numberOfLines={1}>{loadingRestaurant ? 'Loading…' : userData.name || 'Restaurant'}</Text>
            {userData.phone ? <Text style={[type.small, { color: color.textSecondary }]}>{userData.phone}</Text> : null}
            {userData.email && userData.email !== 'N/A' ? <Text style={[type.small, { color: color.textMuted }]} numberOfLines={1}>{userData.email}</Text> : null}
          </View>
          <IconButton
            icon={Edit}
            label="Edit Profile"
            variant="primary"
            onPress={() => {
              setProfileOpen(false);
              navigate('/food/restaurant/edit-owner');
            }}
          />
        </View>
        <LogoutActions isLoggingOut={isLoggingOut} onLogout={handleLogout} onLogoutAll={handleLogoutAllDevices} onCancel={() => setProfileOpen(false)} />
      </Dialog>

      {/* Takeaway */}
      <Dialog visible={takeawayModalOpen} onClose={() => setTakeawayModalOpen(false)} backdrop={color.overlay} panelStyle={[styles.panel, { alignItems: 'stretch' }]}>
        <View style={styles.profileHeader}>
          <Text style={[type.heading, { flex: 1, color: color.text }]} accessibilityRole="header">Takeaway</Text>
          <IconButton icon={X} label="Close" onPress={() => setTakeawayModalOpen(false)} />
        </View>
        <View style={[styles.takeawayRow, tempTakeawayEnabled && { borderColor: color.primary, backgroundColor: color.primarySoft }]}>
          <View style={styles.storeIcon}>
            <ShoppingBag size={20} color={color.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[type.bodyStrong, { color: color.text }]}>Takeaway orders</Text>
            <Text style={[type.caption, { color: tempTakeawayEnabled ? color.primary : color.textMuted }]}>{tempTakeawayEnabled ? 'On' : 'Off'}</Text>
          </View>
          <Switch value={Boolean(tempTakeawayEnabled)} onValueChange={() => setTempTakeawayEnabled(!tempTakeawayEnabled)} accessibilityLabel="Takeaway orders" />
        </View>
        <Text style={[type.small, { color: color.textSecondary, marginVertical: space.lg }]}>When on, customers can place takeaway orders from your restaurant. You can turn this off anytime.</Text>
        <Button title={isTakeawayUpdating ? 'Saving…' : 'Save'} loading={isTakeawayUpdating} onPress={saveTakeaway} />
      </Dialog>

      {/* Balance warning before deleting */}
      <Dialog visible={showBalanceWarning} onClose={() => setShowBalanceWarning(false)} backdrop={color.overlay} panelStyle={styles.panel}>
        <View style={[styles.warnIcon, { backgroundColor: color.warningSoft }]}>
          <AlertTriangle size={28} color={color.warning} />
        </View>
        <Text style={[type.heading, styles.center]}>Wait, you have a balance</Text>
        <View style={styles.balance}>
          <Text style={[type.overline, { color: color.textMuted }]}>{String(balanceData.type || '')}</Text>
          <Text style={[type.priceLg, { color: color.text }]}>{formatINR(balanceData.balance)}</Text>
        </View>
        <Text style={[type.small, styles.center, { color: color.textSecondary, marginBottom: space.xl }]}>
          You still have an unsettled payout to withdraw. Go to Payout to withdraw first, or continue deleting your account.
        </Text>
        <View style={{ alignSelf: 'stretch', gap: space.md }}>
          <Button
            title="Go to payout"
            onPress={() => {
              setShowBalanceWarning(false);
              navigate('/food/restaurant/hub-finance');
            }}
          />
          <Button
            title="Continue anyway"
            variant="outline"
            onPress={() => {
              setShowBalanceWarning(false);
              setDeleteCaptcha('');
              setDeleteConfirmOpen(true);
            }}
          />
        </View>
      </Dialog>

      {/* Delete account */}
      <Dialog visible={deleteConfirmOpen} onClose={() => !isDeleting && setDeleteConfirmOpen(false)} closeOnBackdrop={false} backdrop={color.overlay} panelStyle={styles.panel}>
        <KeyboardAvoidingView behavior="padding" style={{ alignSelf: 'stretch', alignItems: 'center' }}>
          <View style={[styles.warnIcon, { backgroundColor: color.dangerSoft }]}>
            <Trash2 size={28} color={color.danger} />
          </View>
          <Text style={[type.heading, styles.center]}>Delete your account?</Text>
          <View style={styles.warning}>
            <AlertTriangle size={18} color={color.danger} style={{ marginTop: 1 }} />
            <Text style={[type.small, { flex: 1, color: color.text }]}>Your account will be deleted. Admin keeps your historical records for revenue reporting.</Text>
          </View>
          <Input
            value={deleteCaptcha}
            onChangeText={(text) => setDeleteCaptcha(text.toUpperCase())}
            placeholder="Type DELETE to confirm"
            accessibilityLabel="Type DELETE to confirm"
            autoCapitalize="characters"
            style={{ alignSelf: 'stretch', marginBottom: space.xl }}
          />
          <View style={{ flexDirection: 'row', gap: space.md, alignSelf: 'stretch' }}>
            <Button title="Cancel" variant="outline" onPress={() => setDeleteConfirmOpen(false)} disabled={isDeleting} style={{ flex: 1 }} />
            <Button title={isDeleting ? 'Deleting…' : 'Delete'} variant="danger" loading={isDeleting} onPress={deleteAccount} disabled={isDeleting || deleteCaptcha !== 'DELETE'} style={{ flex: 1 }} />
          </View>
        </KeyboardAvoidingView>
      </Dialog>

      <BottomNavOrders />
    </View>
  );
}

const styles = StyleSheet.create({
  restaurantCard: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  storeIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatar: { backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  panel: { width: '90%', maxWidth: 380, alignSelf: 'center', backgroundColor: color.surface, borderRadius: radii.xl, padding: space.xxl, alignItems: 'center', ...elevation.sheet },
  center: { textAlign: 'center', color: color.text },
  searchHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.xs, paddingRight: space.lg, paddingVertical: space.sm, backgroundColor: color.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  clearBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: -space.xs },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginTop: -space.sm, marginRight: -space.sm, marginBottom: space.md },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.xl },
  takeawayRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radii.md, borderWidth: 1, borderColor: color.border },
  warnIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  balance: { alignSelf: 'stretch', alignItems: 'center', gap: space.xs, backgroundColor: color.surfaceMuted, borderRadius: radii.md, padding: space.lg, marginVertical: space.lg },
  warning: { alignSelf: 'stretch', flexDirection: 'row', gap: space.sm, backgroundColor: color.dangerSoft, borderRadius: radii.md, padding: space.md, marginTop: space.md, marginBottom: space.lg },
});
