import { useState } from 'react';
import { useBooking } from '../context/BookingContext';
import { Header } from '../components/layout/Header';
import { PatternDivider } from '../components/layout/PatternDivider';
import { motion, AnimatePresence } from 'framer-motion';

export const HelpSupportScreen = () => {
  const { showToast } = useBooking();

  const [activeFaq, setActiveFaq] = useState(null);
  const [ticketCategory, setTicketCategory] = useState('Taxi');
  const [complaintText, setComplaintText] = useState('');
  const [isTicketSubmitted, setIsTicketSubmitted] = useState(false);
  const [generatedTicketId, setGeneratedTicketId] = useState(null);

  const emergencyHelplines = [
    { title: 'Police Control Room', number: '112', icon: 'fa-solid fa-shield', bg: 'bg-red-600' },
    { title: 'Haflong Civil Hospital', number: '03673-236222', icon: 'fa-solid fa-hospital', bg: 'bg-emerald-700' },
    { title: 'Tourist Police Helpline', number: '+91 94350 99999', icon: 'fa-solid fa-person-military-pointing', bg: 'bg-blue-600' },
    { title: 'Disaster Emergency (DDMA)', number: '1077', icon: 'fa-solid fa-triangle-exclamation', bg: 'bg-amber-600' }
  ];

  const faqs = [
    {
      q: 'How does Start/End ride OTP work for Taxi bookings?',
      a: 'When your assigned driver arrives at the pickup point, share the 4-digit Ride Start OTP shown in your "My Bookings" screen. Once verified on the driver app, the trip begins.'
    },
    {
      q: 'Can I cancel my hotel or tour booking?',
      a: 'Yes, most hotels offer free cancellation up to 24-48 hours before check-in. Check the specific hotel or tour package policy on the booking receipt.'
    },
    {
      q: 'How do I reach Haflong from Guwahati?',
      a: 'You can take the scenic VistaDome hill train from Guwahati to Haflong Railway Station (approx. 5 hours) or travel by private taxi via NH-27.'
    },
    {
      q: 'Are payments secure on this platform?',
      a: 'All digital transactions (UPI, Cards, Net Banking) are encrypted and verified through RBI-compliant secure payment gateways.'
    }
  ];

  const handleCreateTicket = (e) => {
    e.preventDefault();
    if (!complaintText.trim()) return;

    const tId = `DH-TKT-${Math.floor(10000 + Math.random() * 90000)}`;
    setGeneratedTicketId(tId);
    setIsTicketSubmitted(true);
    setComplaintText('');
    showToast(`Support Ticket ${tId} created. Support team will respond shortly.`);
  };

  return (
    <div className="bg-[#FAF6ED] text-gray-800 antialiased min-h-screen pb-28 relative font-poppins">
      <Header
        title="HELP & SUPPORT"
        subtitle="24/7 Tourist assistance, FAQs & SOS emergency"
        showBack={true}
        rightAction="none"
      />
      <PatternDivider variant="green-gold" />

      <main className="p-3.5 space-y-4">
        {/* Emergency SOS Hotlines */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-red-200 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-montserrat font-bold text-sm text-red-700 flex items-center gap-1.5">
              <i className="fa-solid fa-phone-volume text-red-600 animate-pulse"></i>
              <span>Emergency Hotlines (1-Tap Call)</span>
            </h3>
            <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded">
              24×7 Active
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {emergencyHelplines.map((item, idx) => (
              <a
                key={idx}
                href={`tel:${item.number}`}
                className="p-2.5 bg-[#FAF6ED] rounded-xl border border-[#E5DDC3] hover:border-red-400 transition-colors flex items-center gap-2.5"
              >
                <div className={`w-8 h-8 rounded-lg ${item.bg} text-white flex items-center justify-center shrink-0 text-xs shadow-xs`}>
                  <i className={item.icon}></i>
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-[11px] text-gray-900 truncate leading-tight">
                    {item.title}
                  </h4>
                  <span className="text-[10px] font-bold text-emerald-800">{item.number}</span>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Raise a Support Complaint / Ticket */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-3">
          <h3 className="font-montserrat font-bold text-sm text-gray-900 flex items-center gap-2">
            <i className="fa-solid fa-headset text-emerald-800"></i>
            <span>Submit a Support Ticket</span>
          </h3>

          <form onSubmit={handleCreateTicket} className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                Category
              </label>
              <select
                value={ticketCategory}
                onChange={(e) => setTicketCategory(e.target.value)}
                className="w-full bg-[#FAF6ED] border border-[#E5DDC3] rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:border-emerald-600 cursor-pointer"
              >
                <option value="Taxi">Taxi / Ride Booking Issue</option>
                <option value="Hotel">Hotel / Homestay Stay Issue</option>
                <option value="Food">Food Order / Delivery Delay</option>
                <option value="Tour">Tour Package & Guide Issue</option>
                <option value="Payment">Payment / Refund Query</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                Describe your concern
              </label>
              <textarea
                required
                rows={3}
                placeholder="Explain the issue or booking ID details..."
                value={complaintText}
                onChange={(e) => setComplaintText(e.target.value)}
                className="w-full bg-[#FAF6ED] border border-[#E5DDC3] rounded-xl p-3 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              type="submit"
              className="w-full bg-[#06381e] hover:bg-[#0a4d2b] text-amber-300 font-bold text-xs py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Submit Ticket
            </motion.button>
          </form>

          {isTicketSubmitted && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
              <span className="font-bold flex items-center gap-1">
                <i className="fa-solid fa-circle-check text-emerald-600"></i>
                <span>Ticket Generated: {generatedTicketId}</span>
              </span>
              <p className="text-[11px] text-gray-600">
                A customer support executive has been assigned. You will receive an SMS update on your registered phone.
              </p>
            </div>
          )}
        </div>

        {/* FAQs */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-3">
          <h3 className="font-montserrat font-bold text-sm text-gray-900 flex items-center gap-2">
            <i className="fa-solid fa-circle-question text-emerald-800"></i>
            <span>Frequently Asked Questions</span>
          </h3>

          <div className="space-y-2">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;

              return (
                <div
                  key={idx}
                  className="rounded-xl border border-[#E5DDC3]/80 bg-[#FAF6ED]/40 overflow-hidden"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full p-3 text-left flex justify-between items-center gap-2 text-xs font-bold text-gray-900 cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <i
                      className={`fa-solid fa-chevron-down text-[10px] text-gray-500 transition-transform ${
                        isOpen ? 'rotate-180 text-emerald-800' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-3 pb-3 text-xs text-gray-600 leading-relaxed border-t border-gray-100 pt-2"
                      >
                        {faq.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};
