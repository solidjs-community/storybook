export interface InlineCanvasProps {
    /** Text shown in the canvas — change it from Controls on the docs page. */
    label: string;
}

/** Autodocs canvas fixture — args must update the DOM in place when inlined. */
export function InlineCanvas(props: InlineCanvasProps) {
    return (
        <p
            data-testid="inline-canvas-label"
            class="m-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900"
        >
            {props.label}
        </p>
    );
}
