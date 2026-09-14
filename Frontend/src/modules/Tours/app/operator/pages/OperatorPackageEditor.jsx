/**
 * Operator create / edit for a package.
 *
 * Renders the same `PackageForm` the admin's create-on-behalf screen uses, so
 * the two paths offer identical fields. Editing reads the package out of the
 * operator's own list — the public detail route only serves approved ones, and
 * the whole point of editing is often a package that is still pending.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import operatorService from '../../../services/operatorService';
import PackageForm from '../../../components/PackageForm';

const OperatorPackageEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    operatorService
      .getMyPackage(id)
      .then((found) => {
        if (!found) toast.error('That package is no longer in your list');
        setPkg(found);
      })
      .catch((e) => toast.error(e.message || 'Failed to load the package'))
      .finally(() => setLoading(false));
  }, [id]);

  const submit = async (payload) => {
    if (!payload.title) return setError('The package needs a title');
    if (!payload.heroImage) return setError('A cover image URL is required');
    if (!payload.pricePerPerson) return setError('Set a price per person');
    setError('');

    try {
      setSaving(true);
      const result = id
        ? await operatorService.updatePackage(id, payload)
        : await operatorService.createPackage(payload);
      toast.success(result.message || 'Saved');
      navigate('/tours/operator/packages');
    } catch (e) {
      setError(e.message || 'Could not save this package');
      toast.error(e.message || 'Could not save this package');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-400 py-12 text-center">Loading…</p>;

  return (
    <PackageForm
      initial={pkg}
      onSubmit={submit}
      saving={saving}
      error={error}
      submitLabel={id ? 'Save changes' : 'Submit for approval'}
      onCancel={() => navigate('/tours/operator/packages')}
    >
      <div>
        <h1 className="text-2xl font-black text-gray-900">
          {id ? 'Edit package' : 'New package'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {id
            ? 'Changing the price, itinerary or what is included sends it back for a quick review. Copy and photo edits go live straight away.'
            : 'An admin reviews new packages before travellers can see them.'}
        </p>
      </div>
    </PackageForm>
  );
};

export default OperatorPackageEditor;
