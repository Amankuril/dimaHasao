/*
 * window.prompt(message, default) for React Native: the web's tours pages ask
 * for a cancellation reason, a rejection reason or a review reply with the
 * browser's prompt box. `ask` resolves to the typed text, or null on Cancel,
 * exactly as window.prompt returns. Render `dialog` once in the page.
 */
import React, { useCallback, useRef, useState } from 'react';
import { Button, Div, Overlay, P, Textarea } from '../../../../components/web';

export default function usePrompt() {
  const [state, setState] = useState(null);
  const resolver = useRef(null);

  const ask = useCallback(
    (message, defaultValue = '') =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setState({ message, value: String(defaultValue ?? '') });
      }),
    [],
  );

  const finish = (result) => {
    const resolve = resolver.current;
    resolver.current = null;
    setState(null);
    resolve?.(result);
  };

  const dialog = state ? (
    <Overlay className="bg-black/50 flex items-center justify-center p-4" onClose={() => finish(null)}>
      <Div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-xl">
        <P className="text-sm font-semibold text-gray-900 mb-3">{state.message}</P>
        <Textarea
          rows={3}
          autoFocus
          value={state.value}
          onChange={(e) => setState((s) => ({ ...s, value: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900"
        />
        <Div className="flex justify-end gap-2 mt-4">
          <Button type="button" onClick={() => finish(null)} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700">
            Cancel
          </Button>
          <Button type="button" onClick={() => finish(state.value)} className="px-4 py-2 rounded-xl bg-[#0a4d2b] text-sm font-semibold text-white">
            OK
          </Button>
        </Div>
      </Div>
    </Overlay>
  ) : null;

  return [dialog, ask];
}
