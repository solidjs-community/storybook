export interface PackageButtonProps {
    label: string;
    size?: 'sm' | 'lg';
}

/** Package-scoped button for docgen package-import scenario. */
export function Button(props: PackageButtonProps) {
    return (
        <button type="button" data-size={props.size ?? 'sm'}>
            {props.label}
        </button>
    );
}
