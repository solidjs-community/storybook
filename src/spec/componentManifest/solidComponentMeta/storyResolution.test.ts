/**
 * Production-path integration: CSF story file → getComponents → extractPropsFromStories → docgen.
 * Type serialization rules are covered elsewhere; here we verify story wiring matches direct extract.
 */
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { cardDiscriminatedUnion, htmlAttributesButton } from '../../helpers/scenarioFixtures';
import {
    expectStoryDocMatchesComponentDoc,
    expectStoryMatchesDirectExtract,
    extractViaComponentFile,
    extractViaStoryPipeline,
} from '../../helpers/storyScenario';
import { cleanupSpecTempDirs } from '../../helpers/tempProject';

const tempDirs: string[] = [];

afterEach(() => {
    cleanupSpecTempDirs(tempDirs);
});

const buttonComponent = `
    interface ButtonProps {
        label: string;
        size?: 'sm' | 'lg';
    }
    export function Button(props: ButtonProps) {
        return null;
    }
`;

const defaultExportButtonComponent = `
    interface ButtonProps {
        label: string;
        size?: 'sm' | 'lg';
    }
    export default function Button(props: ButtonProps) {
        return null;
    }
`;

/** Minimal preview stub — same shape as definePreview().meta().story() at runtime. */
const previewStub = `
    export default {
        meta(input: Record<string, unknown>) {
            return {
                ...input,
                story(storyInput: Record<string, unknown>) {
                    return storyInput;
                },
            };
        },
    };
`;

/** Type-only stub so temp stories can use satisfies Meta / StoryObj without the package. */
const storybookTypesStub = `
    export type Meta<C> = {
        component?: C;
        title?: string;
        args?: Record<string, unknown>;
    };

    export type StoryObj<M> = {
        args?: Record<string, unknown>;
        render?: (...args: unknown[]) => unknown;
    };
`;

