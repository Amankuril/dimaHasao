/* Ported from Frontend/src/modules/Hotel/app/admin/components/RoomRatesManager.jsx (tools/port.js first pass). */
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
import { Bed, CalendarDays, Plus, Save, Trash2 } from 'lucide-react-native';
import adminService from '../../../services/adminService';
import { toast } from '../../../../lib/notify';
import { Button, CheckBox, Div, HScroll, Input, Span, Icon as UiIcon } from '../../../../components/web';
import {
  Card,
  SectionTitle,
  Field,
  StatusBadge,
  LoadingState,
  EmptyState,
  ErrorState,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';

const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const toInputDate = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');
const RoomRatesManager = ({ propertyId }) => {
  const { tablet } = useLayoutWidth();
  const [roomTypes, setRoomTypes] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [calendar, setCalendar] = useState([]);
  const [range, setRange] = useState(() => {
    const from = new Date();
    const to = new Date(from.getTime() + 13 * 86400000);
    return {
      from: toInputDate(from),
      to: toInputDate(to),
    };
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
      setLoadError(null);
      setRoomTypes(rooms);
      setDrafts(Object.fromEntries(rooms.map((room) => [room._id, toDraft(room)])));
    } catch (error) {
      if (error.response?.status !== 401) {
        setLoadError(error.response?.data?.message || error.message || 'Failed to load room types');
        toast.error('Failed to load room types');
      }
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
    setDrafts((current) => ({
      ...current,
      [roomId]: {
        ...current[roomId],
        ...changes,
      },
    }));
  const patchSeason = (roomId, index, changes) =>
    setDrafts((current) => {
      const seasons = [...(current[roomId]?.seasonalRates || [])];
      seasons[index] = {
        ...seasons[index],
        ...changes,
      };
      return {
        ...current,
        [roomId]: {
          ...current[roomId],
          seasonalRates: seasons,
        },
      };
    });
  const addSeason = (roomId) =>
    setDrafts((current) => ({
      ...current,
      [roomId]: {
        ...current[roomId],
        seasonalRates: [
          ...(current[roomId]?.seasonalRates || []),
          {
            name: '',
            startDate: '',
            endDate: '',
            pricePerNight: current[roomId]?.pricePerNight || 0,
            isActive: true,
          },
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
    return <LoadingState label="Loading room types…" />;
  }
  if (loadError) {
    return <ErrorState title="Could not load room types" message={loadError} onRetry={loadRooms} />;
  }
  return (
    <Div className="gap-4">
      {roomTypes.length === 0 ? (
        <EmptyState icon={Bed} title="No room types yet" message="This property has no room types, so there is nothing to price yet." />
      ) : null}

      {roomTypes.map((room) => {
        const draft = drafts[room._id];
        if (!draft) return null;
        return (
          <Card key={room._id} padded={false}>
            <Div className="p-4 border-b border-slate-100 gap-3">
              <Div className="flex-row items-start gap-3">
                <Div className="flex-1 min-w-0">
                  <Span className="text-base font-semibold text-slate-900" numberOfLines={2}>
                    {room.name}
                  </Span>
                  <Span className="text-xs text-slate-500" numberOfLines={2}>
                    {room.roomCategory || room.inventoryType} · currently {currency(room.pricePerNight)} / night
                  </Span>
                </Div>
                <StatusBadge status={draft.isActive ? 'active' : 'inactive'} label={draft.isActive ? 'Bookable' : 'Not bookable'} />
              </Div>
              <Div className="flex-row flex-wrap items-center gap-3">
                <Div className="flex-row items-center gap-2 h-11">
                  <CheckBox
                    checked={draft.isActive}
                    onChange={(event) =>
                      patchDraft(room._id, {
                        isActive: event.target.checked,
                      })
                    }
                  />
                  <Span className="text-sm text-slate-700">Bookable</Span>
                </Div>
                <Button type="button" onClick={() => save(room._id)} disabled={savingId === room._id} className={BTN_PRIMARY}>
                  <UiIcon as={Save} size={16} className="text-white" />
                  <Span className={BTN_TEXT_PRIMARY}>{savingId === room._id ? 'Saving…' : 'Save'}</Span>
                </Button>
              </Div>
            </Div>

            <Div className="p-4 flex-row flex-wrap gap-3">
              {[
                ['Base rate / night', 'pricePerNight'],
                ['Total inventory', 'totalInventory'],
                ['Extra adult', 'extraAdultPrice'],
                ['Extra child', 'extraChildPrice'],
              ].map(([label, field]) => (
                <Field key={field} label={label} className={tablet ? 'w-[48%]' : 'w-full'}>
                  <Input
                    type="number"
                    min="0"
                    value={draft[field]}
                    onChange={(event) =>
                      patchDraft(room._id, {
                        [field]: event.target.value,
                      })
                    }
                    className={INPUT}
                  />
                </Field>
              ))}
            </Div>

            <Div className="px-4 pb-4">
              <SectionTitle
                action={
                  <Button type="button" onClick={() => addSeason(room._id)} className={BTN_SECONDARY}>
                    <UiIcon as={Plus} size={14} className="text-slate-600" />
                    <Span className={BTN_TEXT_SECONDARY}>Add season</Span>
                  </Button>
                }
              >
                Seasonal rates
              </SectionTitle>

              {draft.seasonalRates.length === 0 ? (
                <Span className="text-sm text-slate-500">No seasons — every night is charged at the base rate.</Span>
              ) : (
                <Div className="gap-3">
                  {draft.seasonalRates.map((season, index) => (
                    <Div key={index} className="p-3 rounded-lg border border-slate-200 gap-3">
                      <Field label="Season name">
                        <Input
                          value={season.name}
                          onChange={(event) =>
                            patchSeason(room._id, index, {
                              name: event.target.value,
                            })
                          }
                          placeholder="Season name"
                          className={INPUT}
                        />
                      </Field>
                      <Div className="flex-row flex-wrap gap-3">
                        <Field label="Starts" className="flex-1 min-w-[140px]">
                          <Input
                            type="date"
                            value={season.startDate}
                            onChange={(event) =>
                              patchSeason(room._id, index, {
                                startDate: event.target.value,
                              })
                            }
                            className={INPUT}
                          />
                        </Field>
                        <Field label="Ends" className="flex-1 min-w-[140px]">
                          <Input
                            type="date"
                            value={season.endDate}
                            onChange={(event) =>
                              patchSeason(room._id, index, {
                                endDate: event.target.value,
                              })
                            }
                            className={INPUT}
                          />
                        </Field>
                        <Field label="Rate / night" className="flex-1 min-w-[140px]">
                          <Input
                            type="number"
                            min="0"
                            value={season.pricePerNight}
                            onChange={(event) =>
                              patchSeason(room._id, index, {
                                pricePerNight: event.target.value,
                              })
                            }
                            className={INPUT}
                          />
                        </Field>
                      </Div>
                      <Div className="flex-row items-center justify-between gap-3">
                        <Div className="flex-row items-center gap-2 h-11">
                          <CheckBox
                            checked={season.isActive}
                            onChange={(event) =>
                              patchSeason(room._id, index, {
                                isActive: event.target.checked,
                              })
                            }
                          />
                          <Span className="text-sm text-slate-700">Active</Span>
                        </Div>
                        <Button
                          type="button"
                          onClick={() => removeSeason(room._id, index)}
                          className="w-11 h-11 items-center justify-center rounded-lg"
                          accessibilityLabel="Remove season"
                        >
                          <UiIcon as={Trash2} size={16} className="text-red-600" />
                        </Button>
                      </Div>
                    </Div>
                  ))}
                </Div>
              )}
            </Div>
          </Card>
        );
      })}

      <Card padded={false}>
        <Div className="p-4 border-b border-slate-100 gap-3">
          <Div className="flex-row items-center gap-2">
            <UiIcon as={CalendarDays} size={16} className="text-slate-500" />
            <Span className="text-base font-semibold text-slate-900">Availability</Span>
          </Div>
          <Div className="flex-row flex-wrap items-end gap-3">
            <Field label="From" className="flex-1 min-w-[140px]">
              <Input
                type="date"
                value={range.from}
                onChange={(event) =>
                  setRange((r) => ({
                    ...r,
                    from: event.target.value,
                  }))
                }
                className={INPUT}
              />
            </Field>
            <Field label="To" className="flex-1 min-w-[140px]">
              <Input
                type="date"
                value={range.to}
                onChange={(event) =>
                  setRange((r) => ({
                    ...r,
                    to: event.target.value,
                  }))
                }
                className={INPUT}
              />
            </Field>
          </Div>
        </Div>

        {calendarLoading ? (
          <LoadingState label="Loading availability…" className="border-0" />
        ) : calendar.length === 0 ? (
          <Div className="p-6 items-center">
            <Span className="text-sm text-slate-500">Nothing to show for this range.</Span>
          </Div>
        ) : (
          <Div className="p-4 gap-4">
            {calendar.map((row) => (
              <Div key={row.roomTypeId} className="gap-2">
                <Span className="text-sm font-medium text-slate-900" numberOfLines={2}>
                  {row.name} <Span className="text-sm text-slate-500">({row.totalInventory} total)</Span>
                </Span>
                <HScroll contentClassName="flex-row gap-1.5">
                  {row.days.map((day) => {
                    const soldOut = day.available === 0;
                    const partial = !soldOut && day.blocked > 0;
                    return (
                      <Div
                        key={day.date}
                        className={`w-14 shrink-0 rounded-lg border px-1 py-2 items-center ${soldOut ? 'bg-red-100 border-red-200' : partial ? 'bg-amber-100 border-amber-200' : 'bg-green-100 border-green-200'}`}
                      >
                        <Span className="text-xs text-slate-600" numberOfLines={1}>
                          {new Date(day.date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </Span>
                        <Span className={`text-sm font-semibold ${soldOut ? 'text-red-700' : partial ? 'text-amber-700' : 'text-green-700'}`}>
                          {day.available}
                        </Span>
                      </Div>
                    );
                  })}
                </HScroll>
              </Div>
            ))}
          </Div>
        )}
      </Card>
    </Div>
  );
};
export default RoomRatesManager;
