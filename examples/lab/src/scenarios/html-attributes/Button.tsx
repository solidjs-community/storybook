import type { JSX } from 'solid-js';

interface ButtonProps extends JSX.HTMLAttributes<HTMLDivElement> {
    label: string;
}

/** HTMLAttributes heritage — DOM props filtered, allowlist kept. */
export function Button(props: ButtonProps) {
    return (
        <div
            role="button"
            {...props}
            class={`inline-flex cursor-pointer items-center rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white ${ props.class ?? '' }`}
        >
            {props.label}
        </div>
    );
}
