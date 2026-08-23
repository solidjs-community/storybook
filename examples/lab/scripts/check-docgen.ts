/**
 * Headless docgen checks for examples/lab scenarios.
 *
 * Run from repo root: bun run check-docgen
 * Or here: bun run check-docgen
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
    experimental_manifests,
    internal_getArgTypesData,
} from 'storybook-solidjs-vite/renderer';

const root = process.cwd();
const builtManifestPath = path.join(root, 'storybook-static/manifests/components.json');

interface ManifestComponent {
    id?: string;
    name?: string;
    error?: { name: string; message: string };
    reactComponentMeta?: {
        displayName?: string;
        exportName?: string;
        props?: Record<string, {
            name: string;
            type?: { name?: string; raw?: string };
            required?: boolean;
            if?: { arg: string; eq?: unknown };
        }>;
    };
}

interface Scenario {
    label: string;
    storyImportPath: string;
    storyId: string;
    storyTitle: string;
    storyName: string;
    componentFilePath: string;
    componentExportName: string;
    expectedProps: string[];
    assert?: (props: NonNullable<ManifestComponent['reactComponentMeta']>['props']) => void;
}

const scenarios: Scenario[] = [
    {
        label: 'Badge (enum union)',
        storyImportPath: 'src/scenarios/badge/Badge.stories.ts',
        storyId: 'lab-badge--neutral',
        storyTitle: 'Docgen Lab/Badge',
        storyName: 'Neutral',
        componentFilePath: 'src/scenarios/badge/Badge.tsx',
        componentExportName: 'Badge',
        expectedProps: ['label', 'variant', 'dot'],
    },
    {
        label: 'Card (discriminated union)',
        storyImportPath: 'src/scenarios/discriminated-union/Card.stories.ts',
        storyId: 'lab-discriminated-union-card--solid',
        storyTitle: 'Docgen Lab/Discriminated Union/Card',
        storyName: 'Solid',
        componentFilePath: 'src/scenarios/discriminated-union/Card.tsx',
        componentExportName: 'Card',
        expectedProps: ['variant', 'padding', 'transparent'],
        assert(props) {
            const padding = props?.['padding'];

            if (padding?.if?.arg !== 'variant' || padding.if.eq !== 'solid') {
                fail('Card.padding missing auto-if { variant: solid }');
            }
        },
    },
    {
        label: 'Button (HTMLAttributes filter)',
        storyImportPath: 'src/scenarios/html-attributes/Button.stories.ts',
        storyId: 'lab-html-attributes-button--default',
        storyTitle: 'Docgen Lab/HTML Attributes/Button',
        storyName: 'Default',
        componentFilePath: 'src/scenarios/html-attributes/Button.tsx',
        componentExportName: 'Button',
        expectedProps: ['label'],
    },
    {
        label: 'PickedButton (Pick utility)',
        storyImportPath: 'src/scenarios/utility-types/PickedButton.stories.ts',
        storyId: 'lab-utility-types-picked-button--default',
        storyTitle: 'Docgen Lab/Utility Types/PickedButton',
        storyName: 'Default',
        componentFilePath: 'src/scenarios/utility-types/PickedButton.tsx',
        componentExportName: 'PickedButton',
        expectedProps: ['label', 'size'],
    },
    {
        label: 'Package Button (@design-system/button)',
        storyImportPath: 'src/scenarios/package-import/Button.stories.ts',
        storyId: 'lab-package-import-button--primary',
        storyTitle: 'Docgen Lab/Package Import/Button',
        storyName: 'Primary',
        componentFilePath: 'node_modules/@design-system/button/index.tsx',
        componentExportName: 'Button',
        expectedProps: ['label', 'size'],
    },
];

function fail(message: string): never {
    console.error(`FAIL: ${ message }`);
    process.exit(1);
}

function ok(message: string) {
    console.log(`OK  ${ message }`);
}

async function checkManifestScenario(scenario: Scenario) {
    const manifestEntries = [{
        id: scenario.storyId,
        title: scenario.storyTitle,
        name: scenario.storyName,
        importPath: scenario.storyImportPath,
        type: 'story' as const,
        subtype: 'story' as const,
        tags: ['manifest', 'autodocs'],
    }];

    const result = await experimental_manifests({}, {
        manifestEntries,
        watch: false,
    });

    const component = Object.values(result.components?.components ?? {})[0] as ManifestComponent | undefined;

    if (!component) {
        fail(`${ scenario.label }: manifest returned no component`);
    }

    if (component.error) {
        fail(`${ scenario.label }: ${ component.error.name }: ${ component.error.message }`);
    }

    const props = component.reactComponentMeta?.props ?? {};
    const propNames = Object.keys(props);

    for (const expected of scenario.expectedProps) {
        if (!propNames.includes(expected)) {
            fail(`${ scenario.label }: missing prop "${ expected }" (got: ${ propNames.join(', ') || 'none' })`);
        }
    }

    scenario.assert?.(props);
    ok(`${ scenario.label } → manifest props: ${ propNames.join(', ') }`);
}

async function checkArgTypesScenario(scenario: Scenario) {
    const argTypes = await internal_getArgTypesData(null, {
        componentFilePath: scenario.componentFilePath,
        componentExportName: scenario.componentExportName,
    });

    if (!argTypes || Object.keys(argTypes).length === 0) {
        fail(`${ scenario.label }: internal_getArgTypesData returned no argTypes`);
    }

    for (const expected of scenario.expectedProps) {
        if (!(expected in argTypes)) {
            fail(`${ scenario.label }: argTypes missing "${ expected }" (got: ${ Object.keys(argTypes).join(', ') })`);
        }
    }

    ok(`${ scenario.label } → argTypes: ${ Object.keys(argTypes).join(', ') }`);
}

function checkBuiltManifest() {
    if (!existsSync(builtManifestPath)) {
        fail(`missing ${ path.relative(root, builtManifestPath) } — run: bun run build-storybook`);
    }

    const manifest = JSON.parse(readFileSync(builtManifestPath, 'utf8')) as {
        meta?: { docgen?: string; engine?: string };
        components?: Record<string, ManifestComponent>;
    };

    for (const scenario of scenarios) {
        const entry = Object.values(manifest.components ?? {}).find(
            component => component.id?.includes(scenario.storyId.split('--')[0] ?? '')
                || component.reactComponentMeta?.exportName === scenario.componentExportName
        );

        if (!entry?.reactComponentMeta?.props) {
            fail(`${ scenario.label }: built manifest has no props`);
        }

        ok(`${ scenario.label } → built manifest props: ${ Object.keys(entry.reactComponentMeta.props).join(', ') }`);
    }

    ok(`built manifest meta.docgen: ${ manifest.meta?.docgen ?? 'unknown' }`);
}

console.log('Docgen lab — manifest + argTypes checks\n');

for (const scenario of scenarios) {
    await checkManifestScenario(scenario);
    await checkArgTypesScenario(scenario);
    console.log('');
}

if (process.argv.includes('--built')) {
    checkBuiltManifest();
}
else {
    console.log('Tip: `bun run build-storybook` then `bun run check-docgen -- --built` for static manifest');
}

console.log('\nVisual checks while `bun run storybook` is running:');
console.log('  • Docgen Lab/* → Controls + Docs props table');
console.log('  • http://localhost:6006/manifests/components.html');
console.log('  • http://localhost:6006/manifests/components.json');
