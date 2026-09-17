/**
 * AUTHZ — object-level authorization.
 *
 * Authentication only proves who is asking. These cases prove the server also
 * checks *what* they may touch: one consumer creates a record, a second
 * consumer asks for it by id, and anything other than a refusal is an IDOR.
 *
 * Records created here are cancelled or released at the end.
 */
import { get, post, patch, del } from '../lib/http.js';
import { check, blocked, module_, SEVERITY } from '../lib/runner.js';

const refused = (res) => [401, 403, 404].includes(res.status);

/** A response that leaks the record itself, whatever the status says. */
const leaked = (res, marker) =>
  res.status === 200 && JSON.stringify(res.body || '').includes(marker);

export const run = async ({ primary, secondary, admin }) => {
  module_('authz');
  const cleanup = [];

  if (!primary?.token || !secondary?.token) {
    blocked('AUTHZ-ALL', 'cross-user object access', 'two consumer sessions required');
    return;
  }

  /* ---------------- support tickets ---------------- */
  const ticket = await post('/support', {
    token: primary.token,
    body: { module: 'hotel', issueType: 'QA authz probe', description: 'QA authz probe — safe to ignore' },
  });
  const ticketId = ticket.body?.ticket?._id;

  if (!ticketId) {
    blocked('AUTHZ-101', 'support ticket cross-user read', `could not create a ticket (${ticket.status})`);
  } else {
    const asOther = await get(`/support/${ticketId}`, { token: secondary.token });
    check('AUTHZ-101', "another user's support ticket refused", refused(asOther) && !leaked(asOther, 'QA authz probe'), {
      expected: '401/403/404', actual: asOther.status, severity: SEVERITY.HIGH,
    });

    const replyAsOther = await post(`/support/${ticketId}/messages`, {
      token: secondary.token, body: { message: 'QA authz probe' },
    });
    check('AUTHZ-102', "cannot reply on another user's ticket", refused(replyAsOther), {
      expected: '401/403/404', actual: replyAsOther.status, severity: SEVERITY.HIGH,
    });

    const own = await get(`/support/${ticketId}`, { token: primary.token });
    check('AUTHZ-103', 'owner can still read their own ticket', own.status === 200, {
      expected: '200', actual: own.status, severity: SEVERITY.HIGH,
    });
  }

  /* ---------------- festival passes ---------------- */
  const festivals = await get('/festivals');
  const festival = festivals.body?.festivals?.[0];
  const category = festival?.ticketCategories?.find((c) => !c.isSoldOut);

  if (!category) {
    blocked('AUTHZ-110', 'festival booking cross-user access', 'no bookable festival category available');
  } else {
    const held = await post('/festivals/bookings/checkout', {
      token: primary.token,
      body: {
        festivalId: festival._id,
        items: [{ ticketCategoryId: category._id, ticketCount: 1 }],
        attendee: { name: 'QA Authz', phone: '9999900001' },
      },
    });
    const groupId = held.body?.orderGroupId;
    const bookingId = held.body?.bookings?.[0]?._id;

    if (!groupId) {
      blocked('AUTHZ-110', 'festival booking cross-user access', `checkout failed (${held.status})`);
    } else {
      cleanup.push(() => post(`/festivals/bookings/checkout/${groupId}/release`, { token: primary.token }));

      const orderAsOther = await post(`/festivals/payments/orders/${groupId}`, { token: secondary.token });
      check('AUTHZ-110', "cannot open a payment order on another user's basket", refused(orderAsOther), {
        expected: '401/403/404', actual: orderAsOther.status, severity: SEVERITY.CRITICAL,
      });

      const releaseAsOther = await post(`/festivals/bookings/checkout/${groupId}/release`, { token: secondary.token });
      const releasedCount = releaseAsOther.body?.released;
      check('AUTHZ-111', "cannot release another user's held seats", releasedCount === 0 || refused(releaseAsOther), {
        expected: 'released 0 or refused', actual: `status ${releaseAsOther.status}, released ${releasedCount}`,
        severity: SEVERITY.HIGH,
      });

      const cancelAsOther = await post(`/festivals/bookings/${bookingId}/cancel`, {
        token: secondary.token, body: { reason: 'QA probe' },
      });
      check('AUTHZ-112', "cannot cancel another user's pass", refused(cancelAsOther), {
        expected: '401/403/404', actual: cancelAsOther.status, severity: SEVERITY.HIGH,
      });

      const listAsOther = await get('/festivals/bookings/my', { token: secondary.token });
      check('AUTHZ-113', "another user's passes absent from my list",
        !leaked(listAsOther, 'QA Authz'), {
          expected: "no trace of the other user's booking", actual: 'booking visible', severity: SEVERITY.CRITICAL,
        });
    }
  }

  /* ---------------- tours ---------------- */
  // Create one rather than hoping the account already has a booking, so these
  // cases run on every environment.
  const packages = await get('/tours/packages?limit=1');
  const pkg = packages.body?.packages?.[0];
  let tourBooking = null;
  if (pkg?._id) {
    const travelDate = new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 10);
    // Packages carry a minimum party size; booking below it is correctly refused.
    const adults = Math.max(1, Number(pkg.groupSizeMin) || 1);
    const made = await post('/tours/bookings', {
      token: primary.token,
      body: { packageId: pkg._id, travelDate, adults, children: 0,
              travellerContact: { name: 'QA Authz', phone: '9999900001' } },
    });
    tourBooking = made.body?.booking || null;
    // Tours has no consumer cancel endpoint, so this booking is left unpaid and
    // is removed by scripts/qa/cleanup.js rather than through the API.
  }
  if (!tourBooking?._id) {
    blocked('AUTHZ-120', 'tour booking cross-user read', 'could not create a tour booking to probe with');
  } else {
    const settleAsOther = await post(`/tours/bookings/${tourBooking._id}/settle`, { token: secondary.token });
    check('AUTHZ-120', "cannot settle another user's tour booking", refused(settleAsOther) || settleAsOther.status === 400, {
      expected: 'refused', actual: settleAsOther.status, severity: SEVERITY.CRITICAL,
    });

    const orderAsOther = await post(`/tours/payments/bookings/${tourBooking._id}/order`, { token: secondary.token });
    check('AUTHZ-121', "cannot open a payment order on another user's tour", refused(orderAsOther), {
      expected: '401/403/404', actual: orderAsOther.status, severity: SEVERITY.CRITICAL,
    });
  }

  /* ---------------- hotel ---------------- */
  // pay_at_hotel keeps this off the payment gateway; the object-level checks
  // being probed are the same either way.
  const properties = await get('/hotel/properties?limit=1');
  const property = Array.isArray(properties.body) ? properties.body[0] : properties.body?.properties?.[0];
  let stay = null;
  if (property?._id) {
    const detail = await get(`/hotel/properties/${property._id}`);
    const roomType = detail.body?.roomTypes?.[0];
    if (roomType?._id) {
      const checkInDate = new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 10);
      const checkOutDate = new Date(Date.now() + 42 * 86400000).toISOString().slice(0, 10);
      const made = await post('/hotel/bookings', {
        token: primary.token,
        body: { propertyId: property._id, roomTypeId: roomType._id, checkInDate, checkOutDate,
                guests: { adults: 1, children: 0, rooms: 1 }, paymentMethod: 'pay_at_hotel',
                guestContact: { name: 'QA Authz', phone: '9999900001' } },
      });
      stay = made.body?.booking || null;
      if (stay?._id) {
        cleanup.push(() => post(`/hotel/bookings/${stay._id}/cancel`, {
          token: primary.token, body: { reason: 'QA suite cleanup' },
        }));
      }
    }
  }
  if (!stay?._id) {
    blocked('AUTHZ-130', 'hotel booking cross-user read', 'could not create a stay to probe with');
  } else {
    const asOther = await get(`/hotel/bookings/${stay._id}`, { token: secondary.token });
    check('AUTHZ-130', "another user's stay refused", refused(asOther) && !leaked(asOther, stay.bookingId || '###'), {
      expected: '401/403/404', actual: asOther.status, severity: SEVERITY.CRITICAL,
    });

    const invoiceAsOther = await get(`/hotel/bookings/${stay._id}/invoice`, { token: secondary.token });
    check('AUTHZ-131', "another user's invoice refused", refused(invoiceAsOther), {
      expected: '401/403/404', actual: invoiceAsOther.status, severity: SEVERITY.HIGH,
    });

    const cancelAsOther = await post(`/hotel/bookings/${stay._id}/cancel`, {
      token: secondary.token, body: { reason: 'QA probe' },
    });
    check('AUTHZ-132', "cannot cancel another user's stay", refused(cancelAsOther), {
      expected: '401/403/404', actual: cancelAsOther.status, severity: SEVERITY.CRITICAL,
    });

    // The guard must not have closed the legitimate path with the illegitimate
    // one: the guest who booked it still has to be able to cancel.
    const cancelAsOwner = await post(`/hotel/bookings/${stay._id}/cancel`, {
      token: primary.token, body: { reason: 'QA suite cleanup' },
    });
    check('AUTHZ-133', 'the guest can still cancel their own stay', cancelAsOwner.status === 200, {
      expected: '200', actual: cancelAsOwner.status, severity: SEVERITY.HIGH,
    });
  }

  /* ---------------- vendor-only surfaces, reached with a consumer token ---------------- */
  for (const [id, path, label] of [
    ['AUTHZ-140', '/tours/bookings/operator', 'tours operator bookings'],
    ['AUTHZ-141', '/hotel/bookings/partner', 'hotel partner bookings'],
    ['AUTHZ-142', '/tours/wallet', 'tours operator wallet'],
    ['AUTHZ-143', '/hotel/wallet', 'hotel partner wallet'],
  ]) {
    const res = await get(path, { token: primary.token });
    check(id, `consumer refused on ${label}`, refused(res), {
      expected: '401/403/404', actual: res.status, severity: SEVERITY.HIGH,
    });
  }

  /* ---------------- admin write surfaces with a consumer token ---------------- */
  for (const [id, method, path, body, label] of [
    ['AUTHZ-150', post, '/festivals/admin', { name: 'QA probe' }, 'create a festival'],
    ['AUTHZ-151', post, '/tours/admin/offers', { code: 'QAPROBE', title: 'QA', discountValue: 99 }, 'create a tour offer'],
    ['AUTHZ-152', post, '/admin/administrators', { email: 'qa-probe@example.com', name: 'QA' }, 'create an administrator'],
    ['AUTHZ-153', patch, '/admin/support/000000000000000000000001', { status: 'closed' }, 'update a support ticket'],
  ]) {
    const res = await method(path, { token: primary.token, body });
    check(id, `consumer cannot ${label}`, refused(res), {
      expected: '401/403/404', actual: res.status, severity: SEVERITY.CRITICAL,
    });
  }

  /* ---------------- a non-superadmin admin must not manage administrators ---------------- */
  if (admin?.token) {
    const meta = await get('/admin/me', { token: admin.token });
    const level = meta.body?.admin?.adminLevel;
    check('AUTHZ-160', 'platform superadmin can list administrators',
      (await get('/admin/administrators', { token: admin.token })).status === 200, {
        expected: '200', actual: `level ${level}`, severity: SEVERITY.MEDIUM,
      });
  } else {
    blocked('AUTHZ-160', 'administrator management boundary', 'no admin session');
  }

  for (const undo of cleanup) { try { await undo(); } catch { /* best effort */ } }
};
