export function Header(props: { heading: string }) {
    return (
        <header>
            {props.heading}
        </header>
    );
}

export function Footer(props: { note: string }) {
    return (
        <footer>
            {props.note}
        </footer>
    );
}

function CardRoot(props: { title: string }) {
    return (
        <section>
            {props.title}
        </section>
    );
}

/** Compound component — Header/Footer are declared via meta.subcomponents, not story JSX. */
export const Card = Object.assign(CardRoot, {
    Header,
    Footer,
});
