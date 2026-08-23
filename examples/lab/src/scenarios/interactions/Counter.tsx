import { createSignal } from 'solid-js';

export interface CounterProps {
    label?: string;
    initial?: number;
}

export function Counter(props: CounterProps) {
    const [count, setCount] = createSignal(props.initial ?? 0);

    return (
        <div>
            <p data-testid="counter-label">{props.label ?? 'Count'}</p>
            <output data-testid="counter-value">{count()}</output>
            <button type="button" onClick={() => setCount(count() + 1)}>
                Increment
            </button>
        </div>
    );
}
