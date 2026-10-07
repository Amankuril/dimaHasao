import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { CheckCircle, Clock, FileText, MapPin, Plus, Search } from 'lucide-react-native';
import { Press } from '../../../../components/ui';
import { poppins, tw } from '../../../../theme';
import { HT } from '../../../theme';
import { ErrorBanner, HOUSE_RULES_OPTIONS, Label, SectionHeading, WInput } from './shared';

/*
 * Steps 7-10 (Property Rules, Documents, Review & Submit, Done) of
 * Frontend/src/modules/Hotel/app/partner/pages/AddHotelWizard.jsx.
 */

export function StepRules({ propertyForm, updatePropertyForm, error }) {
  return (
    <View style={{ gap: 24 }}>
      <SectionHeading icon={Clock} title="Check-in and house rules" description="Set expectations up front to avoid disputes later." />

      <ErrorBanner message={error} />

      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ flex: 1 }}>
            <Label>Check-in Time</Label>
            <View>
              <WInput style={{ paddingLeft: 48 }} placeholder="12:00 PM" value={propertyForm.checkInTime} onChangeText={(v) => updatePropertyForm('checkInTime', v)} />
              <View style={styles.inputIcon} pointerEvents="none">
                <Clock size={18} color={tw.gray400} />
              </View>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Label>Check-out Time</Label>
            <View>
              <WInput style={{ paddingLeft: 48 }} placeholder="11:00 AM" value={propertyForm.checkOutTime} onChangeText={(v) => updatePropertyForm('checkOutTime', v)} />
              <View style={styles.inputIcon} pointerEvents="none">
                <Clock size={18} color={tw.gray400} />
              </View>
            </View>
          </View>
        </View>

        <View>
          <Label>Cancellation Policy</Label>
          <WInput
            multiline
            style={{ minHeight: 100 }}
            placeholder="e.g., Free cancellation up to 24 hours before check-in..."
            value={propertyForm.cancellationPolicy}
            onChangeText={(v) => updatePropertyForm('cancellationPolicy', v)}
          />
        </View>

        <View style={{ gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: tw.gray100 }}>
          <Label>House Rules</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {HOUSE_RULES_OPTIONS.map((r) => {
              const isSelected = propertyForm.houseRules.includes(r);
              return (
                <Press
                  key={r}
                  scale={0.97}
                  onPress={() => {
                    const has = propertyForm.houseRules.includes(r);
                    updatePropertyForm('houseRules', has ? propertyForm.houseRules.filter((x) => x !== r) : [...propertyForm.houseRules, r]);
                  }}
                  style={[styles.rule, isSelected ? styles.ruleOn : null]}
                >
                  <Text style={[styles.ruleText, isSelected ? { color: '#fff' } : null]}>{r}</Text>
                </Press>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

export function StepDocuments({ propertyForm, error, uploading, pickDocument }) {
  return (
    <View style={{ gap: 24 }}>
      <SectionHeading icon={FileText} title="Verification documents" description="Our team checks these before your property goes live." />

      <ErrorBanner message={error} />

      <View style={{ gap: 16 }}>
        <Text style={styles.docIntro}>Please provide the following documents</Text>
        <View style={{ gap: 12 }}>
          {propertyForm.documents.map((doc, idx) => (
            <View key={idx} style={styles.docCard}>
              <View style={styles.docTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docName}>{doc.name}</Text>
                  <Text style={styles.docSub}>Optional document</Text>
                </View>
                {doc.fileUrl ? (
                  <View style={[styles.docBadge, { backgroundColor: tw.emerald50 }]}>
                    <CheckCircle size={18} color={tw.emerald700} />
                  </View>
                ) : (
                  <View style={[styles.docBadge, { backgroundColor: tw.gray100 }]}>
                    <FileText size={18} color={tw.gray400} />
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Press scale={0.98} onPress={() => pickDocument(idx)} style={[styles.docBtn, doc.fileUrl ? styles.docBtnOn : null]}>
                  {uploading === `doc_${idx}` ? (
                    <>
                      <ActivityIndicator size="small" color={tw.gray600} />
                      <Text style={styles.docBtnText}>Uploading...</Text>
                    </>
                  ) : doc.fileUrl ? (
                    <Text style={[styles.docBtnText, { color: HT.primaryStrong }]}>Change File</Text>
                  ) : (
                    <>
                      <Plus size={16} color={tw.gray600} />
                      <Text style={styles.docBtnText}>Upload</Text>
                    </>
                  )}
                </Press>
                {doc.fileUrl ? (
                  <Press scale={0.95} onPress={() => Linking.openURL(doc.fileUrl).catch(() => {})} style={styles.docView} accessibilityLabel="View file">
                    <Search size={18} color={tw.gray500} />
                  </Press>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export function StepReview({ propertyForm, roomTypes, error }) {
  return (
    <View style={{ gap: 24 }}>
      <View style={styles.compliance}>
        <View style={styles.complianceIcon}>
          <CheckCircle size={20} color={tw.emerald700} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.complianceTitle}>Review Compliance</Text>
          <Text style={styles.complianceText}>Please review the details below carefully before submitting. Ensuring accurate information helps in faster approval.</Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errBox}>
          <Text style={styles.errBoxText}>{error}</Text>
        </View>
      ) : null}

      <View style={{ gap: 16 }}>
        <View style={styles.reviewCard}>
          <Text style={styles.reviewHead}>Property Details</Text>
          <View style={{ gap: 4 }}>
            <Text style={styles.reviewName}>{propertyForm.propertyName || 'No Name'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4 }}>
              <MapPin size={14} color={tw.gray600} style={{ marginTop: 3 }} />
              <Text style={styles.reviewAddr}>{propertyForm.address.fullAddress || 'No Address'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.reviewCard}>
          <Text style={styles.reviewHead}>Room Types ({roomTypes.length})</Text>
          {roomTypes.length > 0 ? (
            <View style={{ gap: 8 }}>
              {roomTypes.map((rt, i) => (
                <View key={i} style={styles.between}>
                  <Text style={styles.rtName}>{rt.name}</Text>
                  <Text style={styles.rtPrice}>₹{rt.pricePerNight}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noRooms}>No room types added!</Text>
          )}
        </View>

        <View style={styles.reviewCard}>
          <Text style={styles.reviewHead}>Documents ({propertyForm.documents.filter((d) => d.fileUrl).length}/{propertyForm.documents.length})</Text>
          <View style={{ gap: 8 }}>
            {propertyForm.documents.map((doc, i) => (
              <View key={i} style={styles.between}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  {doc.fileUrl ? <CheckCircle size={14} color={tw.emerald500} /> : <View style={styles.emptyDot} />}
                  <Text style={[styles.docRowName, doc.fileUrl ? { color: tw.gray700 } : null]}>{doc.name}</Text>
                </View>
                <Text style={styles.docRowState}>{doc.fileUrl ? 'Attached' : 'Optional'}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

export function StepDone({ onGo }) {
  return (
    <View style={styles.done}>
      <View style={styles.doneIcon}>
        <CheckCircle size={48} color={tw.emerald600} />
      </View>
      <View style={{ gap: 8, alignItems: 'center' }}>
        <Text style={styles.doneTitle}>Registration Submitted!</Text>
        <Text style={styles.doneText}>Your property registration has been sent for verification. Our team will review it and get back to you shortly.</Text>
      </View>
      <Press scale={0.95} onPress={onGo} style={styles.doneBtn}>
        <Text style={styles.doneBtnText}>Go to My Properties</Text>
      </Press>
    </View>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  inputIcon: { position: 'absolute', left: 16, top: 0, bottom: 0, justifyContent: 'center' },
  rule: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff' },
  ruleOn: { backgroundColor: HT.primary, borderColor: HT.primary },
  ruleText: { fontSize: 12, lineHeight: 16, color: tw.gray600, ...poppins(500) },
  docIntro: { fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(600) },
  docCard: { padding: 16, borderWidth: 1, borderColor: tw.gray200, borderRadius: 16, backgroundColor: '#fff' },
  docTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 8 },
  docName: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(700) },
  docSub: { fontSize: 12, lineHeight: 16, marginTop: 2, color: tw.gray400, ...poppins(400) },
  docBadge: { padding: 6, borderRadius: 999 },
  docBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: tw.gray300, backgroundColor: tw.gray50 },
  docBtnOn: { borderColor: HT.primaryBorder, backgroundColor: HT.primaryTint },
  docBtnText: { fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(700) },
  docView: { padding: 10, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff' },
  compliance: { backgroundColor: tw.emerald50, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: tw.emerald100, flexDirection: 'row', gap: 12 },
  complianceIcon: { backgroundColor: tw.emerald100, padding: 8, borderRadius: 999, alignSelf: 'flex-start' },
  complianceTitle: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(700) },
  complianceText: { fontSize: 12, lineHeight: 16, marginTop: 4, color: tw.gray600, ...poppins(400) },
  errBox: { padding: 16, backgroundColor: tw.red50, borderWidth: 1, borderColor: tw.red200, borderRadius: 16 },
  errBoxText: { fontSize: 14, lineHeight: 20, color: tw.red700, ...poppins(500) },
  reviewCard: { borderWidth: 1, borderColor: tw.gray200, borderRadius: 16, padding: 20, backgroundColor: '#fff' },
  reviewHead: { fontSize: 14, lineHeight: 20, color: tw.gray900, borderBottomWidth: 1, borderBottomColor: tw.gray100, paddingBottom: 8, marginBottom: 12, ...poppins(700) },
  reviewName: { fontSize: 18, lineHeight: 28, color: HT.primaryStrong, ...poppins(700) },
  reviewAddr: { flex: 1, fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(400) },
  rtName: { flex: 1, fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(500) },
  rtPrice: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) },
  noRooms: { fontSize: 12, lineHeight: 16, color: tw.red500, backgroundColor: tw.red50, padding: 8, borderRadius: 8, overflow: 'hidden', ...poppins(500) },
  emptyDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: tw.gray300, backgroundColor: tw.gray50 },
  docRowName: { flex: 1, fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) },
  docRowState: { fontSize: 12, lineHeight: 16, color: tw.gray400, ...poppins(400) },
  done: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 24 },
  doneIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: tw.emerald100, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontSize: 30, lineHeight: 36, color: tw.gray900, textAlign: 'center', ...poppins(800) },
  doneText: { maxWidth: 384, fontSize: 16, lineHeight: 24, color: tw.gray500, textAlign: 'center', ...poppins(400) },
  doneBtn: { paddingHorizontal: 32, paddingVertical: 12, backgroundColor: tw.emerald600, borderRadius: 12 },
  doneBtnText: { fontSize: 16, lineHeight: 24, color: '#fff', ...poppins(700) },
});
