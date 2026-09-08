import { mergeProps, splitProps } from 'solid-js';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger';

export interface BadgeProps {
    /** Text shown inside the badge */
    label: string;
    /** Visual style */
    variant?: BadgeVariant;
    /** Show a dot indicator before the label */
    dot?: boolean;
}

const variantClass: Record<BadgeVariant, string> = {
    neutral: 'bg-zinc-100 text-zinc-700',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-900',
    danger: 'bg-red-100 text-red-800',
};

/** Enum union + mergeProps defaults — baseline controls scenario. */
export function Badge(_props: BadgeProps) {
    const [props] = splitProps(
        mergeProps({ variant: 'neutral' as BadgeVariant, dot: false }, _props),
        ['label', 'variant', 'dot']
    );

    return (
        <span
            data-variant={props.variant}
            data-dot={String(props.dot)}
            class={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${ variantClass[props.variant] }`}
        >
            {props.dot
                ? <span class="size-1.5 rounded-full bg-current" />
                : null}
            {props.label}
        </span>
    );
}
