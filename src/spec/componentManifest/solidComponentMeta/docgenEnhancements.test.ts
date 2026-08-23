/**
 * Docs pipeline: auto-if, defaults, jsDocTags, DOM prop filtering counts.
 * Type → control mapping lives in typeScenarioBaseline.test.ts.
 */
import { afterEach, describe, expect, it } from 'vitest';

import {
    expectScenario,
    extractComponentDoc,
} from '../../helpers/controlScenario';
import { cardDiscriminatedUnion, htmlAttributesButton } from '../../helpers/scenarioFixtures';
import { expectStoryMatchesDirectExtract } from '../../helpers/storyScenario';
import { cleanupSpecTempDirs } from '../../helpers/tempProject';

const tempDirs: string[] = [];

afterEach(() => {
    cleanupSpecTempDirs(tempDirs);
});

describe('dOM prop filtering', () => {
    it('keeps allowlisted inherited DOM props but drops event handlers and bulk attrs', () => {
        expectScenario('DOM allowlist', {
            ...htmlAttributesButton,
            maxPropCount: 40,
            absentProps: ['onClick', 'innerText'],
            expectations: [
                { prop: 'label', rcmName: 'string', control: 'text' },
                { prop: 'id', rcmName: 'string', control: 'text' },
                { prop: 'class', rcmName: 'string', control: 'text' },
            ],
        }, tempDirs);
    });

    it('excludes Solid JSX-only namespaces from globally augmented JSX types', () => {
        expectScenario('Solid JSX namespace filter', {
            files: {
                'solid-jsx.d.ts': `
                    import 'solid-js';

                    declare module 'solid-js' {
                        namespace JSX {
                            interface Directives {
                                clickOutside: boolean;
                            }
                            interface ExplicitProperties {
                                value: string;
                            }
                            interface ExplicitAttributes {
                                href: string;
                            }
                            interface ExplicitBoolAttributes {
                                open: boolean;
                            }
                            interface CustomEvents {
                                custom: Event;
                            }
                            interface CustomCaptureEvents {
                                captured: Event;
                            }
                        }
                    }
                `,
                'Button.tsx': `
                    import type { JSX } from 'solid-js';
                    import './solid-jsx';

                    interface ButtonProps extends JSX.HTMLAttributes<HTMLDivElement> {
                        label: string;
                    }

                    export function Button(props: ButtonProps) {
                        return null;
                    }
                `,
            },
            entryFile: 'Button.tsx',
            exportName: 'Button',
            maxPropCount: 40,
            absentProps: [
                'use:clickOutside',
                'prop:value',
                'attr:href',
                'bool:open',
                'on:custom',
                'oncapture:captured',
            ],
            expectations: [
                { prop: 'label', rcmName: 'string', control: 'text' },
            ],
        }, tempDirs);
    });
});

describe('discriminated union auto-if', () => {
    it('adds conditional visibility for branch-only props', () => {
        const doc = expectScenario('auto-if on branch props', {
            ...cardDiscriminatedUnion,
            expectations: [
                { prop: 'padding', if: { arg: 'variant', eq: 'solid' } },
                { prop: 'transparent', if: { arg: 'variant', eq: 'ghost' } },
            ],
        }, tempDirs);

        expect(doc?.props['variant']?.if).toBeUndefined();
    });
});

describe('story pipeline integration', () => {
    it('preserves destructuring defaults through extractPropsFromStories', async() => {
        const { pipeline } = await expectStoryMatchesDirectExtract({
            label: 'story pipeline defaults',
            files: {
                'storybook-solidjs-vite.ts': `
                    export type Meta<C> = { component?: C; title?: string };
                    export type StoryObj<M> = { args?: Record<string, unknown> };
                `,
                'Button.tsx': `
                    interface ButtonProps {
                        label: string;
                        size?: 'sm' | 'lg';
                    }
                    export function Button({ label = 'Click me', size = 'sm' }: ButtonProps) {
                        return null;
                    }
                `,
                'Button.stories.tsx': `
                    import type { Meta, StoryObj } from './storybook-solidjs-vite';
                    import { Button } from './Button';

                    const meta = {
                        component: Button,
                        title: 'Example/Button',
                    } satisfies Meta<typeof Button>;

                    export default meta;
                    type Story = StoryObj<typeof meta>;

                    export const Primary: Story = {
                        args: { label: 'Hi' },
                    };
                `,
            },
            storyFile: 'Button.stories.tsx',
            componentFile: 'Button.tsx',
            exportName: 'Button',
            tempDirs,
        });

        expect(pipeline.doc?.props['label']?.defaultValue).toEqual({ value: '\'Click me\'' });
        expect(pipeline.doc?.props['size']?.defaultValue).toEqual({ value: '\'sm\'' });
    });
});

describe('default values', () => {
    it('extracts @default from prop JSDoc', () => {
        expectScenario('@default JSDoc', {
            files: {
                'Button.tsx': `
                    interface ButtonProps {
                        /** @default Click me */
                        label: string;
                    }
                    export function Button(props: ButtonProps) { return null; }
                `,
            },
            entryFile: 'Button.tsx',
            exportName: 'Button',
            expectations: [
                { prop: 'label', defaultValue: { value: 'Click me' } },
            ],
        }, tempDirs);
    });

    it('extracts defaults from destructured parameter initializers', () => {
        expectScenario('destructuring defaults', {
            files: {
                'Button.tsx': `
                    interface ButtonProps {
                        label: string;
                        size?: 'sm' | 'lg';
                    }
                    export function Button({ label = 'Click me', size = 'sm' }: ButtonProps) {
                        return null;
                    }
                `,
            },
            entryFile: 'Button.tsx',
            exportName: 'Button',
            expectations: [
                { prop: 'label', defaultValue: { value: '\'Click me\'' } },
                { prop: 'size', defaultValue: { value: '\'sm\'' } },
            ],
        }, tempDirs);
    });
});

describe('component jsDocTags', () => {
    it('collects component-level JSDoc tags such as @import', () => {
        expectScenario('component @import', {
            files: {
                'Button.tsx': `
                    interface ButtonProps { label: string; }
                    /** @import "./Button.js" */
                    export function Button(props: ButtonProps) { return null; }
                `,
            },
            entryFile: 'Button.tsx',
            exportName: 'Button',
            jsDocTags: { import: ['"./Button.js"'] },
        }, tempDirs);
    });
});
