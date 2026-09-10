import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const HotelGallery = ({ images = [], hotelName = 'Hotel' }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!images || images.length === 0) return null;

  return (
    <div className="relative w-full">
      {/* Main Image Banner */}
      <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-black">
        <motion.img
          key={activeIndex}
          src={images[activeIndex]}
          alt={`${hotelName} photo ${activeIndex + 1}`}
          initial={{ opacity: 0.8, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full object-cover cursor-pointer"
          onClick={() => setIsFullscreen(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

        {/* Counter Badge */}
        <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-full border border-white/20 flex items-center gap-1.5 z-10">
          <i className="fa-solid fa-camera text-[10px] text-amber-300"></i>
          <span>
            {activeIndex + 1} / {images.length}
          </span>
        </div>

        {/* Fullscreen Expand Button */}
        <button
          onClick={() => setIsFullscreen(true)}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center border border-white/20 hover:bg-black/70 transition-colors cursor-pointer z-10"
          aria-label="View Fullscreen"
        >
          <i className="fa-solid fa-expand text-xs"></i>
        </button>

        {/* Prev / Next Chevrons on hover */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-xs hover:bg-black/70 transition-colors z-10 cursor-pointer"
              aria-label="Previous image"
            >
              <i className="fa-solid fa-chevron-left text-xs"></i>
            </button>
            <button
              onClick={() => setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-xs hover:bg-black/70 transition-colors z-10 cursor-pointer"
              aria-label="Next image"
            >
              <i className="fa-solid fa-chevron-right text-xs"></i>
            </button>
          </>
        )}
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="flex gap-2 p-2 bg-[#FAF6ED] overflow-x-auto scrollbar-none border-b border-[#E5DDC3]">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`relative h-14 w-20 rounded-lg overflow-hidden shrink-0 transition-all cursor-pointer border-2 ${
                idx === activeIndex
                  ? 'border-emerald-700 ring-2 ring-emerald-500/30'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <div className="fixed inset-0 z-[150] bg-black/95 flex flex-col justify-between p-4 backdrop-blur-md">
            <div className="flex justify-between items-center text-white z-20">
              <span className="text-sm font-semibold text-amber-300 truncate max-w-[80%]">
                {hotelName} ({activeIndex + 1} of {images.length})
              </span>
              <button
                onClick={() => setIsFullscreen(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-colors"
              >
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
              <motion.img
                key={activeIndex}
                src={images[activeIndex]}
                alt="Fullscreen view"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="max-h-full max-w-full object-contain rounded-lg"
              />

              {images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
                    }
                    className="absolute left-2 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors cursor-pointer"
                  >
                    <i className="fa-solid fa-chevron-left"></i>
                  </button>
                  <button
                    onClick={() =>
                      setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
                    }
                    className="absolute right-2 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors cursor-pointer"
                  >
                    <i className="fa-solid fa-chevron-right"></i>
                  </button>
                </>
              )}
            </div>

            {/* Bottom thumbnail strip in fullscreen */}
            <div className="flex justify-center gap-2 overflow-x-auto py-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveIndex(idx)}
                  className={`h-12 w-16 rounded-md overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                    idx === activeIndex ? 'border-amber-400' : 'border-transparent opacity-50'
                  }`}
                >
                  <img src={img} alt="Thumb" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
