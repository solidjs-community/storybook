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
                        data-variant="solid"
                        class="rounded-lg bg-zinc-900 text-sm text-white"
                        style={{ padding: `${ props.padding }px` }}
                    >
                        solid card
                    </div>
                )
                : (
                    <div
                        data-variant="ghost"
                        data-transparent={String(props.transparent)}
                        class={`rounded-lg border border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-600 ${
                            props.transparent ? 'bg-transparent' : 'bg-zinc-50'
                        }`}
                    >
                        ghost card
                    </div>
                )}
        </>
    );
}
