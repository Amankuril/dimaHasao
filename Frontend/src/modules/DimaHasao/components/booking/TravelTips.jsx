import { TRAVEL_TIPS_DATA } from '../../data/tourismData';

export const TravelTips = () => {
  return (
    <section className="bg-[#F1EBD7] rounded-2xl p-4 shadow-sm border border-[#E5DDC3]">
      <h3 className="font-bold text-sm sm:text-base mb-3 text-gray-900 flex items-center gap-2">
        <i className="fa-solid fa-compass text-amber-600"></i>
        <span>Travel Tips</span>
      </h3>
      <div className="grid grid-cols-2 gap-y-3.5 gap-x-3 text-xs">
        {TRAVEL_TIPS_DATA.map((tip, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <i className={`${tip.icon} ${tip.color} text-sm w-4 shrink-0 text-center mt-0.5`}></i>
            <p className="leading-tight text-gray-700 text-[11px]">{tip.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
};
