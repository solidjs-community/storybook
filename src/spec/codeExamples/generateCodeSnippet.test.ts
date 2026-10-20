import { loadCsf } from 'storybook/internal/csf-tools';
import { dedent } from 'ts-dedent';
import { expect, it } from 'vitest';

import { getCodeSnippet } from '../../internal/codeExamples/generateCodeSnippet';

function generateExample(code: string) {
    const csf = loadCsf(code, { makeTitle: userTitle => userTitle ?? 'title' }).parse();

    const snippets = Object.keys(csf._storyExports)
        .map(name => getCodeSnippet(csf, name, csf._meta?.component ?? 'ComponentTitle'));

    return snippets.join('\n');
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

it('default', () => {
    const input = withCSF3(`
        export const Default: Story = {};
    `);

    expect(generateExample(input)).toMatchInlineSnapshot(
        '"const Default = () => <Button>Click me</Button>;"'
    );
});

it('synthesizes self-closing when no children', () => {
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

it('default satisfies or as', () => {
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

it('default - CSF4', () => {
    const input = withCSF4(`
        export const Default = meta.story({});
    `);

    expect(generateExample(input)).toMatchInlineSnapshot(
        '"const Default = () => <Button>Click me</Button>;"'
    );
});

it('replace children', () => {
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

it('boolean', () => {
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

it('cSF2 - Template.bind', () => {
    const input = withCSF3(dedent`
        const Template = (args) => <Button {...args} label="String"></Button>
        export const CSF2: StoryFn = Template.bind({});
    `);

    expect(generateExample(input)).toMatchInlineSnapshot(
        '"const CSF2 = () => <Button label="String">Click me</Button>;"'
    );
});

it('render: Template (identifier referencing local function)', () => {
    const input = withCSF3(dedent`
        const Template = (args) => <Button {...args} label="String"></Button>
        export const Interactive: Story = { render: Template }
    `);

    expect(generateExample(input)).toMatchInlineSnapshot(
        '"const Interactive = () => <Button label="String">Click me</Button>;"'
    );
});

it('custom Render', () => {
    const input = withCSF3(dedent`
        export const CustomRender: Story = { render: () => <Button label="String"></Button> }
    `);

    expect(generateExample(input)).toMatchInlineSnapshot(
        '"const CustomRender = () => <Button label="String"></Button>;"'
    );
});

it('customRenderWithOverideArgs only', () => {
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

it('objectInvalidAttr only', () => {
    const input = withCSF3(
        `export const ObjectInvalidAttr = {
      args: { '1x': 'a', 'bad key': 'b', '@foo': 'c', '-dash': 'd' }
    };`
    );

    expect(generateExample(input)).toMatchInlineSnapshot(
        `"const ObjectInvalidAttr = () => <Button {...{ "1x": 'a', "bad key": 'b', "@foo": 'c', "-dash": 'd' }}>Click me</Button>;"`
    );
});

it('cSF Next preview.meta story with args', () => {
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

it('top level args injection and spreading in different places', () => {
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

it('expands every args spread once and keeps the other attributes', () => {
    const input = withCSF3(dedent`
        export const Spreads: Story = {
          args: { label: 'Hi' },
          render: (args) => <Button {...args} kind="own" {...args} />,
        };
    `);

    expect(generateExample(input)).toMatchInlineSnapshot(
        `"const Spreads = () => <Button label="Hi" kind="own">Click me</Button>;"`
    );
});

it('gives a self-closing element its children after inlining an attribute', () => {
    const input = withCSF3(dedent`
        export const Inline: Story = {
          args: { label: 'Hi' },
          render: (args) => <Button label={args.label} {...args} />,
        };
    `);

    expect(generateExample(input)).toMatchInlineSnapshot(
        `"const Inline = () => <Button label="Hi">Click me</Button>;"`
    );
});

it('inlines children, optional and computed args reads in a fragment', () => {
    const input = withCSF3(dedent`
        export const Fragment: Story = {
          args: { label: 'Hi', size: 'lg' },
          render: (args) => (
            <>
              <b title={args?.label} size={args['size']}>{args.children}</b>
            </>
          ),
        };
    `);

    expect(generateExample(input)).toMatchInlineSnapshot(`
        "const Fragment = () => <>
          <b title="Hi" size="lg">Click me</b>
        </>;"
    `);
});

it('keeps strings JSX cannot hold as expressions and ignores computed keys', () => {
    const input = withCSF3(dedent`
        const key = 'label';

        export const Strings: Story = {
          args: { quote: 'say "hi"', lines: 'a\\nb', [key]: 'computed' },
        };
    `);

    expect(generateExample(input)).toMatchInlineSnapshot(
        `"const Strings = () => <Button quote={'say "hi"'} lines={'a\\nb'}>Click me</Button>;"`
    );
});

it('indents multi-line args where they are placed', () => {
    const input = withCSF3(dedent`
        export const MultiLine: Story = {
          args: {
            style: {
              color: 'red',
            },
          },
          render: (args) => (
            <div>
              <Button {...args} />
            </div>
          ),
        };

        export const Synthesized: Story = {
          args: {
            items: [
              'one',
              'two',
            ],
          },
        };
    `);

    expect(generateExample(input)).toMatchInlineSnapshot(`
        "const MultiLine = () => <div>
          <Button style={{
            color: 'red',
          }}>Click me</Button>
        </div>;
        const Synthesized = () => <Button items={[
          'one',
          'two',
        ]}>Click me</Button>;"
    `);
});
