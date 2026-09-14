/**
 * Admin creates a package on behalf of an operator.
 *
 * The operator picker is the point of this screen — it posts `operatorId` in
 * the body, which is what the admin endpoint reads instead of the caller's own
 * id. Only approved operators are offered, because the server refuses the rest.
 *
 * Every field below the picker comes from the shared `PackageForm`, the same
 * one the operator panel uses, so the two paths cannot drift apart.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../../services/adminService';
import PackageForm, { field, label } from '../../../components/PackageForm';
import { PageHeader } from '../components/ui';
import toast from 'react-hot-toast';

const PackageCreate = () => {
  const navigate = useNavigate();
  const [operators, setOperators] = useState([]);
  const [operatorId, setOperatorId] = useState('');
  const [publishImmediately, setPublishImmediately] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminService.getOperators({ approvalStatus: 'approved', minimal: 1 })
      .then((d) => setOperators(d.operators || []))
      .catch((e) => toast.error(e.message || 'Failed to load operators'));
  }, []);

  const submit = async (payload) => {
    if (!operatorId) return toast.error('Choose which operator this package belongs to');
    if (!payload.title) return toast.error('The package needs a title');
    if (!payload.heroImage) return toast.error('A cover image URL is required');
    if (!payload.pricePerPerson) return toast.error('Set a price per person');

    try {
      setSaving(true);
      const result = await adminService.createPackageForOperator({ ...payload, operatorId, publishImmediately });
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
      submitLabel={publishImmediately ? 'Create and publish' : 'Create as pending'}
      onCancel={() => navigate('/tours/admin/packages')}
    >
      <PageHeader
        title="Create a package"
        subtitle="Built on behalf of an operator — it appears in their panel as if they had made it."
      />

      <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
        <h3 className="font-bold text-gray-900 text-sm pb-3 border-b border-gray-100">Operator</h3>

        <div>
          <label className={label} htmlFor="operatorId">Which operator is this for? <span className="text-red-500">*</span></label>
          <select id="operatorId" value={operatorId} onChange={(e) => setOperatorId(e.target.value)} className={field}>
            <option value="">Select an operator…</option>
            {operators.map((operator) => (
              <option key={operator._id} value={operator._id}>
                {operator.agencyName || operator.name} · {operator.phone}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1.5">
            {operators.length === 0
              ? 'No approved operators yet — approve one first.'
              : 'Only approved operators can have packages sold under their name.'}
          </p>
        </div>

        <label className="flex items-start gap-2.5 text-sm text-gray-700">
          <input type="checkbox" checked={publishImmediately} onChange={(e) => setPublishImmediately(e.target.checked)} className="mt-0.5" />
          <span>
            <strong>Publish immediately</strong>
            <span className="block text-xs text-gray-400">
              Turn this off to leave it pending so the operator can review it before it goes live.
            </span>
          </span>
        </label>
      </section>
    </PackageForm>
  );
};

export default PackageCreate;
