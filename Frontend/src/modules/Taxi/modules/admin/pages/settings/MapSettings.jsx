import React, { useState, useEffect } from 'react';
import { 
  ChevronRight,
  Loader2,
  ArrowLeft,
  Map as MapIcon,
  CheckCircle2,
  ShieldCheck,
  Globe,
  Circle
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import toast from 'react-hot-toast';

const MapSettings = () => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await adminService.getMapSettings();
      setSettings(res.data?.settings || {});
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('Failed to load Map settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdate = async () => {
    try {
      setSubmitting(true);
      await adminService.updateMapSettings(settings);
      toast.success('Map configuration updated successfully');
      fetchData();
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const inputClass = "w-full border border-neutral-200 rounded-lg px-4 py-2.5 text-sm text-neutral-800 bg-white focus:border-neutral-400 focus:ring-1 focus:ring-[#0a4d2b]/30 outline-none transition-colors";
  const labelClass = "block text-xs font-medium text-neutral-500 mb-1.5";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <Loader2 className="animate-spin text-[#0a4d2b]" size={32} />
      </div>
    );
  }

  const mapTypes = [
    { 
      id: 'google_map', 
      name: 'Google Maps', 
      image: 'https://images.livemint.com/img/2021/11/17/1600x900/Google_Maps_rebranded_logo_1637135111166_1637135111306.jpg',
      description: 'Satellite imagery, 360° panoramic views.'
    },
    { 
      id: 'open_street', 
      name: 'Open Street Map', 
      image: 'https://upload.wikimedia.org/wikipedia/commons/b/b0/OpenStreetMap_logo.svg',
      description: 'Free, open source wiki world map.'
    }
  ];

  return (
    <div className="min-h-screen bg-neutral-50 p-6 lg:p-8 font-sans">
      
      {/* Header Block */}
      <div className="mb-8">
        <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-2">
          <span>Settings</span>
          <ChevronRight size={12} />
          <span>Third-party</span>
          <ChevronRight size={12} />
          <span className="text-neutral-700">Map configuration</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl text-neutral-900 font-medium">Map & APIs settings</h1>
          <button onClick={() => window.history.back()} className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors shadow-sm">
            <ArrowLeft size={16} /> Back
          </button>
        </div>
      </div>

      <div className="space-y-8 max-w-6xl mx-auto">
        
        {/* Choose Map Type Section */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] overflow-hidden">
           <div className="p-6 border-b border-neutral-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-neutral-100 text-neutral-500">
                 <Globe size={20} />
              </div>
              <div>
                 <h3 className="text-sm font-medium text-neutral-900">Default map provider</h3>
                 <p className="text-xs text-neutral-500">Select which mapping service to display on mobile and web apps</p>
              </div>
           </div>
           
           <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              {mapTypes.map((map) => (
                <div 
                   key={map.id} 
                   onClick={() => updateField('map_type', map.id)}
                   className={`relative border-2 rounded-xl transition-colors p-2 group cursor-pointer ${settings.map_type === map.id ? 'border-[#0a4d2b] bg-neutral-50/10' : 'border-neutral-100 bg-white hover:border-neutral-200'}`}
                >
                   <div className="aspect-video bg-neutral-50 rounded-lg flex items-center justify-center p-6 overflow-hidden">
                      <img src={map.image} alt={map.name} className="w-full h-full object-contain transform transition-transform duration-500" />
                   </div>
                   <div className="p-4 flex items-center justify-between">
                      <div>
                         <p className="text-sm font-medium text-neutral-900">{map.name}</p>
                         <p className="text-xs text-neutral-500">{map.description}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${settings.map_type === map.id ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-transparent'}`}>
                         <CheckCircle2 size={12} strokeWidth={3} />
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* Google Map Apis Section */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] overflow-hidden">
           <div className="p-6 border-b border-neutral-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-neutral-100 text-neutral-500">
                 <MapIcon size={20} />
              </div>
              <div>
                 <h3 className="text-sm font-medium text-neutral-900">API credentials</h3>
                 <p className="text-xs text-neutral-500">Secure keys for Google Maps Javascript and Distance Matrix APIs</p>
              </div>
           </div>

           <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div>
                    <label className={labelClass}>
                       Google map key for web apps
                    </label>
                    <input 
                      type="password"
                      className={inputClass}
                      value={settings.google_map_key_for_web_apps || ''}
                      onChange={(e) => updateField('google_map_key_for_web_apps', e.target.value)}
                      placeholder="Enter API key"
                    />
                 </div>

                 <div>
                    <label className={labelClass}>
                       Distance matrix / distance matrix API key
                    </label>
                    <input 
                      type="password"
                      className={inputClass}
                      value={settings.google_map_key_for_distance_matrix || ''}
                      onChange={(e) => updateField('google_map_key_for_distance_matrix', e.target.value)}
                      placeholder="Enter matrix key for routing"
                    />
                 </div>
              </div>
           </div>

           {/* Card Footer */}
           <div className="p-6 bg-neutral-50/50 border-t border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-neutral-500 px-2">
                 <ShieldCheck size={12} className="text-neutral-300" />
                 Ready for production
              </div>
              <button 
                onClick={handleUpdate}
                disabled={submitting}
                className="flex items-center gap-2 px-8 py-3 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors shadow-sm disabled:opacity-50"
              >
                {submitting ? (
                  <><Loader2 size={16} className="animate-spin" /> Updating...</>
                ) : (
                  'Save Map Connection'
                )}
              </button>
           </div>
        </div>

      </div>
    </div>
  );
};

export default MapSettings;
