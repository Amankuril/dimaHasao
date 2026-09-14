/**
 * The only place a tour booking's money is calculated.
 *
 * The v1 booking screen used to work out its own total in the browser. That is
 * the same shape as the food bug where Razorpay was handed one figure while
 * verification expected another — so the screen now asks for a quote and only
 * ever displays what comes back.
 */
import PaymentConfig from '../config/payment.config.js';

const round = (value) => Math.round(Number(value) || 0);

/**
 * Price a booking.
 *
 * @param {object} pkg       TourPackage (needs pricePerPerson, childPricePercent, advancePercent)
 * @param {object} party     { adults, children }
 * @param {object} settings  ToursSettings (taxRate, defaultCommission)
 * @param {number} discount  absolute discount already validated by the caller
 */
export const quoteBooking = ({ pkg, party, settings, discount = 0 }) => {
  const adults = Math.max(1, Number(party?.adults) || 1);
  const children = Math.max(0, Number(party?.children) || 0);

  const pricePerPerson = round(pkg.pricePerPerson);
  const childPricePerPerson = round((pricePerPerson * (pkg.childPricePercent ?? 60)) / 100);

  const baseAmount = pricePerPerson * adults + childPricePerPerson * children;

  // A discount can never exceed the fare it is discounting.
  const appliedDiscount = Math.min(round(discount), baseAmount);

  const taxRate = Number(settings?.taxRate) || 0;
  // Tax is charged on the fare before discount, matching how hotel bills.
  const taxes = round((baseAmount * taxRate) / 100);
  const totalAmount = baseAmount - appliedDiscount + taxes;

  const advancePercent = Math.min(100, Math.max(1, Number(pkg.advancePercent) || 100));
  // Rounded up on purpose: a rounding rupee should sit with the platform, which
  // has to pay the gateway, rather than with the balance collected in cash.
  const advanceAmount = Math.min(totalAmount, Math.ceil((totalAmount * advancePercent) / 100));
  const balanceDue = totalAmount - advanceAmount;

  const commissionRate = Number(settings?.defaultCommission) || 0;
  const adminCommission = Math.max(
    round((baseAmount * commissionRate) / 100),
    PaymentConfig.minCommission,
  );

  // What the operator ends up with once the platform has taken its cut. Part of
  // it arrives through the wallet and part as the balance they collect in
  // person — see settlementSplit below.
  const operatorPayout = totalAmount - taxes - adminCommission;

  return {
    adults,
    children,
    totalTravellers: adults + children,
    pricePerPerson,
    childPricePerPerson,
    baseAmount,
    discount: appliedDiscount,
    taxRate,
    taxes,
    totalAmount,
    advancePercent,
    advanceAmount,
    balanceDue,
    adminCommission,
    operatorPayout,
  };
};

/**
 * How the online advance is divided once it lands.
 *
 * The platform always keeps commission + tax, and the operator always ends up
 * with `operatorPayout`. Since the operator collects `balanceDue` in cash
 * directly, the wallet only has to settle the difference:
 *
 *   advance >= platformCut  → credit the operator what is left over
 *   advance <  platformCut  → the advance did not cover the platform's cut, so
 *                             recover the shortfall from the operator's wallet
 *                             (hotel does exactly this for pay-at-property)
 *
 * Either way: walletMovement + balanceDue === operatorPayout.
 */
export const settlementSplit = ({ advanceAmount, taxes, adminCommission }) => {
  const platformCut = taxes + adminCommission;
  const net = advanceAmount - platformCut;

  return net >= 0
    ? { direction: 'credit', amount: net, platformCut }
    : { direction: 'debit', amount: Math.abs(net), platformCut };
};

export default { quoteBooking, settlementSplit };
