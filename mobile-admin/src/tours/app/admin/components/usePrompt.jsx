/*
 * window.prompt(message, default) for React Native: the web's tours pages ask
 * for a cancellation reason, a rejection reason or a review reply with the
 * browser's prompt box. `ask` resolves to the typed text, or null on Cancel,
 * exactly as window.prompt returns. Render `dialog` once in the page.
 */
import React, { useCallback, useRef, useState } from 'react';
import { Button, Div, Overlay, P, Span, Textarea } from '../../../../components/web';

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
      <Div className="w-full max-w-md bg-white rounded-xl border border-slate-200 p-5">
        <P className="text-base font-semibold text-slate-900 mb-3">{state.message}</P>
        <Textarea
          rows={3}
          autoFocus
          value={state.value}
          onChange={(e) => setState((s) => ({ ...s, value: e.target.value }))}
          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900"
        />
        <Div className="flex justify-end gap-2 mt-4">
          <Button type="button" onClick={() => finish(null)} className="flex-row items-center justify-center gap-2 h-11 px-4 rounded-lg border border-slate-300 bg-white">
            <Span className="text-sm font-semibold text-slate-700">Cancel</Span>
          </Button>
          <Button type="button" onClick={() => finish(state.value)} className="flex-row items-center justify-center gap-2 h-11 px-4 rounded-lg bg-blue-600">
            <Span className="text-sm font-semibold text-white">OK</Span>
          </Button>
        </Div>
      </Div>
    </Overlay>
  ) : null;

  return [dialog, ask];
}
