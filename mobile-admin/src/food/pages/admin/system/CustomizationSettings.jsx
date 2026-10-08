/* Ported from Frontend/src/modules/Food/pages/admin/system/CustomizationSettings.jsx (tools/port.js first pass). */
/**
 * These toggles moved to Global admin → Toggle Management, where every switch
 * across the platform now lives — including the per-module maintenance
 * switches that supersede this page's single "Under Maintenance" flag.
 *
 * The route stays so anything linking here still lands somewhere useful
 * rather than on a dead end.
 */
import React from 'react';
import { ToggleRight } from 'lucide-react-native';
import { AdminPage, PageHeader, Card, BTN_PRIMARY } from '../../../../admin/ui';
import { Div, Link, Icon as UiIcon } from '../../../../components/web';
import { Text } from '../../../../components/Text';
import { tw } from '../../../../lib/tw';
export default function CustomizationSettings() {
  return (
    <AdminPage maxWidth={720}>
      <PageHeader
        icon={ToggleRight}
        title="Customization settings"
        subtitle="COD, payment and availability switches now live in Global admin"
        breadcrumb={[{ label: 'Food' }, { label: 'System' }, { label: 'Customization' }]}
      />
      <Card className="items-center py-10 px-6 gap-2">
        <Div className="w-12 h-12 rounded-full bg-amber-100 items-center justify-center mb-1">
          <UiIcon as={ToggleRight} size={22} className="text-amber-700" />
        </Div>
        <Text style={tw`text-base font-semibold text-slate-900 text-center`}>These settings moved</Text>
        <Text style={tw`text-sm text-slate-500 text-center`}>COD, payment and availability switches are now managed for every module together in Global admin.</Text>
        <Link to="/global/admin/toggles" className={`${BTN_PRIMARY} mt-3`}>
          <Text style={tw`text-sm font-semibold text-white`}>Open Toggle Management</Text>
        </Link>
      </Card>
    </AdminPage>
  );
}
