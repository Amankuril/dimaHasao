/**
 * Self-service account deletion for the user, restaurant and delivery apps
 * (DELETE /v1/food/auth/delete-account). Google Play requires an in-app way to
 * delete an account; all three apps already called this endpoint, but it was
 * never mounted, so the button answered 404.
 *
 * Deletion is a soft delete. Orders, payouts and reports keep pointing at the
 * row, so it stays, but it is switched off the way the admin deletes already
 * do it (deletedAt / status 'deleted' / isActive false, which every auth guard
 * and token refresh already refuses). Personal contact data is cleared, and
 * the phone is moved aside so the number can sign up again as a new account.
 * The phone gets a suffix, not a prefix: the partner lookups match on the
 * number's trailing digits, so a prefix would still find the deleted row.
 */
import { FoodUser } from "../users/user.model.js";
import { FoodRestaurant } from "../../modules/food/restaurant/models/restaurant.model.js";
import { FoodDeliveryPartner } from "../../modules/food/delivery/models/deliveryPartner.model.js";
import { FoodOrder } from "../../modules/food/orders/models/order.model.js";
import { getUserWallet } from "../../modules/food/user/services/userWallet.service.js";
import { getRestaurantFinance } from "../../modules/food/restaurant/services/restaurantFinance.service.js";
import { getDeliveryPartnerWalletEnhanced } from "../../modules/food/delivery/services/deliveryFinance.service.js";
import { FoodRefreshToken } from "../refreshTokens/refreshToken.model.js";
import { ValidationError, AuthError } from "./errors.js";

const ACTIVE_ORDER_STATUSES = [
  "created",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "reached_pickup",
  "picked_up",
  "reached_drop",
];

const retiredPhone = (phone) => `${phone || ""}_deleted_${Date.now()}`;

const money = (value) => Math.max(0, Number(value) || 0);

/** What each role still holds; the apps warn before deleting when it is above zero. */
export const getDeletionBalance = async (userId, role) => {
  switch (role) {
    case "USER": {
      const wallet = await getUserWallet(userId);
      return { balance: money(wallet.balance), type: "Wallet Balance" };
    }
    case "RESTAURANT": {
      const finance = await getRestaurantFinance(userId);
      return { balance: money(finance?.currentCycle?.estimatedPayout), type: "Restaurant Available Balance" };
    }
    case "DELIVERY_PARTNER": {
      const wallet = await getDeliveryPartnerWalletEnhanced(userId);
      return {
        balance: money(wallet.pocketBalance),
        cashInHand: money(wallet.cashInHand),
        type: "Delivery Wallet Balance",
      };
    }
    default:
      throw new AuthError("This account type cannot be deleted from the app");
  }
};

const assertNoActiveOrders = async (filter, message) => {
  const active = await FoodOrder.exists({ ...filter, orderStatus: { $in: ACTIVE_ORDER_STATUSES } });
  if (active) throw new ValidationError(message);
};

export const deleteOwnAccount = async (userId, role) => {
  const now = new Date();

  switch (role) {
    case "USER": {
      const user = await FoodUser.findOne({ _id: userId, deletedAt: null });
      if (!user) throw new ValidationError("Account not found");
      if (user.currentRideId) {
        throw new ValidationError("Finish or cancel your current ride before deleting your account.");
      }
      await assertNoActiveOrders(
        { userId: user._id },
        "You have an order in progress. Delete your account after it is delivered or cancelled.",
      );
      // The wallet balance is not refundable cash (top-ups and referral
      // credit), so it does not block; the app shows it before confirming.
      await FoodUser.updateOne(
        { _id: user._id },
        {
          $set: {
            phone: retiredPhone(user.phone),
            isActive: false,
            active: false,
            deletedAt: now,
            deletion_reason: "user_self_delete",
            fcmTokens: [],
            fcmTokenMobile: [],
            addresses: [],
          },
          $unset: { email: "", fcmTokenWeb: "" },
        },
      );
      break;
    }

    case "RESTAURANT": {
      const restaurant = await FoodRestaurant.findById(userId);
      if (!restaurant || restaurant.status === "deleted") throw new ValidationError("Account not found");
      await assertNoActiveOrders(
        { restaurantId: restaurant._id },
        "You have orders in progress. Complete or cancel them before deleting your account.",
      );
      const { balance } = await getDeletionBalance(userId, role);
      if (balance > 0) {
        throw new ValidationError(`Withdraw your available balance of ₹${balance} before deleting your account.`);
      }
      await FoodRestaurant.updateOne(
        { _id: restaurant._id },
        {
          $set: {
            status: "deleted",
            deletedAt: now,
            ownerPhone: retiredPhone(restaurant.ownerPhone),
            fcmTokens: [],
            fcmTokenMobile: [],
          },
          $unset: { ownerEmail: "" },
        },
      );
      break;
    }

    case "DELIVERY_PARTNER": {
      const partner = await FoodDeliveryPartner.findById(userId);
      if (!partner || partner.status === "deleted") throw new ValidationError("Account not found");
      await assertNoActiveOrders(
        { "dispatch.deliveryPartnerId": partner._id },
        "You have a delivery in progress. Complete it before deleting your account.",
      );
      // Only an approved partner has earnings; a pending one deletes freely.
      if (partner.status === "approved") {
        const { balance, cashInHand } = await getDeletionBalance(userId, role);
        if (cashInHand > 0) {
          throw new ValidationError(`Deposit the ₹${cashInHand} cash you are holding before deleting your account.`);
        }
        if (balance > 0) {
          throw new ValidationError(`Withdraw your wallet balance of ₹${balance} before deleting your account.`);
        }
      }
      await FoodDeliveryPartner.updateOne(
        { _id: partner._id },
        {
          $set: {
            status: "deleted",
            deletedAt: now,
            phone: retiredPhone(partner.phone),
            fcmTokens: [],
            fcmTokenMobile: [],
          },
        },
      );
      break;
    }

    default:
      throw new AuthError("This account type cannot be deleted from the app");
  }

  // Every session on every device ends with the account.
  await FoodRefreshToken.deleteMany({ userId });
  return { deleted: true };
};
