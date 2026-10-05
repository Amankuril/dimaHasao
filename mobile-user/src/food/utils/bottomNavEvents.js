import { events } from '../../lib/events';
const NAV_SHOW_EVENT = "food-bottom-nav-show"

export function requestBottomNavShow(lockMs = 900) {
  events.emit(NAV_SHOW_EVENT, { lockMs })
}

export function subscribeBottomNavShow(handler) {
  const onShow = (e) => handler(e)
  events.on(NAV_SHOW_EVENT, onShow)
  return () => events.off(NAV_SHOW_EVENT, onShow)
}
