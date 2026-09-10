import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, MapPin, CheckCircle, XCircle, FileText,
    ChevronLeft, Star, Bed, Calendar, ShieldCheck, AlertCircle,
    MoreVertical, Download, Search, Ban, Wifi, Phone, Mail, Tv, Coffee, Wind, Loader2, Clock, Image as ImageIcon, Users
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';

// --- Tab Components ---

const OverviewTab = ({ hotel }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <h3 className="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
                    <Building2 size={14} /> Property Information
                </h3>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500 font-bold uppercase text-[10px]">Property Name</span>
                        <span className="font-bold text-gray-900">{hotel.propertyName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500 font-bold uppercase text-[10px]">Property Type</span>
                        <span className="font-bold text-gray-900 capitalize">{hotel.propertyType}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500 font-bold uppercase text-[10px]">Contact Number</span>
                        <span className="font-bold text-gray-900">{hotel.contactNumber || 'Not Provided'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500 font-bold uppercase text-[10px]">Status</span>
                        <span className="font-bold text-gray-900 capitalize">{hotel.status}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500 font-bold uppercase text-[10px]">Joined Date</span>
                        <span className="font-bold text-gray-900">{hotel.createdAt ? new Date(hotel.createdAt).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    {hotel.propertyType === 'plot' ? (
                        <>
                            <div className="flex justify-between">
                                <span className="text-gray-500 font-bold uppercase text-[10px]">Plot Area</span>
                                <span className="font-bold text-gray-900">{hotel.plotDetails?.plotArea || 'N/A'} {hotel.plotDetails?.unit || 'sqyrd'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 font-bold uppercase text-[10px]">Expected Price</span>
                                <span className="font-bold text-gray-900">₹{hotel.plotDetails?.expectedPrice?.toLocaleString() || 'N/A'}</span>
                            </div>
                        </>
                    ) : hotel.propertyType === 'buy' ? (
                        <>
                            <div className="flex justify-between">
                                <span className="text-gray-500 font-bold uppercase text-[10px]">Property Type</span>
                                <span className="font-bold text-gray-900">{hotel.buyDetails?.type || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 font-bold uppercase text-[10px]">Expected Price</span>
                                <span className="font-bold text-gray-900">₹{hotel.buyDetails?.expectedPrice?.toLocaleString() || 'N/A'}</span>
                            </div>
                        </>
                    ) : (
                        <div className="flex justify-between">
                            <span className="text-gray-500 font-bold uppercase text-[10px]">{hotel.propertyType === 'tent' ? 'Total Tent Types' : 'Total Room Types'}</span>
                            <span className="font-bold text-gray-900">{hotel.rooms?.length || 0}</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span className="text-gray-500 font-bold uppercase text-[10px]">Live On Platform</span>
                        <span className="font-bold text-gray-900 flex items-center gap-1">
                            {hotel.isLive ? <CheckCircle size={12} className="text-green-600" /> : <XCircle size={12} className="text-red-500" />}
                            {hotel.isLive ? 'Yes' : 'No'}
                        </span>
                    </div>
                </div>
            </div>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <h3 className="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
                    <MapPin size={14} /> Partner & Location
                </h3>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500 font-bold uppercase text-[10px]">Partner Name</span>
                        <span className="font-bold text-gray-900">{hotel.partnerId?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500 font-bold uppercase text-[10px]">Partner Email</span>
                        <span className="font-bold text-gray-900">{hotel.partnerId?.email || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500 font-bold uppercase text-[10px]">Partner Phone</span>
                        <span className="font-bold text-gray-900">{hotel.partnerId?.phone || 'N/A'}</span>
                    </div>
                    <div className="pt-2">
                        <span className="text-gray-500 font-bold uppercase text-[10px] block mb-1">Full Address</span>
                        <span className="font-bold block text-gray-800 leading-relaxed">
                            {hotel.address?.fullAddress || hotel.address?.area || 'N/A'}
                            <br />
                            {hotel.address?.city}, {hotel.address?.district ? `${hotel.address.district}, ` : ''}{hotel.address?.state} {hotel.address?.pincode && `- ${hotel.address.pincode}`}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h3 className="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-3">About Property</h3>
            {hotel.shortDescription && (
                <div className="mb-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-400 mb-1">Short Description</h4>
                    <p className="text-sm font-bold text-gray-700 uppercase tracking-tight italic">
                        {hotel.shortDescription}
                    </p>
                </div>
            )}
            <h4 className="text-[10px] font-bold uppercase text-gray-400 mb-1">Detailed Description</h4>
            <p className="text-sm font-bold text-gray-600 leading-relaxed uppercase tracking-tight">
                {hotel.description || 'No description provided for this property.'}
            </p>
        </div>

        {hotel.propertyType === 'plot' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Plot Area</h4>
                    <p className="text-sm font-bold text-gray-900">{hotel.plotDetails?.plotArea || 'Not set'} {hotel.plotDetails?.unit || 'sqft'}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Dimensions</h4>
                    <p className="text-sm font-bold text-gray-900">
                        {hotel.plotDetails?.dimensions?.length && hotel.plotDetails?.dimensions?.breadth
                            ? `${hotel.plotDetails.dimensions.length} x ${hotel.plotDetails.dimensions.breadth} ft`
                            : 'Not set'}
                    </p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Facing</h4>
                    <p className="text-sm font-bold text-gray-900">{hotel.plotDetails?.facing || 'Not set'}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Land Type</h4>
                    <p className="text-sm font-bold text-gray-900">{hotel.plotDetails?.landType || 'Not set'}</p>
                </div>
            </div>
        ) : hotel.propertyType === 'buy' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Super Built-up Area</h4>
                    <p className="text-sm font-bold text-gray-900">{hotel.buyDetails?.area?.superBuiltUp || 'Not set'} {hotel.buyDetails?.area?.unit || 'sqft'}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Ownership</h4>
                    <p className="text-sm font-bold text-gray-900">{hotel.buyDetails?.ownership || 'Not set'}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Property Age</h4>
                    <p className="text-sm font-bold text-gray-900">{hotel.buyDetails?.propertyAge || 'Not set'}</p>
                </div>
            </div>
        ) : hotel.propertyType === 'rent' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Monthly Rent</h4>
                    <p className="text-sm font-bold text-gray-900">₹{hotel.rentDetails?.monthlyRent?.toLocaleString() || 'Not set'}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Maintenance</h4>
                    <p className="text-sm font-bold text-gray-900">₹{hotel.rentDetails?.maintenanceCharges?.toLocaleString() || '0'}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Type</h4>
                    <p className="text-sm font-bold text-gray-900">{hotel.rentDetails?.type || 'Not specified'}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Furnishing</h4>
                    <p className="text-sm font-bold text-gray-900">{hotel.rentDetails?.furnishing || 'Not specified'}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Tenant Preference</h4>
                    <p className="text-sm font-bold text-gray-900">{hotel.rentDetails?.tenantPreference || 'Any'}</p>
                </div>
                {hotel.rentDetails?.societyName && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Society Name</h4>
                        <p className="text-sm font-bold text-gray-900">{hotel.rentDetails.societyName}</p>
                    </div>
                )}
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Water Supply</h4>
                    <p className="text-sm font-bold text-gray-900">{hotel.rentDetails?.waterSupply || 'Not specified'}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between items-center">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500">Electricity Incl.</h4>
                    <p className="text-xs font-bold text-gray-900">{hotel.rentDetails?.electricityIncluded ? 'YES' : 'NO'}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between items-center">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500">Lift Available</h4>
                    <p className="text-xs font-bold text-gray-900">{hotel.rentDetails?.lift ? 'YES' : 'NO'}</p>
                </div>
            </div>
        ) : hotel.propertyType === 'pg' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Occupancy</h4>
                    <p className="text-sm font-bold text-gray-900">{hotel.pgDetails?.occupancy || 'Not set'}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Gender</h4>
                    <p className="text-sm font-bold text-gray-900">{hotel.pgDetails?.gender || 'Not set'}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Security Deposit</h4>
                    <p className="text-sm font-bold text-gray-900">₹{hotel.pgDetails?.securityDeposit?.toLocaleString() || '0'}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Notice Period</h4>
                    <p className="text-sm font-bold text-gray-900">{hotel.pgDetails?.noticePeriod || 'Not set'}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Min Stay</h4>
                    <p className="text-sm font-bold text-gray-900">{hotel.pgDetails?.minStay || 'Not set'}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between items-center">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500">Food Included</h4>
                    <p className="text-xs font-bold text-gray-900">
                        {typeof hotel.pgDetails?.foodIncluded === 'object'
                            ? [
                                hotel.pgDetails.foodIncluded.breakfast && 'B',
                                hotel.pgDetails.foodIncluded.lunch && 'L',
                                hotel.pgDetails.foodIncluded.dinner && 'D'
                              ].filter(Boolean).join(', ') || 'NO'
                            : hotel.pgDetails?.foodIncluded ? 'YES' : 'NO'
                        }
                    </p>
                </div>
            </div>
        ) : (
            null
        )}

        {hotel.propertyType !== 'plot' && (
            <div>
                <h3 className="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-3">Amenities</h3>
                <div className="flex flex-wrap gap-3">
                    {hotel.amenities && hotel.amenities.length > 0 ? (
                        hotel.amenities.map((amenity, i) => (
                            <div key={i} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold uppercase text-gray-700">
                                <CheckCircle size={12} className="text-green-500" />
                                {amenity.replace(/_/g, ' ')}
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-gray-400 font-bold uppercase">No amenities listed</p>
                    )}
                </div>
            </div>
        )
        }

        {
            hotel.propertyType === 'plot' && (
                <div>
                    <h3 className="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-3">Plot Features</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Boundary Marked</h4>
                            <p className="text-sm font-bold text-gray-900">{hotel.plotDetails?.boundaryMarked ? 'Yes' : 'No'}</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Electricity Available</h4>
                            <p className="text-sm font-bold text-gray-900">{hotel.plotDetails?.electricityAvailable ? 'Yes' : 'No'}</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Water Source</h4>
                            <p className="text-sm font-bold text-gray-900">{hotel.plotDetails?.waterSource || 'Not specified'}</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Road Width</h4>
                            <p className="text-sm font-bold text-gray-900">{hotel.plotDetails?.roadWidth ? `${hotel.plotDetails.roadWidth} ft` : 'Not set'}</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Approval Authority</h4>
                            <p className="text-sm font-bold text-gray-900">{hotel.plotDetails?.approvalAuthority || 'Not specified'}</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Soil Type</h4>
                            <p className="text-sm font-bold text-gray-900">{hotel.plotDetails?.soilType || 'Not specified'}</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Nearby Landmark</h4>
                            <p className="text-sm font-bold text-gray-900">{hotel.plotDetails?.nearbyLandmark || 'Not set'}</p>
                        </div>
                    </div>
                </div>
            )
        }


        {hotel.nearbyPlaces && hotel.nearbyPlaces.length > 0 && (
            <div>
                <h3 className="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-3">Nearby Places</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {hotel.nearbyPlaces.map((place, i) => (
                        <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                <MapPin size={14} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900">{place.name}</h4>
                                <p className="text-[10px] font-bold uppercase text-gray-500">
                                    {place.type} • <span className="text-emerald-600">{place.distanceKm} KM</span>
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
);

const GalleryTab = ({ hotel }) => (
    <div className="space-y-10">
        {/* Section: Property Wide Images */}
        <div>
            <div className="flex items-center gap-2 mb-4">
                <Building2 size={20} className="text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900 uppercase">General Property Photos</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {hotel.propertyImages && hotel.propertyImages.length > 0 ? (
                    hotel.propertyImages.map((img, i) => (
                        <div key={i} className="aspect-square bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 relative group shadow-sm transition-all hover:shadow-md">
                            <img src={img.url || img} alt={`Property ${i}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-10 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <p className="text-gray-400 font-bold uppercase text-xs">No General Photos</p>
                    </div>
                )}
            </div>
        </div>
    </div>
);

const DocumentsTab = ({ hotel, documents, onVerify, verifying }) => {
    const [remark, setRemark] = useState('');

    if (!documents) {
        return (
            <div className="py-20 text-center bg-white border border-gray-200 rounded-2xl">
                <ShieldCheck size={48} className="mx-auto text-gray-200 mb-4" />
                <h3 className="text-gray-900 font-bold uppercase text-sm">No Documents Submitted</h3>
                <p className="text-gray-400 text-xs mt-1">This property has not uploaded any verification documents yet.</p>
            </div>
        );
    }

    const status = documents.verificationStatus || 'pending';

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2 uppercase text-xs tracking-wider">
                        <FileText size={16} /> Document Summary
                    </h4>
                    <div className="space-y-4 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500 font-bold uppercase text-[10px]">Property</span>
                            <span className="font-bold text-gray-900">{hotel.propertyName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 font-bold uppercase text-[10px]">Property Type</span>
                            <span className="font-bold text-gray-900 capitalize">{hotel.propertyType}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 font-bold uppercase text-[10px]">Verification Status</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${status === 'verified'
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : status === 'rejected'
                                    ? 'bg-red-100 text-red-700 border border-red-200'
                                    : 'bg-amber-100 text-amber-700 border border-amber-200'
                                }`}>
                                {status === 'verified' && <ShieldCheck size={10} />}
                                {status === 'rejected' && <XCircle size={10} />}
                                {status === 'pending' && <Clock size={10} />}
                                {status}
                            </span>
                        </div>
                        {documents.verifiedAt && (
                            <div className="flex justify-between">
                                <span className="text-gray-500 font-bold uppercase text-[10px]">Last Updated</span>
                                <span className="font-bold text-gray-900">
                                    {new Date(documents.verifiedAt).toLocaleString()}
                                </span>
                            </div>
                        )}
                        {documents.adminRemark && (
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Admin Remark</p>
                                <p className="text-xs font-bold text-gray-800">{documents.adminRemark}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2 uppercase text-xs tracking-wider">
                        <ShieldCheck size={16} /> Verification Actions
                    </h4>
                    <div className="space-y-4">
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Rejection Remark</p>
                            <textarea
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                                placeholder="Optional note in case of rejection"
                                className="w-full min-h-[80px] text-xs font-bold uppercase border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-black"
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                type="button"
                                disabled={verifying || status === 'verified'}
                                onClick={() => onVerify && onVerify('approve', '')}
                                className={`flex-1 px-4 py-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2 ${status === 'verified'
                                    ? 'bg-green-100 text-green-500 border border-green-100 cursor-not-allowed'
                                    : 'bg-green-600 text-white border border-green-600 hover:bg-green-700'
                                    } ${verifying ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                <CheckCircle size={14} />
                                Approve Documents
                            </button>
                            <button
                                type="button"
                                disabled={verifying || status === 'rejected'}
                                onClick={() => onVerify && onVerify('reject', remark)}
                                className={`flex-1 px-4 py-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2 ${status === 'rejected'
                                    ? 'bg-red-100 text-red-500 border border-red-100 cursor-not-allowed'
                                    : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
                                    } ${verifying ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                <XCircle size={14} />
                                Reject Documents
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase leading-relaxed">
                            Approving documents will move the property to <span className="text-green-700">approved</span> status
                            and make it live on the platform. Rejected properties will stay hidden from users until issues are fixed.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2 uppercase text-xs tracking-wider">
                    <FileText size={16} /> Uploaded Documents
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents.documents && documents.documents.length > 0 ? (
                        documents.documents.map((doc, idx) => (
                            <div key={idx} className="border border-gray-200 rounded-xl p-4 flex flex-col justify-between bg-gray-50">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-bold text-gray-900 uppercase">
                                            {doc.name || doc.type || 'Document'}
                                        </span>
                                        {doc.isRequired && (
                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-100 text-amber-700 border border-amber-200">
                                                Required
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-400 uppercase">
                                        {doc.type || 'Uploaded File'}
                                    </p>
                                </div>
                                <div className="mt-3">
                                    {doc.fileUrl ? (
                                        <a
                                            href={doc.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 text-[10px] font-bold uppercase text-gray-700 hover:bg-gray-100"
                                        >
                                            <FileText size={12} />
                                            View File
                                        </a>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-gray-400">
                                            <AlertCircle size={11} /> No file
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-8 text-[10px] font-bold uppercase text-gray-400">
                            No individual documents uploaded
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const RoomsTab = ({ rooms }) => {
    const [expandedRoomId, setExpandedRoomId] = useState(null);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 uppercase">{rooms?.[0]?.propertyType === 'tent' || rooms?.[0]?.inventoryType === 'tent' ? 'Tent Inventory' : 'Room Inventory'}</h3>
            </div>

            <div className="space-y-4">
                {rooms && rooms.length > 0 ? (
                    rooms.map((room, i) => {
                        const isExpanded = expandedRoomId === room._id;
                        return (
                            <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                <div
                                    className="p-5 flex flex-col md:flex-row items-center gap-6 cursor-pointer"
                                    onClick={() => setExpandedRoomId(isExpanded ? null : room._id)}
                                >
                                    <div className="w-full md:w-32 h-24 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center text-gray-400 relative overflow-hidden">
                                        {room.images && room.images[0] ? (
                                            <img src={room.images[0].url || room.images[0]} alt={room.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <Bed size={32} />
                                        )}
                                    </div>
                                    <div className="flex-1 w-full text-center md:text-left">
                                        <h4 className="font-bold text-gray-900 text-lg uppercase tracking-tight">{room.name}</h4>
                                        <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2 text-[10px] font-bold uppercase text-gray-400">
                                            <span className="flex items-center gap-1"><Users size={12} /> Max {room.maxAdults} Adults, {room.maxChildren} Child</span>
                                            <span className="flex items-center gap-1"><Building2 size={12} /> {room.totalInventory} {room.inventoryType === 'tent' || room.propertyType === 'tent' ? 'Tents' : 'Rooms'} Total</span>
                                            <span className="flex items-center gap-1 text-green-600"><ShieldCheck size={12} /> {room.inventoryType}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-gray-100 pt-4 md:pt-0">
                                        <div className="text-center">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Status</p>
                                            <span className={`inline-block px-3 py-1 text-[10px] font-bold rounded-full uppercase ${room.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {room.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Price / Night</p>
                                            <p className="text-xl font-bold text-gray-900">₹{room.pricePerNight}</p>
                                        </div>
                                        <ChevronLeft
                                            size={20}
                                            className={`text-gray-400 transition-transform duration-300 ${isExpanded ? '-rotate-90' : 'rotate-0'}`}
                                        />
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="border-t border-gray-100 bg-gray-50"
                                        >
                                            <div className="p-6">
                                                {/* Details Grid */}
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                                    <div>
                                                        <h5 className="text-[10px] font-bold uppercase text-gray-500 mb-3 block">Pricing Details</h5>
                                                        <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-gray-500 font-medium">Base Price</span>
                                                                <span className="font-bold text-gray-900">₹{room.pricePerNight}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-gray-500 font-medium">Extra Adult</span>
                                                                <span className="font-bold text-gray-900">₹{room.extraAdultPrice}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-gray-500 font-medium">Extra Child</span>
                                                                <span className="font-bold text-gray-900">₹{room.extraChildPrice}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h5 className="text-[10px] font-bold uppercase text-gray-500 mb-3 block">Configuration</h5>
                                                        <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-gray-500 font-medium">Category</span>
                                                                <span className="font-bold text-gray-900 uppercase">{room.roomCategory}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-gray-500 font-medium">Inventory Type</span>
                                                                <span className="font-bold text-gray-900 uppercase">{room.inventoryType}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-gray-500 font-medium">Total Inventory</span>
                                                                <span className="font-bold text-gray-900">{room.totalInventory} Units</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h5 className="text-[10px] font-bold uppercase text-gray-500 mb-3 block">Amenities</h5>
                                                        <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-wrap gap-2">
                                                            {room.amenities.map((amenity, idx) => (
                                                                <span key={idx} className="px-2 py-1 bg-gray-50 rounded border border-gray-100 text-[10px] font-bold text-gray-600 uppercase">
                                                                    {amenity}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Room Images */}
                                                <div>
                                                    <h5 className="text-[10px] font-bold uppercase text-gray-500 mb-3 block">{room.inventoryType === 'tent' || room.propertyType === 'tent' ? 'Tent Photos' : 'Room Photos'}</h5>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        {room.images && room.images.map((img, idx) => (
                                                            <div key={idx} className="aspect-video bg-gray-200 rounded-lg overflow-hidden border border-gray-200 group relative">
                                                                <img
                                                                    src={img.url || img}
                                                                    alt={`${room.name} ${idx}`}
                                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-10 text-center text-gray-400 font-bold uppercase text-xs">No room data available</div>
                )}
            </div>
        </div>
    );
};

const BookingsTab = ({ bookings, propertyType }) => (
    <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-80">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search Guest Name..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold uppercase outline-none focus:ring-1 focus:ring-black"
                />
            </div>
            <div className="flex items-center gap-4">
                <div className="text-[10px] font-bold uppercase text-gray-500">
                    Total: <span className="font-bold text-gray-900">{bookings?.length || 0} {propertyType === 'rent' ? 'Rent Records' : 'Bookings'}</span>
                </div>
            </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 uppercase text-[10px] font-bold tracking-wider text-gray-500">
                    <tr>
                        <th className="p-4 font-bold text-gray-600">{propertyType === 'rent' ? 'Record ID' : 'Booking ID'}</th>
                        <th className="p-4 font-bold text-gray-600">Status</th>
                        <th className="p-4 font-bold text-gray-600 text-right">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {bookings && bookings.length > 0 ? (
                        bookings.map((b, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                                <td className="p-4 font-mono text-xs text-gray-500">#{b.bookingId || b._id.slice(-6)}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                        b.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                            b.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                                'bg-amber-100 text-amber-700'
                                        }`}>
                                        {b.status}
                                    </span>
                                </td>
                                <td className="p-4 text-right font-bold">₹{b.totalAmount?.toLocaleString()}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="5" className="p-8 text-center text-gray-400 font-bold uppercase text-xs">No bookings found</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

// --- Main Page Component ---

const AdminHotelDetail = () => {
    const { id } = useParams();
    const [hotel, setHotel] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [documents, setDocuments] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: () => { } });
    const [verifying, setVerifying] = useState(false);

    const fetchHotelDetails = useCallback(async () => {
        try {
            setLoading(true);
            const data = await adminService.getHotelDetails(id);
            if (data.success) {
                setHotel(data.hotel);
                setBookings(data.bookings || []);
                setDocuments(data.documents || null);
            }
        } catch (error) {
            console.error('Error fetching hotel details:', error);
            toast.error('Failed to load hotel information');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchHotelDetails();
    }, [fetchHotelDetails]);

    const handleVerifyDocuments = (action, remark) => {
        if (!hotel) return;

        const isApprove = action === 'approve';

        setModalConfig({
            isOpen: true,
            title: isApprove ? 'Approve Property Documents?' : 'Reject Property Documents?',
            message: isApprove
                ? 'This will mark all submitted documents as verified and move the property to approved status.'
                : 'This will reject the submitted documents and keep the property hidden from users.',
            type: isApprove ? 'success' : 'danger',
            confirmText: isApprove ? 'Approve' : 'Reject',
            onConfirm: async () => {
                try {
                    setVerifying(true);
                    const res = await adminService.verifyPropertyDocuments(hotel._id, action, remark);
                    if (res.success) {
                        toast.success(isApprove ? 'Documents approved successfully' : 'Documents rejected successfully');
                        setHotel(res.property);
                        setDocuments(res.documents);
                    }
                } catch {
                    toast.error('Failed to update document verification');
                } finally {
                    setVerifying(false);
                }
            }
        });
    };

    const handleStatusToggle = async () => {
        const isSuspended = hotel.status === 'suspended';
        const newStatus = isSuspended ? 'approved' : 'suspended';
        setModalConfig({
            isOpen: true,
            title: isSuspended ? 'Activate Hotel?' : 'Suspend Hotel?',
            message: isSuspended
                ? `Hotel "${hotel.propertyName}" will be able to receive bookings again.`
                : `Suspending "${hotel.propertyName}" will prevent it from receiving new bookings.`,
            type: isSuspended ? 'success' : 'danger',
            confirmText: isSuspended ? 'Activate' : 'Suspend',
            onConfirm: async () => {
                try {
                    const res = await adminService.updateHotelStatus(hotel._id, newStatus);
                    if (res.success) {
                        toast.success(`Hotel ${isSuspended ? 'activated' : 'suspended'} successfully`);
                        fetchHotelDetails();
                    }
                } catch {
                    toast.error('Failed to update hotel status');
                }
            }
        });
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <Loader2 className="animate-spin text-gray-400" size={48} />
            <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Loading property details...</p>
        </div>
    );

    if (!hotel) return (
        <div className="text-center py-20">
            <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Property Not Found</h2>
            <Link to="/admin/properties" className="mt-6 inline-block text-black font-bold uppercase text-xs border-b-2 border-black pb-1">Back to Properties</Link>
        </div>
    );

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Building2 },
        { id: 'gallery', label: 'Full Gallery', icon: ImageIcon },
        { id: 'documents', label: 'KYC Documents', icon: ShieldCheck },
        ...(hotel?.propertyType !== 'plot' && hotel?.propertyType !== 'buy' ? [
            ...(hotel?.propertyType !== 'rent' ? [{ id: 'rooms', label: hotel?.propertyType === 'tent' ? 'Tents & Pricing' : 'Rooms & Pricing', icon: Bed }] : []),
            { id: 'bookings', label: hotel?.propertyType === 'rent' ? 'Rent History' : 'Booking History', icon: Calendar },
        ] : [])
    ];

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-10">
            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                {...modalConfig}
            />

            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-500 mb-2">
                <Link to="/admin/properties" className="hover:text-black transition-colors">Properties</Link>
                <span>/</span>
                <span className="text-black font-bold">{hotel.propertyName}</span>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-xl bg-gray-100 shadow-inner flex items-center justify-center shrink-0 overflow-hidden border border-gray-200">
                        {hotel.coverImage || (hotel.propertyImages && hotel.propertyImages[0]) ? (
                            <img src={hotel.coverImage || (hotel.propertyImages && hotel.propertyImages[0].url) || (hotel.propertyImages && hotel.propertyImages[0])} alt="Hotel" className="w-full h-full object-cover" />
                        ) : (
                            <Building2 size={32} className="text-gray-300" />
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">{hotel.propertyName}</h1>
                            {hotel.status === 'suspended' ? (
                                <span className="px-2.5 py-0.5 bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold rounded-full flex items-center uppercase">
                                    <Ban size={10} className="mr-1" /> SUSPENDED
                                </span>
                            ) : (
                                <span className={`px-2.5 py-0.5 border text-[10px] font-bold rounded-full flex items-center uppercase ${hotel.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                                    {hotel.status === 'approved' ? <CheckCircle size={10} className="mr-1" /> : <Clock size={10} className="mr-1" />}
                                    {hotel.status}
                                </span>
                            )}
                        </div>
                        <p className="text-gray-500 text-[10px] font-bold uppercase mt-1 flex items-center">
                            <MapPin size={12} className="mr-1 text-gray-400" /> {hotel.address?.city}, {hotel.address?.state}
                            <span className="mx-2 text-gray-300">|</span>
                            Owner: {hotel.partnerId?.name || 'N/A'}
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <button
                        onClick={handleStatusToggle}
                        className={`flex-1 md:flex-none px-4 py-2 border rounded-lg text-[10px] font-bold uppercase transition-colors ${hotel.status === 'suspended'
                            ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                            : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                            }`}
                    >
                        {hotel.status === 'suspended' ? 'Activate' : 'Suspend'}
                    </button>

                </div>
            </div>

            <div className="flex border-b border-gray-200 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-4 text-[10px] font-bold uppercase transition-colors relative whitespace-nowrap ${activeTab === tab.id ? 'text-black' : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="activeTabBadge"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"
                            />
                        )}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === 'overview' && <OverviewTab hotel={hotel} />}
                    {activeTab === 'gallery' && <GalleryTab hotel={hotel} />}
                    {activeTab === 'documents' && (
                        <DocumentsTab
                            hotel={hotel}
                            documents={documents}
                            onVerify={handleVerifyDocuments}
                            verifying={verifying}
                        />
                    )}
                    {activeTab === 'rooms' && <RoomsTab rooms={hotel.rooms} />}
                    {activeTab === 'bookings' && <BookingsTab bookings={bookings} propertyType={hotel?.propertyType} />}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default AdminHotelDetail;
