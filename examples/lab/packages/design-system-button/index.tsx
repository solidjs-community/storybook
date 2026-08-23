export interface PackageButtonProps {
    label: string;
    size?: 'sm' | 'lg';
}

/** Package-scoped button for docgen package-import scenario. */
export function Button(props: PackageButtonProps) {
    return (
        <button
            type="button"
            data-size={props.size ?? 'sm'}
            class={
                (props.size ?? 'sm') === 'lg'
                    ? 'inline-flex items-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-base font-semibold text-zinc-900 hover:bg-zinc-100'
                    : 'inline-flex items-center rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-900 hover:bg-zinc-100'
            }
        >
            {props.label}
        </button>
    );
}
