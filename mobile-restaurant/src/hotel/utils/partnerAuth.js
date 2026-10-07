import { getHotelToken } from '../../api/client';
import { clearHotelSession, getHotelUser, isHotelAuthenticated, setHotelSession } from '../../restaurant/utils/auth';
import { useAuth } from '../../context/AuthContext';

/*
 * Port of Frontend/src/modules/Hotel/utils/partnerAuth.js.
 *
 * The hotel partner session under the module name `partner` (web keys
 * partner_accessToken / partner_user / partner_authenticated). AuthContext owns
 * the storage; these answer the questions the web asks of localStorage.
 */
export const setPartnerSession = (token, user) => setHotelSession(token, user);
export const getPartnerToken = () => getHotelToken();
export const getPartnerUser = () => getHotelUser();
export const isPartnerSignedIn = () => isHotelAuthenticated();
export const clearPartnerSession = () => clearHotelSession();

/** Reactive view of the hotel session for screens: { token, user, signedIn }. */
export function usePartnerAuth() {
  const { hotelToken, hotelUser, signedInHotel } = useAuth();
  return { token: hotelToken, user: hotelUser, signedIn: signedInHotel };
}

export default { setPartnerSession, getPartnerToken, getPartnerUser, isPartnerSignedIn, clearPartnerSession };
