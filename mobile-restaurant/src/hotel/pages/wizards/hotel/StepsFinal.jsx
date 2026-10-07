import { Linking, Text, View } from 'react-native';
import { Clock, FileText, MapPin } from 'lucide-react-native';
import { color, space, type } from '../../../../theme';
import { Field, KeyValue } from '../../../components/dashboard/partnerUi';
import { DocumentRow, DoneState, GroupLabel, Notice, ReviewBlock, ReviewDocLine, ToggleChip } from '../../../components/wizardUi';
import { ErrorBanner, HOUSE_RULES_OPTIONS, SectionHeading } from './shared';

/*
 * Steps 7-10 (Property Rules, Documents, Review & Submit, Done) of
 * Frontend/src/modules/Hotel/app/partner/pages/AddHotelWizard.jsx.
 */

const clockIcon = <Clock size={18} color={color.textMuted} />;

export function StepRules({ propertyForm, updatePropertyForm, error }) {
  return (
    <View style={{ gap: space.xl }}>
      <SectionHeading icon={Clock} title="Check-in and house rules" description="Set expectations up front to avoid disputes later." />

      <ErrorBanner message={error} />

      <View style={{ gap: space.lg }}>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Field style={{ flex: 1 }} label="Check-in time" placeholder="12:00 PM" right={clockIcon} value={propertyForm.checkInTime} onChangeText={(v) => updatePropertyForm('checkInTime', v)} />
          <Field style={{ flex: 1 }} label="Check-out time" placeholder="11:00 AM" right={clockIcon} value={propertyForm.checkOutTime} onChangeText={(v) => updatePropertyForm('checkOutTime', v)} />
        </View>

        <Field
          label="Cancellation policy"
          accessibilityLabel="Cancellation policy"
          multiline
          inputStyle={{ minHeight: 100 }}
          placeholder="e.g., Free cancellation up to 24 hours before check-in..."
          value={propertyForm.cancellationPolicy}
          onChangeText={(v) => updatePropertyForm('cancellationPolicy', v)}
        />

        <View style={{ gap: space.sm }}>
          <GroupLabel>House rules</GroupLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {HOUSE_RULES_OPTIONS.map((r) => (
              <ToggleChip
                key={r}
                label={r}
                selected={propertyForm.houseRules.includes(r)}
                onPress={() => {
                  const has = propertyForm.houseRules.includes(r);
                  updatePropertyForm('houseRules', has ? propertyForm.houseRules.filter((x) => x !== r) : [...propertyForm.houseRules, r]);
                }}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

export function StepDocuments({ propertyForm, error, uploading, pickDocument }) {
  return (
    <View style={{ gap: space.xl }}>
      <SectionHeading icon={FileText} title="Verification documents" description="Our team checks these before your property goes live." />

      <ErrorBanner message={error} />

      <View style={{ gap: space.md }}>
        <Text style={[type.bodyStrong, { color: color.text }]}>Please provide the following documents</Text>
        {propertyForm.documents.map((doc, idx) => (
          <DocumentRow
            key={idx}
            name={doc.name}
            attached={Boolean(doc.fileUrl)}
            uploading={uploading === `doc_${idx}`}
            onUpload={() => pickDocument(idx)}
            onView={() => Linking.openURL(doc.fileUrl).catch(() => {})}
          />
        ))}
      </View>
    </View>
  );
}

export function StepReview({ propertyForm, roomTypes, error }) {
  return (
    <View style={{ gap: space.xl }}>
      <Notice
        tone="success"
        title="Review compliance"
        message="Please review the details below carefully before submitting. Ensuring accurate information helps in faster approval."
      />

      <ErrorBanner message={error} />

      <View style={{ gap: space.md }}>
        <ReviewBlock title="Property details">
          <Text style={[type.subheading, { color: color.text }]}>{propertyForm.propertyName || 'No name'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.xs + 2 }}>
            <MapPin size={16} color={color.textMuted} style={{ marginTop: 2 }} />
            <Text style={[type.small, { flex: 1, color: color.textSecondary }]} numberOfLines={2}>
              {propertyForm.address.fullAddress || 'No address'}
            </Text>
          </View>
        </ReviewBlock>

        <ReviewBlock title={`Room types (${roomTypes.length})`}>
          {roomTypes.length > 0 ? (
            roomTypes.map((rt, i) => <KeyValue key={i} label={rt.name} value={`₹${rt.pricePerNight}`} />)
          ) : (
            <Notice tone="danger" message="No room types added!" />
          )}
        </ReviewBlock>

        <ReviewBlock title={`Documents (${propertyForm.documents.filter((d) => d.fileUrl).length}/${propertyForm.documents.length})`}>
          {propertyForm.documents.map((doc, i) => (
            <ReviewDocLine key={i} name={doc.name} attached={Boolean(doc.fileUrl)} />
          ))}
        </ReviewBlock>
      </View>
    </View>
  );
}

export function StepDone({ onGo }) {
  return (
    <DoneState
      title="Registration submitted!"
      message="Your property registration has been sent for verification. Our team will review it and get back to you shortly."
      actionLabel="Go to my properties"
      onAction={onGo}
    />
  );
}
