import { useState } from 'react';
import { useNavigate, useHostNavigate } from '../router';
import { useBooking } from '../context/BookingContext';
import { PLACES_DATA } from '../data/tourismData';
import { Header } from '../components/layout/Header';
import { PatternDivider } from '../components/layout/PatternDivider';
import { ModuleAccordion } from '../components/layout/ModuleAccordion';
import {
  MODULE_SECTIONS,
  PLATFORM_ACCOUNT,
  VEG_MODE_KEY,
  VEG_MODE_OPTION_KEY,
} from '@/shared/components/app/moduleSections';
import { motion, AnimatePresence } from 'framer-motion';

/** Food's three Veg Mode states, in the order they are offered. */
const VEG_CHOICES = [
  { id: 'off', label: 'Off', on: false, option: 'all' },
  { id: 'all', label: 'Veg dishes', on: true, option: 'all' },
  { id: 'pure-veg', label: 'Pure veg', on: true, option: 'pure-veg' },
];

const readVegChoice = () => {
  try {
    if (localStorage.getItem(VEG_MODE_KEY) !== 'true') return 'off';
    return localStorage.getItem(VEG_MODE_OPTION_KEY) === 'pure-veg' ? 'pure-veg' : 'all';
  } catch {
    return 'off';
  }
};

