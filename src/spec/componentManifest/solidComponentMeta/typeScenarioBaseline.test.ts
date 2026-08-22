import { afterEach, describe, it } from 'vitest';

import { expectScenario } from '../../helpers/controlScenario';
import { cleanupSpecTempDirs } from '../../helpers/tempProject';

/**
 * Type → control scenarios via expectScenario.
 * Docs pipeline features (auto-if, defaults, DOM filtering) live in docgenEnhancements.test.ts.
 */
const tempDirs: string[] = [];

afterEach(() => {
    cleanupSpecTempDirs(tempDirs);
});

describe('design system type patterns', () => {
    it('resolves Size through a barrel re-export', () => {
        expectScenario('barrel re-export', {
            files: {
                'tokens/size.ts': 'export type Size = \'sm\' | \'lg\';',
                'tokens/index.ts': 'export type { Size } from \'./size\';',
                'Button.tsx': `
                    import type { Size } from './tokens';
                    interface ButtonProps { size: Size; }
                    export function Button(props: ButtonProps) { return null; }
                `,
            },
            entryFile: 'Button.tsx',
            exportName: 'Button',
            expectations: [
                { prop: 'size', rcmName: 'enum', control: 'radio' },
            ],
        }, tempDirs);
    });

    it('merges imported base props via extends', () => {
        expectScenario('extends imported interface', {
            files: {
                'base.ts': `
                    export interface Base {
                        disabled?: boolean;
                        size: 'sm' | 'lg';
                    }
                `,
                'Button.tsx': `
                    import type { Base } from './base';
                    interface ButtonProps extends Base { label: string; }
                    export function Button(props: ButtonProps) { return null; }
                `,
            },
            entryFile: 'Button.tsx',
            exportName: 'Button',
            expectations: [
                { prop: 'size', rcmName: 'enum', control: 'radio' },
                { prop: 'disabled', rcmName: 'boolean', control: 'boolean' },
                { prop: 'label', rcmName: 'string', control: 'text' },
            ],
        }, tempDirs);
    });

    it('unwraps Readonly wrappers for serialization while keeping object controls', () => {
        expectScenario('Readonly and Partial wrappers', {
            files: {
                'Example.tsx': `
                    interface Props {
                        config: Readonly<{ nested: { mode: 'a' | 'b' } }>;
                        deepPartial: Partial<{ a: string; b: number }>;
                    }
                    export function Example(props: Props) { return null; }
                `,
            },
            entryFile: 'Example.tsx',
            exportName: 'Example',
            expectations: [
                {
                    prop: 'config',
                    rcmName: '{ nested: { mode: "a" | "b"; }; }',
                    control: 'object',
                },
                {
                    prop: 'deepPartial',
                    rcmName: '{ a: string; b: number; }',
                    control: 'object',
                },
            ],
        }, tempDirs);
    });

    it('does not infer enum controls from Record literal keys', () => {
        expectScenario('Record literal keys', {
            files: {
                'Example.tsx': `
                    interface Props { map: Record<'a' | 'b', string>; }
                    export function Example(props: Props) { return null; }
                `,
            },
            entryFile: 'Example.tsx',
            exportName: 'Example',
            expectations: [
                {
                    prop: 'map',
                    rcmName: 'Record<"a" | "b", string>',
                    control: 'object',
                },
            ],
        }, tempDirs);
    });

    it('maps keyof typeof const arrays to radio options', () => {
        expectScenario('keyof typeof const array', {
            files: {
                'Example.tsx': `
                    const SIZES = ['sm', 'lg'] as const;
                    interface Props {
                        key: keyof typeof SIZES;
                        value: typeof SIZES[number];
                        whole: typeof SIZES;
                    }
                    export function Example(props: Props) { return null; }
                `,
            },
            entryFile: 'Example.tsx',
            exportName: 'Example',
            expectations: [
                {
                    prop: 'key',
                    rcmName: 'enum',
                    control: 'radio',
                },
                { prop: 'value', rcmName: 'enum', control: 'radio' },
                {
                    prop: 'whole',
                    rcmName: 'readonly ["sm", "lg"]',
                    control: 'object',
                },
            ],
        }, tempDirs);
    });

    it('maps keyof typeof const objects to radio options', () => {
        expectScenario('keyof typeof const object', {
            files: {
                'Example.tsx': `
                    const VARIANTS = { primary: 'p', secondary: 's' } as const;
                    interface Props {
                        key: keyof typeof VARIANTS;
                    }
                    export function Example(props: Props) { return null; }
                `,
            },
            entryFile: 'Example.tsx',
            exportName: 'Example',
            expectations: [
                { prop: 'key', rcmName: 'enum', control: 'radio' },
            ],
        }, tempDirs);
    });

    it('treats autocomplete unions with (string & {}) as text', () => {
        expectScenario('widened string union', {
            files: {
                'Example.tsx': `
                    interface Props {
                        size: 'sm' | 'lg' | (string & {});
                    }
                    export function Example(props: Props) { return null; }
                `,
            },
            entryFile: 'Example.tsx',
            exportName: 'Example',
            expectations: [
                { prop: 'size', rcmName: 'string', control: 'text' },
            ],
        }, tempDirs);
    });

    it('supports const enum and numeric enum flags', () => {
        expectScenario('const and numeric enums', {
            files: {
                'Example.tsx': `
                    const enum Direction { Up = 'up', Down = 'down' }
                    enum Flags { A = 1 << 0, B = 1 << 1, C = A | B }
                    interface Props { direction: Direction; flags: Flags; }
                    export function Example(props: Props) { return null; }
                `,
            },
            entryFile: 'Example.tsx',
            exportName: 'Example',
            expectations: [
                { prop: 'direction', rcmName: 'enum', control: 'radio' },
                { prop: 'flags', rcmName: 'enum', control: 'radio' },
            ],
        }, tempDirs);
    });
});

