import React, { useEffect, useRef, useState } from 'react';
import { hasRestaurantProfile, setActiveWorkspace } from '@/shared/partner/partnerSession';
import { User, Mail, Phone, MapPin, Edit, Save, Camera, CreditCard , Store } from 'lucide-react';
import gsap from 'gsap';
import usePartnerStore from '../store/partnerStore';
import { userService, authService, hotelService } from '../../../services/apiService';
import PartnerHeader from '../components/PartnerHeader';
import { isFlutterApp, openFlutterCamera, uploadBase64Image } from '../../../utils/flutterBridge';
import { getPartnerUser } from '../../../utils/partnerAuth';

const Field = ({ label, value, icon: Icon, isEditing, onChange }) => (
    <div className="mb-6 group">
        <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">{label}</label>
        </div>
        <div className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${isEditing ? 'bg-white border-[#005CA8] ring-4 ring-[#005CA8]/10 shadow-inner' : 'bg-gray-50/50 border-gray-100 hover:border-gray-200'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isEditing ? 'bg-[#005CA8] text-white' : 'bg-white text-gray-400 shadow-sm'}`}>
                <Icon size={18} />
            </div>
            {isEditing ? (
                <input
                    type="text"
                    value={value}
                    onChange={onChange}
                    className="flex-1 bg-transparent text-sm font-bold text-slate-900 focus:outline-none placeholder:text-gray-300"
                    placeholder={`Enter ${label}`}
                />
            ) : (
                <span className="flex-1 text-sm font-bold text-slate-900">{value || 'Not set'}</span>
            )}
        </div>
    </div>
);

const PartnerProfile = () => {
    const { formData } = usePartnerStore();
    const [isEditing, setIsEditing] = useState(false);
    const containerRef = useRef(null);
    const [approvalStatus, setApprovalStatus] = useState('pending');
    const [memberSince, setMemberSince] = useState('');
    const [partnerId, setPartnerId] = useState('');
    const [profile, setProfile] = useState({
        name: formData?.propertyName || '',
        email: '',
        phone: '',
        address: '',
        role: 'partner',
        aadhaarNumber: '',
        panNumber: '',
        profileImage: '',
        profileImagePublicId: ''
    });
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        gsap.fromTo(containerRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' });
    }, []);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await userService.getProfile();
                const addr = data.address || {};
                const addrStr = [addr.street, addr.city, addr.state].filter(Boolean).join(', ');
                setProfile({
                    name: data.name || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    address: addrStr,
                    role: data.role || 'partner',
                    aadhaarNumber: data.aadhaarNumber || '',
                    panNumber: data.panNumber || '',
                    profileImage: data.profileImage || '',
                    profileImagePublicId: data.profileImagePublicId || ''
                });
                setApprovalStatus(data.partnerApprovalStatus || 'pending');
                setMemberSince(data.createdAt || data.partnerSince || '');
                setPartnerId(data._id || '');
            } catch {
                console.error('Failed to load partner profile');
                setProfile((p) => ({
                    ...p,
                    name: p.name || 'Partner',
                    role: 'partner'
                }));
            }
        };
        fetchProfile();
    }, []);

    const handleChange = (field, e) => {
        setProfile({ ...profile, [field]: e.target.value });
    };

    const parseAddress = (str) => {
        const parts = (str || '').split(',').map(s => s.trim()).filter(Boolean);
        return {
            street: parts[0] || '',
            city: parts[1] || '',
            state: parts[2] || '',
            zipCode: '',
            country: 'India'
        };
    };

    const handleToggleEdit = async () => {
        if (isEditing) {
            const addressObj = parseAddress(profile.address);
            try {
                const res = await authService.updateProfile({
                    name: profile.name,
                    email: profile.email,
                    phone: profile.phone,
                    address: addressObj
                });
                const updated = res.user || {};
                const addr = updated.address || addressObj;
                const addrStr = [addr.street, addr.city, addr.state].filter(Boolean).join(', ');
                setProfile({
                    ...profile,
                    name: updated.name || profile.name,
                    email: updated.email || profile.email,
                    phone: updated.phone || profile.phone,
                    address: addrStr,
                    role: updated.role || profile.role,
                    profileImage: updated.profileImage || profile.profileImage,
                    profileImagePublicId: updated.profileImagePublicId || profile.profileImagePublicId
                });

                // Sync with localStorage
                const user = (getPartnerUser() || {});
                const updatedUser = { ...user, ...updated };
                localStorage.setItem('user', JSON.stringify(updatedUser));

                setIsEditing(false);
            } catch {
                setIsEditing(false);
            }
        } else {
            setIsEditing(true);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('images', file);

            const res = await hotelService.uploadImages(formData);
            if (res.files && res.files.length > 0) {
                const newUrl = res.files[0].url;
                const newPublicId = res.files[0].publicId;
                await updateProfileImage(newUrl, newPublicId);
            }
        } catch (err) {
            console.error('Image upload failed:', err);
        } finally {
            setUploading(false);
        }
    };

    const handleCameraCapture = async () => {
        try {
            setUploading(true);
            const cameraResult = await openFlutterCamera();

            if (!cameraResult.success || !cameraResult.base64) {
                throw new Error('Camera capture failed');
            }

            const uploadResult = await uploadBase64Image(
                cameraResult.base64,
                cameraResult.mimeType,
                cameraResult.fileName
            );

            if (uploadResult.success && uploadResult.files && uploadResult.files.length > 0) {
                const newUrl = uploadResult.files[0].url;
                const newPublicId = uploadResult.files[0].publicId;
                await updateProfileImage(newUrl, newPublicId);
            }
        } catch (err) {
            console.error('Camera upload failed:', err);
        } finally {
            setUploading(false);
        }
    };

    const updateProfileImage = async (newUrl, newPublicId) => {
        // Update Profile with new image
        const updateRes = await authService.updateProfile({
            profileImage: newUrl,
            profileImagePublicId: newPublicId
        });

        if (updateRes.success) {
            setProfile(prev => ({
                ...prev,
                profileImage: newUrl,
                profileImagePublicId: newPublicId
            }));

            // Sync with localStorage
            const user = (getPartnerUser() || {});
            const updatedUser = { ...user, profileImage: newUrl, profileImagePublicId: newPublicId };
            localStorage.setItem('user', JSON.stringify(updatedUser));
        }
    };

    const statusLabel = approvalStatus === 'approved' ? 'Verified Partner' : approvalStatus === 'rejected' ? 'Rejected' : 'Pending Approval';
    const statusClass = approvalStatus === 'approved' ? 'text-green-600 bg-green-50' : approvalStatus === 'rejected' ? 'text-red-600 bg-red-50' : 'text-orange-600 bg-orange-50';

    /*
     * The restaurant wizard prefills its owner phone from the pending-phone
     * entry, which a hotel-only partner has never had set. Seed it from the
     * signed-in partner so they are not asked to retype the number they just
     * verified.
     */
    const startRestaurantOnboarding = () => {
        const phone = String(profile?.phone || getPartnerUser()?.phone || '').replace(/\D/g, '').slice(-10);
        if (phone) localStorage.setItem('restaurant_pendingPhone', phone);
        setActiveWorkspace('restaurant');
        window.location.assign('/food/restaurant/onboarding');
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Custom Header */}
            <PartnerHeader />

            <main ref={containerRef} className="max-w-xl mx-auto px-4 pt-8">

                {/* Avatar Section */}
                <div className="text-center mb-10 relative">
                    <div className="relative inline-block">
                        <div className="w-28 h-28 bg-[#005CA8] text-white rounded-full flex items-center justify-center text-4xl font-black mx-auto shadow-2xl shadow-[#005CA8]/30 relative border-4 border-white overflow-hidden bg-gradient-to-br from-[#005CA8] to-[#006BC4]">
                            {uploading ? (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                                    <span className="text-[10px] uppercase font-bold tracking-tighter">Saving...</span>
                                </div>
                            ) : profile.profileImage ? (
                                <img src={profile.profileImage} className="w-full h-full object-cover" alt="Profile" />
                            ) : (
                                (profile.name || 'P').substring(0, 2).toUpperCase()
                            )}
                        </div>

                        {/* Permanent Camera Button */}
                        <button
                            onClick={() => isFlutterApp() ? handleCameraCapture() : fileInputRef.current?.click()}
                            disabled={uploading}
                            className="absolute bottom-1 right-1 w-9 h-9 bg-white text-[#005CA8] rounded-full flex items-center justify-center shadow-lg border border-gray-100 hover:scale-110 active:scale-95 transition-all z-10"
                        >
                            <Camera size={18} />
                        </button>
                    </div>

                    {/* Hidden File Input (Only for Web) */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        className="hidden"
                        accept="image/*"
                    />

                    <div className="mt-4">
                        <h2 className="text-2xl font-black text-slate-900">{profile.name || 'Partner'}</h2>
                        <div className="flex items-center justify-center gap-2 mt-1.5">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${statusClass}`}>
                                {statusLabel}
                            </span>
                        </div>
                    </div>
                </div>

                {/*
                  * One sign-in covers both partner businesses, so offer the
                  * other one to a partner who does not run it yet.
                  */}
                {!hasRestaurantProfile() && (
                    <button
                        type="button"
                        onClick={startRestaurantOnboarding}
                        className="w-full mb-6 flex items-center gap-4 bg-white p-5 rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 text-left active:scale-[0.99] transition-all"
                    >
                        <span className="w-12 h-12 shrink-0 rounded-2xl bg-[#005CA8]/10 text-[#005CA8] flex items-center justify-center">
                            <Store size={22} />
                        </span>
                        <span className="min-w-0">
                            <span className="block text-sm font-black text-slate-900">Also list a restaurant</span>
                            <span className="block text-xs text-gray-500">Run it from this same sign-in</span>
                        </span>
                    </button>
                )}

                {/* Details Form Card */}
                <div className="bg-white p-6 pb-10 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 mb-6 transition-all duration-500">
                    <div className="flex items-center justify-between mb-10 pb-4 border-b border-gray-50">
                        <div>
                            <p className="text-[10px] text-[#005CA8] font-black uppercase tracking-[0.2em] mb-1">Account & Settings</p>
                            <h3 className="text-xl font-black text-slate-900">Personal Profile</h3>
                        </div>
                        <button
                            onClick={handleToggleEdit}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all shadow-lg active:scale-95 ${isEditing
                                ? 'bg-[#005CA8] text-white shadow-[#005CA8]/20 hover:bg-[#004b8a]'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            {isEditing ? <><Save size={16} /> Save</> : <><Edit size={16} /> Edit Profile</>}
                        </button>
                    </div>

                    <Field
                        label="Full Name"
                        value={profile.name}
                        icon={User}
                        isEditing={isEditing}
                        onChange={(e) => handleChange('name', e)}
                    />
                    <Field
                        label="Email Address"
                        value={profile.email}
                        icon={Mail}
                        isEditing={isEditing}
                        onChange={(e) => handleChange('email', e)}
                    />
                    <Field
                        label="Phone Number"
                        value={profile.phone}
                        icon={Phone}
                        isEditing={isEditing}
                        onChange={(e) => handleChange('phone', e)}
                    />
                    <Field
                        label="Address"
                        value={profile.address}
                        icon={MapPin}
                        isEditing={isEditing}
                        onChange={(e) => handleChange('address', e)}
                    />

                    {/* Non-Editable Fields */}
                    <Field
                        label="Aadhaar Number"
                        value={profile.aadhaarNumber}
                        icon={CreditCard}
                        isEditing={false} // Always read-only
                        onChange={() => { }}
                    />
                    <Field
                        label="PAN Number"
                        value={profile.panNumber}
                        icon={CreditCard}
                        isEditing={false} // Always read-only
                        onChange={() => { }}
                    />
                </div>

                <div className="mt-8 text-center text-xs text-gray-400">
                    <p className="font-bold tracking-widest uppercase text-[10px]">Member since {memberSince ? new Date(memberSince).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—'}</p>
                </div>

            </main >
        </div >
    );
};

export default PartnerProfile;
