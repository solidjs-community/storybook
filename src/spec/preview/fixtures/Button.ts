export type ButtonProps = { label: string; primary?: boolean };

/** Labels seen by `play` functions, in run order. */
export const played: string[] = [];

// Solid components may return DOM nodes. That keeps these fixtures free of JSX.
export function Button(props: ButtonProps) {
    const button = document.createElement('button');

    button.textContent = props.label;
    button.dataset['primary'] = String(props.primary ?? false);

    return button;
}

export function recordPlay({ canvasElement }: { canvasElement: HTMLElement }) {
    played.push(canvasElement.querySelector('button')?.textContent ?? '');
}
