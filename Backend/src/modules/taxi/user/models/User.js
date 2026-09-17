/**
 * Taxi's rider is the platform's consumer — this file is a shim over FoodUser.
 *
 * It always wrote to the same `users` collection; keeping a second schema over
 * it only meant the two could disagree about what a user is. The taxi-specific
 * fields (government ID proof, referral counters, deletion requests, the
 * current ride) now live on FoodUser, so nothing is dropped on save.
 *
 * Both export names are kept because the eleven taxi files that import this
 * use `{ User }`, and `FoodUser` was already aliased to the same model here.
 */
import { FoodUser } from '../../../../core/users/user.model.js';

export const User = FoodUser;
export { FoodUser };
export default FoodUser;
