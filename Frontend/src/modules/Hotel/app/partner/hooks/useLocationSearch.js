import { useCallback, useEffect, useRef, useState } from 'react';
import useDebouncedValue from '@/shared/hooks/useDebouncedValue';
import { hotelService } from '../../../services/apiService';

/**
 * Address lookup for the property wizards.
 *
 * Replaces three copies of "call the geocoder and hope", each of which had the
 * same three problems:
 *
 *  - The homestay wizard called the API from onChange, so it fired on every
 *    keystroke *and* sent the value from before that keystroke, because the
 *    setState had not flushed yet. Every request was one character stale.
 *  - Responses were applied in arrival order, so a slow early request could
 *    overwrite the results of a later one.
 *  - A deployment with no Maps key produced a red error on a screen the partner
 *    could still finish by typing the address in by hand.
 *
 * @param {{minLength?: number, delay?: number}} options
 */
export function useLocationSearch({ minLength = 3, delay = 400 } = {}) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    /** idle | searching | ok | empty | unavailable | error */
    const [status, setStatus] = useState('idle');

    const debouncedQuery = useDebouncedValue(query, delay);

    // Only the newest request may write results.
    const latestRequest = useRef(0);
    // Once the server says Maps is not configured, stop asking for this session.
    const givenUp = useRef(false);

    const run = useCallback(async (term) => {
        const text = String(term || '').trim();

        if (text.length < minLength) {
            latestRequest.current += 1; // cancel anything in flight
            setResults([]);
            setStatus((current) => (current === 'unavailable' ? current : 'idle'));
            return;
        }

        if (givenUp.current) {
            setStatus('unavailable');
            return;
        }

        const requestId = (latestRequest.current += 1);
        setStatus('searching');

        try {
            const response = await hotelService.searchLocation(text);
            if (requestId !== latestRequest.current) return;

            const list = Array.isArray(response?.results) ? response.results : [];
            setResults(list);
            setStatus(list.length > 0 ? 'ok' : 'empty');
        } catch (error) {
            if (requestId !== latestRequest.current) return;

            const unavailable = Boolean(error?.mapsUnavailable);
            if (unavailable) givenUp.current = true;

            setResults([]);
            setStatus(unavailable ? 'unavailable' : 'error');
        }
    }, [minLength]);

    useEffect(() => {
        run(debouncedQuery);
    }, [debouncedQuery, run]);

    /** Search immediately, for an explicit Search button. */
    const searchNow = useCallback(() => run(query), [run, query]);

    const clear = useCallback(() => {
        latestRequest.current += 1;
        setQuery('');
        setResults([]);
        setStatus((current) => (current === 'unavailable' ? current : 'idle'));
    }, []);

    return {
        query,
        setQuery,
        results,
        status,
        isSearching: status === 'searching',
        mapsUnavailable: status === 'unavailable',
        searchNow,
        clear,
    };
}

export default useLocationSearch;
