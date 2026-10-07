import { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AlertCircle, Check, CheckCircle2, ChevronDown, Eye, ImagePlus, Info, MapPin, Pencil, Plus, Trash2, X } from 'lucide-react-native';
import { Button, IconButton, StatusBadge } from '../../components/ds';
import HeritageHeader from '../../components/HeritageHeader';
import { Press } from '../../components/ui';
import { color, radii, space, tone as tones, type } from '../../theme';
import { Field, PinnedBar } from './dashboard/partnerUi';
import BottomSheet from './BottomSheet';

/*
 * Shared pieces of the three add-property wizards (hotel / lodge, homestay,
 * resort) and the hotel onboarding, in the heritage design system (see
 * DESIGN_SYSTEM.md): one header + progress rail, one pinned Back / Next bar,
 * one option card, photo tile, document row and so on, so the wizards look
 * the same. Presentational only: every handler and value comes from the
 * wizard that renders them.
 */

/* ------------------------------------------------------------------ frame */

/** Deep-green header with the step name, "Step n of N" and a close (discard) button. */
export function WizardHeader({ title, subtitle, onBack, onClose, closeLabel = 'Close and discard' }) {
  return (
    <>
      {/* Light status-bar icons over the deep-green header. */}
      <StatusBar style="light" />
      <HeritageHeader
        title={title}
        subtitle={subtitle}
        onBack={onBack}
        showBack={Boolean(onBack)}
        right={onClose ? <IconButton icon={X} label={closeLabel} onPress={onClose} variant="ghost" iconColor={color.textInverse} /> : null}
      />
    </>
  );
}

