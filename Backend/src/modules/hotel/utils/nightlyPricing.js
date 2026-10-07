/**
 * Per-night rate resolution for a room type.
 *
 * Rooms carry a base `pricePerNight` plus optional `seasonalRates` — named date
 * ranges that override it (peak season, festival weeks, off-season deals). A
 * stay is priced one night at a time so a booking that straddles a season
 * boundary is charged correctly on both sides.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** India Standard Time is UTC+05:30 with no daylight saving. */
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** The longest stay one booking may cover. Each night is a breakdown row. */
export const MAX_STAY_NIGHTS = 30;

/**
 * The IST calendar date of a value, as UTC midnight of that date.
 *
 * Date-only values ("2026-12-24") parse as UTC midnight, which is 05:30 the
 * same day in IST, so they keep their date. A full timestamp sent from an
 * Indian browser (local midnight = 18:30Z the day before) now also lands on
 * the date the guest picked; plain UTC truncation moved it back a day.
 * Returning UTC midnight keeps the stored night dates in the format seasons
 * and invoices already use.
 */
export const istCalendarDay = (value) => {
    const shifted = new Date(new Date(value).getTime() + IST_OFFSET_MS);
    return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
};

const startOfDay = istCalendarDay;

/**
 * Nights between check-in and check-out, counted on IST calendar dates.
 *
 * The single source of the night count. The quote used to count with
 * Math.ceil over raw milliseconds while the price counted calendar days, so
 * two timestamps on the same day gave "1 night" priced at zero nights —
 * totalAmount 0, which the booking flow then treated as already paid.
 */
export const countNights = (checkIn, checkOut) => {
    const nights = Math.round((startOfDay(checkOut) - startOfDay(checkIn)) / MS_PER_DAY);
    return Number.isFinite(nights) ? nights : 0;
};

/**
 * The rate that applies to one night.
 *
 * The first active season covering the night wins, so overlapping ranges are
 * resolved by the order the partner entered them rather than silently picking
 * the cheapest or dearest.
 */
export const rateForNight = (roomType, night) => {
    const base = Number(roomType?.pricePerNight) || 0;
    const seasons = Array.isArray(roomType?.seasonalRates) ? roomType.seasonalRates : [];
    const day = startOfDay(night).getTime();

    for (const season of seasons) {
        if (season?.isActive === false) continue;
        if (!season?.startDate || !season?.endDate) continue;

        const from = startOfDay(season.startDate).getTime();
        const to = startOfDay(season.endDate).getTime();
        if (day >= from && day <= to) {
            const rate = Number(season.pricePerNight);
            if (Number.isFinite(rate) && rate >= 0) return { rate, season: season.name || 'Seasonal' };
        }
    }

    return { rate: base, season: null };
};

/**
 * Price a whole stay.
 *
 * Returns one entry per night (the invoice itemises these) plus the summed
 * `total` for `units` rooms. `checkOut` is exclusive — a guest arriving on the
 * 1st and leaving on the 3rd pays for the 1st and the 2nd.
 */
export const priceStay = (roomType, checkIn, checkOut, units = 1) => {
    const from = startOfDay(checkIn);
    const nights = countNights(checkIn, checkOut);

    // Capped here as well as in the quote, so no caller can build an
    // arbitrarily long breakdown array from two far-apart dates.
    if (nights <= 0 || nights > MAX_STAY_NIGHTS) {
        return { nights: [], total: 0, totalNights: 0 };
    }

    const roomCount = Math.max(1, Number(units) || 1);
    const breakdown = [];
    let total = 0;

    for (let i = 0; i < nights; i += 1) {
        const night = new Date(from.getTime() + i * MS_PER_DAY);
        const { rate, season } = rateForNight(roomType, night);
        const amount = rate * roomCount;
        total += amount;
        breakdown.push({ date: night, rate, season, units: roomCount, amount });
    }

    return { nights: breakdown, total, totalNights: nights };
};
