/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/price-management/DriverIncentive.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronRight, Loader2 } from 'lucide-react-native';
import { useParams, useNavigate } from '../../../../../lib/webRouter';
import api from '../../../../shared/api/axiosInstance';
import { toast } from '../../../../../lib/notify';
import { Button, Div, H1, Input, Label, ScrollDiv, Span, Icon as UiIcon } from '../../../../../components/web';
const DriverIncentive = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('daily');
  const [incentives, setIncentives] = useState([
    {
      min_rides: '0',
      amount: '0',
    },
  ]);
  const [details, setDetails] = useState({
    zone_name: '',
    vehicle_type: '',
  });
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
        console.error('Fetch incentive details failed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPriceDetails();
  }, [id]);
  const addRow = () => {
    setIncentives([
      ...incentives,
      {
        min_rides: '0',
        amount: '0',
      },
    ]);
  };
  const removeRow = (index) => {
    setIncentives(incentives.filter((_, i) => i !== index));
  };
  const updateRow = (index, field, value) => {
    const numericValue = Math.max(0, Number(value));
    const newInc = [...incentives];
    newInc[index][field] = numericValue.toString();
    setIncentives(newInc);
  };
  const handleSubmit = async () => {
    try {
      setLoading(true);
      const payload = {
        driver_incentives: {
          type: activeTab,
          data: incentives,
        },
      };
      await api.patch(`/admin/types/set-prices/${id}`, payload);
      toast.success('Incentives updated successfully!');
      navigate(-1);
    } catch (err) {
      console.error('Update failed:', err);
      toast.error('Failed to update incentives');
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
      {/* Header Block */}
      <Div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-4">
        <H1 className="text-lg font-black text-gray-900 tracking-tight">Incentive</H1>
        <Div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mt-1">
          <Span className="cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => navigate('/taxi/admin/pricing/set-price')}>
            Incentive
          </Span>
          <UiIcon as={ChevronRight} size={10} strokeWidth={3} />
          <Span className="text-gray-600">Control</Span>
        </Div>
      </Div>

      {/* Summary Cards */}
      <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Div className="bg-white border-2 border-dashed border-indigo-100 rounded-md p-3 flex flex-col items-center justify-center text-center shadow-sm">
          <Span className="text-xs font-semibold text-gray-900 bg-gray-100 px-3 py-1 rounded-full mb-1.5">Zone</Span>
          <Span className="text-sm font-bold text-gray-700 capitalize">{(details.zone_name || '').toLowerCase()}</Span>
        </Div>
        <Div className="bg-white border-2 border-dashed border-indigo-100 rounded-md p-3 flex flex-col items-center justify-center text-center shadow-sm">
          <Span className="text-xs font-semibold text-gray-900 bg-gray-100 px-3 py-1 rounded-full mb-1.5">Vehicle Type</Span>
          <Span className="text-sm font-bold text-gray-700 capitalize">{(details.vehicle_type || '').toLowerCase()}</Span>
        </Div>
      </Div>

      {/* Tabs & Content */}
      <Div className="bg-white rounded-md border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <Div className="flex border-b border-gray-100 h-10">
          <Button
            onClick={() => setActiveTab('daily')}
            className={`flex-1 flex items-center justify-center text-sm font-semibold transition-all relative ${activeTab === 'daily' ? 'text-yellow-500' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Daily
            {activeTab === 'daily' && <Div className="absolute bottom-0 left-0 right-0 h-[2px] bg-yellow-400" />}
          </Button>
          <Button
            onClick={() => setActiveTab('weekly')}
            className={`flex-1 flex items-center justify-center text-sm font-semibold transition-all relative ${activeTab === 'weekly' ? 'text-yellow-500' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Weekly
            {activeTab === 'weekly' && <Div className="absolute bottom-0 left-0 right-0 h-[2px] bg-yellow-400" />}
          </Button>
        </Div>

        <Div className="p-4 space-y-4 flex-grow">
          <Div className="flex justify-end">
            <Button
              onClick={addRow}
              className="bg-yellow-400 hover:bg-yellow-500 text-black px-3 py-1.5 rounded-md text-xs font-bold shadow-sm  transition-all flex items-center gap-1.5"
            >
              <UiIcon as={Plus} size={12} /> Add
            </Button>
          </Div>

          <Div className="space-y-3">
            {incentives.map((row, idx) => (
              <Div
                key={idx}
                className="flex flex-col md:flex-row items-end gap-3 animate-in slide-in-from-left-4 duration-300 bg-gray-50/50 p-2 border border-gray-100 rounded-md"
              >
                <Div className="flex-1 space-y-1 w-full">
                  <Label className="text-xs font-semibold text-gray-600">Minimum Ride Should Complete</Label>
                  <Input
                    type="number"
                    min="0"
                    value={row.min_rides}
                    onChange={(e) => updateRow(idx, 'min_rides', e.target.value)}
                    className="w-full border border-gray-200 rounded-md px-2 py-1 text-xs font-bold text-gray-700 focus:border-indigo-500 outline-none shadow-sm"
                  />
                </Div>
                <Div className="flex-1 space-y-1 w-full">
                  <Label className="text-xs font-semibold text-gray-600">Incentive Amount</Label>
                  <Input
                    type="number"
                    min="0"
                    value={row.amount}
                    onChange={(e) => updateRow(idx, 'amount', e.target.value)}
                    className="w-full border border-gray-200 rounded-md px-2 py-1 text-xs font-bold text-gray-700 focus:border-indigo-500 outline-none shadow-sm"
                  />
                </Div>
                <Button onClick={() => removeRow(idx)} className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-md transition-colors">
                  <UiIcon as={Trash2} size={16} />
                </Button>
              </Div>
            ))}
          </Div>
        </Div>

        <Div className="p-3 border-t border-gray-50 flex justify-end bg-gray-50/20">
          <Button
            onClick={handleSubmit}
            className="bg-yellow-400 hover:bg-yellow-500 text-black px-6 py-1.5 rounded-md text-xs font-bold shadow  transition-all active:scale-95"
          >
            Submit
          </Button>
        </Div>
      </Div>

      {/* Floating Design element. Web: fixed bottom-right; here it sits at the end
          of the scrolling page (purely decorative, no action). */}
      <Div className="flex justify-end mt-10">
        <Button className="w-14 h-14 bg-yellow-400 text-white rounded-full flex items-center justify-center shadow-2xl hover:rotate-[360deg] transition-all duration-700">
          <Div className="flex flex-col gap-1 items-center">
            <Div className="w-6 h-[2.5px] bg-white rounded-full"></Div>
            <Div className="w-6 h-[2px] bg-white/70 rounded-full"></Div>
            <Div className="w-6 h-[1.5px] bg-white/40 rounded-full"></Div>
          </Div>
        </Button>
      </Div>
    </ScrollDiv>
  );
};
export default DriverIncentive;