/** Segmented progress rail under the header: one bar per step, labels from 640 px up. */
export function StepRail({ steps, step, showLabels }) {
  const total = steps.length;
  const current = steps[step - 1];
  return (
    <View
      style={w.railWrap}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${step} of ${total}${current ? `, ${current.title}` : ''}`}
      accessibilityValue={{ min: 1, max: total, now: Math.min(step, total) }}
    >
      <View style={w.rail}>
        {steps.map((s, index) => {
          const position = index + 1;
          const done = position < step;
          const on = position === step;
          return (
            <View key={s.title} style={w.railItem}>
              <View style={[w.railBar, { backgroundColor: done ? color.primary : on ? color.gold : color.border }]} />
              {showLabels ? (
                <Text style={[w.railLabel, { color: on ? color.primary : done ? color.textSecondary : color.textMuted }]} numberOfLines={1}>
                  {s.short}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** The one-line "what this step asks for" above the step's card. */
export function StepIntro({ children }) {
  if (!children) return null;
  return <Text style={w.intro}>{children}</Text>;
}

/** White card holding a step's form. */
export function StepCard({ children, style }) {
  return <View style={[w.stepCard, style]}>{children}</View>;
}

/**
 * Pinned Back / (Clear step) / Next bar with the bottom safe area.
 * `next` is omitted on the submitted screen.
 */
export function WizardFooter({ onBack, backDisabled, onClear, clearDisabled, next }) {
  return (
    <PinnedBar style={w.footer}>
      <View style={w.footerRow}>
        <Button title="Back" variant="outline" fullWidth={false} onPress={onBack} disabled={backDisabled} style={w.backBtn} />
        {onClear ? <Button title="Clear step" variant="ghost" fullWidth={false} onPress={onClear} disabled={clearDisabled} textStyle={{ color: color.textSecondary }} /> : null}
        {next ? (
          <Button
            title={next.label}
            onPress={next.onPress}
            disabled={next.disabled}
            loading={next.loading}
            iconRight={next.icon}
            accessibilityLabel={next.label}
            fullWidth={false}
            style={{ flex: 1 }}
          />
        ) : null}
      </View>
    </PinnedBar>
  );
}

/* --------------------------------------------------------------- headings */

/** Icon tile + title + description at the top of a step's card. */
export function SectionHeading({ icon: Icon, title, description }) {
  return (
    <View style={w.sectionHeading}>
      {Icon ? (
        <View style={w.sectionIcon}>
          <Icon size={20} color={color.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={w.sectionTitle} accessibilityRole="header">
          {title}
        </Text>
        {description ? <Text style={w.sectionDescription}>{description}</Text> : null}
      </View>
    </View>
  );
}

/** Small label for a group of controls (not an input): "Cover image", "House rules". */
export function GroupLabel({ children, right, style }) {
  return (
    <View style={[w.groupLabelRow, style]}>
      <Text style={w.groupLabel}>{children}</Text>
      {right != null ? (typeof right === 'string' ? <Text style={w.groupCount}>{right}</Text> : right) : null}
    </View>
  );
}

/** "Property name *": a field label with the required mark. */
export function requiredLabel(text) {
  return (
    <>
      {text}
      <Text style={{ color: color.danger }} accessibilityLabel="required">
        {' *'}
      </Text>
    </>
  );
}

/** Hairline with a centred caption ("Or enter manually"). */
export function OrDivider({ label }) {
  return (
    <View style={w.orRow}>
      <View style={w.orLine} />
      <Text style={w.orText}>{label}</Text>
      <View style={w.orLine} />
    </View>
  );
}

/* ---------------------------------------------------------------- notices */

const NOTICE_ICON = { danger: AlertCircle, warning: AlertCircle, info: Info, success: CheckCircle2, primary: CheckCircle2 };

/** Tinted message block: validation errors (danger), notes (warning / info), "ready" (success). */
export function Notice({ message, title, tone = 'danger', style }) {
  if (!message && !title) return null;
  const t = tones[tone] || tones.danger;
  const Icon = NOTICE_ICON[tone] || AlertCircle;
  return (
    <View style={[w.notice, { backgroundColor: t.bg }, style]} accessibilityRole={tone === 'danger' ? 'alert' : undefined}>
      <Icon size={18} color={t.fg} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        {title ? <Text style={[type.bodyStrong, { color: color.text }]}>{title}</Text> : null}
        {message ? <Text style={[type.small, { color: title ? color.textSecondary : t.fg }]}>{message}</Text> : null}
      </View>
    </View>
  );
}

/** The wizards' validation message. */
export function ErrorBanner({ message }) {
  return <Notice message={message} tone="danger" />;
}

/* ----------------------------------------------------------------- inputs */

/** Labelled 48 px input (partnerUi Field) with the wizards' numeric filter. */
export function NumberField({ onChangeText, allowNegative, ...rest }) {
  const re = allowNegative ? /[^0-9.-]/g : /[^0-9.]/g;
  return <Field keyboardType="decimal-pad" onChangeText={onChangeText ? (v) => onChangeText(String(v).replace(re, '')) : undefined} {...rest} />;
}

/** A native-select stand-in: a 48 px field that opens the options in a bottom sheet. */
export function SelectBox({ label, value, options, onChange, title, style }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View style={[{ gap: space.xs + 2 }, style]}>
      {label ? <Text style={w.fieldLabel}>{label}</Text> : null}
      <Press
        scale={1}
        onPress={() => setOpen(true)}
        accessibilityRole="combobox"
        accessibilityLabel={`${label || title || 'Select'}: ${current ? current.label : 'none'}`}
        accessibilityState={{ expanded: open }}
        style={w.selectBox}
      >
        <Text style={[type.body, { flex: 1, minWidth: 0, color: current ? color.text : color.textDisabled }]} numberOfLines={1}>
          {current ? current.label : 'Select'}
        </Text>
        <ChevronDown size={18} color={color.textMuted} />
      </Press>
      <BottomSheet isOpen={open} onClose={() => setOpen(false)} title={title || label}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Press
              key={o.value}
              scale={1}
              accessibilityRole="menuitem"
              accessibilityState={{ selected: on }}
              onPress={() => {
                onChange(o.value);
                setOpen(false);
              }}
              style={[w.option, on ? { backgroundColor: color.primarySoft } : null]}
            >
              <Text style={[on ? type.bodyStrong : type.body, { flex: 1, color: on ? color.primary : color.text }]}>{o.label}</Text>
              {on ? <Check size={18} color={color.primary} /> : null}
            </Press>
          );
        })}
      </BottomSheet>
    </View>
  );
}

/** Search box + Search button, with the status and results under it. */
export function SearchField({ label, value, onChangeText, onSearch, placeholder }) {
  return (
    <View style={{ gap: space.xs + 2 }}>
      {label ? <Text style={w.fieldLabel}>{label}</Text> : null}
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
        <Field
          style={{ flex: 1 }}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          returnKeyType="search"
          onSubmitEditing={onSearch}
          accessibilityLabel={label || placeholder}
        />
        {onSearch ? <Button title="Search" variant="secondary" fullWidth={false} onPress={onSearch} /> : null}
      </View>
    </View>
  );
}

/**
 * Feedback under an address search box. A deployment with no Maps key is a
 * normal state for this app, so it reads as a note rather than a failure.
 */
export function SearchStatus({ search }) {
  if (search.status === 'searching') {
    return (
      <View style={w.statusRow}>
        <ActivityIndicator size="small" color={color.textMuted} />
        <Text style={w.statusText}>Searching…</Text>
      </View>
    );
  }
  if (search.mapsUnavailable) {
    return <Notice tone="warning" message="Address lookup is unavailable right now — please fill in the address below by hand." />;
  }
  if (search.status === 'empty') {
    return <Text style={w.statusText}>No matches. Try a different search, or enter the address below.</Text>;
  }
  if (search.status === 'error') {
    return <Text style={[w.statusText, { color: color.danger }]}>Could not search just now. Try again, or enter the address below.</Text>;
  }
  return null;
}

/** Search results, capped in height and scrolling inside. */
export function ResultList({ results, onSelect, secondary, maxHeight = 240 }) {
  if (!results.length) return null;
  return (
    <View style={w.results}>
      <ScrollView style={{ maxHeight }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
        {results.map((r, i) => (
          <Press key={i} scale={1} onPress={() => onSelect(r)} accessibilityLabel={r.name} style={[w.resultRow, i === results.length - 1 ? { borderBottomWidth: 0 } : null]}>
            <Text style={[type.bodyStrong, { color: color.text }]} numberOfLines={1}>
              {r.name}
            </Text>
            {secondary(r) ? (
              <Text style={[type.small, { color: color.textMuted }]} numberOfLines={2}>
                {secondary(r)}
              </Text>
            ) : null}
          </Press>
        ))}
      </ScrollView>
    </View>
  );
}

/** Full-width outlined action ("Use current location"). */
export function LocationButton({ onPress, loading, label, loadingLabel, icon }) {
  return <Button title={loading ? loadingLabel : label} onPress={onPress} disabled={loading} loading={loading} icon={icon} variant="secondary" />;
}

/* -------------------------------------------------------------- selection */

/**
 * Equal-width grid: `columns` cells a row with `gap` between them. Children
 * are laid into the cells in order.
 */
export function Grid({ columns = 2, gap = space.md, children, style }) {
  const items = (Array.isArray(children) ? children.flat() : [children]).filter(Boolean);
  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -gap / 2, marginBottom: -gap }, style]}>
      {items.map((child, i) => (
        <View key={child.key ?? i} style={{ width: `${100 / columns}%`, paddingHorizontal: gap / 2, marginBottom: gap }}>
          {child}
        </View>
      ))}
    </View>
  );
}

/** Selectable tile (amenities, resort type, yes/no toggles). Selected = green edge + tick, never colour alone. */
export function OptionCard({ label, selected, onPress, icon: Icon, role = 'checkbox', style }) {
  const tick = <View style={[w.tick, selected ? w.tickOn : null]}>{selected ? <Check size={14} color={color.onPrimary} strokeWidth={3} /> : null}</View>;
  const text = (
    <Text style={[w.optionText, { color: selected ? color.primary : color.text }]} numberOfLines={2}>
      {label}
    </Text>
  );
  return (
    <Press
      scale={0.98}
      onPress={onPress}
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { selected: Boolean(selected) } : { checked: Boolean(selected) }}
      accessibilityLabel={label}
      style={[w.optionCard, Icon ? w.optionCardStacked : null, selected ? w.optionCardOn : null, style]}
    >
      {Icon ? (
        <>
          {/* Icon cards stack (icon + tick, then the label) so the label keeps the full width on narrow phones. */}
          <View style={w.optionTop}>
            <View style={[w.optionIcon, { backgroundColor: selected ? color.surface : color.surfaceMuted }]}>
              <Icon size={18} color={selected ? color.primary : color.textSecondary} />
            </View>
            {tick}
          </View>
          {text}
        </>
      ) : (
        <>
          {text}
          {tick}
        </>
      )}
    </Press>
  );
}

/** Toggle chip, 44 px tall (house rules, room amenities, activities). */
export function ToggleChip({ label, selected, onPress, icon: Icon }) {
  return (
    <Press
      scale={0.97}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: Boolean(selected) }}
      accessibilityLabel={label}
      style={[w.chip, selected ? w.chipOn : null]}
    >
      {selected ? <Check size={14} color={color.primary} strokeWidth={3} /> : Icon ? <Icon size={14} color={color.textSecondary} /> : null}
      <Text style={[type.label, { color: selected ? color.primary : color.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Press>
  );
}

/** Two-option switch inside a form (private room / entire home). */
export function ChoiceSwitch({ options, value, onChange }) {
  return (
    <View style={w.seg} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Press
            key={o.key}
            scale={1}
            onPress={() => onChange(o.key)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
            style={[w.segItem, on ? w.segItemOn : null]}
          >
            <Text style={[type.label, { color: on ? color.primary : color.textSecondary }]} numberOfLines={1}>
              {o.label}
            </Text>
          </Press>
        );
      })}
    </View>
  );
}

/* ----------------------------------------------------------------- photos */

/** Cover photo slot: empty prompt, uploading, or the photo with change / remove. */
export function CoverPhoto({ uri, uploading, disabled, onPick, onRemove, emptyLabel, hint, uploadingLabel = 'Uploading…', changeLabel, height = 192, aspectRatio }) {
  return (
    <View style={[w.cover, aspectRatio ? { aspectRatio } : { height }, uri ? w.coverFilled : null]}>
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel="Cover" /> : null}
      <Press
        scale={1}
        onPress={onPick}
        disabled={Boolean(disabled)}
        accessibilityLabel={uri ? changeLabel || 'Change cover photo' : emptyLabel}
        style={[StyleSheet.absoluteFill, w.coverCenter]}
      >
        {uploading ? (
          <View style={[w.coverCenter, uri ? w.coverScrimLight : null]}>
            <ActivityIndicator size="small" color={color.primary} />
            <Text style={[type.label, { color: color.primary }]}>{uploadingLabel}</Text>
          </View>
        ) : uri ? null : (
          <>
            <View style={w.coverIcon}>
              <ImagePlus size={22} color={color.primary} />
            </View>
            <Text style={[type.bodyStrong, { color: color.primary }]}>{emptyLabel}</Text>
            {hint ? <Text style={[type.caption, { color: color.textMuted }]}>{hint}</Text> : null}
          </>
        )}
      </Press>
      {uri && !uploading ? (
        <View style={[w.coverBar, changeLabel ? w.coverBarScrim : null]} pointerEvents="box-none">
          {changeLabel ? (
            <View style={w.coverChange} pointerEvents="none">
              <ImagePlus size={16} color={color.textInverse} />
              <Text style={[type.label, { color: color.textInverse }]}>{changeLabel}</Text>
            </View>
          ) : (
            <View />
          )}
          {onRemove ? <IconButton icon={Trash2} label="Remove cover image" onPress={onRemove} variant="danger" size={40} iconSize={18} /> : null}
        </View>
      ) : null}
    </View>
  );
}

/** Square photo with a remove button. */
export function PhotoTile({ uri, onRemove, removeLabel = 'Remove image', size }) {
  return (
    <View style={[w.tile, size ? { width: size, height: size } : { width: '100%', aspectRatio: 1 }]}>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      {onRemove ? (
        <Press scale={0.9} onPress={onRemove} accessibilityLabel={removeLabel} hitSlop={8} style={w.tileRemove}>
          <Trash2 size={14} color={color.danger} />
        </Press>
      ) : null}
    </View>
  );
}

/** Dashed "add photos" square. */
export function AddPhotoTile({ onPress, loading, disabled, label = 'Add photos', icon: Icon = Plus, size }) {
  return (
    <Press
      scale={0.97}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      style={[w.tile, w.tileAdd, size ? { width: size, height: size } : { width: '100%', aspectRatio: 1 }, disabled && !loading ? { opacity: 0.5 } : null]}
    >
      {loading ? <ActivityIndicator size="small" color={color.primary} /> : <Icon size={22} color={color.primary} />}
    </Press>
  );
}

/* ------------------------------------------------------------- list items */

/** Dashed empty block inside a step card. */
export function EmptyBox({ icon: Icon, title, hint }) {
  return (
    <View style={w.empty}>
      {Icon ? (
        <View style={w.emptyIcon}>
          <Icon size={22} color={color.primary} />
        </View>
      ) : null}
      <Text style={[type.bodyStrong, { color: color.text, textAlign: 'center' }]}>{title}</Text>
      {hint ? <Text style={[type.small, { color: color.textMuted, textAlign: 'center' }]}>{hint}</Text> : null}
    </View>
  );
}

/** Inline editor (add / edit a nearby place or a room) with its title and Close. */
export function EditorPanel({ title, onClose, children }) {
  return (
    <View style={w.editor}>
      <View style={w.editorHead}>
        <Text style={[type.subheading, { flex: 1, color: color.text }]} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        <Button title="Close" variant="ghost" size="sm" fullWidth={false} onPress={onClose} style={{ minHeight: 44 }} />
      </View>
      <View style={w.editorBody}>{children}</View>
    </View>
  );
}

/** Cancel + confirm at the bottom of an inline editor. */
export function EditorActions({ onCancel, onConfirm, confirmLabel }) {
  return (
    <View style={{ flexDirection: 'row', gap: space.md, paddingTop: space.xs }}>
      <Button title="Cancel" variant="outline" onPress={onCancel} fullWidth={false} style={{ flex: 1 }} />
      <Button title={confirmLabel} onPress={onConfirm} fullWidth={false} style={{ flex: 1 }} />
    </View>
  );
}

/** Two fields side by side that wrap onto two rows when the card is narrow. */
export function FieldPair({ children }) {
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <View style={w.pair}>
      {items.map((child, i) => (
        <View key={child.key ?? i} style={w.pairItem}>
          {child}
        </View>
      ))}
    </View>
  );
}

/** One nearby place in the list, with edit and delete. */
export function PlaceRow({ name, kind, distanceKm, onEdit, onDelete }) {
  return (
    <View style={w.itemRow}>
      <View style={w.itemIcon}>
        <MapPin size={18} color={color.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[type.bodyStrong, { color: color.text }]} numberOfLines={2}>
          {name}
        </Text>
        <Text style={[type.small, { color: color.textMuted }]} numberOfLines={2}>
          {kind}
          {distanceKm ? <Text style={{ color: color.primary }}>{` · ${distanceKm} km`}</Text> : null}
        </Text>
      </View>
      <IconButton icon={Pencil} label={`Edit ${name}`} onPress={onEdit} variant="primary" size={40} iconSize={16} />
      <IconButton icon={Trash2} label={`Delete ${name}`} onPress={onDelete} variant="danger" size={40} iconSize={16} />
    </View>
  );
}

/** A saved room / inventory type: name, rate, facts, a few amenities, edit and delete. */
export function RoomCard({ name, price, badge, facts = [], amenities = [], onEdit, onDelete, editLabel = 'Edit', deleteLabel = 'Delete room type' }) {
  return (
    <View style={w.roomCard}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
        <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
          <Text style={[type.subheading, { color: color.text }]} numberOfLines={2}>
            {name}
          </Text>
          {badge ? <StatusBadge label={badge} tone="primary" /> : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[type.price, { color: color.text }]}>{price}</Text>
          <Text style={[type.caption, { color: color.textMuted }]}>per night</Text>
        </View>
      </View>
      {facts.length ? (
        <View style={w.factRow}>
          {facts.map((f) => (
            <View key={f} style={w.fact}>
              <Text style={[type.caption, { color: color.textSecondary }]}>{f}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {amenities.length ? (
        <Text style={[type.small, { color: color.textMuted }]} numberOfLines={1}>
          {amenities.slice(0, 3).join(' · ')}
          {amenities.length > 3 ? ` · +${amenities.length - 3} more` : ''}
        </Text>
      ) : null}
      <View style={w.roomActions}>
        <Button title={editLabel} variant="secondary" icon={Pencil} onPress={onEdit} fullWidth={false} style={{ flex: 1 }} />
        <IconButton icon={Trash2} label={deleteLabel} onPress={onDelete} variant="danger" />
      </View>
    </View>
  );
}

/** One verification document: name, attached / optional, upload or change, view. */
export function DocumentRow({ name, attached, uploading, onUpload, onView, uploadDisabled }) {
  return (
    <View style={w.docRow}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[type.bodyStrong, { color: color.text }]}>{name}</Text>
          <Text style={[type.caption, { color: color.textMuted }]}>Optional document</Text>
        </View>
        <StatusBadge label={attached ? 'Attached' : 'Not added'} tone={attached ? 'success' : 'neutral'} icon={attached ? CheckCircle2 : undefined} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Button
          title={uploading ? 'Uploading...' : attached ? 'Change file' : 'Upload'}
          icon={!uploading && !attached ? Plus : undefined}
          loading={uploading}
          disabled={uploadDisabled}
          variant={attached ? 'secondary' : 'outline'}
          onPress={onUpload}
          fullWidth={false}
          style={{ flex: 1 }}
        />
        {attached && onView ? <IconButton icon={Eye} label={`View ${name}`} onPress={onView} variant="soft" /> : null}
      </View>
    </View>
  );
}

/* ----------------------------------------------------------------- review */

/** A titled block on the review step. */
export function ReviewBlock({ title, children }) {
  return (
    <View style={w.reviewBlock}>
      <Text style={w.reviewTitle} accessibilityRole="header">
        {title}
      </Text>
      <View style={{ gap: space.sm }}>{children}</View>
    </View>
  );
}

/** One document line on the review step: tick or empty ring, name, state word. */
export function ReviewDocLine({ name, attached }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      {attached ? <CheckCircle2 size={16} color={color.success} /> : <View style={w.ring} />}
      <Text style={[type.body, { flex: 1, minWidth: 0, color: attached ? color.text : color.textSecondary }]} numberOfLines={2}>
        {name}
      </Text>
      <Text style={[type.caption, { color: attached ? color.success : color.textMuted }]}>{attached ? 'Attached' : 'Optional'}</Text>
    </View>
  );
}

/** The submitted screen inside the step card. */
export function DoneState({ title, message, actionLabel, onAction }) {
  return (
    <View style={w.done}>
      <View style={w.doneIcon}>
        <CheckCircle2 size={40} color={color.success} />
      </View>
      <View style={{ gap: space.sm, alignItems: 'center' }}>
        <Text style={[type.heading, { color: color.text, textAlign: 'center' }]} accessibilityRole="header">
          {title}
        </Text>
        <Text style={[type.body, { color: color.textSecondary, textAlign: 'center', maxWidth: 360 }]}>{message}</Text>
      </View>
      <Button title={actionLabel} onPress={onAction} size="lg" />
    </View>
  );
}

const w = StyleSheet.create({
  railWrap: { backgroundColor: color.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.md },
  rail: { width: '100%', maxWidth: 736, alignSelf: 'center', flexDirection: 'row', alignItems: 'flex-start', gap: space.xs },
  railItem: { flex: 1, alignItems: 'center', gap: space.xs + 2 },
  railBar: { height: 6, width: '100%', borderRadius: radii.pill },
  railLabel: { ...type.caption },

  intro: { ...type.body, color: color.textSecondary },
  stepCard: { backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, padding: space.lg, gap: space.xl },

  footer: { paddingHorizontal: space.lg },
  footerRow: { width: '100%', maxWidth: 736, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: space.sm },
  backBtn: { minWidth: 96 },

  sectionHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingBottom: space.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  sectionIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { ...type.subheading, color: color.text },
  sectionDescription: { ...type.small, color: color.textMuted, marginTop: 2 },

  groupLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  groupLabel: { ...type.label, color: color.text, flexShrink: 1 },
  groupCount: { ...type.caption, color: color.textMuted },
  fieldLabel: { ...type.label, color: color.text },

  orRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: color.borderStrong },
  orText: { ...type.caption, color: color.textMuted },

  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm + 2, padding: space.md, borderRadius: radii.md },

  selectBox: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 1, borderColor: color.border, borderRadius: radii.md, backgroundColor: color.surface, paddingHorizontal: space.md },
  option: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, borderRadius: radii.md },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  statusText: { ...type.caption, color: color.textMuted },
  results: { borderWidth: 1, borderColor: color.border, borderRadius: radii.md, backgroundColor: color.surface, overflow: 'hidden' },
  resultRow: { minHeight: 48, justifyContent: 'center', paddingHorizontal: space.lg, paddingVertical: space.sm + 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },

  optionCard: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, paddingHorizontal: space.md, paddingVertical: space.sm + 2, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  optionCardStacked: { flexDirection: 'column', alignItems: 'stretch', gap: space.sm },
  optionCardOn: { borderColor: color.primary, backgroundColor: color.primarySoft },
  optionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionIcon: { width: 36, height: 36, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  optionText: { ...type.label, flexShrink: 1, flexGrow: 1, minWidth: 0 },
  tick: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface },
  tickOn: { backgroundColor: color.primary, borderColor: color.primary },

  chip: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, paddingHorizontal: space.md + 2, borderRadius: radii.pill, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  chipOn: { borderColor: color.primary, backgroundColor: color.primarySoft },

  seg: { flexDirection: 'row', backgroundColor: color.surfaceMuted, borderRadius: radii.md, padding: 4, gap: 4 },
  segItem: { flex: 1, minHeight: 44, borderRadius: radii.sm + 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.sm },
  segItemOn: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.primaryBorder },

  cover: { width: '100%', borderRadius: radii.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.primaryBorder, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  coverFilled: { borderStyle: 'solid', borderColor: color.border, backgroundColor: color.surfaceMuted },
  coverCenter: { alignItems: 'center', justifyContent: 'center', gap: space.sm, padding: space.lg },
  coverScrimLight: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.8)' },
  coverIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  coverBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.sm },
  coverBarScrim: { backgroundColor: color.overlay },
  coverChange: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, paddingHorizontal: space.sm },

  tile: { borderRadius: radii.md, borderWidth: 1, borderColor: color.border, overflow: 'hidden', backgroundColor: color.surfaceMuted },
  tileAdd: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.primaryBorder, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  tileRemove: { position: 'absolute', top: 4, right: 4, width: 28, height: 28, borderRadius: 14, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },

  empty: { alignItems: 'center', gap: space.xs, paddingVertical: space.xxl, paddingHorizontal: space.xl, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.borderStrong, borderRadius: radii.lg, backgroundColor: color.bg },
  emptyIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },

  editor: { borderRadius: radii.lg, borderWidth: 1, borderColor: color.primaryBorder, backgroundColor: color.surface, overflow: 'hidden' },
  editorHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.lg, paddingRight: space.xs, paddingVertical: space.xs, backgroundColor: color.primarySoft, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.primaryBorder },
  editorBody: { padding: space.lg, gap: space.lg },

  pair: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  pairItem: { flexGrow: 1, flexBasis: 140 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, padding: space.md, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  itemIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },

  roomCard: { padding: space.lg, gap: space.md, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  factRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2 },
  fact: { paddingHorizontal: space.sm, paddingVertical: space.xxs + 1, borderRadius: radii.sm, backgroundColor: color.surfaceMuted },
  roomActions: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },

  docRow: { padding: space.lg, gap: space.md, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },

  reviewBlock: { padding: space.lg, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, gap: space.md },
  reviewTitle: { ...type.bodyStrong, color: color.text, paddingBottom: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  ring: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: color.borderStrong },

  done: { alignItems: 'center', justifyContent: 'center', paddingVertical: space.xxxl, gap: space.xxl },
  doneIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: color.successSoft, alignItems: 'center', justifyContent: 'center' },
});
