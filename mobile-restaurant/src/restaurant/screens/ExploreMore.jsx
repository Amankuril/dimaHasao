import { ActivityIndicator, KeyboardAvoidingView, Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, ArrowLeft, ChevronRight, Edit, LogOut, MapPin, Search, ShoppingBag, Store, Trash2, User, UserRound, X } from 'lucide-react-native';
import { authAPI, restaurantAPI } from '../../api/restaurant';
import { showAccountDeletedToast } from '../../components/customToasts';
import Img from '../../components/Img';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { toast } from '../../lib/notify';
import { useLocation } from '../../lib/webRouter';
import { poppins, shadow, tw } from '../../theme';
import BottomNavOrders, { BOTTOM_NAV_HEIGHT } from '../components/BottomNavOrders';
import { PrimaryButton } from '../components/ui';
import { useExploreMore } from '../hooks/pages/useExploreMore';
import { RT, RT_GRADIENT } from '../theme';
import { clearModuleAuth } from '../utils/auth';

const RED = '#FF3131';
const DANGER = '#DC2626';

function Avatar({ image, size }) {
  const uri = image?.url || (typeof image === 'string' ? image : '');
  return (
    <View style={[styles.avatar, { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2 }]}>
      {uri ? (
        <Img source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} resizeMode="cover" accessibilityLabel="Profile" />
      ) : (
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center' }}>
          <User size={size / 2} color={tw.gray400} />
        </View>
      )}
    </View>
  );
}

