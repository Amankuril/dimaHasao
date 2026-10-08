/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/settings/TipSettings.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { ChevronRight, Save, Loader2, Plus, X } from 'lucide-react-native';
import api from '../../../../shared/api/axiosInstance';
import { toast } from '../../../../../lib/notify';
import { Button, Div, H1, H3, H4, Input, Label, Li, P, ScrollDiv, Span, Ul, Icon as UiIcon } from '../../../../../components/web';
const TipSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    enable_tips: '0',
    min_tip_amount: '',
  });

  // UI-only state for new features (backend doesn't support these natively yet)
  const [presets, setPresets] = useState([10, 20, 30, 50, 100]);
  const [allowCustom, setAllowCustom] = useState(true);
  const [newPreset, setNewPreset] = useState('');
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/general-settings/tip');
      setSettings(
        res.data?.settings ||
          res.settings || {
            enable_tips: '0',
            min_tip_amount: '10',
          },
      );
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('Failed to load tip configurations');
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
      // We only save the fields the backend actually supports to prevent errors
      await api.patch('/admin/general-settings/tip', {
        settings: {
          enable_tips: settings.enable_tips,
          min_tip_amount: settings.min_tip_amount,
        },
      });
      toast.success('Settings updated successfully.', {
        style: {
          background: '#151515',
          color: '#fff',
        },
      });
    } catch (err) {
      console.error('Update settings failed:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };
  const handleAddPreset = () => {
    if (newPreset && !isNaN(newPreset)) {
      setPresets([...presets, parseInt(newPreset)].sort((a, b) => a - b));
      setNewPreset('');
    }
  };
  const handleRemovePreset = (valToRemove) => {
    setPresets(presets.filter((p) => p !== valToRemove));
  };
  const isEnabled = settings.enable_tips === '1';
  if (loading) {
    return (
      <ScrollDiv className="min-h-screen flex items-center justify-center bg-[#F5F6F8]">
        <UiIcon as={Loader2} className="w-10 h-10 text-[#F4B400] animate-spin" />
      </ScrollDiv>
    );
  }
  return (
    <ScrollDiv className="min-h-screen bg-[#F5F6F8] p-4 sm:p-6 lg:p-8 font-sans pb-32">
      <Div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
        {/* Header */}
        <Div className="mb-8">
          <Div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-2">
            <Span>App Settings</Span>
            <UiIcon as={ChevronRight} size={14} />
            <Span className="text-[#151515]">Tip Settings</Span>
          </Div>

          <Div className="flex items-center gap-4">
            <Div className="w-1.5 h-8 bg-[#F4B400] rounded-full"></Div>
            <Div>
              <H1 className="text-2xl font-bold text-[#151515]">Tip Settings</H1>
              <P className="text-sm text-gray-500 mt-1">Configure how customers can reward drivers with optional tips after completing a ride.</P>
            </Div>
          </Div>
        </Div>

        {/* Enable Driver Tips Card */}
        <Div
          className={`bg-white rounded-2xl shadow-sm border-l-4 transition-all duration-300 ${isEnabled ? 'border-l-[#F4B400] border-t border-r border-b border-[#E5E7EB]' : 'border-[#E5E7EB]'}`}
        >
          <Div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <Div>
              <H3 className="text-lg font-bold text-[#151515] flex items-center gap-2">⭐ Driver Tips</H3>
              <P className="text-sm text-gray-500 mt-1">Allow customers to reward drivers after ride completion.</P>
              {!isEnabled && (
                <P className="text-xs text-gray-400 mt-2 italic border-l-2 border-gray-300 pl-2">
                  Turning this off immediately hides Tip UI inside customer app.
                </P>
              )}
            </Div>
            <Button
              type="button"
              onClick={() =>
                setSettings((s) => ({
                  ...s,
                  enable_tips: isEnabled ? '0' : '1',
                }))
              }
              className={`w-14 h-7 rounded-full relative transition-colors duration-300 shrink-0 focus:outline-none focus:ring-2 focus:ring-[#F4B400] focus:ring-offset-2 ${isEnabled ? 'bg-[#F4B400]' : 'bg-gray-300'}`}
            >
              <Div className={`w-5 h-5 bg-white rounded-full absolute top-1 shadow-sm transition-all duration-300 ${isEnabled ? 'left-8' : 'left-1'}`} />
            </Button>
          </Div>
        </Div>

        {/* Main Layout 2-Col */}
        <Div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* Left Column (60%) */}
          <Div className="lg:col-span-3 space-y-6">
            {/* Configuration Card */}
            <Div className="bg-white rounded-[20px] shadow-sm border border-[#E5E7EB] border-l-4 border-l-[#F4B400] flex flex-col overflow-hidden transition-all duration-200 hover:shadow-md relative">
              <Div className="p-6">
                <H3 className="text-lg font-bold text-[#151515]">Tip Configuration</H3>
                <P className="text-sm text-gray-500 mt-1 mb-8">Configure minimum tip amount and available preset values.</P>

                {/* Minimum Tip Amount */}
                <Div className="space-y-2 mb-8">
                  <Label className="text-sm font-semibold text-[#151515] block">Minimum Tip Amount</Label>
                  <Div className="flex items-stretch relative group">
                    <Div className="w-12 bg-[#F5F6F8] border border-[#E5E7EB] border-r-0 rounded-l-lg flex items-center justify-center text-gray-500 font-bold group-focus-within:border-[#F4B400] transition-colors">
                      ₹
                    </Div>
                    <Input
                      type="number"
                      value={settings.min_tip_amount || ''}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          min_tip_amount: e.target.value,
                        }))
                      }
                      placeholder="Example: 10"
                      className="flex-1 bg-white border border-[#E5E7EB] rounded-r-lg py-3 px-4 text-sm text-[#151515] font-medium focus:border-[#F4B400] focus:ring-1 focus:ring-[#F4B400] transition-all outline-none"
                    />
                  </Div>
                  {!settings.min_tip_amount ? (
                    <P className="text-xs font-semibold text-red-500 mt-1">Minimum value is required.</P>
                  ) : (
                    <P className="text-xs text-gray-500 mt-1">Minimum value allowed for tipping.</P>
                  )}
                </Div>

                {/* Preset Tip Amounts (UI-Only Mockup) */}
                <Div className="space-y-3 mb-8 pt-6 border-t border-gray-100">
                  <Div className="flex justify-between items-end">
                    <Div>
                      <H4 className="text-sm font-semibold text-[#151515]">Preset Tip Amounts</H4>
                      <P className="text-xs text-gray-500 mt-1">Quick selection chips for the user.</P>
                    </Div>
                  </Div>

                  <Div className="flex flex-wrap gap-3 mt-4">
                    {presets.map((p, idx) => (
                      <Div
                        key={idx}
                        className="flex items-center gap-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-full pl-4 pr-1 py-1.5 group hover:border-gray-300 transition-colors"
                      >
                        <Span className="text-sm font-bold text-[#151515]">₹{p}</Span>
                        <Button
                          onClick={() => handleRemovePreset(p)}
                          className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm"
                        >
                          <UiIcon as={X} size={12} />
                        </Button>
                      </Div>
                    ))}
                  </Div>

                  <Div className="flex items-center gap-2 mt-4 max-w-xs">
                    <Input
                      type="number"
                      value={newPreset}
                      onChange={(e) => setNewPreset(e.target.value)}
                      placeholder="Amount"
                      className="w-24 bg-white border border-[#E5E7EB] rounded-lg py-2 px-3 text-sm focus:border-[#F4B400] outline-none"
                    />
                    <Button
                      onClick={handleAddPreset}
                      className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors flex items-center gap-1"
                    >
                      <UiIcon as={Plus} size={14} /> Add
                    </Button>
                  </Div>
                </Div>

                {/* Custom Tip Amount */}
                <Div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                  <Div>
                    <H4 className="text-sm font-semibold text-[#151515]">Allow Custom Tip Amount</H4>
                    <P className="text-xs text-gray-500 mt-1">Customers can enter their own custom amount.</P>
                  </Div>
                  <Button
                    type="button"
                    onClick={() => setAllowCustom(!allowCustom)}
                    className={`w-12 h-6 rounded-full relative transition-colors duration-300 shrink-0 ${allowCustom ? 'bg-[#F4B400]' : 'bg-gray-300'}`}
                  >
                    <Div
                      className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-all duration-300 ${allowCustom ? 'left-7' : 'left-1'}`}
                    />
                  </Button>
                </Div>
              </Div>

              {/* Sticky Save Footer inside Card */}
              <Div className="bg-gray-50 border-t border-gray-100 p-6 flex justify-end z-10">
                <Button
                  onClick={handleUpdate}
                  disabled={saving}
                  className="bg-[#F4B400] text-[#151515] px-8 py-3 rounded-xl text-sm font-bold shadow-md flex items-center gap-2 hover:bg-[#E0A800] hover:shadow-lg active:scale-95 transition-all disabled:opacity-50"
                >
                  {saving ? <UiIcon as={Loader2} size={18} className="animate-spin" /> : <UiIcon as={Save} size={18} />}
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </Div>
            </Div>

            {/* Help Section */}
            <Div className="bg-[#F5F6F8] rounded-[20px] p-6 border border-[#E5E7EB] transition-all duration-200 hover:shadow-sm">
              <H4 className="text-sm font-bold text-[#151515] mb-3">How Driver Tips Work</H4>
              <Ul className="space-y-2 text-sm text-gray-600">
                <Li className="flex items-start gap-2">
                  <Span className="text-[#F4B400] mt-1">•</Span> Tips are strictly optional for the customer.
                </Li>
                <Li className="flex items-start gap-2">
                  <Span className="text-[#F4B400] mt-1">•</Span> Tips are transferred directly to driver earnings.
                </Li>
                <Li className="flex items-start gap-2">
                  <Span className="text-[#F4B400] mt-1">•</Span> Customers can skip tipping entirely.
                </Li>
                <Li className="flex items-start gap-2">
                  <Span className="text-[#F4B400] mt-1">•</Span> Minimum amount is controlled via this panel.
                </Li>
                <Li className="flex items-start gap-2">
                  <Span className="text-[#F4B400] mt-1">•</Span> Driver tips do not affect base fare calculation.
                </Li>
              </Ul>
            </Div>
          </Div>

        </Div>
      </Div>
    </ScrollDiv>
  );
};
export default TipSettings;
