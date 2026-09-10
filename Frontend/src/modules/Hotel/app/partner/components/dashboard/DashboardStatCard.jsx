
import React from 'react';

const DashboardStatCard = ({ icon: Icon, label, value, subtext, actionLabel, onAction, colorClass = "text-[#005CA8]" }) => {
  return (
    <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-full transition-transform hover:scale-[1.01]">
      <div className="flex justify-between items-start mb-1 sm:mb-2">
        <div className={`p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-gray-50 text-gray-700`}>
          <Icon size={16} className={`sm:w-5 sm:h-5 ${colorClass}`} />
        </div>
        {actionLabel && (
          <button
            onClick={onAction}
            className="text-[9px] sm:text-xs font-semibold text-[#005CA8] hover:text-[#004b8a] hover:underline whitespace-nowrap ml-1"
          >
            {actionLabel}
          </button>
        )}
      </div>
      <div>
        <h3 className="text-base sm:text-2xl font-bold text-gray-900 leading-tight">{value}</h3>
        <p className="text-[10px] sm:text-sm text-gray-500 font-medium truncate leading-tight mt-0.5">{label}</p>

        {/* Subtext shown conditionally or very small */}
        {subtext && (
          <p className="hidden sm:block text-[9px] sm:text-xs text-emerald-600 font-medium mt-1 truncate">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
};

export default DashboardStatCard;
