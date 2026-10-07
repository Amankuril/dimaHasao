import { useWindowDimensions } from 'react-native';

/*
 * Small pieces for the resort wizard. The form furniture is shared with the
 * hotel and homestay wizards (hotel/components/wizardUi).
 */

/** Tailwind's `sm:` breakpoint (640px): the web shows more columns / labels from here up. */
export function useIsSm() {
  return useWindowDimensions().width >= 640;
}

/** A wizard value as text for an input (numbers and null included). */
export const asText = (value) => (value == null ? '' : String(value));

export { ErrorBanner, SearchStatus } from '../../../components/wizardUi';
