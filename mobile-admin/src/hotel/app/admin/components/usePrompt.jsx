/*
 * window.prompt() for this app: the web settles a payout with a synchronous
 * prompt, which React Native has no equivalent of. `prompt(message, default)`
 * resolves to the entered string, or null when cancelled — the same contract.
 * Render `promptElement` once in the component that calls it.
 */
import React, { useCallback, useRef, useState } from 'react';
import { Button, Div, Input, Overlay, P } from '../../../../components/web';

export default function usePrompt() {
  const [state, setState] = useState(null);
  const resolver = useRef(null);

  const prompt = useCallback(
    (message, defaultValue = '') =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setState({ message, value: defaultValue ?? '' });
      }),
    [],
  );

  const finish = (result) => {
    const resolve = resolver.current;
    resolver.current = null;
    setState(null);
    resolve?.(result);
  };

  const promptElement = state ? (
    <Overlay onClose={() => finish(null)} className="flex items-center justify-center p-4 bg-black/50">
      <Div className="bg-white rounded-2xl w-full max-w-sm p-5">
        <P className="text-sm text-gray-800 mb-3">{state.message}</P>
        <Input
          autoFocus
          value={state.value}
          onChange={(e) => setState((s) => ({ ...s, value: e.target.value }))}
          onKeyDown={(e) => e.key === 'Enter' && finish(state.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
        <Div className="flex flex-row justify-end gap-2 mt-4">
          <Button onClick={() => finish(null)} className="px-4 py-2 rounded-lg border border-gray-200">
            Cancel
          </Button>
          <Button onClick={() => finish(state.value)} className="px-4 py-2 rounded-lg bg-black text-white font-bold">
            OK
          </Button>
        </Div>
      </Div>
    </Overlay>
  ) : null;

  return { prompt, promptElement };
}
