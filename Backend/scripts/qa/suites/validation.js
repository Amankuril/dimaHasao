/**
 * VALIDATION — field-level input rules, checked on the server.
 *
 * Frontend validation is a convenience; these cases bypass it entirely. A
 * malformed request must be refused with a 4xx, never stored and never a 500 —
 * a 500 on bad input is an unhandled cast, which is its own defect.
 */
import { get, post, put } from '../lib/http.js';
import { check, blocked, module_, SEVERITY } from '../lib/runner.js';

const rejected = (res) => res.status >= 400 && res.status < 500;
const crashed = (res) => res.status >= 500;

export const run = async ({ primary, admin }) => {
  module_('validation');

  if (!primary?.token) { blocked('VAL-ALL', 'validation suite', 'no consumer session'); return; }

  /* ---------- required fields and wrong types ---------- */
  const festivals = await get('/festivals');
  const festival = festivals.body?.festivals?.[0];
  const category = festival?.ticketCategories?.find((c) => !c.isSoldOut);

  if (!category) {
    blocked('VAL-100', 'festival booking validation', 'no bookable category');
  } else {
    const cases = [
      ['VAL-100', 'empty basket refused', { festivalId: festival._id, items: [] }],
      ['VAL-101', 'missing festivalId refused', { items: [{ ticketCategoryId: category._id, ticketCount: 1 }] }],
      ['VAL-102', 'zero tickets refused', { festivalId: festival._id, items: [{ ticketCategoryId: category._id, ticketCount: 0 }] }],
      ['VAL-103', 'negative tickets refused', { festivalId: festival._id, items: [{ ticketCategoryId: category._id, ticketCount: -5 }] }],
      ['VAL-104', 'non-numeric ticket count refused', { festivalId: festival._id, items: [{ ticketCategoryId: category._id, ticketCount: 'many' }] }],
      ['VAL-105', 'unknown category id refused', { festivalId: festival._id, items: [{ ticketCategoryId: '000000000000000000000001', ticketCount: 1 }] }],
      ['VAL-106', 'malformed object id refused', { festivalId: 'not-an-id', items: [{ ticketCategoryId: category._id, ticketCount: 1 }] }],
      ['VAL-107', 'duplicate category refused', { festivalId: festival._id, items: [
        { ticketCategoryId: category._id, ticketCount: 1 }, { ticketCategoryId: category._id, ticketCount: 1 }] }],
      ['VAL-108', 'absurd ticket count refused', { festivalId: festival._id, items: [{ ticketCategoryId: category._id, ticketCount: 999999 }] }],
    ];

    for (const [id, title, body] of cases) {
      const res = await post('/festivals/bookings/checkout', { token: primary.token, body });
      const ok = rejected(res);
      check(id, title, ok, {
        expected: '4xx', actual: crashed(res) ? `${res.status} (unhandled)` : res.status,
        severity: crashed(res) ? SEVERITY.HIGH : SEVERITY.MEDIUM,
      });
      // A refused request must not have left a booking behind.
      if (res.body?.orderGroupId) {
        await post(`/festivals/bookings/checkout/${res.body.orderGroupId}/release`, { token: primary.token });
      }
    }
  }

  /* ---------- dates ---------- */
  const properties = await get('/hotel/properties?limit=1');
  const property = Array.isArray(properties.body) ? properties.body[0] : properties.body?.properties?.[0];
  const detail = property?._id ? await get(`/hotel/properties/${property._id}`) : null;
  const roomType = detail?.body?.roomTypes?.[0];

  if (!roomType) {
    blocked('VAL-120', 'stay date validation', 'no room type available');
  } else {
    const iso = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
    const stayCases = [
      ['VAL-120', 'check-out before check-in refused', iso(20), iso(18)],
      ['VAL-121', 'same-day check-in and check-out refused', iso(20), iso(20)],
      ['VAL-122', 'check-in in the past refused', iso(-10), iso(-8)],
      ['VAL-123', 'unparseable dates refused', 'not-a-date', 'also-not-a-date'],
    ];
    for (const [id, title, checkInDate, checkOutDate] of stayCases) {
      const res = await post('/hotel/bookings/quote', {
        token: primary.token,
        body: { propertyId: property._id, roomTypeId: roomType._id, checkInDate, checkOutDate,
                guests: { adults: 1, children: 0, rooms: 1 } },
      });
      check(id, title, rejected(res), {
        expected: '4xx', actual: crashed(res) ? `${res.status} (unhandled)` : res.status,
        severity: crashed(res) ? SEVERITY.HIGH : SEVERITY.MEDIUM,
      });
    }
  }

  /* ---------- identity fields ---------- */
  for (const [id, title, phone] of [
    ['VAL-130', 'empty phone refused', ''],
    ['VAL-131', 'short phone refused', '123'],
    ['VAL-132', 'alphabetic phone refused', 'abcdefghij'],
    ['VAL-133', 'absurdly long phone refused', '9'.repeat(200)],
  ]) {
    const res = await post('/auth/otp/request', { body: { audience: 'user', phone } });
    check(id, title, rejected(res), {
      expected: '4xx', actual: crashed(res) ? `${res.status} (unhandled)` : res.status, severity: SEVERITY.MEDIUM,
    });
  }

  /* ---------- admin-side numeric and string rules ---------- */
  if (!admin?.token) {
    blocked('VAL-140', 'tour offer validation', 'no admin session');
  } else {
    const offerCases = [
      ['VAL-140', 'offer with no code refused', { title: 'QA', discountValue: 10 }],
      ['VAL-141', 'offer with no title refused', { code: 'QAV1', discountValue: 10 }],
      ['VAL-142', 'zero discount refused', { code: 'QAV2', title: 'QA', discountValue: 0 }],
      ['VAL-143', 'negative discount refused', { code: 'QAV3', title: 'QA', discountValue: -20 }],
      ['VAL-144', 'percentage over 100 refused', { code: 'QAV4', title: 'QA', discountType: 'percentage', discountValue: 150 }],
      ['VAL-145', 'end before start refused', { code: 'QAV5', title: 'QA', discountValue: 10,
        startDate: '2027-06-01', endDate: '2027-01-01' }],
    ];
    for (const [id, title, body] of offerCases) {
      const res = await post('/tours/admin/offers', { token: admin.token, body });
      check(id, title, rejected(res), {
        expected: '4xx', actual: crashed(res) ? `${res.status} (unhandled)` : res.status,
        severity: crashed(res) ? SEVERITY.HIGH : SEVERITY.MEDIUM,
      });
      // Anything that slipped through is removed so the suite stays repeatable.
      if (res.body?.offer?._id) await post(`/tours/admin/offers/${res.body.offer._id}`, { token: admin.token });
    }

    const festivalCases = [
      ['VAL-150', 'festival with no name refused', { heroImage: 'x', ticketCategories: [{ name: 'A', price: 1, totalTickets: 1 }] }],
      ['VAL-151', 'festival with no categories refused', { name: 'QA', heroImage: 'x', ticketCategories: [] }],
      ['VAL-152', 'category with no seats refused', { name: 'QA', heroImage: 'x', ticketCategories: [{ name: 'A', price: 10, totalTickets: 0 }] }],
      ['VAL-153', 'booking window closing before it opens refused', {
        name: 'QA', heroImage: 'x', ticketCategories: [{ name: 'A', price: 10, totalTickets: 5 }],
        bookingOpensAt: '2027-06-01T10:00', bookingClosesAt: '2027-01-01T10:00' }],
    ];
    for (const [id, title, body] of festivalCases) {
      const res = await post('/festivals/admin', { token: admin.token, body });
      check(id, title, rejected(res), {
        expected: '4xx', actual: crashed(res) ? `${res.status} (unhandled)` : res.status,
        severity: crashed(res) ? SEVERITY.HIGH : SEVERITY.MEDIUM,
      });
    }
  }

  /* ---------- pagination bounds ---------- */
  for (const [id, title, path] of [
    ['VAL-160', 'negative page handled', '/festivals?page=-5'],
    ['VAL-161', 'absurd limit capped', '/tours/packages?limit=999999'],
    ['VAL-162', 'non-numeric page handled', '/tours/packages?page=abc'],
  ]) {
    const res = await get(path);
    check(id, title, res.status === 200, {
      expected: '200 with sane defaults', actual: res.status, severity: SEVERITY.LOW,
    });
  }
};
