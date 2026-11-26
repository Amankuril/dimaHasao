/**
 * Edit a tour package. Same PackageForm as create, seeded from the saved
 * package, so the two screens cannot validate differently.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import adminService from '../../../services/adminService';
import PackageForm from '../../../components/PackageForm';
import { PageHeader, Spinner } from '../components/ui';
import toast from 'react-hot-toast';

const PackageEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    adminService
      .getPackage(id)
      .then((data) => alive && setPkg(data.package || null))
      .catch((error) => {
        toast.error(error.message || 'Could not load this package');
        navigate('/tours/admin/packages', { replace: true });
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id, navigate]);

  const submit = async (payload) => {
    try {
      setSaving(true);
      const result = await adminService.updatePackage(id, payload);
      toast.success(result.message || 'Package updated');
      navigate('/tours/admin/packages');
    } catch (error) {
      toast.error(error.message || 'Could not save this package');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;
  if (!pkg) return null;

  return (
    <PackageForm initial={pkg} onSubmit={submit} saving={saving} submitLabel="Save changes" onCancel={() => navigate('/tours/admin/packages')}>
      <PageHeader title={`Edit: ${pkg.title}`} subtitle="Changes go live on the travellers' app as soon as you save" />
    </PackageForm>
  );
};

export default PackageEdit;
