import { createSignal } from 'solid-js';

export interface CounterProps {
    label?: string;
    initial?: number;
}

export function Counter(props: CounterProps) {
    const [count, setCount] = createSignal(props.initial ?? 0);

    return (
        <div class="inline-grid gap-2 rounded-xl border border-zinc-200 p-4 font-sans text-sm">
            <p data-testid="counter-label">{props.label ?? 'Count'}</p>
            <output class="text-2xl font-bold" data-testid="counter-value">{count()}</output>
            <button
                type="button"
                class="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
                onClick={() => setCount(count() + 1)}
            >
                Increment
            </button>
        </div>
    );
}
