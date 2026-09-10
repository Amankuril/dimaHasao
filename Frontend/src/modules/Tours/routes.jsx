import { Routes, Route, Navigate } from 'react-router-dom';

// Tours & Travels has no backend module yet — this is the admin placeholder so
// the section exists alongside Food / Taxi / Hotel. Replace with real screens
// once Backend/src/modules/tours lands.
const ToursComingSoon = () => (
  <div className="min-h-screen bg-neutral-950 text-neutral-200 flex items-center justify-center p-6">
    <div className="max-w-md text-center space-y-3">
      <div className="text-4xl">🧭</div>
      <h1 className="text-xl font-bold text-white">Tours &amp; Travels</h1>
      <p className="text-sm text-neutral-400">
        Tour packages, itineraries, guides and operator management will appear
        here. The module is not built yet.
      </p>
    </div>
  </div>
);

export default function ToursRoutes() {
  return (
    <Routes>
      <Route path="admin" element={<ToursComingSoon />} />
      <Route path="*" element={<Navigate to="admin" replace />} />
    </Routes>
  );
}
