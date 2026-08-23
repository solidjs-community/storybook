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