export const ProfileScreen = () => {
  const { user, login, logout, favorites, bookings, showToast } = useBooking();
  const [selectedLang, setSelectedLang] = useState('English');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editPhone, setEditPhone] = useState(user.phone || '+91 98765 43210');
  const [vegChoice, setVegChoice] = useState(readVegChoice);
  const navigate = useNavigate();
  // Module screens live outside this mount, so they need unprefixed paths.
  const hostNavigate = useHostNavigate();

  /**
   * Veg Mode is Food's setting, and Food's ProfileContext seeds itself from
   * these same localStorage keys — so setting it here is the same switch, not
   * a copy of it. Food picks the new value up the next time it mounts.
   */
  const applyVegChoice = (choice) => {
    setVegChoice(choice.id);
    try {
      localStorage.setItem(VEG_MODE_KEY, String(choice.on));
      localStorage.setItem(VEG_MODE_OPTION_KEY, choice.option);
    } catch {
      /* private mode: the toggle still reads correctly for this session */
    }
    showToast(`Veg Mode: ${choice.label}`);
  };

  const renderVegControl = (row) => (
    <div className="p-2.5 rounded-xl bg-[#FAF6ED] border border-[#E5DDC3]/70 space-y-2">
      <div className="flex items-center gap-3">
        <i className={`${row.icon} text-emerald-700 text-xs w-4 text-center shrink-0`}></i>
        <div className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-gray-800">{row.label}</span>
          <span className="block text-[10px] text-gray-500 leading-snug">{row.sub}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {VEG_CHOICES.map((choice) => (
          <button
            key={choice.id}
            onClick={() => applyVegChoice(choice)}
            className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
              vegChoice === choice.id
                ? 'bg-[#0a3a22] text-amber-300 border-[#0a3a22]'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  );

  const favoritePlaces = PLACES_DATA.filter((p) => favorites.includes(p.id));

  const handleSaveProfile = (e) => {
    e.preventDefault();
    login(editPhone);
    setIsEditing(false);
    showToast('Profile updated successfully! ✨');
  };

  return (
    <div className="bg-[#FAF6ED] text-gray-800 antialiased min-h-screen pb-20 relative font-poppins">
      {/* Full Page Header */}
      <Header
        title="TOURIST PROFILE"
        subtitle="Manage your profile & preferences"
        showBack={true}
        rightAction="none"
      />
      <PatternDivider variant="green-gold" />

      <main className="p-4 space-y-4">
        {/* User Card */}
        <div className="bg-gradient-to-br from-[#0a2e12] via-[#0f441b] to-[#186a43] rounded-2xl p-5 text-white shadow-lg relative overflow-hidden border border-amber-400/20">
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.2) 1px, transparent 0)',
              backgroundSize: '16px 16px'
            }}
          />

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-16 h-16 rounded-full border-2 border-amber-400 p-0.5 overflow-hidden shrink-0 shadow-lg bg-[#061c0a]">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDHxXjaqg_p2_vshVQlQARltQKITPTxRdxMMlP-3QyFF5y8e2b25l5rewGDv8hjTJT1mIeodoXkQyW5Q5DbamrNM5Wqkn9zC5hXH-uNiaqjmuWSf0eYIG090j8R2skAqbm4nCA9jzMl8Rca5t2ANsI31UQDQpgiAqnjiXgjeFcP5hsy0iTh8orLvaeTNhXhfOJY7K7F6qam7R85TVEaEb8naGgso3oEml2Ix6YFyN-Jua917AHlmZIs"
                  alt="Avatar"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>

              <div className="min-w-0">
                <h3 className="font-bold text-base text-amber-300 truncate">{user.name}</h3>
                <p className="text-xs text-emerald-200 truncate mt-0.5">{user.phone || '+91 98765 43210'}</p>
                <span className="inline-block mt-1.5 bg-amber-400/20 text-amber-300 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-amber-400/30">
                  <i className="fa-solid fa-certificate text-[9px] mr-1 text-amber-400"></i>
                  Verified Tourist Explorer
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsEditing(true)}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs cursor-pointer shrink-0 transition-colors shadow"
              aria-label="Edit Profile"
            >
              <i className="fa-solid fa-pen-to-square"></i>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-white/10 text-center relative z-10">
            <div>
              <span className="text-[10px] text-emerald-200 block uppercase">Booked Rides</span>
              <strong className="text-base font-bold text-amber-300">{bookings.length}</strong>
            </div>
            <div className="border-x border-white/10">
              <span className="text-[10px] text-emerald-200 block uppercase">Saved Wishlist</span>
              <strong className="text-base font-bold text-amber-300">{favoritePlaces.length}</strong>
            </div>
            <div>
              <span className="text-[10px] text-emerald-200 block uppercase">Member Tier</span>
              <strong className="text-base font-bold text-amber-300">Gold</strong>
            </div>
          </div>
        </div>

        {/*
          One identity above, each module's own account screens below it.
          Those screens were never removed when the nav was unified — they just
          stopped being reachable from it. The rows link to the module's real
          screen rather than reimplementing it, so there is one of each.
        */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h4 className="font-bold text-xs uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
              <i className="fa-solid fa-layer-group text-emerald-700"></i>
              <span>Your Services</span>
            </h4>
            <span className="text-[9px] text-gray-500">One account, every service</span>
          </div>

          {MODULE_SECTIONS.map((section) => (
            <ModuleAccordion
              key={section.id}
              section={section}
              rows={section.account}
              onNavigate={hostNavigate}
              renderControl={renderVegControl}
            />
          ))}
        </div>

        {/* Platform-wide rows: these belong to no single module. */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-1">
          <h4 className="font-bold text-xs uppercase tracking-wider text-gray-800 mb-2 flex items-center gap-1.5">
            <i className="fa-solid fa-circle-info text-emerald-700"></i>
            <span>Help &amp; Feedback</span>
          </h4>
          {PLATFORM_ACCOUNT.map((row) => (
            <button
              key={row.path}
              onClick={() => hostNavigate(row.path)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <i className={`${row.icon} text-emerald-700 text-base w-5 shrink-0`}></i>
                <div className="min-w-0">
                  <span className="block text-xs font-semibold text-gray-800 truncate">{row.label}</span>
                  <span className="block text-[10px] text-gray-500 truncate">{row.sub}</span>
                </div>
              </div>
              <i className="fa-solid fa-chevron-right text-gray-400 text-xs shrink-0"></i>
            </button>
          ))}
        </div>

        {/* Saved Wishlist Section */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E5DDC3]">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
              <i className="fa-solid fa-heart text-red-500"></i>
              <span>Saved Wishlist ({favoritePlaces.length})</span>
            </h4>
            {favoritePlaces.length > 0 && (
              <button
                onClick={() => navigate('/places')}
                className="text-[10px] text-blue-600 font-semibold hover:underline cursor-pointer"
              >
                View All &gt;
              </button>
            )}
          </div>

          {favoritePlaces.length > 0 ? (
            <div className="space-y-2.5">
              {favoritePlaces.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/places/${p.id}`)}
                  className="flex items-center gap-3 p-2 rounded-xl bg-gray-50 hover:bg-emerald-50 cursor-pointer transition-colors border border-gray-100/80"
                >
                  <img src={p.mainImage} alt={p.name} className="w-12 h-12 rounded-lg object-cover shadow-xs shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-bold text-gray-900 truncate">{p.name}</h5>
                    <p className="text-[10px] text-gray-500 truncate">{p.location}</p>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 shrink-0">Explore →</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic text-center py-4">
              No saved destinations yet. Tap the heart icon on any place to save!
            </p>
          )}
        </div>

        {/* Quick Nav Options */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E5DDC3] space-y-1">
          <h4 className="font-bold text-xs uppercase tracking-wider text-gray-800 mb-2 flex items-center gap-1.5">
            <i className="fa-solid fa-sliders text-emerald-700"></i>
            <span>Account Shortcuts</span>
          </h4>

          <button
            onClick={() => navigate('/bookings')}
            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <i className="fa-regular fa-calendar-check text-blue-600 text-base w-5"></i>
              <span className="text-xs font-semibold text-gray-800">My Booked Rides</span>
            </div>
            <i className="fa-solid fa-chevron-right text-gray-400 text-xs"></i>
          </button>

          <button
            onClick={() => navigate('/places')}
            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-map-location-dot text-emerald-700 text-base w-5"></i>
              <span className="text-xs font-semibold text-gray-800">Explore Attractions</span>
            </div>
            <i className="fa-solid fa-chevron-right text-gray-400 text-xs"></i>
          </button>

          <button
            onClick={() => navigate('/more')}
            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-compass text-amber-600 text-base w-5"></i>
              <span className="text-xs font-semibold text-gray-800">All Tourism Services &amp; Guides</span>
            </div>
            <i className="fa-solid fa-chevron-right text-gray-400 text-xs"></i>
          </button>
        </div>

        {/* Language Selection */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E5DDC3]">
          <h4 className="font-bold text-xs uppercase tracking-wider text-gray-800 mb-3 flex items-center gap-1.5">
            <i className="fa-solid fa-language text-emerald-700"></i>
            <span>Language Preference</span>
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {['English', 'Dimasa', 'Assamese'].map((lang) => (
              <button
                key={lang}
                onClick={() => {
                  setSelectedLang(lang);
                  showToast(`Language switched to ${lang}`);
                }}
                className={`py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  selectedLang === lang
                    ? 'bg-[#0a3a22] text-amber-300 border-[#0a3a22] shadow-xs'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Account Actions */}
        <div className="space-y-2">
          {user.isLoggedIn ? (
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 border border-red-200 cursor-pointer"
            >
              <i className="fa-solid fa-right-from-bracket"></i>
              <span>Log Out</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-[#0a3a22] hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow"
            >
              <i className="fa-solid fa-right-to-bracket"></i>
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </main>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-5 shadow-2xl z-10 w-full max-w-sm border border-emerald-100 relative"
            >
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-sm text-gray-900">Edit Tourist Profile</h4>
                <button
                  onClick={() => setIsEditing(false)}
                  className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-xs"></i>
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#0a3a22] text-white rounded-xl font-bold text-xs hover:bg-emerald-800 shadow cursor-pointer transition-colors"
                >
                  Save Changes
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
