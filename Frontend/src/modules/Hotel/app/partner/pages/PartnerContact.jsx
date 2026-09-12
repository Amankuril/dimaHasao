import React, { useRef, useState, useEffect } from 'react';
import { Mail, Phone, Send } from 'lucide-react';
import gsap from 'gsap';
import PartnerHeader from '../components/PartnerHeader';
import { legalService } from '../../../services/apiService';

const PartnerContact = () => {
  const contentRef = useRef(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    gsap.fromTo(
      contentRef.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
    );
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !subject || !message) {
      setError('Please fill all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      await legalService.submitContact('partner', {
        name,
        email,
        phone,
        subject,
        message
      });
      setSuccess('Your message has been sent to the Dima Hasao team.');
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
    } catch (e) {
      setError(e?.message || 'Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <PartnerHeader title="Contact Partner Support" subtitle="Reach the Dima Hasao team" />

      <main ref={contentRef} className="max-w-3xl mx-auto px-4 pt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#005CA8]/10 flex items-center justify-center text-[#005CA8]">
              <Mail size={18} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">Email</p>
              <p className="text-xs text-gray-500">hoomzohub@gmail.com</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#005CA8]/10 flex items-center justify-center text-[#005CA8]">
              <Phone size={18} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">Phone</p>
              <p className="text-xs text-gray-500">6232314147</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-2">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl px-4 py-2">
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#005CA8]/60"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#005CA8]/60"
                placeholder="you@hotel.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#005CA8]/60"
                placeholder="+91"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Subject *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#005CA8]/60"
                placeholder="Billing, onboarding, payouts..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Message *</label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#005CA8]/60 resize-none"
              placeholder="Share context so we can assist you faster."
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 mt-2 bg-[#005CA8] hover:bg-[#004b8a] text-white py-3 rounded-xl text-sm font-bold active:scale-95 disabled:opacity-60 disabled:active:scale-100 transition-all shadow-md"
          >
            <Send size={16} />
            {submitting ? 'Sending...' : 'Send to Support'}
          </button>
        </form>
      </main>
    </div>
  );
};

export default PartnerContact;

