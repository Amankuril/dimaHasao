/**
 * Hotel's consumer is the platform's consumer — this file is a shim over
 * FoodUser.
 *
 * All three user models already pointed at the same `users` collection, so a
 * customer was one row read through three schemas that disagreed. Hotel's lost
 * every argument: it marked `password` required and enumerated a lowercase
 * `role`, while accounts created by the unified OTP auth have no password and
 * store 'USER'. Validating a real user through this model failed on both
 * fields, so **any hotel code path that saved a consumer threw**.
 *
 * The fields hotel used to own — saved stays, KYC, address, partner
 * application state — now live on FoodUser, so nothing is dropped.
 *
 * The filename and default export are unchanged, so the eight hotel files that
 * import it did not have to move. Same approach as the Admin and SMS shims.
 */
import { FoodUser } from '../../../core/users/user.model.js';

export const User = FoodUser;
export default FoodUser;
