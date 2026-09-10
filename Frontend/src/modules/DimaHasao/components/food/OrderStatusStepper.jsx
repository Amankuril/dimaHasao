import { motion } from 'framer-motion';

export const OrderStatusStepper = ({ currentStep = 2 }) => {
  const steps = [
    { id: 1, label: 'Placed', sub: 'Received', icon: 'fa-solid fa-receipt' },
    { id: 2, label: 'Preparing', sub: 'In Kitchen', icon: 'fa-solid fa-kitchen-set' },
    { id: 3, label: 'On the Way', sub: 'With Driver', icon: 'fa-solid fa-motorcycle' },
    { id: 4, label: 'Delivered', sub: 'Enjoy Meal', icon: 'fa-solid fa-circle-check' }
  ];

  return (
    <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-3">
      <div className="flex justify-between items-center text-xs">
        <span className="font-bold text-gray-900 font-montserrat">Live Order Status</span>
        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold text-[10px] border border-emerald-200 animate-pulse">
          ● Preparing Fresh
        </span>
      </div>

      {/* Visual Stepper */}
      <div className="relative flex justify-between items-center px-2 py-2">
        {/* Background Bar */}
        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-gray-200 z-0" />
        
        {/* Active Progress Bar */}
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute left-6 top-1/2 -translate-y-1/2 h-1 bg-emerald-700 z-0 max-w-[calc(100%-48px)]"
        />

        {steps.map((step) => {
          const isDone = step.id < currentStep;
          const isCurrent = step.id === currentStep;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all shadow-xs ${
                  isDone
                    ? 'bg-emerald-700 text-white'
                    : isCurrent
                    ? 'bg-[#06381e] text-amber-300 ring-4 ring-emerald-500/20 scale-110'
                    : 'bg-gray-100 text-gray-400 border border-gray-200'
                }`}
              >
                <i className={`${step.icon} text-[11px]`}></i>
              </div>
              <span
                className={`text-[9.5px] font-bold mt-1 text-center leading-tight ${
                  isCurrent ? 'text-emerald-900' : isDone ? 'text-gray-700' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
