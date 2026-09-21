/**
 * Support contact details for the taxi apps.
 *
 * This file used to hold the previous vendor's: their owner's name, a Noida
 * office address, their phone number, and an email with a space in it
 * ("customercare@Appzeto 24.com") that no mail client would accept. Four
 * screens printed it as this district's support desk.
 *
 * It now reads what an admin sets in Global Settings → Brand & Contact, the
 * same record the sign-in screens use, with neutral copy as the fallback so a
 * screen never shows another company's details. Fields the district has not
 * filled in come back empty, and the screens hide those rows.
 */
import { useMemo } from 'react';

import usePlatformSettings from '@/shared/hooks/usePlatformSettings';

/** Static shape for the few places that read this outside a component. */
export const SUPPORT_INFO = {
  companyName: 'Dima Hasao Tourism',
  ownerName: '',
  phone: '',
  phoneHref: '',
  email: '',
  supportLabel: 'District support',
  responseTime: '',
  serviceArea: 'Taxi rides, bookings, payments, and account help',
  officeAddress: '',
  availability: '',
};

/**
 * The live version, for components.
 *
 * @returns {typeof SUPPORT_INFO} the district's details, filled in where set
 */
export const useSupportInfo = () => {
  const settings = usePlatformSettings();

  return useMemo(() => {
    const phone = String(settings.supportPhone || '').trim();

    return {
      ...SUPPORT_INFO,
      companyName: String(settings.brandName || SUPPORT_INFO.companyName).trim(),
      phone,
      phoneHref: phone.replace(/\s+/g, ''),
      email: String(settings.supportEmail || '').trim(),
      officeAddress: [settings.address, settings.state, settings.pincode]
        .map((part) => String(part || '').trim())
        .filter(Boolean)
        .join(', '),
    };
  }, [settings]);
};
