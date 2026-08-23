import { createSignal } from 'solid-js';

export interface ClickButtonProps {
    label: string;
    onClick?: () => void;
}

export function ClickButton(props: ClickButtonProps) {
    const [clicks, setClicks] = createSignal(0);

    return (
        <button
            type="button"
            class="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
            onClick={() => {
                setClicks(clicks() + 1);
                props.onClick?.();
            }}
        >
            {props.label}
            {' '}
            (
            {clicks()}
            )
        </button>
    );
}
