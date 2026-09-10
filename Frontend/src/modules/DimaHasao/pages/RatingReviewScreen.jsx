import { useState } from 'react';
import { useNavigate } from '../router';
import { useBooking } from '../context/BookingContext';
import { Header } from '../components/layout/Header';
import { PatternDivider } from '../components/layout/PatternDivider';
import { motion } from 'framer-motion';

export const RatingReviewScreen = () => {
  const navigate = useNavigate();
  const { showToast } = useBooking();

  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState(['Friendly Driver', 'Clean Vehicle']);
  const [reviewText, setReviewText] = useState('');
  const [serviceType, setServiceType] = useState('Taxi Ride');

  const availableTags = [
    'On-Time Pickup',
    'Friendly Driver',
    'Clean Vehicle',
    'Great View',
    'Delicious Food',
    'Humble Guide',
    'Safe Driving',
    'Worth the Price'
  ];

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    showToast('Thank you for rating your Dima Hasao experience! ⭐');
    navigate('/bookings');
  };

  return (
    <div className="bg-[#FAF6ED] text-gray-800 antialiased min-h-screen pb-28 relative font-poppins">
      <Header
        title="RATE & REVIEW"
        subtitle="Share your honest feedback"
        showBack={true}
        rightAction="none"
      />
      <PatternDivider variant="green-gold" />

      <main className="p-3.5 space-y-4">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-gray-700 block mb-1">
              Select Experience to Rate
            </label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full bg-[#FAF6ED] border border-[#E5DDC3] rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:border-emerald-600"
            >
              <option value="Taxi Ride">Taxi Ride (Auto / Cab)</option>
              <option value="Hotel Stay">Hotel & Resort Stay</option>
              <option value="Food Order">Food & Dining Experience</option>
              <option value="Tour Package">Tour Package & Guided Trek</option>
            </select>
          </div>

          {/* Star Selector */}
          <div className="text-center space-y-2 py-2">
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider block">
              Tap to Rate
            </span>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="text-3xl text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                >
                  <i
                    className={`${
                      star <= rating ? 'fa-solid fa-star' : 'fa-regular fa-star text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-xs font-bold text-emerald-900">
              {rating === 5
                ? '⭐ Outstanding Experience'
                : rating === 4
                ? '👍 Very Good'
                : rating === 3
                ? '👌 Average'
                : '👎 Needs Improvement'}
            </span>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-gray-700 block">
              What did you like most?
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);

                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`text-[11px] font-semibold px-3 py-1 rounded-full border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#06381e] text-amber-300 border-emerald-800'
                        : 'bg-[#FAF6ED] text-gray-700 border-[#E5DDC3]'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Review Text */}
          <div>
            <label className="text-[11px] font-semibold text-gray-700 block mb-1">
              Write a Review (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Tell fellow tourists what made your experience memorable..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="w-full bg-[#FAF6ED] border border-[#E5DDC3] rounded-xl p-3 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="w-full bg-[#06381e] hover:bg-[#0a4d2b] text-amber-300 font-bold text-xs py-3 rounded-xl shadow-md transition-colors cursor-pointer"
          >
            Submit Verified Review
          </motion.button>
        </form>
      </main>
    </div>
  );
};