describe('solid JSX & DOM props', () => {
    it('surfaces allowlisted props from extends HTMLAttributes', () => {
        expectScenario('extends HTMLAttributes', {
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
            expectations: [
                { prop: 'id', rcmName: 'string', control: 'text' },
                { prop: 'class', rcmName: 'string', control: 'text' },
                { prop: 'label', rcmName: 'string', control: 'text' },
            ],
        }, tempDirs);
    });

    it('surfaces allowlisted props from extends SvgSVGAttributes', () => {
        expectScenario('extends SvgSVGAttributes', {
            files: {
                'Icon.tsx': `
                    import type { JSX } from 'solid-js';
                    interface IconProps extends JSX.SvgSVGAttributes<SVGSVGElement> {
                        title: string;
                    }
                    export function Icon(props: IconProps) { return null; }
                `,
            },
            entryFile: 'Icon.tsx',
            exportName: 'Icon',
            expectations: [
                { prop: 'class', rcmName: 'string', control: 'text' },
                { prop: 'title', rcmName: 'string', control: 'text' },
            ],
        }, tempDirs);
    });

    it('resolves indexed access through IntrinsicElements', () => {
        expectScenario('IntrinsicElements indexed access', {
            files: {
                'Button.tsx': `
                    import type { JSX } from 'solid-js';
                    type Div = JSX.IntrinsicElements['div'];
                    interface ButtonProps {
                        id: Div['id'];
                        class: Div['class'];
                    }
                    export function Button(props: ButtonProps) { return null; }
                `,
            },
            entryFile: 'Button.tsx',
            exportName: 'Button',
            expectations: [
                { prop: 'id', rcmName: 'string', control: 'text' },
                { prop: 'class', rcmName: 'string', control: 'text' },
            ],
        }, tempDirs);
    });

    it('resolves ComponentProps<typeof Component>', () => {
        expectScenario('ComponentProps', {
            files: {
                'Button.tsx': `
                    import type { ComponentProps } from 'solid-js';
                    function BaseButton(props: { size?: 'sm' | 'lg'; label: string }) {
                        return null;
                    }
                    interface ButtonProps extends ComponentProps<typeof BaseButton> {}
                    export function Button(props: ButtonProps) { return null; }
                `,
            },
            entryFile: 'Button.tsx',
            exportName: 'Button',
            expectations: [
                { prop: 'size', rcmName: 'enum', control: 'radio' },
                { prop: 'label', rcmName: 'string', control: 'text' },
            ],
        }, tempDirs);
    });

    it('collects branch-only props from imported discriminated unions', () => {
        expectScenario('imported discriminated union', {
            files: {
                'types.ts': `
                    export type CardProps =
                        | { variant: 'solid'; padding: number }
                        | { variant: 'ghost'; transparent: boolean };
                `,
                'Card.tsx': `
                    import type { CardProps } from './types';
                    export function Card(props: CardProps) { return null; }
                `,
            },
            entryFile: 'Card.tsx',
            exportName: 'Card',
            expectations: [
                { prop: 'variant', rcmName: 'enum', control: 'radio' },
                { prop: 'padding', rcmName: 'number', control: 'number' },
                { prop: 'transparent', rcmName: 'boolean', control: 'boolean' },
            ],
        }, tempDirs);
    });

    it('marks props optional when any union branch makes them optional', () => {
        expectScenario('union optional prop', {
            files: {
                'Example.tsx': `
                    type Props =
                        | { label: string }
                        | { label?: string; extra: boolean };
                    export function Example(props: Props) { return null; }
                `,
            },
            entryFile: 'Example.tsx',
            exportName: 'Example',
            expectations: [
                { prop: 'label', rcmName: 'string', control: 'text', required: false },
            ],
        }, tempDirs);
    });
});

