import type { JSX } from '@solidjs/web';

interface ButtonProps extends JSX.HTMLAttributes<HTMLDivElement> {
    label: string;
}

/** HTMLAttributes heritage — DOM props filtered, allowlist kept. */
export function Button(props: ButtonProps) {
    return (
        <div
            role="button"
            {...props}
            class={ [
                'inline-flex cursor-pointer items-center rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100',
                props.class,
            ].filter(Boolean).join(' ') }
        >
            {props.label}
        </div>
    );
}
