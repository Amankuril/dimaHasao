/**
 * Admin room rates, inventory and availability for one property.
 *
 * The scope of work puts room categories, pricing and availability under the
 * admin panel as well as the partner panel, so support can correct a rate or
 * free up inventory without asking the partner to sign in.
 *
 * Seasonal rates are date ranges that override the base nightly rate. Overlaps
 * are allowed and resolved first-match-wins, which is how a short festival rate
 * can sit on top of a broad peak season — the server prices each night with the
 * same rule (see utils/nightlyPricing.js).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';

const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const toInputDate = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

const RoomRatesManager = ({ propertyId }) => {
    const [roomTypes, setRoomTypes] = useState([]);
    const [drafts, setDrafts] = useState({});
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);

    const [calendar, setCalendar] = useState([]);
    const [range, setRange] = useState(() => {
        const from = new Date();
        const to = new Date(from.getTime() + 13 * 86400000);
        return { from: toInputDate(from), to: toInputDate(to) };
    });
    const [calendarLoading, setCalendarLoading] = useState(false);

    const toDraft = (room) => ({
        pricePerNight: room.pricePerNight ?? 0,
        totalInventory: room.totalInventory ?? 0,
        extraAdultPrice: room.extraAdultPrice ?? 0,
        extraChildPrice: room.extraChildPrice ?? 0,
        isActive: room.isActive !== false,
        seasonalRates: (room.seasonalRates || []).map((season) => ({
            name: season.name || '',
            startDate: toInputDate(season.startDate),
            endDate: toInputDate(season.endDate),
            pricePerNight: season.pricePerNight ?? 0,
            isActive: season.isActive !== false,
        })),
    });

    const loadRooms = useCallback(async () => {
        try {
            setLoading(true);
            const data = await adminService.getPropertyRoomTypes(propertyId);
            const rooms = data.roomTypes || [];
            setRoomTypes(rooms);
            setDrafts(Object.fromEntries(rooms.map((room) => [room._id, toDraft(room)])));
        } catch (error) {
            if (error.response?.status !== 401) toast.error('Failed to load room types');
        } finally {
            setLoading(false);
        }
    }, [propertyId]);

    const loadCalendar = useCallback(async () => {
        if (!range.from || !range.to) return;
        try {
            setCalendarLoading(true);
            const data = await adminService.getPropertyAvailability(propertyId, range);
            setCalendar(data.calendar || []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load availability');
        } finally {
            setCalendarLoading(false);
        }
    }, [propertyId, range]);

    useEffect(() => {
        loadRooms();
    }, [loadRooms]);

    useEffect(() => {
        loadCalendar();
    }, [loadCalendar]);

    const patchDraft = (roomId, changes) =>
        setDrafts((current) => ({ ...current, [roomId]: { ...current[roomId], ...changes } }));

    const patchSeason = (roomId, index, changes) =>
        setDrafts((current) => {
            const seasons = [...(current[roomId]?.seasonalRates || [])];
            seasons[index] = { ...seasons[index], ...changes };
            return { ...current, [roomId]: { ...current[roomId], seasonalRates: seasons } };
        });

    const addSeason = (roomId) =>
        setDrafts((current) => ({
            ...current,
            [roomId]: {
                ...current[roomId],
                seasonalRates: [
                    ...(current[roomId]?.seasonalRates || []),
                    { name: '', startDate: '', endDate: '', pricePerNight: current[roomId]?.pricePerNight || 0, isActive: true },
                ],
            },
        }));

    const removeSeason = (roomId, index) =>
        setDrafts((current) => ({
            ...current,
            [roomId]: {
                ...current[roomId],
                seasonalRates: (current[roomId]?.seasonalRates || []).filter((_, i) => i !== index),
            },
        }));

    const save = async (roomId) => {
        const draft = drafts[roomId];
        if (!draft) return;

        // Caught here so the admin sees the row at fault rather than a generic 400.
        for (const season of draft.seasonalRates) {
            if (!season.name.trim() || !season.startDate || !season.endDate) {
                toast.error('Every season needs a name, a start date and an end date');
                return;
            }
            if (new Date(season.endDate) < new Date(season.startDate)) {
                toast.error(`"${season.name}" ends before it starts`);
                return;
            }
        }

        try {
            setSavingId(roomId);
            await adminService.updateRoomType(roomId, {
                pricePerNight: Number(draft.pricePerNight),
                totalInventory: Number(draft.totalInventory),
                extraAdultPrice: Number(draft.extraAdultPrice),
                extraChildPrice: Number(draft.extraChildPrice),
                isActive: draft.isActive,
                seasonalRates: draft.seasonalRates.map((season) => ({
                    ...season,
                    pricePerNight: Number(season.pricePerNight),
                })),
            });
            toast.success('Room updated');
            await Promise.all([loadRooms(), loadCalendar()]);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not update this room');
        } finally {
            setSavingId(null);
        }
    };

    if (loading) {
        return (
            <div className="p-12 text-center text-gray-400">
                <Loader2 size={22} className="animate-spin inline" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {roomTypes.length === 0 && (
                <div className="p-10 text-center text-gray-400 text-xs bg-white border border-gray-200 rounded-2xl">
                    This property has no room types yet.
                </div>
            )}

            {roomTypes.map((room) => {
                const draft = drafts[room._id];
                if (!draft) return null;

                return (
                    <div key={room._id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h4 className="font-bold text-gray-900">{room.name}</h4>
                                <p className="text-[10px] uppercase tracking-wider text-gray-400">
                                    {room.roomCategory || room.inventoryType} · currently {currency(room.pricePerNight)} / night
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 text-xs font-bold text-gray-600">
                                    <input
                                        type="checkbox"
                                        checked={draft.isActive}
                                        onChange={(event) => patchDraft(room._id, { isActive: event.target.checked })}
                                    />
                                    Bookable
                                </label>
                                <button
                                    type="button"
                                    onClick={() => save(room._id)}
                                    disabled={savingId === room._id}
                                    className="flex items-center gap-2 px-4 py-2 bg-neutral-950 text-white rounded-lg text-xs font-bold hover:bg-neutral-800 disabled:opacity-60"
                                >
                                    {savingId === room._id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                    Save
                                </button>
                            </div>
                        </div>

                        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                ['Base rate / night', 'pricePerNight'],
                                ['Total inventory', 'totalInventory'],
                                ['Extra adult', 'extraAdultPrice'],
                                ['Extra child', 'extraChildPrice'],
                            ].map(([label, field]) => (
                                <label key={field} className="block">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={draft[field]}
                                        onChange={(event) => patchDraft(room._id, { [field]: event.target.value })}
                                        className="mt-1 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold outline-none focus:border-black"
                                    />
                                </label>
                            ))}
                        </div>

                        <div className="px-6 pb-6">
                            <div className="flex items-center justify-between mb-3">
                                <h5 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                    Seasonal rates
                                </h5>
                                <button
                                    type="button"
                                    onClick={() => addSeason(room._id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-bold uppercase text-gray-600 hover:bg-gray-100"
                                >
                                    <Plus size={12} /> Add season
                                </button>
                            </div>

                            {draft.seasonalRates.length === 0 ? (
                                <p className="text-xs text-gray-400">
                                    No seasons — every night is charged at the base rate.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {draft.seasonalRates.map((season, index) => (
                                        <div
                                            key={index}
                                            className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr_auto_auto] gap-2 items-center bg-gray-50 p-2 rounded-xl"
                                        >
                                            <input
                                                value={season.name}
                                                onChange={(event) => patchSeason(room._id, index, { name: event.target.value })}
                                                placeholder="Season name"
                                                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-black"
                                            />
                                            <input
                                                type="date"
                                                value={season.startDate}
                                                onChange={(event) => patchSeason(room._id, index, { startDate: event.target.value })}
                                                className="px-2 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-black"
                                            />
                                            <input
                                                type="date"
                                                value={season.endDate}
                                                onChange={(event) => patchSeason(room._id, index, { endDate: event.target.value })}
                                                className="px-2 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-black"
                                            />
                                            <input
                                                type="number"
                                                min="0"
                                                value={season.pricePerNight}
                                                onChange={(event) => patchSeason(room._id, index, { pricePerNight: event.target.value })}
                                                className="px-2 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-black"
                                            />
                                            <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase">
                                                <input
                                                    type="checkbox"
                                                    checked={season.isActive}
                                                    onChange={(event) => patchSeason(room._id, index, { isActive: event.target.checked })}
                                                />
                                                On
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => removeSeason(room._id, index)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                                aria-label="Remove season"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                    <h4 className="font-bold text-gray-900 flex items-center gap-2">
                        <CalendarDays size={16} className="text-blue-600" /> Availability
                    </h4>
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={range.from}
                            onChange={(event) => setRange((r) => ({ ...r, from: event.target.value }))}
                            className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-black"
                        />
                        <span className="text-gray-400 text-xs">to</span>
                        <input
                            type="date"
                            value={range.to}
                            onChange={(event) => setRange((r) => ({ ...r, to: event.target.value }))}
                            className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-black"
                        />
                    </div>
                </div>

                {calendarLoading ? (
                    <div className="p-10 text-center text-gray-400">
                        <Loader2 size={20} className="animate-spin inline" />
                    </div>
                ) : calendar.length === 0 ? (
                    <p className="p-10 text-center text-xs text-gray-400">Nothing to show for this range.</p>
                ) : (
                    <div className="p-4 space-y-5 overflow-x-auto">
                        {calendar.map((row) => (
                            <div key={row.roomTypeId}>
                                <p className="text-xs font-bold text-gray-700 mb-2">
                                    {row.name}{' '}
                                    <span className="text-gray-400 font-medium">({row.totalInventory} total)</span>
                                </p>
                                <div className="flex gap-1 min-w-max">
                                    {row.days.map((day) => {
                                        const soldOut = day.available === 0;
                                        const partial = !soldOut && day.blocked > 0;
                                        return (
                                            <div
                                                key={day.date}
                                                title={`${new Date(day.date).toDateString()} — ${day.available} of ${row.totalInventory} free`}
                                                className={`w-11 shrink-0 rounded-lg border px-1 py-1.5 text-center ${
                                                    soldOut
                                                        ? 'bg-red-50 border-red-200'
                                                        : partial
                                                            ? 'bg-amber-50 border-amber-200'
                                                            : 'bg-emerald-50 border-emerald-200'
                                                }`}
                                            >
                                                <p className="text-[9px] font-bold text-gray-500">
                                                    {new Date(day.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                </p>
                                                <p
                                                    className={`text-xs font-black ${
                                                        soldOut ? 'text-red-600' : partial ? 'text-amber-700' : 'text-emerald-700'
                                                    }`}
                                                >
                                                    {day.available}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoomRatesManager;
