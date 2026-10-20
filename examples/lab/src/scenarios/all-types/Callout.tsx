export type CalloutSize = 'sm' | 'md' | 'lg';
export type CalloutTone
    = | 'neutral'
        | 'info'
        | 'success'
        | 'warning'
        | 'danger'
        | 'accent';

export type CalloutProps = {
    /** Visible title */
    label: string;
    /** Numeric counter */
    count?: number;
    /** Whether the callout is interactive */
    enabled?: boolean;
    /** Compact, regular, or large */
    size?: CalloutSize;
    /** Color tone — 6 options so Controls should pick select, not radio */
    tone?: CalloutTone;
    /** Accent swatch (name matches the color control matcher) */
    accentColor?: string;
    /** ISO date (name matches the date control matcher) */
    dueDate?: string;
    /** Chips under the title */
    tags?: string[];
    /** Arbitrary nested metadata */
    meta?: { id: string };
    /** Fired when the callout is clicked */
    onPress?: () => void;
    /** DOM id */
    id?: string;
    /** Extra class names */
    class?: string;
    /** Native title tooltip */
    title?: string;
    /** Tab order */
    tabIndex?: number;
    /** Accessible name */
    'aria-label'?: string;
    /** Layout style */
    appearance?: 'solid' | 'ghost';
    /** Inner padding in px — relevant for solid */
    padding?: number;
    /** See-through background — relevant for ghost */
    transparent?: boolean;
};

const toneClass: Record<CalloutTone, string> = {
    neutral: 'border-zinc-300 bg-zinc-100 text-zinc-800',
    info: 'border-sky-300 bg-sky-50 text-sky-900',
    success: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    warning: 'border-amber-300 bg-amber-50 text-amber-900',
    danger: 'border-red-300 bg-red-50 text-red-900',
    accent: 'border-violet-300 bg-violet-50 text-violet-900',
};

const sizeClass: Record<CalloutSize, string> = {
    sm: 'gap-1 px-2 py-1 text-xs',
    md: 'gap-2 px-3 py-2 text-sm',
    lg: 'gap-3 px-4 py-3 text-base',
};

/** Flagship docgen target: one component with every prop kind we extract. */
export function Callout(props: CalloutProps) {
    const size = () => props.size ?? 'md';
    const tone = () => props.tone ?? 'neutral';
    const count = () => props.count ?? 0;
    const tags = () => props.tags ?? [];
    const enabled = () => props.enabled ?? true;
    const ghost = () => (props.appearance ?? 'solid') === 'ghost';
    const padding = () => props.padding ?? 12;

    return (
        <div
            id={props.id}
            title={props.title}
            tabindex={enabled() ? (props.tabIndex ?? 0) : -1}
            aria-label={props['aria-label']}
            aria-disabled={enabled() ? undefined : true}
            role={enabled() ? 'button' : undefined}
            onClick={() => enabled() && props.onPress?.()}
            class={[
                'inline-flex max-w-md flex-col rounded-xl border font-sans',
                sizeClass[size()],
                ghost()
                    ? (props.transparent
                        ? 'border-dashed border-zinc-400 bg-transparent text-zinc-500'
                        : 'border-dashed border-zinc-300 bg-white text-zinc-800')
                    : toneClass[tone()],
                enabled() ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
                props.class,
            ].filter(Boolean).join(' ')}
            style={{
                padding: ghost() ? undefined : `${ padding() }px`,
                'border-color': ghost() ? undefined : (props.accentColor ?? '#6366f1'),
            }}
        >
            <div class="flex items-center justify-between gap-3">
                <strong>{props.label}</strong>
                <span class="tabular-nums opacity-70">{count()}</span>
            </div>
            {tags().length > 0 && (
                <div class="flex flex-wrap gap-1">
                    {tags().map(tag => (
                        <span class="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                            {tag}
                        </span>
                    ))}
                </div>
            )}
            {props.dueDate && (
                <span class="text-[11px] opacity-60">due {props.dueDate}</span>
            )}
        </div>
    );
}
