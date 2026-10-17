/**
 * Ported from Frontend/src/modules/Taxi/modules/shared/content/supportInfo.js.
 */
import {useMemo} from 'react';
import usePlatformSettings from './usePlatformSettings';

export const SUPPORT_INFO = {
  companyName: 'Dima Hasao Tourism',
  phone: '',
  phoneHref: '',
  email: '',
  supportLabel: 'District support',
  serviceArea: 'Taxi rides, bookings, payments, and account help',
  officeAddress: '',
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
      officeAddress: [settings.address, settings.state, settings.pincode].map(p => String(p || '').trim()).filter(Boolean).join(', '),
    };
  }, [settings]);
};

export default useSupportInfo;
