import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Pencil, PlusCircle, Trash2, Eye, AlertCircle } from 'lucide-react';
import { propertyService } from '../../../services/apiService';
import PartnerHeader from '../components/PartnerHeader';

const PartnerProperties = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [propertiesByType, setPropertiesByType] = useState({});
  const [propertyToDelete, setPropertyToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  const fetchProperties = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await propertyService.getMy();
      const grouped = {};
      (res.properties || []).forEach(p => {
        const type = p.propertyType || 'other';
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(p);
      });
      setPropertiesByType(grouped);
    } catch (e) {
      setError(e?.message || 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleAddProperty = () => {
    navigate('/hotel/join');
  };

  // A lodge is a roomed property, so it edits through the hotel wizard.
  const EDIT_WIZARD_BY_TYPE = {
    hotel: '/hotel/join-hotel',
    lodge: '/hotel/join-lodge',
    resort: '/hotel/join-resort',
    homestay: '/hotel/join-homestay',
  };

  const handleEditProperty = (property) => {
    const route = EDIT_WIZARD_BY_TYPE[property.propertyType];
    if (route) navigate(route, { state: { property } });
  };

  const handleViewDetails = (property) => {
    navigate(`/hotel/properties/${property._id}`);
  };

  const handleDeleteProperty = async () => {
    if (!propertyToDelete) return;
    setIsDeleting(true);
    try {
      await propertyService.delete(propertyToDelete._id);

      // Update local state without refetching
      const updatedGroups = { ...propertiesByType };
      const type = propertyToDelete.propertyType || 'other';
      if (updatedGroups[type]) {
        updatedGroups[type] = updatedGroups[type].filter(p => p._id !== propertyToDelete._id);
        if (updatedGroups[type].length === 0) {
          delete updatedGroups[type];
        }
      }
      setPropertiesByType(updatedGroups);
      setPropertyToDelete(null);
    } catch (e) {
      setError(e?.message || 'Failed to delete property');
    } finally {
      setIsDeleting(false);
    }
  };

  const sections = Object.entries(propertiesByType);
  const filteredSections = activeFilter === 'All' 
    ? sections 
    : sections.filter(([type]) => type === activeFilter);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <PartnerHeader title="My Properties" subtitle="Manage your listings by property type" />

      <div className="px-4 pt-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Building2 size={14} /> Your Listings
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleAddProperty}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#005CA8] hover:bg-[#004b8a] text-white text-[11px] font-bold uppercase tracking-wide active:scale-95 transition-all"
            >
              <PlusCircle size={14} /> Add New
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        {sections.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-1">
            {['All', ...Object.keys(propertiesByType)].map((filterType) => {
               const displayName = filterType === 'All' 
                 ? 'All Properties' 
                 : (propertiesByType[filterType][0]?.dynamicCategory?.displayName || filterType.toUpperCase());
                 
               return (
                 <button
                   key={filterType}
                   onClick={() => setActiveFilter(filterType)}
                   className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all whitespace-nowrap border uppercase tracking-wide flex-shrink-0 ${
                     activeFilter === filterType
                       ? 'bg-[#005CA8] text-white border-[#005CA8] shadow-sm'
                       : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                   }`}
                 >
                   {displayName}
                 </button>
               );
            })}
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">
            {error}
          </div>
        )}

        {loading && (
          <p className="text-xs text-gray-500">Loading properties...</p>
        )}

        {!loading && sections.length === 0 && (
          <div className="mt-8 text-center text-xs text-gray-500">
            <p>No properties found. Start by adding your first property.</p>
          </div>
        )}

        <div className="space-y-6 mt-2">
          {filteredSections.map(([type, list]) => (
            <div key={type} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div>
                  <p className="text-[12px] font-bold text-gray-500 uppercase tracking-widest">
                    {list[0]?.dynamicCategory?.displayName || type.toUpperCase()}
                  </p>
                  <p className="text-[11px] text-gray-400">{list.length} {list.length === 1 ? 'property' : 'properties'}</p>
                </div>
              </div>
              <div className="space-y-4">
                {list.map(property => (
                  <div key={property._id} className="bg-white rounded-[20px] p-4 border border-gray-100 shadow-[0_2px_15px_rgb(0,0,0,0.03)] flex flex-col gap-4">
                    
                    <div className="flex justify-between items-start gap-4">
                      {/* Left: Info */}
                      <div className="flex-1 pt-1 min-w-0">
                        <h3 className="text-[18px] font-bold text-slate-900 leading-tight mb-2.5 truncate">
                          {property.propertyName}
                        </h3>
                        
                        <div className="flex items-center gap-1.5 text-gray-500 text-[13px] font-medium mb-1">
                          <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                          <span className="truncate">
                            {property.address?.city || 'Unknown City'}, {property.address?.state || ''}
                          </span>
                        </div>
                        
                        {/* Short Description below location */}
                        <p className="text-[13px] text-gray-400 font-medium pl-5 line-clamp-2">
                          {property.shortDescription || 'No description provided'}
                        </p>
                      </div>

                      {/* Right: Image & Badge */}
                      <div className="relative w-[110px] h-[80px] sm:w-[140px] sm:h-[96px] md:w-[160px] md:h-[112px] rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-50 shadow-sm">
                        {property.coverImage ? (
                          <img
                            src={property.coverImage}
                            alt={property.propertyName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                            No Image
                          </div>
                        )}
                        {/* Status Badge */}
                        <div className="absolute top-1.5 right-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm ${
                            property.status === 'published' ? 'bg-emerald-500' :
                            property.status === 'rejected' ? 'bg-red-500' :
                            'bg-orange-500'
                          }`}>
                            {property.status === 'published' ? 'Active' : (property.status ? property.status.charAt(0).toUpperCase() + property.status.slice(1) : 'Pending')}
                          </span>
                        </div>
                        {/* Slider dots (only if multiple images exist) */}
                        {property.propertyImages && property.propertyImages.length > 0 && (
                          <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1">
                             <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_2px_rgba(0,0,0,0.5)]"></div>
                             {property.propertyImages.slice(0, 2).map((_, idx) => (
                               <div key={idx} className="w-1.5 h-1.5 bg-white/50 rounded-full shadow-[0_0_2px_rgba(0,0,0,0.5)]"></div>
                             ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Buttons */}
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => handleEditProperty(property)}
                        className="flex-1 py-2.5 rounded-[10px] bg-blue-50 hover:bg-blue-100 text-[#005CA8] text-[13px] font-bold flex items-center justify-center gap-2 transition-colors"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <button
                        onClick={() => handleViewDetails(property)}
                        className="flex-1 py-2.5 rounded-[10px] bg-slate-50 hover:bg-slate-100 text-slate-700 text-[13px] font-bold flex items-center justify-center gap-2 transition-colors"
                      >
                        <Eye size={14} /> Details
                      </button>
                      <button
                        type="button"
                        onClick={() => setPropertyToDelete(property)}
                        className="flex-1 py-2.5 rounded-[10px] bg-red-50 hover:bg-red-100 text-red-600 text-[13px] font-bold flex items-center justify-center gap-2 transition-colors"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {propertyToDelete && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-sm transition-opacity" onClick={() => setPropertyToDelete(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] w-full max-w-sm px-4">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                  <Trash2 size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Property?</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Are you sure you want to delete <span className="font-bold text-gray-800">{propertyToDelete.propertyName}</span>? This action cannot be undone and will delete all associated rooms and data.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPropertyToDelete(null)}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteProperty}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-red-200 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default PartnerProperties;
