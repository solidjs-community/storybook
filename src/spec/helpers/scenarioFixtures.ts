/** Shared multi-file fixtures reused across spec suites. */
export const cardDiscriminatedUnion = {
    files: {
        'Card.tsx': `
            type CardProps =
                | { variant: 'solid'; padding: number }
                | { variant: 'ghost'; transparent: boolean };
            export function Card(props: CardProps) { return null; }
        `,
    },
    entryFile: 'Card.tsx',
    exportName: 'Card',
} as const;

export const htmlAttributesButton = {
    files: {
        'Button.tsx': `
            import type { JSX } from 'solid-js';
            interface ButtonProps extends JSX.HTMLAttributes<HTMLDivElement> {
                label: string;
            }
            export function Button(props: ButtonProps) { return null; }
        `,
    },
    entryFile: 'Button.tsx',
    exportName: 'Button',
} as const;
