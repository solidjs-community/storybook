export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger';

export interface BadgeProps {
    /** Text shown inside the badge */
    label: string;
    /** Visual style */
    variant?: BadgeVariant;
    /** Show a dot indicator before the label */
    dot?: boolean;
}

/** Enum union + default props — baseline controls scenario. */
export function Badge(props: BadgeProps) {
    const variant = () => props.variant ?? 'neutral';
    const dot = () => props.dot ?? false;

    return (
        <span data-variant={ variant() } data-dot={ String(dot()) }>
            {dot() ? '• ' : null}
            {props.label}
        </span>
    );
}
