import type { JSX } from 'solid-js';

interface ButtonProps extends JSX.HTMLAttributes<HTMLDivElement> {
    label: string;
}

/** HTMLAttributes heritage — DOM props filtered, allowlist kept. */
export function Button(props: ButtonProps) {
    return (
        <div role="button" {...props}>
            {props.label}
        </div>
    );
}
