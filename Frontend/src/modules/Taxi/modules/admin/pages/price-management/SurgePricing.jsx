import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  ChevronRight, 
  Loader2,
  FilePlus,
  ArrowLeft,
  Settings
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../../shared/api/axiosInstance';
import toast from 'react-hot-toast';

const inputClass = "w-full border border-neutral-200 rounded-md px-2 py-0.5 text-xs text-neutral-800 bg-white focus:border-neutral-400 focus:ring-1 focus:ring-[#0a4d2b]/30 outline-none transition-colors shadow-sm";
const labelClass = "block text-xs font-medium text-neutral-500 mb-0";

const SurgePricing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Sunday');
  const [surges, setSurges] = useState([]);
  const [details, setDetails] = useState({ zone_name: '', vehicle_type: '' });

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
            vehicle_type: target.vehicle_type?.name || target.vehicle_type_name || 'Vehicle'
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
    const currentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setSurges([...surges, { start_time: currentTime, end_time: currentTime, surge_price: '' }]);
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
          slots: surges
        }
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
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
         <Loader2 className="w-10 h-10 text-[#0a4d2b] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FD] p-3 lg:p-4 font-sans">
      
      {/* Header Block from Design System */}
      <div className="mb-4 flex flex-col lg:flex-row lg:items-center justify-between border-b border-neutral-100 pb-2">
        <div>
           <h1 className="text-xl font-medium text-[#1E293B]" style={{ fontFamily: '"Times New Roman", Times, serif' }}>Surge pricing</h1>
           <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-1">
              <span className="cursor-pointer hover:text-[#0a4d2b] transition-colors" onClick={() => navigate('/taxi/admin/pricing/set-price')}>Surge</span>
              <ChevronRight size={10} />
              <span className="text-neutral-800 font-medium">Surge control</span>
           </div>
        </div>
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-600 bg-white border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors font-medium shadow-sm mt-2 lg:mt-0"
        >
          <ArrowLeft size={14} /> Back
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* Summary Info (Left Sidebar style) */}
        <div className="lg:col-span-1 space-y-3">
           <div className="bg-white rounded-md border border-neutral-100 p-3 shadow-sm relative">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-neutral-50">
                 <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-neutral-100 text-neutral-500">
                    <Settings size={18} />
                 </div>
                 <div>
                    <h3 className="text-sm font-medium text-neutral-900 leading-tight">Price details</h3>
                    <p className="text-xs text-neutral-500 mt-0.5">Reference data</p>
                 </div>
              </div>
              <div className="space-y-2">
                 <div>
                    <label className={labelClass}>Active zone</label>
                    <div className="p-1.5 bg-neutral-50 rounded text-xs font-medium text-neutral-700 border border-neutral-100">{details.zone_name}</div>
                 </div>
                 <div>
                    <label className={labelClass}>Vehicle type</label>
                    <div className="p-1.5 bg-neutral-50 rounded text-xs font-medium text-neutral-700 border border-neutral-100">{details.vehicle_type}</div>
                 </div>
              </div>
           </div>
        </div>

        {/* Main Configuration Area */}
        <div className="lg:col-span-3">
           <div className="bg-white rounded-md border border-neutral-100 shadow-sm overflow-hidden flex flex-col">
              <div className="flex border-b border-neutral-100 overflow-x-auto no-scrollbar scroll-smooth bg-neutral-50/30">
                 {days.map(day => (
                   <button 
                     key={day}
                     onClick={() => setActiveTab(day)}
                     className={`flex-1 min-w-[80px] h-10 flex items-center justify-center text-xs font-medium   transition-colors relative ${activeTab === day ? 'text-[#0a4d2b] bg-white' : 'text-neutral-500 hover:text-neutral-600'}`}
                   >
                      {day.substring(0, 3)}
                      {activeTab === day && <div className="absolute top-0 left-0 right-0 h-[2px] bg-neutral-900" />}
                   </button>
                 ))}
              </div>

              <div className="p-4 flex-grow">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-medium text-neutral-800 flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-neutral-900 animate-pulse"></div>
                       {activeTab} Slots
                    </h2>
                    <button onClick={addSurge} className="bg-neutral-900 text-white px-3 py-1.5 rounded text-xs font-medium shadow-sm hover:bg-neutral-800 transition-colors flex items-center gap-1.5">
                       <Plus size={14} /> Add new surge
                    </button>
                 </div>

                 {surges.length === 0 ? (
                    <div className="py-10 flex flex-col items-center justify-center gap-3 text-neutral-300">
                       <div className="w-20 h-20 rounded-full bg-neutral-50 flex items-center justify-center border-2 border-dashed border-neutral-200">
                          <FilePlus size={32} />
                       </div>
                       <p className="text-[13px] font-medium text-neutral-400">No surge slots defined for this day</p>
                    </div>
                 ) : (
                    <div className="space-y-3">
                       {surges.map((row, idx) => (
                          <div key={idx} className="bg-neutral-50/50 p-3 rounded-md border border-neutral-100 grid grid-cols-1 md:grid-cols-4 gap-3 items-end relative overflow-hidden group">
                             <div className="absolute left-0 top-0 bottom-0 w-1 bg-neutral-200 group-hover:bg-neutral-800 transition-colors"></div>
                             
                             <div>
                                <label className={labelClass}>Start time</label>
                                <input 
                                  type="time"
                                  value={row.start_time}
                                  onChange={(e) => updateSurge(idx, 'start_time', e.target.value)}
                                  className={inputClass}
                                />
                             </div>
                             <div>
                                <label className={labelClass}>End time</label>
                                <input 
                                  type="time"
                                  value={row.end_time}
                                  onChange={(e) => updateSurge(idx, 'end_time', e.target.value)}
                                  className={inputClass}
                                />
                             </div>
                             <div>
                                <label className={labelClass}>Surge Price (in %)</label>
                                <div className="relative">
                                  <input 
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={row.surge_price}
                                    onChange={(e) => updateSurge(idx, 'surge_price', e.target.value)}
                                    className={inputClass + " pr-8"}
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-xs">%</span>
                                </div>
                             </div>
                             <div className="flex justify-end pr-2">
                                <button 
                                  onClick={() => removeSurge(idx)}
                                  className="w-10 h-10 flex items-center justify-center text-rose-400 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                                >
                                   <Trash2 size={18} />
                                </button>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>

              <div className="p-3 border-t border-neutral-100 flex justify-end bg-neutral-50/20">
                 <button onClick={handleUpdate} className="bg-neutral-900 text-white px-6 py-1.5 rounded text-xs font-medium shadow hover:bg-neutral-800 transition-colors">
                    Update surge
                 </button>
              </div>
           </div>
        </div>

      </div>

    </div>
  );
};

export default SurgePricing;

