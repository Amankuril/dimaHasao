/**
 * Emergency, SOS and support numbers, as set in Global admin → Brand & Contact.
 *
 * These used to be hardcoded, three copies in the customer app alone, plus
 * contacts left over from previous products. Now an admin edits them once.
 *
 * Never empty, because an SOS button must always dial something:
 *   1. the admin's values, once /platform/settings has loaded;
 *   2. the last values seen on this device (cold start with no network);
 *   3. the numbers the app shipped with (also covers an older backend).
 */
import { useEffect } from 'react';
import usePlatformSettings from '../shared/hooks/usePlatformSettings';
import { localStore } from './storage';

const SAVED_KEY = 'platform_contacts_v1';

export const DEFAULT_SOS_NUMBER = '112';
export const DEFAULT_TOURISM_DESK_PHONE = '+91 9101533127';
export const DEFAULT_EMERGENCY_CONTACTS = [
  { label: 'Police Control Room', number: '112', icon: 'fa-solid fa-shield' },
  { label: 'Haflong Civil Hospital', number: '03673-236222', icon: 'fa-solid fa-hospital' },
  { label: 'District Police Control Room', number: '8638389873', icon: 'fa-solid fa-person-military-pointing' },
  { label: 'Disaster Emergency (DDMA)', number: '1077', icon: 'fa-solid fa-triangle-exclamation' },
];

/** `tel:` link for a number as people write it ("03673-236222", "+91 94350 12345"). */
export const telHref = (number) => `tel:${String(number || '').replace(/[^\d+]/g, '')}`;

const readSaved = () => {
  try {
    const raw = localStore.getItem(SAVED_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const pick = (source) => ({
  sosNumber: source.sosNumber,
  emergencyContacts: source.emergencyContacts,
  tourismDeskPhone: source.tourismDeskPhone,
  supportPhone: source.supportPhone,
  supportEmail: source.supportEmail,
  partnerSupportPhone: source.partnerSupportPhone,
  partnerSupportEmail: source.partnerSupportEmail,
});

export function useContactSettings() {
  const live = usePlatformSettings();
  // Only a backend that knows these fields counts as "loaded" for them.
  const hasLive = Boolean(live && (live.sosNumber || Array.isArray(live.emergencyContacts)));

  useEffect(() => {
    if (!hasLive) return;
    try {
      localStore.setItem(SAVED_KEY, JSON.stringify(pick(live)));
    } catch {
      /* storage unavailable: the defaults still apply */
    }
  }, [hasLive, live]);

  const source = hasLive ? live : readSaved() || live || {};
  const contacts = Array.isArray(source.emergencyContacts)
    ? source.emergencyContacts.filter((row) => row?.label && row?.number)
    : DEFAULT_EMERGENCY_CONTACTS;

  return {
    sosNumber: String(source.sosNumber || '').trim() || DEFAULT_SOS_NUMBER,
    emergencyContacts: contacts,
    tourismDeskPhone: String(source.tourismDeskPhone ?? DEFAULT_TOURISM_DESK_PHONE).trim(),
    supportPhone: String(source.supportPhone || '').trim(),
    supportEmail: String(source.supportEmail || '').trim(),
    partnerSupportPhone: String(source.partnerSupportPhone || source.supportPhone || '').trim(),
    partnerSupportEmail: String(source.partnerSupportEmail || source.supportEmail || '').trim(),
  };
}
