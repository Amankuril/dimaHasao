/*
 * Event bus for toasts and confirm dialogs, with no React dependency, so any
 * module can raise one. ToastContainer and ConfirmModalContainer (mounted
 * once in the root layout) subscribe.
 *
 * The API mirrors the slice of sonner the web uses: toast(msg),
 * toast.success/error/info/warning(msg, { id, duration, description }),
 * toast.dismiss(id).
 */

const toastSubs = new Set();
const confirmSubs = new Set();
let seq = 0;

function emit(evt) {
  toastSubs.forEach((fn) => fn(evt));
}

function show(type, message, opts = {}) {
  const o = typeof opts === 'string' ? { title: opts } : opts || {};
  const id = o.id ?? `t${++seq}`;
  emit({
    kind: 'show',
    toast: { id, type, message: String(message ?? ''), description: o.description, duration: o.duration ?? 4000, action: o.action },
  });
  return id;
}

export function toast(message, opts) {
  return show('default', message, opts);
}
toast.success = (m, o) => show('success', m, o);
toast.error = (m, o) => show('error', m, o);
toast.info = (m, o) => show('info', m, o);
toast.warning = (m, o) => show('warning', m, o);
toast.message = (m, o) => show('default', m, o);
toast.dismiss = (id) => emit({ kind: 'dismiss', id });
/** sonner's toast.custom: render(dismiss) returns the whole toast element. */
toast.custom = (render, o = {}) => {
  const id = o.id ?? `t${++seq}`;
  emit({ kind: 'show', toast: { id, type: 'custom', render, duration: o.duration ?? 4000 } });
  return id;
};

export function subscribeToasts(fn) {
  toastSubs.add(fn);
  return () => toastSubs.delete(fn);
}

/** Resolves true when the user confirms, false otherwise. */
export function confirm(title, message, { confirmText = 'Confirm', cancelText = 'Cancel', destructive = false } = {}) {
  return new Promise((resolve) => {
    if (!confirmSubs.size) {
      resolve(false);
      return;
    }
    confirmSubs.forEach((fn) => fn({ title, message, confirmText, cancelText, destructive, resolve }));
  });
}

export function subscribeConfirm(fn) {
  confirmSubs.add(fn);
  return () => confirmSubs.delete(fn);
}

export default toast;
