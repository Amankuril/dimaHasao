/**
 * What a closed module shows.
 *
 * Deliberately a dead end with one way out: a message and a back button. No
 * bottom nav, no tabs, no "try again" — every other control would lead further
 * into a module that is not serving, and a nav bar would invite exactly that.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wrench } from 'lucide-react';

export default function ModuleMaintenance({ message, title = 'Under maintenance' }) {
  const navigate = useNavigate();

  /*
   * Back, or the app's home if there is nothing to go back to — arriving here
   * from a deep link or a cold start leaves no history, and a back button that
   * does nothing is worse than none.
   */
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/app', { replace: true });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="px-4 pt-5">
        <button
          type="button"
          onClick={goBack}
          aria-label="Go back"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 active:scale-95 transition"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-8 pb-24 text-center">
        <span className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-50 text-amber-600">
          <Wrench size={32} />
        </span>

        <h1 className="text-xl font-bold text-slate-900">{title}</h1>

        <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500">{message}</p>
      </div>
    </div>
  );
}