describe('solid component aliases', () => {
    it('resolves props from solid-js Component aliases', () => {
        expectScenario('Component<Props>', {
            files: {
                'Button.tsx': `
                    import type { Component } from 'solid-js';
                    interface ButtonProps { size?: 'sm' | 'lg'; label: string; }
                    export const Button: Component<ButtonProps> = () => null;
                `,
            },
            entryFile: 'Button.tsx',
            exportName: 'Button',
            expectations: [
                { prop: 'size', rcmName: 'enum', control: 'radio' },
                { prop: 'label', rcmName: 'string', control: 'text' },
            ],
        }, tempDirs);
    });

    it('resolves props from VoidComponent alias', () => {
        expectScenario('VoidComponent', {
            files: {
                'Void.tsx': `
                    import type { VoidComponent } from 'solid-js';
                    interface Props { size?: 'sm' | 'lg'; }
                    export const Void: VoidComponent<Props> = () => null;
                `,
            },
            entryFile: 'Void.tsx',
            exportName: 'Void',
            expectations: [
                { prop: 'size', rcmName: 'enum', control: 'radio' },
            ],
        }, tempDirs);
    });

    it('resolves props from ParentComponent alias', () => {
        expectScenario('ParentComponent', {
            files: {
                'Parent.tsx': `
                    import type { ParentComponent } from 'solid-js';
                    interface Props { size?: 'sm' | 'lg'; }
                    export const Parent: ParentComponent<Props> = () => null;
                `,
            },
            entryFile: 'Parent.tsx',
            exportName: 'Parent',
            expectations: [
                { prop: 'size', rcmName: 'enum', control: 'radio' },
            ],
        }, tempDirs);
    });

    it('resolves props from FlowComponent alias', () => {
        expectScenario('FlowComponent', {
            files: {
                'Flow.tsx': `
                    import type { FlowComponent } from 'solid-js';
                    interface Props { size?: 'sm' | 'lg'; }
                    export const Flow: FlowComponent<Props> = () => null;
                `,
            },
            entryFile: 'Flow.tsx',
            exportName: 'Flow',
            expectations: [
                { prop: 'size', rcmName: 'enum', control: 'radio' },
            ],
        }, tempDirs);
    });

    it('extracts literal unions from generic components', () => {
        expectScenario('generic List<T extends literals>', {
            files: {
                'List.tsx': `
                    interface ListProps<T extends 'a' | 'b'> {
                        item: T;
                        items: T[];
                    }
                    export function List<T extends 'a' | 'b'>(props: ListProps<T>) {
                        return null;
                    }
                `,
            },
            entryFile: 'List.tsx',
            exportName: 'List',
            expectations: [
                { prop: 'item', rcmName: 'enum', control: 'radio' },
                { prop: 'items', rcmName: 'array', control: 'object' },
            ],
        }, tempDirs);
    });

    it('surfaces branch-only discriminated union props', () => {
        expectScenario('top-level discriminated props', {
            files: {
                'Button.tsx': `
                    type ButtonProps =
                        | { variant: 'primary'; label: string; muted?: boolean }
                        | { variant: 'ghost'; transparent: boolean; label?: string };
                    export function Button(props: ButtonProps) { return null; }
                `,
            },
            entryFile: 'Button.tsx',
            exportName: 'Button',
            expectations: [
                { prop: 'variant', rcmName: 'enum', control: 'radio' },
                { prop: 'label', rcmName: 'string', control: 'text', required: false },
                { prop: 'muted', rcmName: 'boolean', control: 'boolean' },
                { prop: 'transparent', rcmName: 'boolean', control: 'boolean' },
            ],
        }, tempDirs);
    });

    it('maps solid-js JSX types to loose docgen (Element alias or any)', () => {
        expectScenario('solid-js JSX types', {
            files: {
                'Card.tsx': `
                    import type { JSX } from 'solid-js';
                    interface CardProps {
                        children: JSX.Element;
                        style?: JSX.CSSProperties;
                    }
                    export function Card(props: CardProps) { return null; }
                `,
            },
            entryFile: 'Card.tsx',
            exportName: 'Card',
            expectations: [
                { prop: 'children', rcmName: 'Element', control: 'object' },
                { prop: 'style', rcmName: 'CSSProperties', control: 'object' },
            ],
        }, tempDirs);
    });
});

