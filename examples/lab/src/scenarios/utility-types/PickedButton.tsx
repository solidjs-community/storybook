interface BaseButtonProps {
    label: string;
    size?: 'sm' | 'lg';
    disabled?: boolean;
    secret?: string;
}

type PickedButtonProps = Pick<BaseButtonProps, 'label' | 'size'>;

/** Pick/Omit utility types — only picked props in argTypes. */
export function PickedButton(props: PickedButtonProps) {
    return (
        <button type="button" disabled={false} data-size={props.size ?? 'sm'}>
            {props.label}
        </button>
    );
}
