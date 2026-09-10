export const InclusionsGrid = ({ includes = [], exclusions = [] }) => {
  return (
    <div className="space-y-4">
      {/* What is Included */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-2.5">
        <h3 className="font-montserrat font-bold text-sm text-gray-900 flex items-center gap-2">
          <i className="fa-solid fa-circle-check text-emerald-600"></i>
          <span>What's Included in Package</span>
        </h3>

        <div className="space-y-2">
          {includes.map((inc) => (
            <div
              key={inc.id}
              className="flex items-start gap-2.5 p-2 bg-[#FAF6ED] rounded-xl border border-[#E5DDC3]/60 text-xs text-gray-800"
            >
              <i className="fa-solid fa-check text-emerald-700 text-xs mt-0.5 shrink-0"></i>
              <span className="font-medium leading-relaxed">{inc.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* What is Not Included */}
      {exclusions.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-2.5">
          <h3 className="font-montserrat font-bold text-sm text-gray-900 flex items-center gap-2">
            <i className="fa-solid fa-circle-xmark text-red-500"></i>
            <span>Exclusions</span>
          </h3>

          <div className="space-y-1.5">
            {exclusions.map((exc, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                <i className="fa-solid fa-xmark text-red-400 text-xs mt-0.5 shrink-0"></i>
                <span className="leading-relaxed">{exc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