describe('indexed access & npm type aliases', () => {
    it('resolves interface indexed access to string or enum', () => {
        expectScenario('local indexed access', {
            files: {
                'Button.tsx': `
                    interface Source {
                        size: 'sm' | 'lg';
                        label: string;
                        count: number;
                    }
                    interface ButtonProps {
                        size: Source['size'];
                        label: Source['label'];
                        count: Source['count'];
                    }
                    export function Button(props: ButtonProps) { return null; }
                `,
            },
            entryFile: 'Button.tsx',
            exportName: 'Button',
            expectations: [
                { prop: 'size', rcmName: 'enum', control: 'radio' },
                { prop: 'label', rcmName: 'string', control: 'text' },
                { prop: 'count', rcmName: 'number', control: 'number' },
            ],
        }, tempDirs);
    });

    it('resolves imported interface indexed access through type aliases', () => {
        expectScenario('imported indexed access alias', {
            files: {
                'theme.ts': `
                    export interface Theme {
                        accent: 'blue' | 'red';
                        name: string;
                    }
                `,
                'Button.tsx': `
                    import type { Theme } from './theme';
                    type Accent = Theme['accent'];
                    type Name = Theme['name'];
                    interface ButtonProps {
                        accent: Accent;
                        name: Name;
                    }
                    export function Button(props: ButtonProps) { return null; }
                `,
            },
            entryFile: 'Button.tsx',
            exportName: 'Button',
            expectations: [
                { prop: 'accent', rcmName: 'enum', control: 'radio' },
                { prop: 'name', rcmName: 'string', control: 'text' },
            ],
        }, tempDirs);
    });

    it('resolves nested indexed access and Pick<> selections', () => {
        expectScenario('nested indexed access', {
            files: {
                'Button.tsx': `
                    interface Tokens {
                        colors: { secondary: '#fff' | '#000' };
                    }
                    interface Full { size: 'sm' | 'lg'; label: string; }
                    interface ButtonProps {
                        color: Tokens['colors']['secondary'];
                        size: Pick<Full, 'size'>['size'];
                    }
                    export function Button(props: ButtonProps) { return null; }
                `,
            },
            entryFile: 'Button.tsx',
            exportName: 'Button',
            expectations: [
                { prop: 'color', rcmName: 'enum', control: 'radio' },
                { prop: 'size', rcmName: 'enum', control: 'radio' },
            ],
        }, tempDirs);
    });

    it('maps single const indexed literals to radio options', () => {
        expectScenario('typeof const indexed literal', {
            files: {
                'Button.tsx': `
                    const CONFIG = { mode: 'light' as const, size: 'sm' as const };
                    interface ButtonProps {
                        mode: typeof CONFIG['mode'];
                        size: typeof CONFIG['size'];
                    }
                    export function Button(props: ButtonProps) { return null; }
                `,
            },
            entryFile: 'Button.tsx',
            exportName: 'Button',
            expectations: [
                { prop: 'mode', rcmName: 'enum', control: 'radio' },
                { prop: 'size', rcmName: 'enum', control: 'radio' },
            ],
        }, tempDirs);
    });

    it('resolves npm generic indexed access to primitive controls', () => {
        expectScenario('solid-js HTMLAttributes indexed access', {
            files: {
                'Button.tsx': `
                    import type { JSX } from 'solid-js';
                    type DivAttrs = JSX.HTMLAttributes<HTMLDivElement>;
                    interface ButtonProps {
                        id: DivAttrs['id'];
                        role: DivAttrs['role'];
                    }
                    export function Button(props: ButtonProps) { return null; }
                `,
            },
            entryFile: 'Button.tsx',
            exportName: 'Button',
            expectations: [
                {
                    prop: 'id',
                    rcmName: 'string',
                    control: 'text',
                },
                {
                    prop: 'role',
                    rcmName: 'enum',
                    control: 'select',
                },
            ],
        }, tempDirs);
    });
});
