import React, { useState, useEffect } from 'react';
import { 
  ChevronRight,
  Loader2,
  ArrowLeft,
  Flame,
  FileJson,
  UploadCloud,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import toast from 'react-hot-toast';

const FirebaseSettings = () => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await adminService.getFirebaseSettings();
      setSettings(res.data?.settings || {});
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('Failed to load Firebase settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const data = {
        ...settings,
        firebase_json_name: selectedFile?.name || settings.firebase_json_name,
      };

      await adminService.updateFirebaseSettings(data);
      toast.success('Firebase configuration updated successfully');
      fetchData();
      setSelectedFile(null);
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

  return (
    <div className="min-h-screen bg-neutral-50 p-6 lg:p-8 font-sans">
      
      {/* Header Block */}
      <div className="mb-8">
        <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-2">
          <span>Settings</span>
          <ChevronRight size={12} />
          <span>Third-party</span>
          <ChevronRight size={12} />
          <span className="text-neutral-700">Firebase configuration</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl text-neutral-900 font-medium">Firebase settings</h1>
          <button onClick={() => window.history.back()} className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors shadow-sm">
            <ArrowLeft size={16} /> Back
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Main Card */}
        <form onSubmit={handleSave} className="bg-white rounded-xl border border-neutral-900/[0.08] overflow-hidden">
          {/* Card Header */}
          <div className="p-6 border-b border-neutral-100 flex items-center gap-3">
             <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-neutral-100 text-neutral-500">
                <Flame size={20} />
             </div>
             <div>
                <h3 className="text-sm font-medium text-neutral-900">Cloud infrastructure</h3>
                <p className="text-xs text-neutral-500">Manage your Firebase real-time database and service accounts</p>
             </div>
          </div>

          <div className="p-8 space-y-8">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="md:col-span-2">
                   <label className={labelClass}>Firebase database URL</label>
                   <input 
                    className={inputClass}
                    value={settings.firebase_database_url || ''}
                    onChange={(e) => updateField('firebase_database_url', e.target.value)}
                    placeholder="https://your-project.firebaseio.com"
                    required
                   />
                </div>

                <div>
                   <label className={labelClass}>API key</label>
                   <input 
                    type="password"
                    className={inputClass}
                    value={settings.firebase_api_key || ''}
                    onChange={(e) => updateField('firebase_api_key', e.target.value)}
                    placeholder="***********************************"
                    required
                   />
                </div>

                <div>
                   <label className={labelClass}>Auth domain</label>
                   <input 
                    className={inputClass}
                    value={settings.firebase_auth_domain || ''}
                    onChange={(e) => updateField('firebase_auth_domain', e.target.value)}
                    placeholder="your-project.firebaseapp.com"
                    required
                   />
                </div>

                <div>
                   <label className={labelClass}>Project ID</label>
                   <input 
                    className={inputClass}
                    value={settings.firebase_project_id || ''}
                    onChange={(e) => updateField('firebase_project_id', e.target.value)}
                    placeholder="your-project-id"
                    required
                   />
                </div>

                <div>
                   <label className={labelClass}>Storage bucket</label>
                   <input 
                    className={inputClass}
                    value={settings.firebase_storage_bucket || ''}
                    onChange={(e) => updateField('firebase_storage_bucket', e.target.value)}
                    placeholder="your-project.appspot.com"
                    required
                   />
                </div>

                <div>
                   <label className={labelClass}>Messaging sender ID</label>
                   <input 
                    className={inputClass}
                    value={settings.firebase_messaging_sender_id || ''}
                    onChange={(e) => updateField('firebase_messaging_sender_id', e.target.value)}
                    placeholder="xxxxxxxxxxxx"
                    required
                   />
                </div>

                <div>
                   <label className={labelClass}>App ID</label>
                   <input 
                    className={inputClass}
                    value={settings.firebase_app_id || ''}
                    onChange={(e) => updateField('firebase_app_id', e.target.value)}
                    placeholder="1:xxxxxxxxx:web:xxxxxxxxxxxx"
                    required
                   />
                </div>

                <div className="md:col-span-2">
                   <label className={labelClass}>Service account JSON</label>
                   <div className="mt-2 group relative">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-200 rounded-xl cursor-pointer bg-neutral-50/50 hover:bg-neutral-50 hover:border-neutral-200 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                          {selectedFile ? (
                            <>
                              <CheckCircle2 className="text-green-500 mb-2" size={24} />
                              <p className="text-sm font-medium text-neutral-700">{selectedFile.name}</p>
                              <p className="text-xs text-neutral-500">File selected successfully</p>
                            </>
                          ) : (
                            <>
                              <UploadCloud className="text-neutral-500 mb-2 group-hover:text-[#0a4d2b] transition-colors" size={24} />
                              <p className="text-sm font-medium text-neutral-600">Click to upload or drag and drop</p>
                              <p className="text-xs text-neutral-500">Service account credentials (.json)</p>
                            </>
                          )}
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept=".json"
                          onChange={(e) => setSelectedFile(e.target.files[0])}
                        />
                      </label>
                   </div>
                   {settings.firebase_json_name && !selectedFile && (
                     <div className="mt-4 p-3 bg-neutral-50/50 rounded-lg flex items-center justify-between border border-neutral-200">
                        <div className="flex items-center gap-2">
                           <FileJson size={14} className="text-[#0a4d2b]" />
                           <span className="text-xs font-medium text-neutral-900">{settings.firebase_json_name}</span>
                        </div>
                        <span className="text-xs font-medium text-neutral-400">Currently active</span>
                     </div>
                   )}
                </div>

             </div>
          </div>

          {/* Card Footer */}
          <div className="p-6 bg-neutral-50/50 border-t border-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-neutral-500 px-2">
              <ShieldCheck size={12} className="text-neutral-300" />
              Encrypted storage
            </div>
            <button 
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-8 py-3 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting ? (
                <><Loader2 size={16} className="animate-spin" /> Saving Changes...</>
              ) : (
                'Save Connection'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FirebaseSettings;
