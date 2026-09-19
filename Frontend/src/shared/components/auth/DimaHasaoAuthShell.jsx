import { DEFAULT_BRAND_LOGO } from "@/shared/constants/brandLogo";

/**
 * The frame every sign-in, sign-up and onboarding screen on the platform sits
 * in.
 *
 * Shared rather than copied so they cannot drift. Each module used to bring its
 * own look to the first screen a partner ever sees — food-delivery red here, a
 * plain white form there — so signing in to one part of the district's platform
 * looked like arriving at a different product.
 *
 * Dima Hasao's palette: deep forest green, the gold used across the consumer
 * app, and the Dimasa weave. The weave and the ambient glow are drawn in CSS on
 * purpose — a sign-in page should not wait on a remote image to look like
 * itself. The typography classes are declared here rather than in
 * dimahasao.css, which is only imported inside the consumer bundle; the fonts
 * themselves are loaded globally by index.html.
 */
export default function DimaHasaoAuthShell({
  children,
  /** Line under the wordmark. Defaults to the whole platform. */
  blurb = 'The administration console for food, taxis, stays, tours and festivals across the district.',
  /** Bulleted list in the identity panel — a module names what it covers. */
  points = ['Food', 'Taxi', 'Hotels', 'Tours', 'Festivals'],
  /** Widen for forms with two columns, narrow for a single field. */
  width = '940px',
  /** The crest for this audience — each panel has its own. */
  logo = DEFAULT_BRAND_LOGO,
}) {
  return (
    <div className="dh-auth relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-[#04190c] px-4 py-8 sm:py-12">
      <style>{`
        .dh-auth { font-family: 'Poppins', 'Montserrat', sans-serif; }
        .dh-auth .dh-cinzel { font-family: 'Cinzel', serif; }
        .dh-auth .dh-playfair { font-family: 'Playfair Display', serif; }
        .dh-auth .dh-montserrat { font-family: 'Montserrat', sans-serif; }

        .dh-auth .dh-weave {
          background-image: repeating-linear-gradient(
            45deg,
            #04190c 0, #04190c 7px,
            #caa83e 7px, #caa83e 14px,
            #0d3d20 14px, #0d3d20 21px,
            #8c1c13 21px, #8c1c13 28px
          );
        }

        /* Chrome paints an autofilled input solid pale blue, which would put a
           white block in the middle of a dark card. */
        .dh-auth input:-webkit-autofill,
        .dh-auth input:-webkit-autofill:hover,
        .dh-auth input:-webkit-autofill:focus {
          -webkit-text-fill-color: #f4efe2 !important;
          -webkit-box-shadow: 0 0 0 1000px #02130a inset !important;
          caret-color: #f4efe2;
          transition: background-color 5000s ease-in-out 0s !important;
        }
      `}</style>

      {/* Ambient depth. Pointer-events off so nothing here can swallow a click. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-32 h-[420px] w-[420px] rounded-full bg-[#0d6b39]/25 blur-[110px]" />
        <div className="absolute -bottom-40 -right-20 h-[460px] w-[460px] rounded-full bg-[#caa83e]/12 blur-[130px]" />
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#062c14]/70 blur-[120px]" />
      </div>

      <div style={{ '--dh-auth-w': width }} className="relative z-10 w-full max-w-(--dh-auth-w) overflow-hidden rounded-[26px] border border-[#caa83e]/30 bg-[#051f11]/95 shadow-[0_28px_80px_rgba(0,0,0,0.65)] backdrop-blur-md">
        <div className="dh-weave h-2 w-full" />

        <div className="grid grid-cols-1 md:grid-cols-[1.05fr_1fr]">
          {/* Who this console belongs to. Hidden on phones, where the form is
              the whole job. */}
          <div className="relative hidden flex-col justify-between gap-8 border-r border-[#caa83e]/20 p-9 md:flex lg:p-11">
            <div>
              <img
                src={logo}
                alt="Dima Hasao Tourism"
                className="h-24 w-24 object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.55)]"
              />

              <h1 className="dh-playfair mt-6 text-[30px] font-black leading-tight tracking-wide text-[#f4efe2] lg:text-[34px]">
                Dima Hasao
              </h1>

              <div className="mt-2 flex items-center gap-2">
                <span className="h-px w-8 bg-[#caa83e]" />
                <span className="dh-montserrat text-[9px] font-black uppercase tracking-[0.3em] text-[#caa83e]">
                  Tourism
                </span>
                <span className="h-px flex-1 bg-[#caa83e]/30" />
              </div>

              <p className="mt-6 max-w-[30ch] text-sm leading-relaxed text-[#cbd8cd]">
                {blurb}
              </p>
            </div>

            <ul className="space-y-2.5">
              {points.map((service) => (
                <li key={service} className="flex items-center gap-2.5 text-[13px] text-[#9fb3a4]">
                  <span className="h-1.5 w-1.5 rotate-45 bg-[#caa83e]" />
                  {service}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-7 sm:p-9 lg:p-11">
            {/* The mark again for phones, where the identity panel is hidden. */}
            <img
              src={logo}
              alt="Dima Hasao Tourism"
              className="mx-auto mb-4 h-16 w-16 object-contain md:hidden"
            />
            {children}
          </div>
        </div>

        <div className="dh-weave h-2 w-full" />
      </div>
    </div>
  );
}

/** The shared field frame: gold hairline, dark well, gold focus. */
export const authFieldClass = (hasError) =>
  `flex items-center rounded-xl border bg-[#02130a] transition-colors focus-within:border-[#caa83e] ${
    hasError ? "border-red-400/70" : "border-[#caa83e]/35"
  }`;

export const authLabelClass =
  "dh-montserrat mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#9fb3a4]";

export const authInputClass =
  "h-12 flex-1 border-none bg-transparent text-sm text-[#f4efe2] placeholder-[#5d7264] outline-none focus:outline-none focus:ring-0";

export const authButtonClass =
  "dh-montserrat flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#caa83e] text-sm font-black uppercase tracking-[0.16em] text-[#04190c] shadow-[0_10px_24px_rgba(202,168,62,0.25)] transition-all hover:bg-[#e8c558] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70";
