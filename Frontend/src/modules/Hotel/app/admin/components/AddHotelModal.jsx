import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, User, Mail, MapPin, Loader2 } from 'lucide-react';

const AddHotelModal = ({ isOpen, onClose }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        owner: '',
        email: '',
        location: '',
        phone: ''
    });

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsLoading(true);

        // Simulate API Call
        setTimeout(() => {
            setIsLoading(false);
            onClose();
            // In a real app, this would trigger a refresh of the hotel list or show a toast
            alert(`New Hotel "${formData.name}" added successfully!`);
            setFormData({ name: '', owner: '', email: '', location: '', phone: '' });
        }, 1500);
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden"
                >
                    <div className="flex justify-between items-center p-6 border-b border-neutral-100">
                        <h3 className="text-lg font-medium text-neutral-900">Onboard new hotel</h3>
                        <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full text-neutral-500 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Hotel name</label>
                                <div className="relative">
                                    <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Grand palace hotel"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 sm:text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-1">Owner name</label>
                                    <div className="relative">
                                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                                        <input
                                            type="text"
                                            required
                                            placeholder="John doe"
                                            value={formData.owner}
                                            onChange={e => setFormData({ ...formData, owner: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 sm:text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-1">Phone</label>
                                    <div className="relative">
                                        <input
                                            type="tel"
                                            required
                                            placeholder="+91 98xxx xxxxx"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full px-4 py-2 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 sm:text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Owner email</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                                    <input
                                        type="email"
                                        required
                                        placeholder="owner@example.com"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 sm:text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Location / address</label>
                                <div className="relative">
                                    <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                                    <input
                                        type="text"
                                        required
                                        placeholder="Street, city, zip code"
                                        value={formData.location}
                                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 sm:text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 border border-neutral-200 rounded-lg text-neutral-700 font-medium hover:bg-neutral-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex-1 px-4 py-2 bg-neutral-900 text-white font-medium rounded-lg transition-colors hover:bg-neutral-800 disabled:opacity-70 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Create account'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default AddHotelModal;
