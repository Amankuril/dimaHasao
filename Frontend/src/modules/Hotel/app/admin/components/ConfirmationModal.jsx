import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, type = 'danger', confirmText = 'Confirm' }) => {
    if (!isOpen) return null;

    const colors = {
        danger: { bg: 'bg-red-50', icon: 'text-red-600', button: 'bg-red-600 hover:bg-red-700' },
        success: { bg: 'bg-green-50', icon: 'text-green-600', button: 'bg-green-600 hover:bg-green-700' },
        warning: { bg: 'bg-amber-50', icon: 'text-amber-600', button: 'bg-amber-600 hover:bg-amber-700' },
    };

    const style = colors[type];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden"
                >
                    <div className="p-6 text-center">
                        <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${style.bg}`}>
                            {type === 'success' ? <CheckCircle className={style.icon} size={24} /> : <AlertTriangle className={style.icon} size={24} />}
                        </div>
                        <h3 className="text-lg font-medium text-neutral-900 mb-2">{title}</h3>
                        <p className="text-sm text-neutral-500 mb-6">{message}</p>

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2 border border-neutral-200 rounded-lg text-neutral-700 font-medium hover:bg-neutral-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => { onConfirm(); onClose(); }}
                                className={`flex-1 px-4 py-2 text-white font-medium rounded-lg transition-colors shadow-sm ${style.button}`}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ConfirmationModal;
