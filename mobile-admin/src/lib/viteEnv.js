/*
 * `import.meta.env` as the ported web code reads it.
 *
 * Vite inlines those variables at build time; Metro does not define
 * `import.meta` at all, so a screen reading `import.meta.env.VITE_X` threw
 * "Cannot read properties of undefined" and never rendered. Expo's own
 * variables are inlined under `process.env.EXPO_PUBLIC_*`, so a VITE_ name is
 * looked up there first, then left empty — the same thing the web shows when
 * the variable is unset.
 */
export const viteEnv = new Proxy(
  {},
  {
    get(_target, key) {
      if (typeof key !== 'string') return undefined;
      return process.env[key] ?? process.env[key.replace(/^VITE_/, 'EXPO_PUBLIC_')] ?? undefined;
    },
  },
);

export default viteEnv;
