import React from 'react';
import { motion } from 'framer-motion';

const TABS = [
    { id: 'buy', label: 'Buy', color: '#eff6ff', gradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' }, // Soft Blue
    { id: 'rent', label: 'Rent', color: '#f0fdf4', gradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' }, // Light Green
    { id: 'plot', label: 'Plot', color: '#fff7ed', gradient: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)' }, // Pale Orange
];

const PurposeSelector = ({ selectedPurpose, onSelectPurpose }) => {
    return (
        <div className="flex items-center p-1 bg-gray-100/50 backdrop-blur-sm rounded-full w-fit mx-auto mb-4 border border-white/20 shadow-sm relative overflow-hidden">
            {/* Sliding Pill Indicator */}
            <motion.div
                layoutId="purposeIndicator"
                className="absolute inset-y-1 bg-white rounded-full shadow-md z-0"
                initial={false}
                animate={{
                    left: selectedPurpose === 'buy' ? '4px' : selectedPurpose === 'rent' ? '33.3%' : '66.6%',
                    width: '32%',
                }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />

            {TABS.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onSelectPurpose(tab.id)}
                    className={`
            relative z-10 px-6 py-2 text-sm font-bold transition-colors
            ${selectedPurpose === tab.id ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}
          `}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
};

export default PurposeSelector;
export { TABS as PURPOSE_TABS };
