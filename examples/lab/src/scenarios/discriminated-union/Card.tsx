type CardProps
    = | { variant: 'solid'; padding: number }
        | { variant: 'ghost'; transparent: boolean };

/** Discriminated union — auto-if controls on variant-specific props. */
export function Card(props: CardProps) {
    return (
        <>
            {props.variant === 'solid'
                ? (
                    <div
                        class="min-w-48 rounded-xl border border-zinc-200 bg-zinc-100 font-sans text-sm text-zinc-800"
                        data-variant="solid"
                        style={{ padding: `${ props.padding }px` }}
                    >
                        solid card
                    </div>
                )
                : (
                    <div
                        class={
                            props.transparent
                                ? 'min-w-48 rounded-xl border border-dashed border-zinc-400 bg-transparent font-sans text-sm text-zinc-500'
                                : 'min-w-48 rounded-xl border border-dashed border-zinc-300 bg-transparent font-sans text-sm text-zinc-800'
                        }
                        data-variant="ghost"
                        data-transparent={String(props.transparent)}
                    >
                        ghost card
                    </div>
                )}
        </>
    );
}
