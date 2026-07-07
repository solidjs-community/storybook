type CardProps
    = | { variant: 'solid'; padding: number }
      | { variant: 'ghost'; transparent: boolean };

/** Discriminated union — auto-if controls on variant-specific props. */
export function Card(props: CardProps) {
    return (
        <>
            {props.variant === 'solid'
                ? (
                    <div data-variant="solid" style={{ padding: `${ props.padding }px` }}>
                        solid card
                    </div>
                )
                : (
                    <div data-variant="ghost" data-transparent={String(props.transparent)}>
                        ghost card
                    </div>
                )}
        </>
    );
}
