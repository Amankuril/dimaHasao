/* Ported from Frontend/src/modules/Tours/app/admin/pages/PackageCreate.jsx (tools/port.js first pass). */
/**
 * Create a tour package.
 *
 * Tours are single-vendor — the district runs them itself — so there is no
 * operator to pick and nothing to create "on behalf of". Every field comes
 * from the shared `PackageForm`, which the edit screen uses too, so the two
 * paths cannot validate differently.
 */
import React, { useState } from 'react';
import { useNavigate } from '../../../../lib/webRouter';
import adminService from '../../../services/adminService';
import PackageForm from '../../../components/PackageForm';
import { AdminPage, Card, PageHeader } from '../../../../admin/ui';
import { toast } from '../../../../lib/notify';
import { CheckBox, Div, P, Strong } from '../../../../components/web';
const PackageCreate = () => {
  const navigate = useNavigate();
  const [publishImmediately, setPublishImmediately] = useState(true);
  const [saving, setSaving] = useState(false);
  const submit = async (payload) => {
    if (!payload.title) return toast.error('The package needs a title');
    if (!payload.heroImage) return toast.error('A cover image URL is required');
    if (!payload.pricePerPerson) return toast.error('Set a price per person');
    try {
      setSaving(true);
      const result = await adminService.createPackage({
        ...payload,
        publishImmediately,
      });
      toast.success(result.message || 'Package created');
      navigate('/tours/admin/packages');
    } catch (error) {
      toast.error(error.message || 'Could not create this package');
    } finally {
      setSaving(false);
    }
  };
  return (
    <AdminPage maxWidth={720}>
      <PackageForm
        onSubmit={submit}
        saving={saving}
        submitLabel={publishImmediately ? 'Create and publish' : 'Save as draft'}
        onCancel={() => navigate('/tours/admin/packages')}
      >
        <PageHeader
          title="Create a package"
          subtitle="Published to the travellers' app as soon as you save, unless you keep it as a draft."
          breadcrumb={[{ label: 'Tours' }, { label: 'Packages' }, { label: 'New' }]}
        />

        <Card className="mb-4">
          <Div className="flex-row items-start gap-3">
            <CheckBox checked={publishImmediately} onChange={(e) => setPublishImmediately(e.target.checked)} />
            <Div className="flex-1 min-w-0">
              <Strong className="text-sm text-slate-900">Publish immediately</Strong>
              <P className="text-xs text-slate-500 mt-0.5">Turn this off to save it as a draft that travellers cannot see yet.</P>
            </Div>
          </Div>
        </Card>
      </PackageForm>
    </AdminPage>
  );
};
export default PackageCreate;
