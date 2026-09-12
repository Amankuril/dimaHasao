/**
 * Seasonal rate editor for one room type.
 *
 * The scope of work asks the hotel panel for seasonal pricing. Rooms carry a
 * base nightly rate plus named date ranges that override it; the server prices
 * a stay night by night, so a booking that crosses a season boundary is charged
 * correctly on both sides.
 *
 * Overlaps are allowed — first match wins — so a short festival rate can sit on
 * top of a broader peak season.
 */
import React, { useEffect, useState } from 'react';
import { CalendarRange, ChevronDown, Loader2, Plus, Trash2 } from 'lucide-react';
import { propertyService } from '../../../services/apiService';

const toInputDate = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');
const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const SeasonalRatesPanel = ({ propertyId, roomType, onSaved, onNotify }) => {
    const [open, setOpen] = useState(false);
    const [seasons, setSeasons] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setSeasons(
            (roomType?.seasonalRates || []).map((season) => ({
                name: season.name || '',
                startDate: toInputDate(season.startDate),
                endDate: toInputDate(season.endDate),
                pricePerNight: season.pricePerNight ?? roomType?.pricePerNight ?? 0,
                isActive: season.isActive !== false,
            })),
        );
    }, [roomType]);

    if (!roomType) return null;

    const patch = (index, changes) =>
        setSeasons((current) => current.map((season, i) => (i === index ? { ...season, ...changes } : season)));

    const add = () =>
        setSeasons((current) => [
            ...current,
            { name: '', startDate: '', endDate: '', pricePerNight: roomType.pricePerNight || 0, isActive: true },
        ]);

    const remove = (index) => setSeasons((current) => current.filter((_, i) => i !== index));

    const save = async () => {
        for (const season of seasons) {
            if (!season.name.trim() || !season.startDate || !season.endDate) {
                onNotify?.('Every season needs a name, a start date and an end date', 'error');
                return;
            }
            if (new Date(season.endDate) < new Date(season.startDate)) {
                onNotify?.(`"${season.name}" ends before it starts`, 'error');
                return;
            }
        }

        try {
            setSaving(true);
            await propertyService.updateRoomType(propertyId, roomType._id, {
                seasonalRates: seasons.map((season) => ({
                    ...season,
                    pricePerNight: Number(season.pricePerNight),
                })),
            });
            onNotify?.('Seasonal rates saved', 'success');
            onSaved?.();
        } catch (error) {
            onNotify?.(error?.message || 'Could not save seasonal rates', 'error');
        } finally {
            setSaving(false);
        }
    };

    const activeCount = seasons.filter((season) => season.isActive).length;

    return (
        <div className="mx-4 mb-4 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3"
            >
                <span className="flex items-center gap-2 text-sm font-bold text-gray-900">
                    <CalendarRange size={16} className="text-emerald-600" />
                    Seasonal rates
                </span>
                <span className="flex items-center gap-2 text-[11px] font-bold text-gray-400">
                    {activeCount > 0 ? `${activeCount} active` : `Base ${currency(roomType.pricePerNight)}`}
                    <ChevronDown size={14} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </span>
            </button>

            {open && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
                    <p className="text-[11px] text-gray-500">
                        Nights inside a season are charged at its rate; every other night uses the base rate of{' '}
                        <strong>{currency(roomType.pricePerNight)}</strong>.
                    </p>

                    {seasons.length === 0 && (
                        <p className="text-xs text-gray-400 py-2">No seasons set for {roomType.name}.</p>
                    )}

                    {seasons.map((season, index) => (
                        <div key={index} className="bg-gray-50 rounded-xl p-3 space-y-2">
                            <div className="flex items-center gap-2">
                                <input
                                    value={season.name}
                                    onChange={(event) => patch(index, { name: event.target.value })}
                                    placeholder="e.g. Puja peak"
                                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => remove(index)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                    aria-label="Remove season"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <input
                                    type="date"
                                    value={season.startDate}
                                    onChange={(event) => patch(index, { startDate: event.target.value })}
                                    className="px-2 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-500"
                                />
                                <input
                                    type="date"
                                    value={season.endDate}
                                    onChange={(event) => patch(index, { endDate: event.target.value })}
                                    className="px-2 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-500"
                                />
                                <input
                                    type="number"
                                    min="0"
                                    value={season.pricePerNight}
                                    onChange={(event) => patch(index, { pricePerNight: event.target.value })}
                                    className="px-2 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-emerald-500"
                                />
                            </div>
                            <label className="flex items-center gap-2 text-[11px] font-bold text-gray-500">
                                <input
                                    type="checkbox"
                                    checked={season.isActive}
                                    onChange={(event) => patch(index, { isActive: event.target.checked })}
                                />
                                Apply this season
                            </label>
                        </div>
                    ))}

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={add}
                            className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-600"
                        >
                            <Plus size={12} /> Add season
                        </button>
                        <button
                            type="button"
                            onClick={save}
                            disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold disabled:opacity-60"
                        >
                            {saving && <Loader2 size={14} className="animate-spin" />}
                            Save rates
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SeasonalRatesPanel;
