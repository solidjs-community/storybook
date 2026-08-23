export function Header(props: { heading: string }) {
    return (
        <header class="font-semibold">
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
        <section class="grid min-w-48 gap-2 rounded-xl border border-zinc-200 bg-white p-4 font-sans text-sm text-zinc-800">
            {props.title}
        </section>
    );
}

/** Compound component — Header/Footer are declared via meta.subcomponents, not story JSX. */
export const Card = Object.assign(CardRoot, {
    Header,
    Footer,
});
