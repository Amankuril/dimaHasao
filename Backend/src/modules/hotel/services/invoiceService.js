/**
 * Booking invoices.
 *
 * The scope of work asks for a digital invoice on every hotel booking. This
 * builds it from what the booking recorded at the time of sale — the nightly
 * breakdown, taxes and discount — rather than recomputing from the property,
 * because room rates and seasons change afterwards and a reissued invoice must
 * still match what the guest actually paid.
 */

/** Invoice numbers are derived, not stored: the booking id already is unique. */
export const invoiceNumberFor = (booking) => {
    const id = String(booking?.bookingId || booking?._id || '').replace(/^BK-/, '');
    return `INV-${id}`;
};

const money = (value) => Math.round(Number(value) || 0);

/**
 * Rebuild the nightly lines for a booking made before nightlyBreakdown existed,
 * so old bookings still produce a usable invoice instead of an empty table.
 */
const fallbackNights = (booking) => {
    const nights = Number(booking?.totalNights) || 0;
    if (nights <= 0) return [];

    const rate = money((Number(booking?.baseAmount) || 0) / nights);
    const start = booking?.checkInDate ? new Date(booking.checkInDate) : null;

    return Array.from({ length: nights }, (_, index) => ({
        date: start ? new Date(start.getTime() + index * 86400000) : null,
        rate,
        season: null,
        units: 1,
        amount: rate,
    }));
};

export const buildInvoice = ({ booking, property, roomType, guest, partner, settings }) => {
    const nights =
        Array.isArray(booking?.nightlyBreakdown) && booking.nightlyBreakdown.length > 0
            ? booking.nightlyBreakdown
            : fallbackNights(booking);

    const baseAmount = money(booking?.baseAmount);
    const extraCharges = money(booking?.extraCharges);
    const discount = money(booking?.discount);
    const taxes = money(booking?.taxes);
    const total = money(booking?.totalAmount);
    const gstRate = Number(settings?.taxRate) || 0;

    const lineItems = [
        ...nights.map((night) => ({
            kind: 'night',
            description: night.season
                ? `${roomType?.name || 'Room'} — ${night.season}`
                : roomType?.name || 'Room',
            date: night.date || null,
            units: night.units || 1,
            rate: money(night.rate),
            amount: money(night.amount),
        })),
    ];

    if (extraCharges > 0) {
        lineItems.push({
            kind: 'extra',
            description: 'Extra guest charges',
            date: null,
            units: 1,
            rate: extraCharges,
            amount: extraCharges,
        });
    }

    return {
        invoiceNumber: invoiceNumberFor(booking),
        issuedAt: booking?.createdAt || new Date(),
        bookingId: booking?.bookingId || String(booking?._id || ''),
        bookingStatus: booking?.bookingStatus,
        paymentStatus: booking?.paymentStatus,
        paymentMethod: booking?.paymentMethod || null,

        seller: {
            name: property?.propertyName || 'Property',
            type: property?.propertyType || null,
            address: property?.address || null,
            contactNumber: property?.contactNumber || partner?.phone || null,
            partnerName: partner?.name || null,
        },

        buyer: {
            name: guest?.name || 'Guest',
            phone: guest?.phone || null,
            email: guest?.email || null,
        },

        stay: {
            checkInDate: booking?.checkInDate || null,
            checkOutDate: booking?.checkOutDate || null,
            totalNights: Number(booking?.totalNights) || nights.length,
            roomType: roomType?.name || null,
            bookingUnit: booking?.bookingUnit || 'room',
            adults: booking?.guests?.adults ?? null,
            children: booking?.guests?.children ?? null,
        },

        lineItems,

        totals: {
            subtotal: baseAmount + extraCharges,
            discount,
            couponCode: booking?.couponCode || null,
            taxableAmount: baseAmount + extraCharges - discount,
            gstRate,
            taxes,
            total,
            amountDue: booking?.paymentStatus === 'paid' ? 0 : total,
        },

        // Shown to the partner and admin only; the guest's copy omits it.
        settlement: {
            commission: money(booking?.adminCommission),
            partnerPayout: money(booking?.partnerPayout),
        },
    };
};
