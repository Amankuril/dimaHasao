/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/price-management/SurgePricing.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronRight, Loader2, FilePlus, ArrowLeft, Settings } from 'lucide-react-native';
import { useParams, useNavigate } from '../../../../../lib/webRouter';
import api from '../../../../shared/api/axiosInstance';
import { toast } from '../../../../../lib/notify';
import { Button, Div, H1, H2, H3, HScroll, Input, Label, P, ScrollDiv, Span, Icon as UiIcon } from '../../../../../components/web';
const inputClass =
  'w-full border border-gray-200 rounded-md px-2 py-0.5 text-xs text-gray-800 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors shadow-sm';
const labelClass = 'block text-[10px] font-semibold text-gray-500 mb-0';
const SurgePricing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Sunday');
  const [surges, setSurges] = useState([]);
  const [details, setDetails] = useState({
    zone_name: '',
    vehicle_type: '',
  });
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  useEffect(() => {
    const fetchPriceDetails = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/admin/types/set-prices/${id}`);
        const target = res.data || res.results || res;
        if (target) {
          setDetails({
            zone_name: target.zone_id?.name || target.zone_name || 'Global',
            vehicle_type: target.vehicle_type?.name || target.vehicle_type_name || 'Vehicle',
          });
        }
      } catch (err) {
        console.error('Fetch surge details failed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPriceDetails();
  }, [id]);
  const addSurge = () => {
    const currentTime = new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
    setSurges([
      ...surges,
      {
        start_time: currentTime,
        end_time: currentTime,
        surge_price: '',
      },
    ]);
  };
  const removeSurge = (index) => {
    setSurges(surges.filter((_, i) => i !== index));
  };
  const updateSurge = (index, field, value) => {
    const newSurges = [...surges];
    if (field === 'surge_price') {
      newSurges[index][field] = Math.max(0, Number(value)).toString();
    } else {
      newSurges[index][field] = value;
    }
    setSurges(newSurges);
  };
  const handleUpdate = async () => {
    try {
      setLoading(true);
      const payload = {
        surge_prices: {
          day: activeTab,
          slots: surges,
        },
      };
      await api.patch(`/admin/types/set-prices/${id}`, payload);
      toast.success(`${activeTab} surge prices updated!`);
      navigate(-1);
    } catch (err) {
      console.error('Update failed:', err);
      toast.error('Failed to update surge prices');
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return (
      <ScrollDiv className="min-h-screen flex items-center justify-center bg-gray-50">
        <UiIcon as={Loader2} className="w-10 h-10 text-indigo-600 animate-spin" />
      </ScrollDiv>
    );
  }
  return (
    <ScrollDiv className="min-h-screen bg-[#F8F9FD] p-3 lg:p-4 font-sans">
      {/* Header Block from Design System */}
      <Div className="mb-4 flex flex-col lg:flex-row lg:items-center justify-between border-b border-gray-100 pb-2">
        <Div>
          <H1
            className="text-xl font-bold text-[#1E293B]"
            style={{
              fontFamily: 'Playfair',
            }}
          >
            Surge Pricing
          </H1>
          <Div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-1 font-medium">
            <Span className="cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => navigate('/taxi/admin/pricing/set-price')}>
              Surge
            </Span>
            <UiIcon as={ChevronRight} size={10} />
            <Span className="text-slate-800 font-bold uppercase">Surge Control</Span>
          </Div>
        </Div>
        <Button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-all font-semibold shadow-sm mt-2 lg:mt-0"
        >
          <UiIcon as={ArrowLeft} size={14} /> Back
        </Button>
      </Div>

      <Div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Summary Info (Left Sidebar style) */}
        <Div className="lg:col-span-1 space-y-3">
          <Div className="bg-white rounded-md border border-gray-100 p-3 shadow-sm relative">
            <Div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-50">
              <Div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <UiIcon as={Settings} size={18} />
              </Div>
              <Div>
                <H3 className="text-sm font-bold text-gray-900 leading-tight">Price Details</H3>
                <P className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-0.5">Reference Data</P>
              </Div>
            </Div>
            <Div className="space-y-2">
              <Div>
                <Label className={labelClass}>Active Zone</Label>
                <Div className="p-1.5 bg-gray-50 rounded text-xs font-bold text-gray-700 border border-gray-100">{details.zone_name}</Div>
              </Div>
              <Div>
                <Label className={labelClass}>Vehicle Type</Label>
                <Div className="p-1.5 bg-gray-50 rounded text-xs font-bold text-gray-700 border border-gray-100">{details.vehicle_type}</Div>
              </Div>
            </Div>
          </Div>
        </Div>

        {/* Main Configuration Area */}
        <Div className="lg:col-span-3">
          <Div className="bg-white rounded-md border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <HScroll className="flex border-b border-gray-100 bg-gray-50/30">
              {days.map((day) => (
                <Button
                  key={day}
                  onClick={() => setActiveTab(day)}
                  className={`flex-1 min-w-[80px] h-10 flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === day ? 'text-indigo-600 bg-white' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {day.substring(0, 3)}
                  {activeTab === day && <Div className="absolute top-0 left-0 right-0 h-[2px] bg-indigo-600" />}
                </Button>
              ))}
            </HScroll>

            <Div className="p-4 flex-grow">
              <Div className="flex justify-between items-center mb-4">
                <H2 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                  <Div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></Div>
                  {activeTab} Slots
                </H2>
                <Button
                  onClick={addSurge}
                  className="bg-indigo-600 text-white px-3 py-1.5 rounded text-[11px] font-bold shadow-sm hover:bg-indigo-700 transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <UiIcon as={Plus} size={14} /> Add New Surge
                </Button>
              </Div>

              {surges.length === 0 ? (
                <Div className="py-10 flex flex-col items-center justify-center gap-3 text-slate-300">
                  <Div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center border-2 border-dashed border-gray-200">
                    <UiIcon as={FilePlus} size={32} />
                  </Div>
                  <P className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">No surge slots defined for this day.</P>
                </Div>
              ) : (
                <Div className="space-y-3">
                  {surges.map((row, idx) => (
                    <Div
                      key={idx}
                      className="bg-gray-50/50 p-3 rounded-md border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-3 items-end relative overflow-hidden group"
                    >
                      <Div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-200 group-hover:bg-indigo-500 transition-colors"></Div>

                      <Div>
                        <Label className={labelClass}>Start Time</Label>
                        <Input type="time" value={row.start_time} onChange={(e) => updateSurge(idx, 'start_time', e.target.value)} className={inputClass} />
                      </Div>
                      <Div>
                        <Label className={labelClass}>End Time</Label>
                        <Input type="time" value={row.end_time} onChange={(e) => updateSurge(idx, 'end_time', e.target.value)} className={inputClass} />
                      </Div>
                      <Div>
                        <Label className={labelClass}>Surge Price (in %)</Label>
                        <Div className="relative">
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={row.surge_price}
                            onChange={(e) => updateSurge(idx, 'surge_price', e.target.value)}
                            className={inputClass + ' pr-8'}
                          />
                          <Span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">%</Span>
                        </Div>
                      </Div>
                      <Div className="flex justify-end pr-2">
                        <Button
                          onClick={() => removeSurge(idx)}
                          className="w-10 h-10 flex items-center justify-center text-rose-400 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                        >
                          <UiIcon as={Trash2} size={18} />
                        </Button>
                      </Div>
                    </Div>
                  ))}
                </Div>
              )}
            </Div>

            <Div className="p-3 border-t border-gray-100 flex justify-end bg-gray-50/20">
              <Button
                onClick={handleUpdate}
                className="bg-indigo-600 text-white px-6 py-1.5 rounded text-[11px] font-black uppercase tracking-widest shadow hover:bg-indigo-700 transition-all active:scale-95"
              >
                Update Surge
              </Button>
            </Div>
          </Div>
        </Div>
      </Div>
    </ScrollDiv>
  );
};
export default SurgePricing;