/** The two logout buttons and Cancel shared by the logout dialog and the profile dialog. */
function LogoutActions({ isLoggingOut, onLogout, onLogoutAll, onCancel }) {
  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <View style={{ width: '100%', gap: 12 }}>
        <Press scale={0.98} onPress={onLogout} disabled={isLoggingOut} style={[styles.logout, isLoggingOut ? { opacity: 0.5 } : null]}>
          <Text style={[styles.logoutText, { color: '#fff' }]}>{isLoggingOut ? 'Logging out...' : 'Logout'}</Text>
        </Press>
        <Press scale={0.98} onPress={onLogoutAll} disabled={isLoggingOut} style={[styles.logoutAll, isLoggingOut ? { opacity: 0.5 } : null]}>
          <Text style={[styles.logoutText, { color: DANGER }]}>{isLoggingOut ? 'Logging out...' : 'Logout from all devices'}</Text>
        </Press>
      </View>
      <Press scale={1} onPress={onCancel} disabled={isLoggingOut} hitSlop={8} style={[{ marginTop: 20 }, isLoggingOut ? { opacity: 0.5 } : null]}>
        <Text style={{ fontSize: 15, lineHeight: 22, color: '#6B7280', ...poppins(700) }}>Cancel</Text>
      </Press>
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

  const noResults = (
    <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 16 }}>
      <Search size={64} color={tw.gray300} style={{ marginBottom: 16 }} />
      <Text style={{ fontSize: 18, lineHeight: 28, color: tw.gray900, marginBottom: 8, ...poppins(600) }}>No results found</Text>
      <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray500, textAlign: 'center', ...poppins(400) }}>Try searching with different keywords</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Press onPress={() => navigate('/food/restaurant')} accessibilityLabel="Go back" style={{ padding: 6 }}>
            <ArrowLeft size={24} color={tw.gray900} />
          </Press>
          <Text style={styles.title} accessibilityRole="header">Explore more</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Press onPress={() => setSearchOpen(true)} accessibilityLabel="Search" style={{ padding: 8 }}>
            <Search size={20} color={tw.gray900} />
          </Press>
          <Press onPress={() => setProfileOpen(true)} accessibilityLabel="Profile">
            <LinearGradient colors={profileOpen ? RT_GRADIENT : [tw.gray100, tw.gray100]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 8, borderRadius: 999 }}>
              <UserRound size={20} color={profileOpen ? '#fff' : tw.gray900} />
            </LinearGradient>
          </Press>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 96 + BOTTOM_NAV_HEIGHT + insets.bottom }}>
        <View style={styles.restaurantCard}>
          <View style={{ padding: 8, backgroundColor: tw.gray100, borderRadius: 8 }}>
            <Store size={20} color={tw.gray900} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 17, lineHeight: 20, letterSpacing: -0.4, color: tw.gray900, ...poppins(700) }} numberOfLines={1}>{restaurantDisplayName}</Text>
            {restaurantDisplayAddress ? (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 6, opacity: 0.9 }}>
                <MapPin size={12} color={RT.primary} style={{ marginTop: 3 }} />
                <Text style={{ flex: 1, fontSize: 12, lineHeight: 19.5, color: tw.gray600, ...poppins(600) }}>{restaurantDisplayAddress}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {sections.length > 0
          ? sections.map((section, index) => (
              <View key={section.key}>
                <View style={{ marginBottom: 32 }}>
                  <Text style={{ fontSize: 16, lineHeight: 24, color: tw.gray900, marginBottom: 16, ...poppins(700) }}>{section.title}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8, rowGap: 16 }}>
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <View key={item.id} style={{ width: '33.333%', paddingHorizontal: 8, alignItems: 'center' }}>
                          <Press scale={0.98} onPress={() => openItem(item)} accessibilityLabel={item.label} style={styles.tile}>
                            <Icon size={32} color={tw.gray900} strokeWidth={1.5} />
                          </Press>
                          <Text style={styles.tileLabel}>{item.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
                {index < sections.length - 1 ? <View style={styles.rule} /> : null}
              </View>
            ))
          : noResults}
        <View style={styles.rule} />

        <Press scale={0.99} onPress={() => setLogoutConfirmOpen(true)} style={styles.logoutRow}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ width: 51, height: 51, borderRadius: 26, backgroundColor: tw.red50, alignItems: 'center', justifyContent: 'center' }}>
              <LogOut size={20} color={RED} style={{ marginLeft: 2 }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, lineHeight: 25, color: RED, marginBottom: 2, ...poppins(700) }}>Logout</Text>
              <Text style={styles.rowHint}>Tap to logout from this device</Text>
            </View>
          </View>
          <ChevronRight size={18} color={tw.gray300} />
        </Press>

        <Press scale={0.99} onPress={handleDeleteAccountClick} disabled={isCheckingBalance} style={styles.deleteRow}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF1F2', alignItems: 'center', justifyContent: 'center' }}>
              {isCheckingBalance ? <ActivityIndicator size="small" color={RED} /> : <Trash2 size={20} color={RED} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, lineHeight: 24, color: RED, ...poppins(700) }}>Delete Account</Text>
              <Text style={styles.rowHint}>Tap to delete your account</Text>
            </View>
          </View>
          <ChevronRight size={20} color="rgba(255,49,49,0.3)" />
        </Press>
      </ScrollView>

      {/* Logout confirmation */}
      <Dialog visible={logoutConfirmOpen} onClose={() => !isLoggingOut && setLogoutConfirmOpen(false)} backdrop="rgba(0,0,0,0.5)" panelStyle={styles.logoutPanel}>
        <View style={{ marginBottom: 12 }}>
          <Avatar image={userData.profileImage} size={84} />
        </View>
        <Text style={styles.personName}>{userData.name || 'Restaurant'}</Text>
        {userData.phone ? <Text style={[styles.personLine, { color: tw.gray500, marginBottom: 2 }]}>{userData.phone}</Text> : null}
        {userData.email && userData.email !== 'N/A' ? <Text style={[styles.personLine, { color: tw.gray400, marginBottom: 24 }]}>{userData.email}</Text> : null}
        <LogoutActions isLoggingOut={isLoggingOut} onLogout={handleLogout} onLogoutAll={handleLogoutAllDevices} onCancel={() => setLogoutConfirmOpen(false)} />
      </Dialog>

      {/* Search */}
      <Modal visible={searchOpen} animationType="slide" onRequestClose={closeSearch} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
          <View style={styles.searchHeader}>
            <Press onPress={closeSearch} accessibilityLabel="Close search" style={{ padding: 6 }}>
              <ArrowLeft size={24} color={tw.gray900} />
            </Press>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search features..." placeholderTextColor={tw.gray500} autoFocus style={styles.searchInput} />
              {searchQuery ? (
                <Press onPress={() => setSearchQuery('')} accessibilityLabel="Clear search" hitSlop={8} style={{ position: 'absolute', right: 8, padding: 4 }}>
                  <X size={16} color={tw.gray600} />
                </Press>
              ) : null}
            </View>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {searchQuery.trim() ? (
              sections.length > 0 ? (
                <View style={{ padding: 16 }}>
                  {sections.map((section, index) => (
                    <View key={section.key} style={{ marginBottom: index === sections.length - 1 ? 0 : 24 }}>
                      <Text style={styles.searchSection}>{section.title}</Text>
                      <View style={{ gap: 8 }}>
                        {section.items.map((item) => {
                          const Icon = item.icon;
                          return (
                            <Press
                              key={item.id}
                              scale={0.99}
                              onPress={() => {
                                if (item.route) navigate(item.route, { state: { from: location.pathname } });
                                closeSearch();
                              }}
                              style={styles.searchRow}
                            >
                              <View style={{ padding: 8, backgroundColor: tw.gray100, borderRadius: 8 }}>
                                <Icon size={20} color={tw.gray900} />
                              </View>
                              <Text style={{ flex: 1, fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(400) }}>{item.label}</Text>
                              <ChevronRight size={20} color={tw.gray400} />
                            </Press>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                noResults
              )
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 16 }}>
                <Search size={64} color={tw.gray300} style={{ marginBottom: 16 }} />
                <Text style={{ fontSize: 16, lineHeight: 24, color: tw.gray900, marginBottom: 4, ...poppins(500) }}>Search for features</Text>
                <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray500, textAlign: 'center', ...poppins(400) }}>Type to search for outlet settings, orders, and more</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* My profile */}
      <Dialog visible={profileOpen} onClose={() => setProfileOpen(false)} backdrop="rgba(0,0,0,0.5)" panelStyle={styles.profilePanel}>
        <View style={styles.profileHeader}>
          <Text style={styles.title}>My profile</Text>
          <Press onPress={() => setProfileOpen(false)} accessibilityLabel="Close" style={{ padding: 6 }}>
            <X size={20} color={tw.gray900} />
          </Press>
        </View>
        <View style={{ padding: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Avatar image={userData.profileImage?.url ? userData.profileImage : null} size={64} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.personName, { fontSize: 17, textAlign: 'left' }]} numberOfLines={1}>{loadingRestaurant ? 'Loading...' : userData.name || 'Restaurant'}</Text>
              {userData.phone ? <Text style={[styles.personLine, { color: tw.gray500, marginBottom: 2 }]}>{userData.phone}</Text> : null}
              {userData.email && userData.email !== 'N/A' ? <Text style={[styles.personLine, { color: tw.gray400 }]} numberOfLines={1}>{userData.email}</Text> : null}
            </View>
          </View>
          <Press
            onPress={() => {
              setProfileOpen(false);
              navigate('/food/restaurant/edit-owner');
            }}
            accessibilityLabel="Edit Profile"
            style={{ padding: 8, marginLeft: 8, backgroundColor: tw.gray50, borderRadius: 999 }}
          >
            <Edit size={16} color={tw.gray600} />
          </Press>
        </View>
        <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
          <LogoutActions isLoggingOut={isLoggingOut} onLogout={handleLogout} onLogoutAll={handleLogoutAllDevices} onCancel={() => setProfileOpen(false)} />
        </View>
      </Dialog>

      {/* Takeaway */}
      <Dialog visible={takeawayModalOpen} onClose={() => setTakeawayModalOpen(false)} backdrop="rgba(0,0,0,0.5)" panelStyle={styles.takeawayPanel}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <Text style={styles.dialogTitle}>Takeaway</Text>
          <Press onPress={() => setTakeawayModalOpen(false)} accessibilityLabel="Close" style={{ padding: 6 }}>
            <X size={20} color={tw.gray400} />
          </Press>
        </View>
        <Press
          scale={1}
          onPress={() => setTempTakeawayEnabled(!tempTakeawayEnabled)}
          accessibilityRole="switch"
          accessibilityState={{ checked: Boolean(tempTakeawayEnabled) }}
          style={[styles.takeawayRow, tempTakeawayEnabled ? { backgroundColor: 'rgba(240,253,244,0.5)', borderColor: tw.green100 } : { backgroundColor: tw.gray50, borderColor: tw.gray100 }]}
        >
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <LinearGradient colors={[tw.blue500, tw.blue700]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={20} color="#fff" strokeWidth={2.5} />
            </LinearGradient>
            <Text style={{ fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(700) }}>Takeaway orders</Text>
          </View>
          <View style={{ width: 56, height: 32, borderRadius: 16, justifyContent: 'center', backgroundColor: tempTakeawayEnabled ? tw.green500 : tw.gray300 }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', marginLeft: tempTakeawayEnabled ? 28 : 4, ...shadow('md') }} />
          </View>
        </Press>
        <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray500, paddingHorizontal: 4, marginBottom: 24, ...poppins(400) }}>
          When enabled, customers can place takeaway orders from your restaurant. You can turn this off anytime.
        </Text>
        <PrimaryButton
          title="Save"
          loading={isTakeawayUpdating}
          loadingTitle="Saving..."
          onPress={saveTakeaway}
          style={[{ borderRadius: 16, overflow: 'hidden' }, isTakeawayUpdating ? { opacity: 0.7 } : null]}
          textStyle={{ fontSize: 16, lineHeight: 24, ...poppins(700) }}
        />
      </Dialog>

      {/* Balance warning before deleting */}
      <Dialog visible={showBalanceWarning} onClose={() => setShowBalanceWarning(false)} backdrop="rgba(0,0,0,0.5)" panelStyle={[styles.warnPanel, { borderColor: RT.accentBorder }]}>
        <View style={[styles.warnIcon, { backgroundColor: tw.orange100 }]}>
          <AlertTriangle size={32} color={RT.accent} />
        </View>
        <Text style={[styles.dialogTitle, { textAlign: 'center', marginBottom: 8 }]}>Wait! Balance Found</Text>
        <View style={{ backgroundColor: tw.gray50, borderRadius: 16, padding: 16, marginBottom: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 10, lineHeight: 15, letterSpacing: 1, color: tw.gray500, marginBottom: 4, minWidth: 40, ...poppins(900) }}>{String(balanceData.type || '').toUpperCase()}</Text>
          {/* web class `text-[#B80B3D]xl font-black text-black`: the theme's [class*="text-[#B80B3D]"] rule repaints it green */}
          <Text style={{ fontSize: 16, lineHeight: 24, color: RT.primary, ...poppins(900) }}>₹{Number(balanceData.balance || 0).toLocaleString('en-IN')}</Text>
        </View>
        <Text style={{ fontSize: 14, lineHeight: 22.75, color: tw.gray500, textAlign: 'center', marginBottom: 24, ...poppins(400) }}>
          You still have unsettled payout available to withdraw. Continue deleting your account or go to Payout to withdraw first.
        </Text>
        <View style={{ gap: 12 }}>
          <Press
            scale={0.98}
            onPress={() => {
              setShowBalanceWarning(false);
              setDeleteCaptcha('');
              setDeleteConfirmOpen(true);
            }}
            style={{ height: 48, borderRadius: 12, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 16, color: tw.gray700, ...poppins(700) }}>Continue Anyway</Text>
          </Press>
          <PrimaryButton
            title="Go to Payout"
            onPress={() => {
              setShowBalanceWarning(false);
              navigate('/food/restaurant/hub-finance');
            }}
            style={{ borderRadius: 12, overflow: 'hidden' }}
            textStyle={{ fontSize: 16, lineHeight: 24, ...poppins(700) }}
          />
        </View>
      </Dialog>

      {/* Delete account */}
      <Dialog visible={deleteConfirmOpen} onClose={() => !isDeleting && setDeleteConfirmOpen(false)} closeOnBackdrop={false} backdrop="rgba(0,0,0,0.6)" panelStyle={[styles.warnPanel, { borderColor: tw.red100 }]}>
        <KeyboardAvoidingView behavior="padding">
          <View style={[styles.warnIcon, { backgroundColor: tw.red100 }]}>
            <Trash2 size={32} color={RT.primary} />
          </View>
          <Text style={[styles.dialogTitle, { textAlign: 'center', marginBottom: 8 }]}>Delete Your Account?</Text>
          <Text style={{ fontSize: 14, lineHeight: 22.75, color: tw.gray500, textAlign: 'center', marginBottom: 20, ...poppins(400) }}>Are you sure you want to delete your account?</Text>
          <View style={styles.warning}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <AlertTriangle size={16} color={RT.primary} />
              <Text style={{ fontSize: 12, lineHeight: 16, letterSpacing: 0.6, color: tw.red700, minWidth: 56, ...poppins(700) }}>WARNING</Text>
            </View>
            <Text style={{ fontSize: 11, lineHeight: 13.75, color: tw.red800, ...poppins(500) }}>Your account will be Deleted. Admin will keep your historical records for revenue reporting.</Text>
          </View>
          <TextInput
            value={deleteCaptcha}
            onChangeText={(text) => setDeleteCaptcha(text.toUpperCase())}
            placeholder="Type DELETE to confirm"
            placeholderTextColor={tw.gray400}
            autoCapitalize="characters"
            style={[styles.captcha, deleteCaptcha ? { letterSpacing: 1.6, ...poppins(700) } : poppins(500)]}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Press scale={0.98} onPress={() => setDeleteConfirmOpen(false)} disabled={isDeleting} style={[styles.keep, isDeleting ? { opacity: 0.5 } : null]}>
              <Text style={{ fontSize: 14, color: tw.gray800, ...poppins(700) }}>No, Cancel</Text>
            </Press>
            <PrimaryButton
              title={isDeleting ? 'Deleting...' : 'Delete Account'}
              onPress={deleteAccount}
              disabled={isDeleting || deleteCaptcha !== 'DELETE'}
              style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}
              textStyle={{ fontSize: 14, lineHeight: 20, ...poppins(700) }}
            />
          </View>
        </KeyboardAvoidingView>
      </Dialog>

      <BottomNavOrders />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.gray200, paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  restaurantCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray200, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 24 },
  tile: { width: '100%', minHeight: 110, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff', borderRadius: 8, borderWidth: 2, borderColor: tw.gray200, ...shadow('md') },
  tileLabel: { marginTop: 12, fontSize: 14, lineHeight: 17.5, color: tw.gray700, textAlign: 'center', ...poppins(400) },
  rule: { borderTopWidth: 1, borderTopColor: tw.gray200, marginVertical: 24 },
  logoutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 19, borderWidth: 1, borderColor: tw.red100, backgroundColor: '#fff', padding: 16, marginBottom: 16 },
  deleteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 16, borderWidth: 1, borderColor: tw.gray100, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 20, ...shadow('sm') },
  rowHint: { fontSize: 13, lineHeight: 19, color: tw.gray500, ...poppins(500) },
  avatar: { backgroundColor: tw.gray50, alignItems: 'center', justifyContent: 'center' },
  logoutPanel: { width: '100%', maxWidth: 340, alignSelf: 'center', borderRadius: 29, backgroundColor: '#fff', padding: 28, alignItems: 'center', ...shadow('2xl') },
  personName: { fontSize: 19, lineHeight: 24, color: '#1F2937', marginBottom: 4, textAlign: 'center', ...poppins(900) },
  personLine: { fontSize: 13, lineHeight: 19, ...poppins(500) },
  logout: { borderRadius: 14, backgroundColor: DANGER, paddingVertical: 14, alignItems: 'center' },
  logoutAll: { borderRadius: 14, borderWidth: 1.5, borderColor: DANGER, backgroundColor: '#fff', paddingVertical: 14, alignItems: 'center' },
  logoutText: { fontSize: 15, lineHeight: 22, ...poppins(700) },
  searchHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  searchInput: { paddingLeft: 16, paddingRight: 40, paddingVertical: 8, backgroundColor: tw.gray100, borderRadius: 8, fontSize: 16, color: tw.gray900, ...poppins(400) },
  searchSection: { fontSize: 14, lineHeight: 20, letterSpacing: 0.35, color: tw.gray500, textTransform: 'uppercase', marginBottom: 12, ...poppins(600) },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8 },
  profilePanel: { width: '92%', maxWidth: 384, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 40, overflow: 'hidden', ...shadow('2xl') },
  profileHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  takeawayPanel: { width: '90%', maxWidth: 384, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 24, padding: 24, ...shadow('2xl') },
  dialogTitle: { fontSize: 20, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  takeawayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
  warnPanel: { width: '100%', maxWidth: 384, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 24, padding: 24, borderWidth: 1, ...shadow('2xl') },
  warnIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 },
  warning: { marginBottom: 20, backgroundColor: tw.red50, borderLeftWidth: 4, borderLeftColor: tw.red500, borderTopRightRadius: 12, borderBottomRightRadius: 12, padding: 12 },
  captcha: { height: 48, paddingHorizontal: 16, borderRadius: 12, borderWidth: 2, borderColor: tw.gray100, textAlign: 'center', fontSize: 16, color: tw.gray900, marginBottom: 24 },
  keep: { flex: 1, height: 48, borderRadius: 12, borderWidth: 2, borderColor: tw.gray200, alignItems: 'center', justifyContent: 'center' },
});
