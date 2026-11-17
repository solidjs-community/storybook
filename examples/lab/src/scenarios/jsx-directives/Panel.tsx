import type { JSX } from '@solidjs/web';

interface PanelProps extends JSX.HTMLAttributes<HTMLDivElement> {
    title: string;
    // Issue #56: Solid `use:` / `prop:` namespaces are not component args.
    'use:clickOutside'?: boolean;
    'prop:value'?: string;
}

/** Directives leak onto HTMLAttributes via module augmentation — Controls must drop them. */
export function Panel(props: PanelProps) {
    return (
        <div
            {...props}
            class={ [
                'inline-flex min-w-40 items-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900',
                props.class,
            ].filter(Boolean).join(' ') }
        >
            {props.title}
        </div>
    );
}
