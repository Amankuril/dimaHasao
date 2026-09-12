import { useEffect, useState } from 'react';

/**
 * A value that only settles after it has stopped changing for `delay` ms.
 *
 * Use it to drive search requests from an input. Reading the debounced value in
 * an effect is what makes the request correct as well as infrequent: calling a
 * search function straight from onChange sends the state from *before* this
 * keystroke, because the setState has not flushed yet — so every request was
 * one character behind what the user had typed.
 *
 *   const query = useDebouncedValue(rawQuery, 400);
 *   useEffect(() => { if (query) search(query); }, [query]);
 *
 * @param {*} value      the live value, updated on every keystroke
 * @param {number} delay milliseconds of quiet before it settles
 */
export function useDebouncedValue(value, delay = 400) {
    const [settled, setSettled] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setSettled(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return settled;
}

export default useDebouncedValue;
