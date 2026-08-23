/**
 * Headless docgen checks for examples/lab scenarios.
 *
 * `experimental_manifests` is an empty stub under the docgen server (Storybook 11).
 * Live extract goes through the docgen provider; the static build writes
 * `storybook-static/services/core/docgen/*.json`.
 *
 * Run from repo root: bun run check-docgen
 * Or here: bun run check-docgen
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createDocgenProvider } from 'storybook-solidjs-vite/internal/docgen-worker';
import { internal_getArgTypesData } from 'storybook-solidjs-vite/renderer';

const root = process.cwd();
const builtDocgenDir = path.join(root, 'storybook-static/services/core/docgen');

interface DocgenProp {
    name?: string;
    type?: { name?: string; raw?: string } | string;
    required?: boolean;
    if?: { arg: string; eq?: unknown };
}

interface DocgenPayload {
    id?: string;
    name?: string;
    path?: string;
    error?: { name: string; message: string };
    argTypes?: Record<string, unknown>;
    reactComponentMeta?: {
        displayName?: string;
        exportName?: string;
        props?: Record<string, DocgenProp>;
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
    assert?: (props: Record<string, DocgenProp>) => void;
}

const scenarios: Scenario[] = [
    {
        label: 'Badge (enum union)',
        storyImportPath: 'src/scenarios/badge/Badge.stories.ts',
        storyId: 'docgen-lab-badge--neutral',
        storyTitle: 'Docgen Lab/Badge',
        storyName: 'Neutral',
        componentFilePath: 'src/scenarios/badge/Badge.tsx',
        componentExportName: 'Badge',
        expectedProps: ['label', 'variant', 'dot'],
    },
    {
        label: 'Card (discriminated union)',
        storyImportPath: 'src/scenarios/discriminated-union/Card.stories.ts',
        storyId: 'docgen-lab-discriminated-union-card--solid',
        storyTitle: 'Docgen Lab/Discriminated Union/Card',
        storyName: 'Solid',
        componentFilePath: 'src/scenarios/discriminated-union/Card.tsx',
        componentExportName: 'Card',
        expectedProps: ['variant', 'padding', 'transparent'],
        assert(props) {
            const padding = props['padding'];

            if (padding?.if?.arg !== 'variant' || padding.if.eq !== 'solid') {
                fail('Card.padding missing auto-if { variant: solid }');
            }
        },
    },
    {
        label: 'Button (HTMLAttributes filter)',
        storyImportPath: 'src/scenarios/html-attributes/Button.stories.ts',
        storyId: 'docgen-lab-html-attributes-button--default',
        storyTitle: 'Docgen Lab/HTML Attributes/Button',
        storyName: 'Default',
        componentFilePath: 'src/scenarios/html-attributes/Button.tsx',
        componentExportName: 'Button',
        expectedProps: ['label'],
    },
    {
        label: 'PickedButton (Pick utility)',
        storyImportPath: 'src/scenarios/utility-types/PickedButton.stories.ts',
        storyId: 'docgen-lab-utility-types-pickedbutton--default',
        storyTitle: 'Docgen Lab/Utility Types/PickedButton',
        storyName: 'Default',
        componentFilePath: 'src/scenarios/utility-types/PickedButton.tsx',
        componentExportName: 'PickedButton',
        expectedProps: ['label', 'size'],
    },
    {
        label: 'Package Button (@design-system/button)',
        storyImportPath: 'src/scenarios/package-import/Button.stories.ts',
        storyId: 'docgen-lab-package-import-button--primary',
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

function payloadProps(payload: DocgenPayload): Record<string, DocgenProp> {
    if (payload.reactComponentMeta?.props) {
        return payload.reactComponentMeta.props;
    }

    return Object.fromEntries(
        Object.keys(payload.argTypes ?? {}).map(name => [name, { name }])
    );
}

const extractDocgen = await createDocgenProvider()(async() => undefined);

async function checkDocgenProvider(scenario: Scenario) {
    const payload = await extractDocgen({
        entry: {
            id: scenario.storyId,
            title: scenario.storyTitle,
            name: scenario.storyName,
            importPath: scenario.storyImportPath,
            type: 'story',
            subtype: 'story',
        },
    }) as DocgenPayload | undefined;

    if (!payload) {
        fail(`${ scenario.label }: docgen provider returned nothing`);
    }

    if (payload.error) {
        fail(`${ scenario.label }: ${ payload.error.name }: ${ payload.error.message }`);
    }

    const props = payloadProps(payload);
    const propNames = Object.keys(props);

    for (const expected of scenario.expectedProps) {
        if (!propNames.includes(expected)) {
            fail(`${ scenario.label }: missing prop "${ expected }" (got: ${ propNames.join(', ') || 'none' })`);
        }
    }

    scenario.assert?.(props);
    ok(`${ scenario.label } → docgen props: ${ propNames.join(', ') }`);
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

function loadBuiltPayloads(): DocgenPayload[] {
    if (!existsSync(builtDocgenDir)) {
        return [];
    }

    return readdirSync(builtDocgenDir)
        .filter(file => file.endsWith('.json'))
        .flatMap((file) => {
            const raw = JSON.parse(readFileSync(path.join(builtDocgenDir, file), 'utf8')) as {
                components?: Record<string, DocgenPayload>;
            };

            return Object.values(raw.components ?? {});
        });
}

function checkBuiltSnapshots() {
    if (!existsSync(builtDocgenDir)) {
        fail(`missing ${ path.relative(root, builtDocgenDir) } — run: bun run build-storybook`);
    }

    const payloads = loadBuiltPayloads();

    if (payloads.length === 0) {
        fail('built docgen snapshots contain no components');
    }

    for (const scenario of scenarios) {
        const componentId = scenario.storyId.split('--')[0] ?? '';
        const entry = payloads.find(payload =>
            payload.id === componentId
            || payload.path?.includes(scenario.componentFilePath)
        );

        if (!entry) {
            fail(`${ scenario.label }: no built docgen snapshot (ids: ${ payloads.map(payload => payload.id).join(', ') || 'none' })`);
        }

        const props = payloadProps(entry);
        const propNames = Object.keys(props);

        for (const expected of scenario.expectedProps) {
            if (!propNames.includes(expected)) {
                fail(`${ scenario.label }: built snapshot missing "${ expected }" (got: ${ propNames.join(', ') || 'none' })`);
            }
        }

        scenario.assert?.(props);
        ok(`${ scenario.label } → built snapshot props: ${ propNames.join(', ') }`);
    }
}

console.log('Docgen lab — provider + argTypes checks\n');

for (const scenario of scenarios) {
    await checkDocgenProvider(scenario);
    await checkArgTypesScenario(scenario);
    console.log('');
}

if (process.argv.includes('--skip-built')) {
    console.log('Skipping built snapshots (`--skip-built`)');
}
else {
    console.log('Built docgen snapshots\n');
    checkBuiltSnapshots();
}

console.log('\nVisual checks while `bun run storybook` is running:');
console.log('  • Docgen Lab/* → Controls + Docs props table');
