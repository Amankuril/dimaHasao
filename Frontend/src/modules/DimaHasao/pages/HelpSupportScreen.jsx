import { useEffect, useState } from 'react';
import { useNavigate } from '../router';
import { useBooking } from '../context/BookingContext';
import { raiseSupportTicket, fetchMySupportTickets } from '../services/supportApi';
import { Header } from '../components/layout/Header';
import { PatternDivider } from '../components/layout/PatternDivider';
import { motion, AnimatePresence } from 'framer-motion';

export const HelpSupportScreen = () => {
  const { user, showToast } = useBooking();
  const navigate = useNavigate();

  const [activeFaq, setActiveFaq] = useState(null);
  const [ticketCategory, setTicketCategory] = useState('Taxi');
  const [complaintText, setComplaintText] = useState('');
  const [isTicketSubmitted, setIsTicketSubmitted] = useState(false);
  const [generatedTicketId, setGeneratedTicketId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [myTickets, setMyTickets] = useState([]);

  // The customer's own history, across every service — the desk files each
  // ticket under the module they picked, but they see one list.
  useEffect(() => {
    if (!user?.isLoggedIn) return;
    fetchMySupportTickets().then(setMyTickets).catch(() => setMyTickets([]));
  }, [user?.isLoggedIn, isTicketSubmitted]);

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

  /**
   * Raise the ticket on the server.
   *
   * This screen used to invent a ticket number in the browser and tell the
   * customer support had been assigned — nothing was ever sent. The reference
   * shown now is the one the admin desk sees.
   */
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!complaintText.trim() || submitting) return;

    if (!user?.isLoggedIn) {
      showToast('Please sign in so we can follow up on your ticket');
      return navigate('/login');
    }

    try {
      setSubmitting(true);
      const { ticket } = await raiseSupportTicket({
        category: ticketCategory,
        description: complaintText.trim(),
      });
      setGeneratedTicketId(ticket.ticketCode);
      setIsTicketSubmitted(true);
      setComplaintText('');
      showToast(`Support ticket ${ticket.ticketCode} raised`);
    } catch (error) {
      showToast(error?.response?.data?.message || 'We could not raise that ticket. Try again.');
    } finally {
      setSubmitting(false);
    }
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
              disabled={submitting}
              className="w-full bg-[#06381e] hover:bg-[#0a4d2b] disabled:opacity-60 text-amber-300 font-bold text-xs py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting ? 'Sending…' : 'Submit Ticket'}
            </motion.button>
          </form>

          {isTicketSubmitted && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
              <span className="font-bold flex items-center gap-1">
                <i className="fa-solid fa-circle-check text-emerald-600"></i>
                <span>Ticket Generated: {generatedTicketId}</span>
              </span>
              <p className="text-[11px] text-gray-600">
                Our support team can see this now. Quote the reference above if you call us.
              </p>
            </div>
          )}
        </div>

        {/* The customer's own tickets */}
        {myTickets.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-3">
            <h3 className="font-montserrat font-bold text-sm text-gray-900 flex items-center gap-2">
              <i className="fa-solid fa-clock-rotate-left text-emerald-800"></i>
              <span>Your Tickets</span>
            </h3>

            <div className="space-y-2">
              {myTickets.map((ticket) => {
                const done = ['resolved', 'closed'].includes(ticket.status);
                const reply = [...(ticket.messages || [])].reverse()
                  .find((m) => m.senderRole === 'admin');
                return (
                  <div key={ticket._id} className="rounded-xl border border-[#E5DDC3]/80 bg-[#FAF6ED]/40 p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black tracking-wide text-emerald-950">
                        {ticket.ticketCode}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        done ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {done ? 'Resolved' : 'In progress'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-snug line-clamp-2">
                      {ticket.description}
                    </p>
                    {reply && (
                      <p className="text-[11px] text-emerald-900 bg-emerald-50 rounded-lg p-2 leading-snug">
                        <span className="font-bold">Support: </span>{reply.message}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
