/**
 * Pick / Omit / Required and intersection compositions.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { expectProp, expectScenario, extractComponentDoc } from '../../helpers/controlScenario';
import { cleanupSpecTempDirs } from '../../helpers/tempProject';

const tempDirs: string[] = [];

afterEach(() => {
    cleanupSpecTempDirs(tempDirs);
});

describe('component props', () => {
    it('resolves Omit<Base, keys> & custom fields', () => {
        expectScenario('Omit and extend', {
            files: {
                'SuperButton.tsx': `
                    interface ButtonProps { size: 'sm' | 'lg'; label: string; children: string; }
                    type SuperButtonProps = Omit<ButtonProps, 'children'> & { badge: string };
                    export function SuperButton(props: SuperButtonProps) { return null; }
                `,
            },
            entryFile: 'SuperButton.tsx',
            exportName: 'SuperButton',
            expectations: [
                { prop: 'size', rcmName: 'enum', control: 'radio' },
                { prop: 'label', rcmName: 'string', control: 'text' },
                { prop: 'badge', rcmName: 'string', control: 'text' },
                { prop: 'children', missing: true },
            ],
        }, tempDirs);
    });

    it('resolves cross-file Omit<Base, keys> & custom fields', () => {
        const doc = extractComponentDoc({
            files: {
                'Button.tsx': `
                    export interface ButtonProps { size: 'sm' | 'lg'; label: string; children: string; }
                `,
                'SuperButton.tsx': `
                    import type { ButtonProps } from './Button';
                    type SuperButtonProps = Omit<ButtonProps, 'children'> & { badge: string };
                    export function SuperButton(props: SuperButtonProps) { return null; }
                `,
            },
            entryFile: 'SuperButton.tsx',
            exportName: 'SuperButton',
            tempDirs,
        });

        expect(Object.keys(doc?.props ?? {}).sort()).toEqual(['badge', 'label', 'size']);
        expect(doc?.props.children).toBeUndefined();
    });

    it('resolves Pick and Omit type aliases on the component', () => {
        expectScenario('Pick alias on component', {
            files: {
                'Button.tsx': `
                    interface ButtonProps { size: 'sm' | 'lg'; label: string; children: string; }
                    type SlimProps = Pick<ButtonProps, 'size' | 'label'>;
                    export function Slim(props: SlimProps) { return null; }
                `,
            },
            entryFile: 'Button.tsx',
            exportName: 'Slim',
            expectations: [
                { prop: 'size', rcmName: 'enum', control: 'radio' },
                { prop: 'label', rcmName: 'string', control: 'text' },
                { prop: 'children', missing: true },
            ],
        }, tempDirs);
    });

    it('resolves Required on optional object props', () => {
        expectScenario('Required utility', {
            files: {
                'Example.tsx': `
                    interface Props { meta?: { id: string; count: number }; }
                    type RequiredProps = Required<Props>;
                    export function Example(props: RequiredProps) { return null; }
                `,
            },
            entryFile: 'Example.tsx',
            exportName: 'Example',
            expectations: [
                {
                    prop: 'meta',
                    rcmName: '{ id: string; count: number; }',
                    control: 'object',
                    required: true,
                },
            ],
        }, tempDirs);
    });

    it('resolves nested Omit<Pick<>> compositions', () => {
        const doc = extractComponentDoc({
            files: {
                'Example.tsx': `
                    interface Base { a: string; b: number; c: boolean; }
                    type Composed = Omit<Pick<Base, 'a' | 'b'>, 'a'> & { d: string };
                    export function Example(props: Composed) { return null; }
                `,
            },
            entryFile: 'Example.tsx',
            exportName: 'Example',
            tempDirs,
        });

        expect(Object.keys(doc?.props ?? {}).sort()).toEqual(['b', 'd']);
        expectProp(doc, 'nested Omit<Pick>', 'b', { rcmName: 'number' });
        expectProp(doc, 'nested Omit<Pick>', 'd', { rcmName: 'string' });
    });
});

describe('nested prop serialization', () => {
    it('expands inline Pick and Omit object props', () => {
        const doc = extractComponentDoc({
            files: {
                'Button.tsx': `
                    interface ButtonProps { size: 'sm' | 'lg'; label: string; children: string; }
                    interface WrapperProps {
                        picked: Pick<ButtonProps, 'size'>;
                        omitted: Omit<ButtonProps, 'label' | 'children'>;
                    }
                    export function Wrapper(props: WrapperProps) { return null; }
                `,
            },
            entryFile: 'Button.tsx',
            exportName: 'Wrapper',
            tempDirs,
        });

        expectProp(doc, 'inline Pick/Omit', 'picked', {
            type: { name: '{ size: "sm" | "lg"; }', raw: '{ size: "sm" | "lg"; }' },
        });
        expectProp(doc, 'inline Pick/Omit', 'omitted', {
            type: { name: '{ size: "sm" | "lg"; }', raw: '{ size: "sm" | "lg"; }' },
        });
    });

    it('expands type aliases that resolve to Pick selections', () => {
        const doc = extractComponentDoc({
            files: {
                'Button.tsx': `
                    interface ButtonProps { size: 'sm' | 'lg'; label: string; }
                    type Picked = Pick<ButtonProps, 'size'>;
                    interface WrapperProps { picked: Picked; }
                    export function Wrapper(props: WrapperProps) { return null; }
                `,
            },
            entryFile: 'Button.tsx',
            exportName: 'Wrapper',
            tempDirs,
        });

        expectProp(doc, 'Pick alias nested', 'picked', { rcmName: '{ size: "sm" | "lg"; }' });
    });

    it('expands Omit alias intersections used as nested props', () => {
        const doc = extractComponentDoc({
            files: {
                'Button.tsx': `
                    interface ButtonProps { size: 'sm' | 'lg'; label: string; children: string; }
                    type SuperButtonProps = Omit<ButtonProps, 'children'> & { badge: string };
                    interface WrapperProps { super: SuperButtonProps; }
                    export function Wrapper(props: WrapperProps) { return null; }
                `,
            },
            entryFile: 'Button.tsx',
            exportName: 'Wrapper',
            tempDirs,
        });

        expectProp(doc, 'Omit intersection nested', 'super', {
            rcmName: '{ badge: string; label: string; size: "sm" | "lg"; }',
        });
    });
});
