import { useSearchParams } from 'react-router-dom';

/**
 * Tabs for a list page, kept in the URL as ?view= so the sidebar entries and
 * the browser back button land on the same tab.
 *
 * @param {{ tabs: {value: string, label: string, count?: number}[], fallback: string }} props
 */
export function useListView(fallback) {
    const [params, setParams] = useSearchParams();
    const view = params.get('view') || fallback;
    const setView = (next) => {
        const copy = new URLSearchParams(params);
        copy.set('view', next);
        setParams(copy, { replace: true });
    };
    return [view, setView];
}

export default function ViewTabs({ tabs, value, onChange }) {
    return (
        <div className="flex gap-1 border-b border-neutral-200 overflow-x-auto" role="tablist">
            {tabs.map((tab) => {
                const active = tab.value === value;
                return (
                    <button
                        key={tab.value}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(tab.value)}
                        className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                            active ? 'border-[#0a4d2b] text-[#0a4d2b]' : 'border-transparent text-neutral-500 hover:text-neutral-800'
                        }`}
                    >
                        {tab.label}
                        {typeof tab.count === 'number' ? (
                            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${active ? 'bg-[#0a4d2b]/10 text-[#0a4d2b]' : 'bg-neutral-100 text-neutral-600'}`}>
                                {tab.count}
                            </span>
                        ) : null}
                    </button>
                );
            })}
        </div>
    );
}
