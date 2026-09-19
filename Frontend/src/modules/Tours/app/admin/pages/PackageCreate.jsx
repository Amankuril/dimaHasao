/**
 * Create a tour package.
 *
 * Tours are single-vendor — the district runs them itself — so there is no
 * operator to pick and nothing to create "on behalf of". Every field comes
 * from the shared `PackageForm`, which the edit screen uses too, so the two
 * paths cannot validate differently.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../../services/adminService';
import PackageForm from '../../../components/PackageForm';
import { PageHeader } from '../components/ui';
import toast from 'react-hot-toast';

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
      const result = await adminService.createPackage({ ...payload, publishImmediately });
      toast.success(result.message || 'Package created');
      navigate('/tours/admin/packages');
    } catch (error) {
      toast.error(error.message || 'Could not create this package');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PackageForm
      onSubmit={submit}
      saving={saving}
      submitLabel={publishImmediately ? 'Create and publish' : 'Save as draft'}
      onCancel={() => navigate('/tours/admin/packages')}
    >
      <PageHeader
        title="Create a package"
        subtitle="Published to the travellers' app as soon as you save, unless you keep it as a draft."
      />

      <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <label className="flex items-start gap-2.5 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={publishImmediately}
            onChange={(e) => setPublishImmediately(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <strong>Publish immediately</strong>
            <span className="block text-xs text-gray-400">
              Turn this off to save it as a draft that travellers cannot see yet.
            </span>
          </span>
        </label>
      </section>
    </PackageForm>
  );
};

export default PackageCreate;
