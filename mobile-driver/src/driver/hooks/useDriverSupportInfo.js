import { useMemo } from 'react';
import { usePlatformSettings } from '../../lib/platformSettings';

/*
 * Port of Taxi/modules/shared/content/supportInfo.js: the district's support contact details from
 * Global Settings -> Brand & Contact, empty where the district has not filled them in.
 */
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
