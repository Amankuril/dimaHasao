/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/settings/TransportRideSettings.jsx (tools/port.js first pass). */
import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, Save, Loader2, ChevronUp } from 'lucide-react-native';
import api from '../../../../shared/api/axiosInstance';
import { toast } from '../../../../../lib/notify';
import { Button, Div, H3, Input, Label, Option, P, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../../components/web';
const InputField = ({ label, name, value, onChange, placeholder, type = 'text' }) => (
  <Div className="space-y-1.5 w-full">
    <Label className="text-sm font-medium text-gray-700 block ml-0.5">{label}</Label>
    <Input
      type={type}
      name={name}
      value={value || ''}
      onChange={(e) => onChange(name, e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-4 text-sm text-gray-900 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all outline-none shadow-sm"
    />
  </Div>
);
const TransportRideSettings = () => {
  const pageRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({});
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/general-settings/transport-ride');
      setSettings(res.data?.settings || res.settings || {});
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('Failed to load transport parameters');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);
  const handleUpdate = async () => {
    try {
      setSaving(true);
      await api.patch('/admin/general-settings/transport-ride', {
        settings,
      });
      toast.success('Transport settings updated successfully!');
    } catch (err) {
      console.error('Update error:', err);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };
  const handleChange = (name, value) => {
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  if (loading) {
    return (
      <ScrollDiv className="min-h-screen flex items-center justify-center bg-gray-50">
        <Div className="flex flex-col items-center gap-4">
          <UiIcon as={Loader2} className="w-10 h-10 text-yellow-500 animate-spin" />
          <P className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Loading Settings...</P>
        </Div>
      </ScrollDiv>
    );
  }
  return (
    <Div className="h-screen relative">
      <ScrollDiv ref={pageRef} className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 font-sans pb-32">
      <Div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-700">
        {/* Header Breadcrumb */}
        <Div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-end gap-4">
          <Div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <Span>Transport Ride Settings</Span>
            <UiIcon as={ChevronRight} size={14} />
            <Span className="text-gray-900">Transport Ride Settings</Span>
          </Div>
        </Div>

        <Div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <Div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50/30">
            <Div className="w-1 h-5 bg-yellow-400 rounded-full"></Div>
            <H3 className="text-[13px] font-bold text-gray-700 uppercase tracking-tight">Transport Ride Settings</H3>
          </Div>

          <Div className="p-6 pb-8">
            <Div className="mb-8 rounded-xl border border-gray-200 bg-gray-50/50 px-5 py-4">
              <P className="text-sm font-semibold text-gray-900">Regular ride search behavior is controlled from this page.</P>
              <P className="mt-1 text-sm text-gray-500">Only the settings below are currently wired into the live dispatch flow.</P>
            </Div>

            <Div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
              {/* Left Column */}
              <Div className="space-y-6">
                <Div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700 block ml-0.5">Trip Dispatch Type</Label>
                  <Select
                    value={settings.trip_dispatch_type || '1'}
                    onChange={(e) => handleChange('trip_dispatch_type', e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-4 text-sm text-gray-900 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all outline-none shadow-sm"
                  >
                    <Option value="1">One By One</Option>
                    <Option value="2">Broadcast</Option>
                  </Select>
                </Div>

                <InputField
                  label="Maximum Time For Find Drivers For Regular Ride"
                  name="maximum_time_for_find_drivers_for_regular_ride"
                  value={settings.maximum_time_for_find_drivers_for_regular_ride}
                  onChange={handleChange}
                  type="number"
                />

                <InputField
                  label="Trip Accept/Reject Duration For Driver in Seconds"
                  name="trip_accept_reject_duration_for_driver"
                  value={settings.trip_accept_reject_duration_for_driver}
                  onChange={handleChange}
                  type="number"
                />
              </Div>

              {/* Right Column */}
              <Div className="space-y-6">
                <InputField
                  label="Driver Search Radius in Kilometer"
                  name="driver_search_radius"
                  value={settings.driver_search_radius}
                  onChange={handleChange}
                  type="number"
                />

                <Div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700 block ml-0.5">Require Admin Approval to End Rental</Label>
                  <Select
                    value={settings.require_admin_approval_to_end_rental || '0'}
                    onChange={(e) => handleChange('require_admin_approval_to_end_rental', e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-4 text-sm text-gray-900 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all outline-none shadow-sm"
                  >
                    <Option value="0">No (Auto-complete ride)</Option>
                    <Option value="1">Yes (Awaiting confirmation)</Option>
                  </Select>
                </Div>
              </Div>
            </Div>

            <Div className="mt-10 flex justify-end pt-6 border-t border-gray-100">
              <Button
                onClick={handleUpdate}
                disabled={saving}
                className="bg-yellow-400 text-black px-8 py-2.5 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 hover:bg-yellow-500 active:scale-95 transition-all disabled:opacity-50"
              >
                {saving ? <UiIcon as={Loader2} size={18} className="animate-spin" /> : <UiIcon as={Save} size={18} />}
                {saving ? 'Saving...' : 'Update Settings'}
              </Button>
            </Div>
          </Div>
        </Div>
      </Div>

      </ScrollDiv>

      {/* Floating Scroll Top */}
      <Button
        onClick={() => pageRef.current?.scrollTo({ y: 0, animated: true })}
        className="absolute bottom-10 right-10 bg-white text-gray-600 border border-gray-200 w-12 h-12 rounded-full flex items-center justify-center shadow-md hover:bg-gray-50 hover:text-black transition-all z-50"
      >
        <UiIcon as={ChevronUp} size={20} />
      </Button>
    </Div>
  );
};
export default TransportRideSettings;
