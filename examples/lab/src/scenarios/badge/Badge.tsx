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
    neutral: 'bg-zinc-200 text-zinc-700',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-800',
};

/** Enum union + default props — baseline controls scenario. */
export function Badge(props: BadgeProps) {
    const variant = () => props.variant ?? 'neutral';
    const dot = () => props.dot ?? false;

    return (
        <span
            class={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${ variantClass[variant()] }`}
            data-variant={ variant() }
            data-dot={ String(dot()) }
        >
            {dot() ? '• ' : null}
            {props.label}
        </span>
    );
}
