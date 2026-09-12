/**
 * Per-night rate resolution for a room type.
 *
 * Rooms carry a base `pricePerNight` plus optional `seasonalRates` — named date
 * ranges that override it (peak season, festival weeks, off-season deals). A
 * stay is priced one night at a time so a booking that straddles a season
 * boundary is charged correctly on both sides.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * UTC midnight of the given date.
 *
 * Date-only values ("2026-12-24") parse as UTC midnight and are stored that
 * way, so the comparison has to happen in UTC too. Normalising to *local*
 * midnight instead shifts the calendar date by one on any server west of
 * Greenwich, which would charge the wrong season on a boundary night.
 */
const startOfDay = (value) => {
    const date = new Date(value);
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
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
    const to = startOfDay(checkOut);
    const nights = Math.round((to - from) / MS_PER_DAY);

    if (!Number.isFinite(nights) || nights <= 0) {
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
