export interface PackageButtonProps {
    label: string;
    size?: 'sm' | 'lg';
}

const sizeClass = {
    sm: 'px-2.5 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
} as const;

/** Package-scoped button for docgen package-import scenario. */
export function Button(props: PackageButtonProps) {
    const size = props.size ?? 'sm';

    return (
        <button
            type="button"
            data-size={size}
            class={`inline-flex items-center rounded-md bg-zinc-900 font-medium text-white ${ sizeClass[size] }`}
        >
            {props.label}
        </button>
    );
}
