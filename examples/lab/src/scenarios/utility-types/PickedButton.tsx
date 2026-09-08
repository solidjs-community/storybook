interface BaseButtonProps {
    label: string;
    size?: 'sm' | 'lg';
    disabled?: boolean;
    secret?: string;
}

type PickedButtonProps = Pick<BaseButtonProps, 'label' | 'size'>;

const sizeClass = {
    sm: 'px-2.5 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
} as const;

/** Pick/Omit utility types — only picked props in argTypes. */
export function PickedButton(props: PickedButtonProps) {
    const size = props.size ?? 'sm';

    return (
        <button
            type="button"
            disabled={false}
            data-size={size}
            class={`inline-flex items-center rounded-md bg-zinc-900 font-medium text-white ${ sizeClass[size] }`}
        >
            {props.label}
        </button>
    );
}
