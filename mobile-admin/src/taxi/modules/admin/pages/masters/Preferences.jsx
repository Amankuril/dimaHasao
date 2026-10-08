/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/masters/Preferences.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { Upload, Plus, Trash2, Edit2, Image as ImageIcon, Loader2, SlidersHorizontal } from 'lucide-react-native';
import { adminService } from '../../services/adminService';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  TableSkeleton,
  EmptyState,
  ErrorState,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_TEXT_PRIMARY,
  useLayoutWidth,
} from '../../../../../admin/ui';
import { Button, Div, Img, Input, Span, Icon as UiIcon } from '../../../../../components/web';
import { alert, window } from '../../../../../lib/webShim';
import { objectUrl, pickImage } from '../../../../../lib/files';

const COLS = [56, 170, 90, 100, 110];

const StatusToggle = ({ active, onToggle, label }) => (
  <Button onClick={onToggle} accessibilityLabel={label} className="h-11 justify-center">
    <Div className={`w-11 h-6 rounded-full justify-center ${active ? 'bg-blue-600' : 'bg-slate-300'}`}>
      <Div className={`w-4 h-4 rounded-full bg-white ${active ? 'self-end mr-1' : 'ml-1'}`} />
    </Div>
  </Button>
);
const Preferences = () => {
  const [preferences, setPreferences] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    icon: null,
  });
  const [iconPreview, setIconPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { tablet } = useLayoutWidth();
  const fetchPreferences = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const response = await adminService.getPreferences();
      const data = response?.paginator?.data || response?.results || (Array.isArray(response) ? response : []);
      setPreferences(data);
    } catch (err) {
      console.error('Fetch Preferences Error:', err);
      setLoadError(err?.message || 'Failed to load preferences');
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchPreferences();
  }, []);
  const handleIconChange = async () => {
    const file = await pickImage();
    if (file) {
      setFormData((prev) => ({
        ...prev,
        icon: file,
      }));
      setIconPreview(objectUrl(file));
    }
  };
  const handleCreate = async () => {
    if (!formData.name) return alert('Please enter preference name');
    try {
      setIsSubmitting(true);
      const data = {
        name: formData.name,
      };
      await adminService.createPreference(data);
      setFormData({
        name: '',
        icon: null,
      });
      setIconPreview(null);
      fetchPreferences();
    } catch (err) {
      console.error('Create Preference Error:', err);
      alert(err.message || 'Failed to create preference');
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await adminService.updatePreferenceStatus(id, {
        active: currentStatus ? 0 : 1,
      });
      fetchPreferences();
    } catch (err) {
      console.error('Toggle Error:', err);
    }
  };
  const handleDelete = async (id) => {
    if (await window.confirmAsync('Delete this preference?')) {
      try {
        await adminService.deletePreference(id);
        fetchPreferences();
      } catch (err) {
        console.error('Delete Error:', err);
      }
    }
  };
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={SlidersHorizontal}
        title="Preferences"
        subtitle="Ride preferences riders can ask for"
        breadcrumb={[{ label: 'Masters' }, { label: 'Preferences' }]}
      />

      <Card className="mb-4">
        <SectionTitle>Add new preference</SectionTitle>
        <Div className={`gap-3 ${tablet ? 'flex-row items-end' : ''}`}>
          <Field label="Name" required className={tablet ? 'flex-1' : ''}>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              placeholder="e.g. Pet, Luggage"
              className={INPUT}
            />
          </Field>

          <Field label="Icon" hint="Optional square image">
            <Button
              onClick={handleIconChange}
              accessibilityLabel="Choose preference icon"
              className="w-16 h-16 border border-slate-300 rounded-lg items-center justify-center overflow-hidden bg-white"
            >
              {iconPreview ? (
                <Img src={iconPreview} className="w-full h-full" contentFit="cover" alt="Preview" />
              ) : (
                <UiIcon as={Upload} size={18} className="text-slate-400" />
              )}
            </Button>
          </Field>

          <Button onClick={handleCreate} disabled={isSubmitting} className={`${BTN_PRIMARY} ${isSubmitting ? 'opacity-50' : ''}`}>
            {isSubmitting ? (
              <UiIcon as={Loader2} size={16} className="text-white" />
            ) : (
              <UiIcon as={Plus} size={16} className="text-white" />
            )}
            <Span className={BTN_TEXT_PRIMARY}>Create</Span>
          </Button>
        </Div>
      </Card>

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : loadError ? (
        <ErrorState title="Could not load preferences" message={loadError} onRetry={fetchPreferences} />
      ) : preferences.length === 0 ? (
        <EmptyState title="No preferences yet" message="Create one with the form above and it will appear here." />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={['#', 'Name', 'Icon', 'Status', 'Actions']} />
          <TBody>
            {preferences.map((pref, idx) => (
              <Row key={pref._id || pref.id || idx} last={idx === preferences.length - 1}>
                <Cell width={COLS[0]} numberOfLines={1}>
                  {idx + 1}
                </Cell>
                <Cell width={COLS[1]}>
                  <Span className="text-sm font-semibold text-slate-900" numberOfLines={2}>
                    {pref.name}
                  </Span>
                </Cell>
                <Cell width={COLS[2]}>
                  <Div className="w-9 h-9 rounded-lg bg-slate-100 items-center justify-center overflow-hidden border border-slate-200">
                    {pref.icon ? (
                      <Img src={pref.icon} className="w-full h-full" contentFit="cover" alt={pref.name} />
                    ) : (
                      <UiIcon as={ImageIcon} size={16} className="text-slate-400" />
                    )}
                  </Div>
                </Cell>
                <Cell width={COLS[3]}>
                  <StatusToggle
                    label={`Toggle ${pref.name}`}
                    active={pref.active === 1 || pref.active === true}
                    onToggle={() => handleToggleStatus(pref._id || pref.id, pref.active === 1 || pref.active === true)}
                  />
                </Cell>
                <Cell width={COLS[4]} align="right">
                  <Div className="flex-row items-center justify-end gap-1">
                    <Button
                      accessibilityLabel={`Edit ${pref.name}`}
                      className="w-11 h-11 rounded-lg items-center justify-center border border-slate-200 bg-white"
                    >
                      <UiIcon as={Edit2} size={16} className="text-slate-600" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(pref._id || pref.id)}
                      accessibilityLabel={`Delete ${pref.name}`}
                      className="w-11 h-11 rounded-lg items-center justify-center border border-slate-200 bg-white"
                    >
                      <UiIcon as={Trash2} size={16} className="text-red-600" />
                    </Button>
                  </Div>
                </Cell>
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}
    </AdminPage>
  );
};
export default Preferences;
