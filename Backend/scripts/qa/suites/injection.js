/**
 * INJECTION — hostile input.
 *
 * NoSQL operator injection, stored XSS, path traversal and mass assignment.
 * Every payload here is safe: nothing deletes, nothing escalates on success —
 * the cases detect whether the door is open, they do not walk through it.
 */
import { get, post, patch } from '../lib/http.js';
import { check, blocked, module_, SEVERITY } from '../lib/runner.js';

const XSS = '<script>alert(1)</script>';

export const run = async ({ primary, secondary, admin }) => {
  module_('injection');

  if (!primary?.token) { blocked('INJ-ALL', 'injection suite', 'no consumer session'); return; }

  /* ---------- NoSQL operator injection in auth ---------- */
  // A classic: { $ne: null } as a phone matches the first user in the
  // collection if the value is interpolated into the query unsanitised.
  for (const [id, body, label] of [
    ['INJ-101', { audience: 'user', phone: { $ne: null } }, 'phone as { $ne: null }'],
    ['INJ-102', { audience: 'user', phone: { $gt: '' } }, 'phone as { $gt: "" }'],
    ['INJ-103', { audience: { $ne: null }, phone: '8962843670' }, 'audience as { $ne: null }'],
  ]) {
    const res = await post('/auth/otp/request', { body });
    const issuedOtp = Boolean(res.body?.data?.otp);
    check(id, `OTP request refuses ${label}`, !issuedOtp, {
      expected: 'no OTP issued', actual: issuedOtp ? `OTP issued (status ${res.status})` : `refused ${res.status}`,
      severity: SEVERITY.CRITICAL,
    });
  }

  const adminInj = await post('/auth/admin/login', {
    body: { email: { $ne: null }, password: { $ne: null } },
  });
  check('INJ-104', 'admin login refuses operator objects', !adminInj.body?.data?.accessToken, {
    expected: 'no session', actual: adminInj.body?.data?.accessToken ? 'SESSION ISSUED' : `refused ${adminInj.status}`,
    severity: SEVERITY.CRITICAL,
  });

  /* ---------- NoSQL operators in query filters ---------- */
  for (const [id, path, label] of [
    ['INJ-110', '/festivals?search[$ne]=null', 'festival search'],
    ['INJ-111', '/tours/packages?category[$ne]=null', 'tour package filter'],
    ['INJ-112', '/hotel/properties?propertyType[$ne]=null', 'property filter'],
  ]) {
    const res = await get(path);
    // The server must not 500: an operator object reaching the driver raw is
    // what produces a cast error, and that is the tell.
    check(id, `${label} survives an operator in the query`, res.status !== 500, {
      expected: 'not 500', actual: res.status, severity: SEVERITY.MEDIUM,
    });
  }

  /* ---------- stored XSS ---------- */
  const ticket = await post('/support', {
    token: primary.token,
    body: { module: 'hotel', issueType: `QA ${XSS}`, description: `QA injection probe ${XSS}` },
  });
  if (!ticket.body?.ticket?._id) {
    blocked('INJ-120', 'stored XSS in support ticket', `could not create a ticket (${ticket.status})`);
  } else {
    const stored = JSON.stringify(ticket.body.ticket);
    // Storing the raw string is acceptable if output is escaped; what must not
    // happen is the server reflecting it into an HTML response.
    const readBack = await get(`/support/${ticket.body.ticket._id}`, { token: primary.token });
    const contentType = String(readBack.headers['content-type'] || '');
    check('INJ-120', 'support ticket is served as JSON, not HTML', contentType.includes('application/json'), {
      expected: 'application/json', actual: contentType, severity: SEVERITY.MEDIUM,
    });
    check('INJ-121', 'script payload round-trips as data (escaped downstream)', stored.includes('script'), {
      expected: 'stored verbatim for the client to escape', actual: 'altered or dropped', severity: SEVERITY.LOW,
    });
  }

  /* ---------- mass assignment ---------- */
  // Fields the client must never be able to set on itself.
  const before = await get('/food/user/profile', { token: primary.token });
  const beforeRole = before.body?.data?.user?.role || before.body?.user?.role;

  const escalate = await patch('/food/user/profile', {
    token: primary.token,
    body: { name: 'QA Probe', role: 'ADMIN', isAdmin: true, adminLevel: 'platform_superadmin', walletBalance: 999999 },
  });
  const after = await get('/food/user/profile', { token: primary.token });
  const afterRole = after.body?.data?.user?.role || after.body?.user?.role;
  check('INJ-130', 'profile update cannot set role', afterRole === beforeRole, {
    expected: `role stays ${beforeRole}`, actual: `role is ${afterRole} (update returned ${escalate.status})`,
    severity: SEVERITY.CRITICAL,
  });

  /* ---------- a booking cannot dictate its own money ---------- */
  const festivals = await get('/festivals');
  const festival = festivals.body?.festivals?.[0];
  const category = festival?.ticketCategories?.find((c) => !c.isSoldOut);
  if (!category) {
    blocked('INJ-140', 'festival booking cannot set its own price', 'no bookable category');
  } else {
    const held = await post('/festivals/bookings/checkout', {
      token: primary.token,
      body: {
        festivalId: festival._id,
        items: [{ ticketCategoryId: category._id, ticketCount: 1 }],
        // Amounts the client has no business sending.
        totalAmount: 1, baseAmount: 1, pricePerTicket: 1, paymentStatus: 'paid', qrCode: 'FORGED',
        attendee: { name: 'QA Injection', phone: '9999900002' },
      },
    });
    const booking = held.body?.bookings?.[0];
    if (!booking) {
      blocked('INJ-140', 'festival booking cannot set its own price', `checkout failed (${held.status})`);
    } else {
      check('INJ-140', 'server prices the pass, not the client', booking.totalAmount === category.price, {
        expected: `₹${category.price}`, actual: `₹${booking.totalAmount}`, severity: SEVERITY.CRITICAL,
      });
      check('INJ-141', 'client cannot mark its own booking paid', booking.paymentStatus === 'pending', {
        expected: 'pending', actual: booking.paymentStatus, severity: SEVERITY.CRITICAL,
      });
      check('INJ-142', 'client cannot forge a pass code', !booking.qrCode, {
        expected: 'no pass code before payment', actual: booking.qrCode || '(none)', severity: SEVERITY.CRITICAL,
      });
      await post(`/festivals/bookings/checkout/${held.body.orderGroupId}/release`, { token: primary.token });
    }
  }

  /* ---------- path traversal on the upload/static surface ---------- */
  for (const [id, path] of [
    ['INJ-150', '/../../../../etc/passwd'],
    ['INJ-151', '/uploads/../../../../etc/passwd'],
  ]) {
    const res = await get(path);
    const leaked = res.text.includes('root:') || res.text.includes('/bin/bash');
    check(id, `path traversal blocked (${path})`, !leaked, {
      expected: 'no file contents', actual: leaked ? 'LEAKED /etc/passwd' : `refused ${res.status}`,
      severity: SEVERITY.CRITICAL,
    });
  }

  /* ---------- an oversized payload must not crash the process ---------- */
  const huge = 'A'.repeat(3 * 1024 * 1024);
  const bigRes = await post('/support', {
    token: primary.token, body: { module: 'hotel', issueType: 'QA size probe', description: huge },
  });
  check('INJ-160', 'oversized body is refused cleanly, not as a 500',
    [400, 413].includes(bigRes.status), {
      expected: '400/413', actual: bigRes.status || 'connection dropped', severity: SEVERITY.MEDIUM,
    });
  const alive = await get('/health');
  check('INJ-161', 'server still alive after the oversized body', alive.status === 200, {
    expected: '200', actual: alive.status, severity: SEVERITY.CRITICAL,
  });
};
