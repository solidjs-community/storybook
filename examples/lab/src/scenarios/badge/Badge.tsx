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

/** Enum union + mergeProps defaults — baseline controls scenario. */
export function Badge(_props: BadgeProps) {
    const [props] = splitProps(
        mergeProps({ variant: 'neutral', dot: false }, _props),
        ['label', 'variant', 'dot']
    );

    return (
        <span data-variant={ props.variant } data-dot={ String(props.dot) }>
            {props.dot ? '• ' : null}
            {props.label}
        </span>
    );
}