describe('cSF 3 meta.component → docgen', () => {
    it('matches direct extract for satisfies Meta<typeof Component> stories', async() => {
        const { pipeline } = await expectStoryMatchesDirectExtract({
            label: 'satisfies Meta StoryObj',
            files: {
                'storybook-solidjs-vite.ts': storybookTypesStub,
                'Button.tsx': buttonComponent,
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
                        args: {
                            label: 'Click me',
                            size: 'sm',
                        },
                    };
                `,
            },
            storyFile: 'Button.stories.tsx',
            componentFile: 'Button.tsx',
            exportName: 'Button',
            tempDirs,
        });

        expect(pipeline.componentRef.path).toBe(pipeline.componentPath);
        expect(pipeline.componentRef.importId).toBe('./Button');
        expect(pipeline.componentRef.importName).toBe('Button');
    });

    it('matches direct extract for default-export components', async() => {
        await expectStoryMatchesDirectExtract({
            label: 'default export component',
            files: {
                'storybook-solidjs-vite.ts': storybookTypesStub,
                'Button.tsx': defaultExportButtonComponent,
                'Button.stories.tsx': `
                    import type { Meta, StoryObj } from './storybook-solidjs-vite';
                    import Button from './Button';

                    const meta = {
                        component: Button,
                        title: 'Example/Button',
                    } satisfies Meta<typeof Button>;

                    export default meta;
                    type Story = StoryObj<typeof meta>;

                    export const Primary: Story = {
                        args: { label: 'Click me', size: 'sm' },
                    };
                `,
            },
            storyFile: 'Button.stories.tsx',
            componentFile: 'Button.tsx',
            exportName: 'default',
            tempDirs,
        });
    });
});

describe('cSF Next preview.meta → docgen', () => {
    it('matches direct extract for meta.story with args', async() => {
        await expectStoryMatchesDirectExtract({
            label: 'CSF Next args-only',
            files: {
                'preview.ts': previewStub,
                'Button.tsx': buttonComponent,
                'Button.stories.tsx': `
                    import preview from './preview';
                    import { Button } from './Button';

                    const meta = preview.meta({
                        component: Button,
                        title: 'Example/Button',
                    });

                    export const Primary = meta.story({
                        args: {
                            label: 'Click me',
                            size: 'sm',
                        },
                    });
                `,
            },
            storyFile: 'Button.stories.tsx',
            componentFile: 'Button.tsx',
            exportName: 'Button',
            tempDirs,
        });
    });

    it('matches direct extract when meta.story uses render JSX', async() => {
        await expectStoryMatchesDirectExtract({
            label: 'CSF Next render JSX',
            files: {
                'preview.ts': previewStub,
                'Button.tsx': buttonComponent,
                'Button.stories.tsx': `
                    import preview from './preview';
                    import { Button } from './Button';

                    const meta = preview.meta({
                        component: Button,
                        title: 'Example/Button',
                    });

                    export const WithRender = meta.story({
                        render: () => <Button label="Hi" size="lg" />,
                    });
                `,
            },
            storyFile: 'Button.stories.tsx',
            componentFile: 'Button.tsx',
            exportName: 'Button',
            tempDirs,
        });
    });
});

describe('jSX in story → resolvePropsFromStoryFile', () => {
    it('matches direct extract when story renders the component', async() => {
        await expectStoryMatchesDirectExtract({
            label: 'render JSX',
            files: {
                'Button.tsx': buttonComponent,
                'Button.stories.tsx': `
                    import { Button } from './Button';

                    export default {
                        component: Button,
                        title: 'Example/Button',
                    };

                    export const WithRender = {
                        render: () => <Button label="Hi" size="lg" />,
                    };
                `,
            },
            storyFile: 'Button.stories.tsx',
            componentFile: 'Button.tsx',
            exportName: 'Button',
            tempDirs,
        });
    });

    it('matches direct extract for namespace imports with render JSX', async() => {
        await expectStoryMatchesDirectExtract({
            label: 'namespace import JSX',
            files: {
                'Button.tsx': buttonComponent,
                'Button.stories.tsx': `
                    import * as UI from './Button';

                    export default {
                        component: UI.Button,
                        title: 'Example/Button',
                    };

                    export const Primary = {
                        render: () => <UI.Button label="Hi" size="sm" />,
                    };
                `,
            },
            storyFile: 'Button.stories.tsx',
            componentFile: 'Button.tsx',
            exportName: 'Button',
            tempDirs,
        });
    });

    it('matches direct extract for namespace imports with meta.component only', async() => {
        await expectStoryMatchesDirectExtract({
            label: 'namespace import args-only',
            files: {
                'Button.tsx': buttonComponent,
                'Button.stories.tsx': `
                    import * as UI from './Button';

                    export default {
                        component: UI.Button,
                        title: 'Example/Button',
                    };

                    export const Primary = {
                        args: { label: 'Hi', size: 'sm' },
                    };
                `,
            },
            storyFile: 'Button.stories.tsx',
            componentFile: 'Button.tsx',
            exportName: 'Button',
            tempDirs,
        });
    });
});

describe('advanced types through story pipeline', () => {
    it('preserves Omit & extend props', async() => {
        await expectStoryMatchesDirectExtract({
            label: 'Omit and extend',
            files: {
                'SuperButton.tsx': `
                    interface ButtonProps { size: 'sm' | 'lg'; label: string; children: string; }
                    type SuperButtonProps = Omit<ButtonProps, 'children'> & { badge: string };
                    export function SuperButton(props: SuperButtonProps) { return null; }
                `,
                'SuperButton.stories.tsx': `
                    import { SuperButton } from './SuperButton';

                    export default {
                        component: SuperButton,
                        title: 'Example/SuperButton',
                    };

                    export const Primary = {
                        args: { label: 'Go', size: 'sm', badge: 'new' },
                    };
                `,
            },
            storyFile: 'SuperButton.stories.tsx',
            componentFile: 'SuperButton.tsx',
            exportName: 'SuperButton',
            title: 'Example/SuperButton',
            tempDirs,
        });
    });

    it('preserves discriminated union auto-if metadata', async() => {
        const files = {
            ...cardDiscriminatedUnion.files,
            'Card.stories.tsx': `
                import { Card } from './Card';

                export default {
                    component: Card,
                    title: 'Example/Card',
                };

                export const Solid = {
                    args: { variant: 'solid', padding: 8 },
                };
            `,
        };

        const pipeline = await extractViaStoryPipeline({
            files,
            storyFile: 'Card.stories.tsx',
            componentFile: 'Card.tsx',
            exportName: 'Card',
            title: 'Example/Card',
            tempDirs,
        });

        const fileNames = Object.keys(files).map(relativePath => join(pipeline.dir, relativePath));
        const directDoc = extractViaComponentFile({
            dir: pipeline.dir,
            componentPath: pipeline.componentPath,
            exportName: 'Card',
            fileNames,
        });

        expectStoryDocMatchesComponentDoc('discriminated union', pipeline.doc, directDoc);
        expect(pipeline.doc?.props['padding']?.if).toEqual({ arg: 'variant', eq: 'solid' });
    });
});

describe('package imports in story pipeline', () => {
    const packageButtonPath = 'node_modules/@design-system/button/index.tsx';

    it('resolves @scope/pkg imports and matches direct extract', async() => {
        const { pipeline } = await expectStoryMatchesDirectExtract({
            label: 'package import',
            files: {
                [packageButtonPath]: buttonComponent,
                'Button.stories.tsx': `
                    import type { Meta, StoryObj } from './storybook-solidjs-vite';
                    import { Button } from '@design-system/button';

                    const meta = {
                        component: Button,
                        title: 'Example/Button',
                    } satisfies Meta<typeof Button>;

                    export default meta;
                    type Story = StoryObj<typeof meta>;

                    export const Primary: Story = {
                        args: { label: 'Click me', size: 'sm' },
                    };
                `,
                'storybook-solidjs-vite.ts': storybookTypesStub,
            },
            storyFile: 'Button.stories.tsx',
            componentFile: packageButtonPath,
            exportName: 'Button',
            tempDirs,
        });

        expect(pipeline.componentRef.isPackage).toBe(true);
        expect(pipeline.componentRef.importId).toBe('@design-system/button');
        expect(pipeline.componentRef.path).toBe(pipeline.componentPath);
    });

    it('resolves package imports from nested story directories', async() => {
        const { pipeline } = await expectStoryMatchesDirectExtract({
            label: 'nested package import',
            files: {
                [packageButtonPath]: buttonComponent,
                'src/scenarios/package-import/Button.stories.tsx': `
                    import type { Meta, StoryObj } from '../../storybook-solidjs-vite';
                    import { Button } from '@design-system/button';

                    const meta = {
                        component: Button,
                        title: 'Example/Button',
                    } satisfies Meta<typeof Button>;

                    export default meta;
                    type Story = StoryObj<typeof meta>;

                    export const Primary: Story = {
                        args: { label: 'Click me', size: 'sm' },
                    };
                `,
                'storybook-solidjs-vite.ts': storybookTypesStub,
            },
            storyFile: 'src/scenarios/package-import/Button.stories.tsx',
            componentFile: packageButtonPath,
            exportName: 'Button',
            tempDirs,
        });

        expect(pipeline.componentRef.path).toBe(pipeline.componentPath);
    });
});

describe('dOM filtering through story pipeline', () => {
    it('keeps allowlisted inherited props without bulk HTMLAttributes noise', async() => {
        const storyFiles = {
            ...htmlAttributesButton.files,
            'storybook-solidjs-vite.ts': storybookTypesStub,
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
                    args: { label: 'Click me' },
                };
            `,
        };

        const { pipeline, directDoc } = await expectStoryMatchesDirectExtract({
            label: 'DOM filter via story',
            files: storyFiles,
            storyFile: 'Button.stories.tsx',
            componentFile: 'Button.tsx',
            exportName: 'Button',
            tempDirs,
        });

        expect(Object.keys(pipeline.doc?.props ?? {}).length).toBeLessThan(40);
        expect(pipeline.doc?.props['onClick']).toBeUndefined();
        expect(pipeline.doc?.props['innerText']).toBeUndefined();
        expect(pipeline.doc?.props['label']?.type.name).toBe('string');
        expect(pipeline.doc?.props['id']).toBeUndefined();
        expect(pipeline.doc?.props['class']?.type.name).toBe('string');
        expect(pipeline.doc?.props['style']).toBeDefined();
        expect(Object.keys(directDoc?.props ?? {}).length).toBe(
            Object.keys(pipeline.doc?.props ?? {}).length
        );
    });

    it('promotes inherited DOM props listed in story args', async() => {
        const storyFiles = {
            ...htmlAttributesButton.files,
            'storybook-solidjs-vite.ts': storybookTypesStub,
            'Button.stories.tsx': `
                import type { Meta, StoryObj } from './storybook-solidjs-vite';
                import { Button } from './Button';

                const meta = {
                    component: Button,
                    title: 'Example/Button',
                } satisfies Meta<typeof Button>;

                export default meta;
                type Story = StoryObj<typeof meta>;

                export const WithAria: Story = {
                    args: {
                        label: 'Accessible',
                        'aria-label': 'Primary action',
                        tabindex: 0,
                    },
                };
            `,
        };

        const pipeline = await extractViaStoryPipeline({
            files: storyFiles,
            storyFile: 'Button.stories.tsx',
            componentFile: 'Button.tsx',
            exportName: 'Button',
            tempDirs,
        });
        const directDoc = extractViaComponentFile({
            dir: pipeline.dir,
            componentPath: pipeline.componentPath,
            exportName: 'Button',
            fileNames: Object.keys(storyFiles).map(relativePath => join(pipeline.dir, relativePath)),
        });

        expect(pipeline.doc?.props['aria-label']?.type.name).toBe('string');
        expect(directDoc?.props['aria-label']).toBeUndefined();
        expect(pipeline.doc?.props['id']).toBeUndefined();
        expect(pipeline.doc?.props['class']).toBeDefined();
    });
});
