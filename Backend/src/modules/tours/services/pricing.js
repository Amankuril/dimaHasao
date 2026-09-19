/**
 * The only place a tour booking's money is calculated.
 *
 * The v1 booking screen used to work out its own total in the browser. That is
 * the same shape as the food bug where Razorpay was handed one figure while
 * verification expected another — so the screen now asks for a quote and only
 * ever displays what comes back.
 *
 * Tours are single-vendor: the district runs them itself, exactly as it runs
 * its festivals. There is no operator to pay, so there is no commission to
 * take and no payout to settle — the customer pays in full and the whole
 * amount belongs to the platform.
 */

const round = (value) => Math.round(Number(value) || 0);

/**
 * Price a booking.
 *
 * `advanceAmount` and `balanceDue` are kept in the response even though a tour
 * is now paid in full: the approved booking screen reads `advanceAmount` as
 * "payable now" and prints `balanceDue` on the confirmation. Holding them at
 * `total` and `0` keeps that screen honest without it having to know the
 * settlement model changed.
 *
 * @param {object} pkg       TourPackage (needs pricePerPerson, childPricePercent)
 * @param {object} party     { adults, children }
 * @param {object} settings  ToursSettings (taxRate)
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
    // Paid in full at booking; nothing is collected later.
    advancePercent: 100,
    advanceAmount: totalAmount,
    balanceDue: 0,
  };
};

export default { quoteBooking };
