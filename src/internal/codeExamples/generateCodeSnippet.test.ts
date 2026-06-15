import { recast, types as t } from 'storybook/internal/babel';
import { loadCsf } from 'storybook/internal/csf-tools';
import { dedent } from 'ts-dedent';
import { expect, test } from 'vitest';

import { getCodeSnippet } from './generateCodeSnippet';

function generateExample(code: string) {
    const csf = loadCsf(code, { makeTitle: userTitle => userTitle ?? 'title' }).parse();

    const snippets = Object.keys(csf._storyExports)
        .map(name => getCodeSnippet(csf, name, csf._meta?.component ?? 'ComponentTitle'))
        .filter(Boolean);

    return recast.print(t.program(snippets)).code;
}

function withCSF3(body: string) {
    return dedent`
        import type { Meta } from 'storybook-solidjs-vite';
        import { Button } from '@design-system/button';

        const meta: Meta<typeof Button> = {
          component: Button,
          args: {
            children: 'Click me'
          }
        };
        export default meta;

        ${ body }
    `;
}

function withCSF4(body: string) {
    return dedent`
        import preview from './preview';
        import { Button } from '@design-system/button';

        const meta = preview.meta({
          component: Button,
          args: {
            children: 'Click me'
          }
        });

        ${ body }
    `;
}

test('Default', () => {
    const input = withCSF3(`
        export const Default: Story = {};
    `);

    expect(generateExample(input)).toMatchInlineSnapshot(
        '"const Default = () => <Button>Click me</Button>;"'
    );
});

test('Synthesizes self-closing when no children', () => {
    const input = dedent`
        import type { Meta } from 'storybook-solidjs-vite';
        import { Button } from '@design-system/button';

        const meta: Meta<typeof Button> = {
          component: Button,
        };
        export default meta;

        export const NoChildren: Story = {};
    `;

    expect(generateExample(input)).toMatchInlineSnapshot('"const NoChildren = () => <Button />;"');
});

test('Default satisfies or as', () => {
    const input = withCSF3(`
        export const Default = {} satisfies Story;
        export const Other = {} as Story;
    `);

    expect(generateExample(input)).toMatchInlineSnapshot(
        `
        "const Default = () => <Button>Click me</Button>;
        const Other = () => <Button>Click me</Button>;"
    `
    );
});

test('Default - CSF4', () => {
    const input = withCSF4(`
        export const Default = meta.story({});
    `);

    expect(generateExample(input)).toMatchInlineSnapshot(
        '"const Default = () => <Button>Click me</Button>;"'
    );
});

test('Replace children', () => {
    const input = withCSF3(dedent`
        export const WithEmoji: Story = {
          args: {
            children: '🚀Launch'
          }
        };
    `);

    expect(generateExample(input)).toMatchInlineSnapshot(
        '"const WithEmoji = () => <Button>🚀Launch</Button>;"'
    );
});

test('Boolean', () => {
    const input = withCSF3(dedent`
        export const Disabled: Story = {
          args: {
            disabled: true
          }
        };
    `);

    expect(generateExample(input)).toMatchInlineSnapshot(
        '"const Disabled = () => <Button disabled>Click me</Button>;"'
    );
});

test('CSF2 - Template.bind', () => {
    const input = withCSF3(dedent`
        const Template = (args) => <Button {...args} label="String"></Button>
        export const CSF2: StoryFn = Template.bind({});
    `);

    expect(generateExample(input)).toMatchInlineSnapshot(
        '"const CSF2 = () => <Button label="String">Click me</Button>;"'
    );
});

test('render: Template (identifier referencing local function)', () => {
    const input = withCSF3(dedent`
        const Template = (args) => <Button {...args} label="String"></Button>
        export const Interactive: Story = { render: Template }
    `);

    expect(generateExample(input)).toMatchInlineSnapshot(
        '"const Interactive = () => <Button label="String">Click me</Button>;"'
    );
});

test('Custom Render', () => {
    const input = withCSF3(dedent`
        export const CustomRender: Story = { render: () => <Button label="String"></Button> }
    `);

    expect(generateExample(input)).toMatchInlineSnapshot(
        '"const CustomRender = () => <Button label="String"></Button>;"'
    );
});

test('CustomRenderWithOverideArgs only', () => {
    const input = withCSF3(
        `export const CustomRenderWithOverideArgs = {
      render: (args) => <Button {...args} override="overide">Render</Button>,
      args: { foo: 'bar', override: 'value' }
    };`
    );

    expect(generateExample(input)).toMatchInlineSnapshot(
        '"const CustomRenderWithOverideArgs = () => <Button foo="bar" override="overide">Render</Button>;"'
    );
});

test('ObjectInvalidAttr only', () => {
    const input = withCSF3(
        `export const ObjectInvalidAttr = {
      args: { '1x': 'a', 'bad key': 'b', '@foo': 'c', '-dash': 'd' }
    };`
    );

    expect(generateExample(input)).toMatchInlineSnapshot(`
        "const ObjectInvalidAttr = () => <Button
            {...{
                "1x": 'a',
                "bad key": 'b',
                "@foo": 'c',
                "-dash": 'd'
            }}>Click me</Button>;"
    `);
});

test('CSF Next preview.meta story with args', () => {
    const input = dedent`
        import { fn } from 'storybook/test';
        import preview from '../../.storybook/preview';
        import { Button } from './Button';

        const meta = preview.meta({
          component: Button,
          args: { onClick: fn() },
        });

        export const Primary = meta.story({
          args: {
            primary: true,
            label: 'Button',
          },
        });
    `;

    expect(generateExample(input)).toMatchInlineSnapshot(
        '"const Primary = () => <Button onClick={fn()} primary label="Button" />;"'
    );
});

test('top level args injection and spreading in different places', () => {
    const input = withCSF3(dedent`
        export const MultipleSpreads: Story = {
          args: { disabled: false, count: 0, empty: '' },
          render: (args) => (
            <div count={args.count}>
              <Button {...args} />
              <Button {...args} />
            </div>
          ),
        };
    `);

    expect(generateExample(input)).toMatchInlineSnapshot(`
        "const MultipleSpreads = () => <div count={0}>
            <Button disabled={false} count={0} empty="">Click me</Button>
            <Button disabled={false} count={0} empty="">Click me</Button>
        </div>;"
    `);
});
