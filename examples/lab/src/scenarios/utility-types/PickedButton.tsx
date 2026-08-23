interface BaseButtonProps {
    label: string;
    size?: 'sm' | 'lg';
    disabled?: boolean;
    secret?: string;
}

type PickedButtonProps = Pick<BaseButtonProps, 'label' | 'size'>;

/** Pick/Omit utility types — only picked props in argTypes. */
export function PickedButton(props: PickedButtonProps) {
    const size = props.size ?? 'sm';

    return (
        <button
            type="button"
            disabled={false}
            data-size={size}
            class={
                size === 'lg'
                    ? 'inline-flex items-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-base font-semibold text-zinc-900 hover:bg-zinc-100'
                    : 'inline-flex items-center rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-900 hover:bg-zinc-100'
            }
        >
            {props.label}
        </button>
    );
}
