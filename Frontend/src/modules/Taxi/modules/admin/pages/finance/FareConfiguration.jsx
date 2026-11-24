import React, { useState } from 'react';
import { 
  Save, 
  MapPin, 
  TrendingUp, 
  Clock, 
  Car, 
  Bike, 
  Truck, 
  Info, 
  AlertTriangle,
  History,
  ChevronDown,
  Layers,
  Settings,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

const VehiclePriceCard = ({ type, icon: Icon, base, perKm, commission, isActive, onClick }) => (
  <div 
    onClick={onClick}
    className={`p-4 rounded-2xl border transition-colors cursor-pointer flex flex-col justify-between h-32 ${
      isActive 
        ? 'bg-[#0F172A] border-transparent text-white shadow-xl shadow-neutral-200' 
        : 'bg-white border-neutral-100 text-neutral-900 hover:border-neutral-300'
    }`}
  >
    <div className="flex items-center justify-between">
       <div className={`p-2 rounded-lg ${isActive ? 'bg-white/10' : 'bg-neutral-50 text-neutral-500'}`}>
         <Icon size={20} />
       </div>
       {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>}
    </div>
    <div>
       <p className={`text-xs font-medium   leading-none mb-1.5 ${isActive ? 'text-neutral-500' : 'text-neutral-500'}`}>{type}</p>
       <div className="flex items-center justify-between">
          <span className="text-[14px] font-medium">₹{base} Base</span>
          <span className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-neutral-500'}`}>₹{perKm}/km</span>
       </div>
    </div>
  </div>
);

const FareConfiguration = () => {
  const [selectedCity, setSelectedCity] = useState('Indore');
  const [selectedVehicle, setSelectedVehicle] = useState('Economy');
  
  const vehicleTypes = [
    { type: 'Economy', icon: Car, base: 50, perKm: 12, commission: 15 },
    { type: 'Luxury', icon: Car, base: 120, perKm: 25, commission: 20 },
    { type: 'Bike', icon: Bike, base: 20, perKm: 6, commission: 10 },
    { type: 'Auto', icon: Car, base: 30, perKm: 10, commission: 15 },
    { type: 'Truck', icon: Truck, base: 250, perKm: 45, commission: 12 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-6xl mx-auto pb-20">
      {/* Header & City Selector */}
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-neutral-50">
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-2 cursor-pointer group">
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><MapPin size={20} /></div>
              <div>
                 <p className="text-xs text-neutral-500 leading-none mb-1">Operational city</p>
                 <div className="flex items-center gap-1">
                    <span className="text-xl font-medium text-neutral-900">{selectedCity}</span>
                    <ChevronDown size={14} className="text-neutral-500" />
                 </div>
              </div>
           </div>
           
           <div className="h-10 w-px bg-neutral-100"></div>

           <div className="flex items-center gap-2">
              <div className="p-2.5 bg-neutral-50 rounded-xl text-neutral-500"><Layers size={20} /></div>
              <div>
                 <p className="text-xs text-neutral-500 leading-none mb-1">Fare tier</p>
                 <span className="text-sm font-medium text-neutral-700">Standard pricing</span>
              </div>
           </div>
        </div>

        <div className="flex gap-3">
           <button className="bg-neutral-50 border border-neutral-200 text-neutral-600 px-6 py-2.5 rounded-xl text-[13px] font-medium hover:bg-neutral-100 transition-colors flex items-center gap-2">
             <History size={18} /> View history
           </button>
           <button className="bg-neutral-900 text-white px-8 py-2.5 rounded-xl text-[13px] font-medium hover:opacity-90 transition-colors shadow-xl shadow-black/10 flex items-center gap-2">
             <Save size={18} /> Updating pricing
           </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
         {/* Left Side: Vehicle Type & Basic Configuration */}
         <div className="space-y-6">
            <h4 className="text-xs text-neutral-500 ml-1">Select vehicle category</h4>
            <div className="grid grid-cols-2 gap-3">
               {vehicleTypes.map((v, idx) => (
                  <VehiclePriceCard 
                    key={idx} 
                    {...v} 
                    isActive={selectedVehicle === v.type}
                    onClick={() => setSelectedVehicle(v.type)}
                  />
               ))}
            </div>

            <div className="bg-orange-50 border border-orange-100 p-6 rounded-2xl space-y-3">
               <div className="flex items-center gap-2 text-orange-600">
                  <AlertTriangle size={18} />
                  <span className="text-[13px] font-medium">Live pricing warning</span>
               </div>
               <p className="text-[12px] font-medium text-orange-800 leading-relaxed">
                  Changes made to {selectedVehicle} pricing will affect all ongoing booking calculations in {selectedCity} immediately after saving.
               </p>
            </div>
         </div>

         {/* Right Side: Detailed Input Grid */}
         <div className="col-span-2 space-y-6 bg-white rounded-xl border border-neutral-900/[0.08] p-8">
            <div className="flex items-center justify-between mb-2">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-neutral-100 text-neutral-500"><Settings size={20} /></div>
                  <h3 className="text-xl font-medium text-neutral-900">Pricing Engine: {selectedVehicle}</h3>
               </div>
               <span className="text-xs font-medium text-green-500 bg-green-50 px-2 py-1 rounded">Latest update: today, 10:00 AM</span>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-8 mt-10">
               {/* Base Fare Group */}
               <div className="space-y-4">
                  <div>
                    <label className="text-xs text-neutral-500 flex items-center gap-1.5 mb-2.5">
                       Base fare amount <Info size={12} className="text-neutral-300" />
                    </label>
                    <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">₹</span>
                       <input type="number" defaultValue="50" className="w-full bg-neutral-50 border-none rounded-2xl py-3.5 pl-10 pr-4 text-[15px] font-medium text-neutral-900 focus:ring-1 focus:ring-primary/20" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 mb-2.5 block">Included Distance (KM)</label>
                    <div className="relative">
                       <input type="number" defaultValue="2" className="w-full bg-neutral-50 border-none rounded-2xl py-3.5 px-4 text-[15px] font-medium text-neutral-900 focus:ring-1 focus:ring-primary/20" />
                       <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 text-[12px]">KM</span>
                    </div>
                  </div>
               </div>

               {/* Unit Rates Group */}
               <div className="space-y-4">
                  <div>
                    <label className="text-xs text-neutral-500 mb-2.5 block">Price per kilometre</label>
                    <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">₹</span>
                       <input type="number" defaultValue="14" className="w-full bg-neutral-50 border-none rounded-2xl py-3.5 pl-10 pr-4 text-[15px] font-medium text-neutral-900 focus:ring-1 focus:ring-primary/20" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 mb-2.5 block">Price Per Minute (Wait Time)</label>
                    <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">₹</span>
                       <input type="number" defaultValue="2" className="w-full bg-neutral-50 border-none rounded-2xl py-3.5 pl-10 pr-4 text-[15px] font-medium text-neutral-900 focus:ring-1 focus:ring-primary/20" />
                    </div>
                  </div>
               </div>

               {/* Commission & Cancellations */}
               <div className="space-y-4">
                  <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10">
                    <label className="text-xs font-medium text-primary mb-2.5 block">Admin Commission (%)</label>
                    <div className="relative">
                       <input type="number" defaultValue="15" className="w-full bg-white border border-primary/20 rounded-xl py-2 px-4 text-[18px] font-medium text-primary focus:ring-0" />
                       <span className="absolute right-4 top-1/2 -translate-y-1/2 text-primary font-medium">%</span>
                    </div>
                  </div>
               </div>

               {/* Surge Settings Visual */}
               <div className="bg-neutral-50 p-6 rounded-2xl flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                     <span className="text-[12px] font-medium text-neutral-900">Automatic surge pricing</span>
                     <div className="w-10 h-5 bg-green-500 rounded-full relative p-1 cursor-pointer">
                        <div className="w-3 h-3 bg-white rounded-full absolute right-1"></div>
                     </div>
                  </div>
                  <div className="flex items-center gap-4 mt-6">
                     <div className="flex-1">
                        <p className="text-xs text-neutral-500 mb-1.5">Current multiplier</p>
                        <div className="flex items-center gap-2">
                           <TrendingUp size={16} className="text-primary" />
                           <span className="text-xl font-medium text-neutral-900">1.2x</span>
                        </div>
                     </div>
                     <button className="p-2 border border-neutral-200 rounded-lg text-neutral-500 hover:text-black">
                        <ChevronRight size={18} />
                     </button>
                  </div>
               </div>
            </div>

            {/* Bottom Special Charges Section */}
            <div className="mt-10 border-t border-neutral-50 pt-10 flex gap-8">
               <div className="flex-1 space-y-4">
                  <h5 className="text-xs text-neutral-500">Night operation surcharge</h5>
                  <div className="flex items-center gap-6">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-neutral-50 rounded-lg text-neutral-500"><Clock size={16} /></div>
                        <span className="text-[13px] font-medium text-neutral-700">11:00 PM — 05:00 AM</span>
                     </div>
                     <div className="text-[14px] font-medium text-neutral-900 bg-neutral-50 px-3 py-1 rounded-lg">
                        +20% FLAT
                     </div>
                  </div>
               </div>
               <div className="w-px bg-neutral-50"></div>
               <div className="flex-1 flex items-center">
                  <div className="flex items-center gap-4 p-4 bg-green-50/50 border border-green-100 rounded-2xl w-full">
                     <div className="w-10 h-10 rounded-full flex items-center justify-center bg-neutral-100 text-neutral-500"><ShieldCheck size={20} /></div>
                     <div className="leading-tight">
                        <p className="text-[13px] font-medium text-green-800">Active strategy</p>
                        <p className="text-xs font-medium text-green-600 mt-1">Growth-Optimized Pricing</p>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default FareConfiguration;
