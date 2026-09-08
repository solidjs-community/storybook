export function Header(props: { heading: string }) {
    return (
        <header class="text-sm font-semibold text-zinc-900">
            {props.heading}
        </header>
    );
}

export function Footer(props: { note: string }) {
    return (
        <footer class="text-xs text-zinc-500">
            {props.note}
        </footer>
    );
}

function CardRoot(props: { title: string }) {
    return (
        <section class="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 shadow-sm">
            {props.title}
        </section>
    );
}

/** Compound component — Header/Footer are declared via meta.subcomponents, not story JSX. */
export const Card = Object.assign(CardRoot, {
    Header,
    Footer,
});
