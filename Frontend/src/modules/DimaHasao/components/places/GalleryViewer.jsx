import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const GalleryViewer = ({ place }) => {
  const [selectedImage, setSelectedImage] = useState(place.heroImage || place.mainImage);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const images = place.gallery && place.gallery.length > 0
    ? [place.heroImage || place.mainImage, ...place.gallery.filter(g => g !== (place.heroImage || place.mainImage))]
    : [place.heroImage || place.mainImage];

  return (
    <div>
      {/* Hero Section */}
      <div className="relative overflow-hidden group">
        <motion.img
          key={selectedImage}
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          alt={place.name}
          className="w-full h-64 object-cover object-center rounded-b-2xl shadow-md cursor-pointer"
          src={selectedImage}
          onClick={() => setIsLightboxOpen(true)}
        />

        {/* Number & Name Badge */}
        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-3.5 py-1 rounded-full text-xs font-bold shadow-md text-gray-900 border border-amber-300">
          {place.number}. {place.name}
        </div>

        {/* Expand Icon */}
        <button
          onClick={() => setIsLightboxOpen(true)}
          className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-xs text-white flex items-center justify-center text-xs opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
          aria-label="View Fullscreen"
        >
          <i className="fa-solid fa-expand"></i>
        </button>
      </div>

      {/* Gallery Thumbnails */}
      {images.length > 1 && (
        <div className="px-4 pt-4">
          <div className="flex gap-2.5 overflow-x-auto pb-2 hide-scrollbar">
            {images.map((img, idx) => {
              const isCurrent = selectedImage === img;
              return (
                <motion.button
                  key={idx}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setSelectedImage(img)}
                  className={`w-18 h-18 rounded-xl object-cover shrink-0 border-2 overflow-hidden shadow-xs transition-all cursor-pointer ${
                    isCurrent ? 'border-amber-500 ring-2 ring-amber-400/40 scale-105' : 'border-white opacity-70 hover:opacity-100'
                  }`}
                >
                  <img alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" src={img} />
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      <AnimatePresence>
        {isLightboxOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-lg z-10 cursor-pointer"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              src={selectedImage}
              alt={place.name}
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
