/**
 * BUSINESS — the rules that decide what a customer is charged and what they get.
 *
 * These are the cases where a bug costs money rather than convenience:
 * inventory that oversells, prices the client can dictate, discounts that
 * outlive their rules, and passes that work twice at the gate.
 */
import { get, post, patch } from '../lib/http.js';
import { check, blocked, module_, SEVERITY } from '../lib/runner.js';

export const run = async ({ primary, secondary, admin }) => {
  module_('business');
  const cleanup = [];

  if (!primary?.token) { blocked('BIZ-ALL', 'business suite', 'no consumer session'); return; }

  /* ---------- inventory cannot oversell, even concurrently ---------- */
  const festivals = await get('/festivals');
  const festival = festivals.body?.festivals?.[0];
  const category = festival?.ticketCategories?.find((c) => !c.isSoldOut);

  if (!category) {
    blocked('BIZ-100', 'seat inventory', 'no bookable category');
  } else {
    const before = category.remainingTickets;

    // Five simultaneous baskets for one seat each. The counter must move by
    // exactly five — no more (oversold) and no less (a lost take).
    const baskets = await Promise.all(Array.from({ length: 5 }, () =>
      post('/festivals/bookings/checkout', {
        token: primary.token,
        body: { festivalId: festival._id, items: [{ ticketCategoryId: category._id, ticketCount: 1 }],
                attendee: { name: 'QA Concurrency', phone: '9999900003' } },
      })));
    const groups = baskets.map((b) => b.body?.orderGroupId).filter(Boolean);
    for (const g of groups) cleanup.push(() => post(`/festivals/bookings/checkout/${g}/release`, { token: primary.token }));

    const after = (await get(`/festivals/${festival._id}`)).body?.festival
      ?.ticketCategories?.find((c) => String(c._id) === String(category._id));
    check('BIZ-100', 'concurrent baskets take exactly what they claim',
      before - after.remainingTickets === groups.length, {
        expected: `${groups.length} seats taken`, actual: `${before - after.remainingTickets}`,
        severity: SEVERITY.CRITICAL,
      });

    // Releasing must hand every one of them back.
    for (const g of groups) await post(`/festivals/bookings/checkout/${g}/release`, { token: primary.token });
    const restored = (await get(`/festivals/${festival._id}`)).body?.festival
      ?.ticketCategories?.find((c) => String(c._id) === String(category._id));
    check('BIZ-101', 'releasing a basket returns every seat', restored.remainingTickets === before, {
      expected: `${before} left`, actual: `${restored.remainingTickets}`, severity: SEVERITY.HIGH,
    });

    // Over the per-order cap.
    const overCap = await post('/festivals/bookings/checkout', {
      token: primary.token,
      body: { festivalId: festival._id,
              items: [{ ticketCategoryId: category._id, ticketCount: category.maxPerBooking + 1 }] },
    });
    check('BIZ-102', 'per-order cap enforced', overCap.status >= 400, {
      expected: '4xx', actual: overCap.status, severity: SEVERITY.MEDIUM,
    });
    if (overCap.body?.orderGroupId) await post(`/festivals/bookings/checkout/${overCap.body.orderGroupId}/release`, { token: primary.token });
  }

  /* ---------- a closed category is not on sale ---------- */
  if (admin?.token) {
    const adminFestivals = await get('/festivals/admin', { token: admin.token });
    const withClosed = adminFestivals.body?.festivals
      ?.find((f) => (f.ticketCategories || []).some((c) => c.isActive === false));
    if (!withClosed) {
      blocked('BIZ-110', 'closed categories are hidden from buyers', 'no closed category in the data');
    } else {
      const closed = withClosed.ticketCategories.filter((c) => c.isActive === false);
      const publicView = await get(`/festivals/${withClosed._id}`);
      const publicIds = (publicView.body?.festival?.ticketCategories || []).map((c) => String(c._id));
      check('BIZ-110', 'closed categories absent from the public payload',
        closed.every((c) => !publicIds.includes(String(c._id))), {
          expected: 'hidden', actual: 'offered for sale', severity: SEVERITY.HIGH,
        });

      const buyClosed = await post('/festivals/bookings/checkout', {
        token: primary.token,
        body: { festivalId: withClosed._id, items: [{ ticketCategoryId: closed[0]._id, ticketCount: 1 }] },
      });
      check('BIZ-111', 'a closed category cannot be bought', buyClosed.status >= 400, {
        expected: '4xx', actual: buyClosed.status, severity: SEVERITY.HIGH,
      });
    }
  } else {
    blocked('BIZ-110', 'closed categories are hidden from buyers', 'no admin session');
  }

  /* ---------- a pass is scanned once ---------- */
  blocked('BIZ-120', 'a paid pass is refused on a second gate scan',
    'needs a completed payment; covered manually against a signed Razorpay callback');

  /* ---------- coupons obey their own rules ---------- */
  if (!admin?.token) {
    blocked('BIZ-130', 'coupon rules', 'no admin session');
  } else {
    const code = `QABIZ${Date.now().toString().slice(-6)}`;
    const made = await post('/tours/admin/offers', {
      token: admin.token,
      body: { code, title: 'QA business probe', discountType: 'percentage', discountValue: 20,
              maxDiscount: 500, minBookingAmount: 100000, usageLimit: 5, userLimit: 1 },
    });
    const offerId = made.body?.offer?._id;
    if (!offerId) {
      blocked('BIZ-130', 'coupon rules', `could not create an offer (${made.status})`);
    } else {
      cleanup.push(() => post(`/tours/admin/offers/${offerId}/delete-probe`, { token: admin.token }));

      const packages = await get('/tours/packages?limit=1');
      const pkg = packages.body?.packages?.[0];
      if (!pkg) {
        blocked('BIZ-130', 'coupon rules', 'no tour package to quote against');
      } else {
        const adults = Math.max(1, Number(pkg.groupSizeMin) || 1);
        const travelDate = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
        const quoted = await post('/tours/bookings/quote', {
          token: primary.token,
          body: { packageId: pkg._id, travelDate, adults, children: 0, couponCode: code },
        });
        // The minimum is set far above any real fare, so it must be refused.
        check('BIZ-130', 'a coupon below its minimum spend is refused',
          quoted.body?.coupon?.discount === 0 && Boolean(quoted.body?.coupon?.reason), {
            expected: 'no discount, with a reason',
            actual: `discount ${quoted.body?.coupon?.discount}, reason ${quoted.body?.coupon?.reason || 'none'}`,
            severity: SEVERITY.HIGH,
          });

        const unknown = await post('/tours/bookings/quote', {
          token: primary.token,
          body: { packageId: pkg._id, travelDate, adults, children: 0, couponCode: 'DEFINITELY-NOT-A-CODE' },
        });
        check('BIZ-131', 'an unknown coupon still prices the trip',
          unknown.status === 200 && unknown.body?.coupon?.discount === 0, {
            expected: '200 with no discount', actual: `${unknown.status}, discount ${unknown.body?.coupon?.discount}`,
            severity: SEVERITY.MEDIUM,
          });
      }
    }
  }

  /* ---------- the quote a screen shows is the amount charged ---------- */
  const packages = await get('/tours/packages?limit=1');
  const pkg = packages.body?.packages?.[0];
  if (!pkg) {
    blocked('BIZ-140', 'quote matches the booking', 'no tour package');
  } else {
    const adults = Math.max(1, Number(pkg.groupSizeMin) || 1);
    const travelDate = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
    const quote = (await post('/tours/bookings/quote', {
      token: primary.token, body: { packageId: pkg._id, travelDate, adults, children: 0 },
    })).body?.quote;

    const booked = await post('/tours/bookings', {
      token: primary.token,
      body: { packageId: pkg._id, travelDate, adults, children: 0,
              travellerContact: { name: 'QA Business', phone: '9999900004' } },
    });
    const booking = booked.body?.booking;
    if (!quote || !booking) {
      blocked('BIZ-140', 'quote matches the booking', `quote ${Boolean(quote)}, booking ${booked.status}`);
    } else {
      check('BIZ-140', 'the booking charges what the quote showed',
        booking.totalAmount === quote.totalAmount && booking.advanceAmount === quote.advanceAmount, {
          expected: `total ${quote.totalAmount}, advance ${quote.advanceAmount}`,
          actual: `total ${booking.totalAmount}, advance ${booking.advanceAmount}`,
          severity: SEVERITY.CRITICAL,
        });
      check('BIZ-141', 'the settlement identity holds',
        booking.totalAmount === booking.taxes + booking.adminCommission + booking.operatorPayout, {
          expected: 'total = taxes + commission + payout',
          actual: `${booking.totalAmount} vs ${booking.taxes} + ${booking.adminCommission} + ${booking.operatorPayout}`,
          severity: SEVERITY.CRITICAL,
        });
      check('BIZ-142', 'a new booking is unpaid until it is paid',
        booking.paymentStatus === 'pending' && !booking.amountPaid, {
          expected: 'pending, nothing paid', actual: `${booking.paymentStatus}, paid ${booking.amountPaid}`,
          severity: SEVERITY.CRITICAL,
        });
    }
  }

  /* ---------- taxi fares are the server's, not the caller's ---------- */
  const vehicles = await get('/taxi/users/vehicle-types').catch(() => null);
  const vehicleTypeId = vehicles?.body?.data?.[0]?._id
    || vehicles?.body?.data?.results?.[0]?._id
    || null;

  if (!vehicleTypeId) {
    blocked('BIZ-150', 'taxi fare is priced by the server', 'no vehicle type available to quote');
  } else {
    const estimate = await post('/taxi/rides/fare-estimate', {
      token: primary.token,
      body: { vehicleTypeId, estimatedDistanceMeters: 50000, estimatedDurationMinutes: 90 },
    });

    check('BIZ-150', 'the server will quote a fare', estimate.status === 200, {
      expected: '200', actual: estimate.status, severity: SEVERITY.HIGH,
    });

    if (!estimate.body?.data?.priced) {
      // Enforcement needs a tariff; without one the platform says so plainly
      // and the submitted fare stands, which is the documented fallback.
      blocked('BIZ-151', 'a fare below the tariff is refused',
        'no tariff configured for this vehicle — enforcement is inactive until one exists');
    } else {
      const quoted = estimate.body.data.total;
      const underpriced = await post('/taxi/rides', {
        token: primary.token,
        body: {
          pickup: [93.0167, 25.1667], drop: [93.5, 25.5],
          pickupAddress: 'QA pickup', dropAddress: 'QA drop',
          fare: 1, estimatedDistanceMeters: 50000, estimatedDurationMinutes: 90,
          vehicleTypeId, paymentMethod: 'cash',
        },
      });
      check('BIZ-151', 'a fare below the tariff is refused', underpriced.status >= 400, {
        expected: `4xx (tariff says about ₹${quoted})`, actual: underpriced.status, severity: SEVERITY.CRITICAL,
      });
      const rideId = underpriced.body?.data?.ride?._id || underpriced.body?.data?._id;
      if (rideId) {
        await patch(`/taxi/rides/${rideId}/cancel`, { token: primary.token, body: { reason: 'QA cleanup' } });
      }
    }
  }

  for (const undo of cleanup) { try { await undo(); } catch { /* best effort */ } }
};
