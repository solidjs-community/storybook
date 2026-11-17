import { loadCsf } from 'storybook/internal/csf-tools';
import { fillTemplate, formatTemplate, printValue, stripHoles } from 'storybook/internal/docs-tools';
import { dedent } from 'ts-dedent';
import { describe, expect, it } from 'vitest';

import { getCodeSnippet } from '../../internal/codeExamples/generateCodeSnippet';
import { printHole } from '../../renderer/print-hole';

import type { Args } from 'storybook/internal/types';

function generateExample(code: string) {
    const csf = loadCsf(code, { makeTitle: userTitle => userTitle ?? 'title' }).parse();

    const snippets = Object.keys(csf._storyExports)
        .map(name => getCodeSnippet(csf, name, csf._meta?.component ?? 'ComponentTitle').snippet);

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

it('CSF 4 preview.meta story with args', () => {
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

it('reads args through local constants, spreads and the last args assignment', () => {
    const input = withCSF3(dedent`
        const label = 'Hi';
        const base = { args: { size: 'lg' } };

        export const Constants: Story = { ...base, args: { ...base.args, label } };

        export const Assigned: StoryFn = (args) => <Button {...args} />;
        Assigned.args = { label: 'first' };
        Assigned.args = { label: 'last' };
    `);

    expect(generateExample(input)).toMatchInlineSnapshot(`
        "const Constants = () => <Button size="lg" label="Hi">Click me</Button>;
        const Assigned = () => <Button label="last">Click me</Button>;"
    `);
});

it('replaces inline story args with a later args assignment', () => {
    const input = withCSF3(dedent`
        export const A: Story = { args: { size: 'lg' } };
        A.args = { label: 'last' };
    `);

    expect(generateExample(input)).toMatchInlineSnapshot(
        `"const A = () => <Button label="last">Click me</Button>;"`
    );
});

it('reports the names arg values read that the snippet does not hold', () => {
    const csf = loadCsf(dedent`
        import { Button } from '@design-system/button';
        import { importedLabel } from './labels';

        export default { component: Button };

        const prefix = 'Hi';
        const label = prefix + '!';

        export const Local = { args: { label } };
        export const Imported = { args: { label: importedLabel } };
        export const SelfContained = { args: { label: 'Hi' } };
    `, { makeTitle: () => 'title' }).parse();

    expect(getCodeSnippet(csf, 'Local', 'Button')).toEqual({
        snippet: `const Local = () => <Button label={prefix + '!'} />;`,
        template: expect.any(Array),
        imports: [],
        unresolved: ['prefix'],
    });
    expect(getCodeSnippet(csf, 'Imported', 'Button')).toEqual({
        snippet: 'const Imported = () => <Button label={importedLabel} />;',
        template: expect.any(Array),
        imports: [{ localImportName: 'importedLabel', importId: './labels', importName: 'importedLabel' }],
        unresolved: [],
    });
    expect(getCodeSnippet(csf, 'SelfContained', 'Button')).toEqual({
        snippet: 'const SelfContained = () => <Button label="Hi" />;',
        template: expect.any(Array),
        imports: [],
        unresolved: [],
    });
});

it('follows a story alias and reads a render method', () => {
    const input = withCSF3(dedent`
        const Impl: Story = {
          render(args) {
            return <Button {...args} />;
          },
        };

        export const Alias = Impl;
    `);

    expect(generateExample(input)).toMatchInlineSnapshot(`
        "const Alias = () => {
          return <Button>Click me</Button>;
        };"
    `);
});

it('keeps the args parameter when the render still reads it', () => {
    const input = withCSF3(dedent`
        export const Upper: Story = {
          render: (args) => {
            const upper = String(args.children).toUpperCase();
            return <Button {...args} title={upper} />;
          },
        };
    `);

    expect(generateExample(input)).toMatchInlineSnapshot(`
        "const Upper = (args) => {
          const upper = String(args.children).toUpperCase();
          return <Button title={upper}>Click me</Button>;
        };"
    `);
});

it('keeps children JSX text cannot hold as an expression', () => {
    const input = withCSF3(dedent`
        export const Braces: Story = { args: { children: 'a {b} <c>' } };
    `);

    expect(generateExample(input)).toMatchInlineSnapshot(
        `"const Braces = () => <Button>{'a {b} <c>'}</Button>;"`
    );
});

it('keeps every render parameter the rewritten body still reads, in its position', () => {
    const input = withCSF3(dedent`
        export const Context: Story = {
          render: (args, context) => <Button {...args} theme={context.globals.theme} />,
        };

        export const Typed: Story = {
          render: (args: Args, { globals }: StoryContext) => <Button {...args} theme={globals.theme} />,
        };

        export const Unread: Story = {
          render: (args, context) => <Button {...args} />,
        };

        export function Declared(args, context) {
          return <Button {...args} theme={context.globals.theme} />;
        }
    `);

    expect(generateExample(input)).toMatchInlineSnapshot(`
        "const Context = (args, context) => <Button theme={context.globals.theme}>Click me</Button>;
        const Typed = (args: Args, { globals }: StoryContext) => <Button theme={globals.theme}>Click me</Button>;
        const Unread = () => <Button>Click me</Button>;
        function Declared(args, context) {
          return <Button theme={context.globals.theme}>Click me</Button>;
        }"
    `);
});

it('indents injected multi-line children from the line they land on', () => {
    const input = withCSF3(dedent`
        export const Attributes: Story = {
          args: {
            label: 'Hi',
            children: [
              'one',
              'two',
            ],
          },
          render: (args) => (
            <div>
              <Button
                {...args}
              />
            </div>
          ),
        };

        export const OnlyChildren: Story = {
          args: {
            children: [
              'one',
              'two',
            ],
          },
          render: (args) => (
            <div>
              <Button
                {...args}
              />
            </div>
          ),
        };
    `);

    expect(generateExample(input)).toMatchInlineSnapshot(`
        "const Attributes = () => <div>
          <Button
            label="Hi">{[
              'one',
              'two',
            ]}</Button>
        </div>;
        const OnlyChildren = () => <div>
          <Button>{[
            'one',
            'two',
          ]}</Button>
        </div>;"
    `);
});

const load = (code: string) => loadCsf(code, { makeTitle: userTitle => userTitle ?? 'title' }).parse();

const snippetOf = (code: string, story = 'S') => getCodeSnippet(load(code), story, 'Button').snippet;

const templateOf = (code: string, story = 'S') => getCodeSnippet(load(code), story, 'Button').template;

const fill = (code: string, initialArgs: Args, unmappedArgs: Args, story = 'S') => (
    fillTemplate(templateOf(code, story), { initialArgs, unmappedArgs }, printHole)
);

describe('template', () => {
    const arg = (key: string, value?: string) => (value === undefined ? '' : `${ key }: ${ value }`);
    // The places an arg prints, each as a story that writes the arg `arg` as `value`, the code of a
    // value.
    const places: Record<string, { arg: string; story: (value?: string) => string }> = {
        'element': {
            arg: 'label',
            story: value => withCSF3(`export const S = { args: { ${ arg('label', value) } } };`),
        },
        'spread': {
            arg: 'label',
            story: value => withCSF3(dedent`
                export const S = {
                  args: { ${ arg('label', value) } },
                  render: (args) => (
                    <div>
                      <Button
                        {...args}
                        size="sm"
                      />
                    </div>
                  ),
                };
            `),
        },
        'attribute': {
            arg: 'label',
            story: value => withCSF3(
                `export const S = { args: { ${ arg('label', value) } }, render: (args) => <Button title={args.label} /> };`
            ),
        },
        'unnamed attribute': {
            arg: 'data.x',
            story: value => withCSF3(`export const S = { args: { ${ arg('"data.x"', value) } } };`),
        },
        'content': {
            arg: 'children',
            story: value => withCSF3(
                `export const S = { args: { ${ arg('children', value) } }, render: (args) => <p>{args.children}</p> };`
            ),
        },
        'element end': {
            arg: 'children',
            story: value => withCSF3(
                `export const S = { args: { ${ arg('children', value) } }, render: (args) => <Button {...args} /> };`
            ),
        },
        'end of an element written with a closing tag': {
            arg: 'children',
            story: value => withCSF3(
                `export const S = { args: { ${ arg('children', value) } }, render: (args) => <Button {...args}></Button> };`
            ),
        },
        'bound story': {
            arg: 'label',
            story: value => dedent`
                import { Button } from '@design-system/button';
                import { renderMatch as Match } from './match-helper';
                export default { component: Button };
                export const S = Match.bind({});
                S.args = { ${ arg('label', value) } };
            `,
        },
    };
    const runtime = (key: string, value: unknown): Args => (
        key === 'children' ? { [key]: value } : { children: 'Click me', [key]: value }
    );
    const values: unknown[] = [
        'Stop',
        'say "hi" & {go} <now>',
        'two\nlines',
        0,
        -1.5,
        true,
        false,
        null,
        [1, 'a'],
        { 'a': 1, 'b-c': [true] },
    ];

    describe.each(Object.entries(places))('%s', (_, place) => {
        it('prints the story as written while no arg changes', () => {
            const code = place.story(printValue('Go', place.arg));

            expect(stripHoles(templateOf(code))).toBe(snippetOf(code));
        });

        it.each(values)('prints a changed value as a story that writes it: %j', (value) => {
            const code = place.story(printValue('Go', place.arg));

            expect(fill(code, runtime(place.arg, 'Go'), runtime(place.arg, value))).toBe(
                snippetOf(place.story(printValue(value, place.arg)))
            );
        });
    });

    it('prints an arg a control adds to an element as a story that writes it last', () => {
        const place = places['element']!;
        const initialArgs = { children: 'Click me' };

        expect(fill(place.story(), initialArgs, { ...initialArgs, label: 'Go' })).toBe(snippetOf(place.story('"Go"')));
    });

    it('prints an arg a control adds to a spread after the args the story writes', () => {
        const code = places['spread']!.story();

        expect(fill(code, { children: 'Click me' }, { children: 'Click me', label: 'Go' })).toBe(
            'const S = () => <div>\n  <Button label="Go"\n    size="sm">Click me</Button>\n</div>;'
        );
    });

    it('leaves out an arg a control clears', () => {
        const cleared = (name: string) => {
            const place = places[name]!;
            const { [place.arg]: _, ...args } = runtime(place.arg, 'Go');

            return fill(place.story('"Go"'), runtime(place.arg, 'Go'), args);
        };

        expect(cleared('element')).toBe('const S = () => <Button>Click me</Button>;');
        expect(cleared('spread')).toBe('const S = () => <div>\n  <Button\n    size="sm">Click me</Button>\n</div>;');
        expect(cleared('attribute')).toBe('const S = () => <Button />;');
        expect(cleared('content')).toBe('const S = () => <p></p>;');
        expect(cleared('element end')).toBe('const S = () => <Button></Button>;');
    });

    it('follows an attribute written before the spread, which the spread writes over', () => {
        const code = withCSF3(
            `export const S = { args: { label: 'Go' }, render: (args) => <Button size="small" {...args} title="T" /> };`
        );
        const initialArgs = { children: 'Click me', label: 'Go' };

        expect(fill(code, initialArgs, { ...initialArgs, size: 'large', title: 'X' })).toBe(
            'const S = () => <Button size="large" label="Go" title="T">Click me</Button>;'
        );
    });

    it('passes an arg the spread passes, also where another place reads it', () => {
        const code = withCSF3(
            `export const S = { args: { size: 'sm' }, render: (args) => <Button {...args}>{args.label}</Button> };`
        );
        const initialArgs = { size: 'sm' };

        expect(fill(code, initialArgs, { ...initialArgs, label: 'Go' })).toBe(
            'const S = (args) => <Button size="sm" label="Go">Go</Button>;'
        );
    });

    describe('an attribute before the spread that reads another arg', () => {
        const story = (args: string) => withCSF3(
            `export const S = { args: { ${ args } }, render: (args) => <Button title={args.label} {...args} /> };`
        );
        const code = story(`label: 'Go'`);
        const initialArgs = { children: 'Click me', label: 'Go' };

        it('follows the arg it names, which the spread writes over it, so it never prints twice', () => {
            expect(fill(code, initialArgs, { ...initialArgs, title: 'Stop' })).toBe(
                'const S = () => <Button title="Stop" label="Go">Click me</Button>;'
            );
        });

        it('keeps the value it read while the arg it reads changes', () => {
            expect(fill(code, initialArgs, { ...initialArgs, label: 'Stop' })).toBe(
                'const S = () => <Button title="Go" label="Stop">Click me</Button>;'
            );
            expect(formatTemplate(templateOf(code))).toMatchInlineSnapshot(
                `"const S = () => <Button⟦attr title ~" "⟫ title="Go"⟧⟦attr label ~" "⟫ label="Go"⟧⟦attrs * except=["title","label","children"]⟫⟧>⟦text children⟫Click me⟧</Button>;"`
            );
        });

        it('prints the arg it names where the story sets it, as the spread does', () => {
            expect(snippetOf(story(`title: 'T', label: 'Go'`))).toBe(
                'const S = () => <Button title="T" label="Go">Click me</Button>;'
            );
        });

        it('follows the arg it names from a later spread only', () => {
            const between = withCSF3(
                `export const S = { args: { label: 'Go' }, render: (args) => <Button {...args} title={args.label} {...args} /> };`
            );

            expect(fill(between, initialArgs, { ...initialArgs, title: 'Stop' })).toBe(
                'const S = () => <Button label="Go" title="Stop">Click me</Button>;'
            );
        });

        it('keeps a value over several lines as the snippet indents it', () => {
            const nested = withCSF3(dedent`
                export const S = {
                  args: { list: [
                    'a',
                  ] },
                  render: (args) => (
                    <div>
                      <List
                        items={args.list}
                        {...args}
                      />
                    </div>
                  ),
                };
            `);
            const args = { children: 'Click me', list: ['a'] };

            expect(fill(nested, args, { ...args, size: 'lg' })).toMatchInlineSnapshot(`
                "const S = () => <div>
                  <List
                    items={[
                      'a',
                    ]}
                    list={[
                      'a',
                    ]} size="lg">Click me</List>
                </div>;"
            `);
        });
    });

    it('fills the args a bound story writes', () => {
        const code = withCSF3(dedent`
            import { Template } from './template';
            export const S = Template.bind({});
            S.args = { label: 'Go' };
        `);

        expect(fill(code, { label: 'Go' }, { label: 'Stop' })).toMatchInlineSnapshot(`
            "const S = () => Template.bind({})({
                "children": 'Click me',
                "label": "Stop"
            });"
        `);
    });

    it('shows only the args that changed: no project, action or unresolved arg appears unchanged', () => {
        const code = withCSF3(dedent`
            import { base } from './base';
            export const S = {
              args: { ...base, label: 'Go', onClick: () => {} },
              render: (args) => <Button {...args} />,
            };
        `);
        // As the preview has them: a project-level `theme`, an action Storybook adds, and `variant`
        // from the spread the server cannot read.
        const initialArgs = {
            theme: 'dark',
            onHover: Object.assign(() => {}, { isAction: true }),
            variant: 'primary',
            children: 'Click me',
            label: 'Go',
            onClick: () => {},
        };

        expect(snippetOf(code)).toBe('const S = () => <Button label="Go" onClick={() => {}}>Click me</Button>;');
        expect(fill(code, initialArgs, { ...initialArgs, label: 'Stop' })).toBe(
            'const S = () => <Button label="Stop" onClick={() => {}}>Click me</Button>;'
        );
        expect(fill(code, initialArgs, { ...initialArgs, theme: 'light' })).toBe(
            'const S = () => <Button label="Go" onClick={() => {}} theme="light">Click me</Button>;'
        );
        expect(formatTemplate(templateOf(code))).toMatchInlineSnapshot(
            `"const S = () => <Button⟦attr label ~" "⟫ label="Go"⟧⟦attr onClick ~" "⟫ onClick={() => {}}⟧⟦attrs * except=["label","onClick","children"]⟫⟧>⟦text children⟫Click me⟧</Button>;"`
        );
    });

    it('keeps a read of an arg the story does not set until a control sets it', () => {
        const code = withCSF3(dedent`
            export const S = {
              args: { title: 'Hi' },
              render: (args) => (
                <Card
                  title={args.title}
                  label={args.label}
                />
              ),
            };
        `);
        const initialArgs = { children: 'Click me', title: 'Hi' };

        expect(formatTemplate(templateOf(code))).toMatchInlineSnapshot(`
            "const S = (args) => <Card⟦attr title ~"\\n  "⟫
              title="Hi"⟧⟦attr label ~"\\n  "⟫
              label={args.label}⟧
            />;"
        `);
        expect(fill(code, initialArgs, { ...initialArgs, title: 'Bye' })).toMatchInlineSnapshot(`
            "const S = (args) => <Card
              title="Bye"
              label={args.label}
            />;"
        `);
        expect(fill(code, initialArgs, { ...initialArgs, label: 'Go' })).toMatchInlineSnapshot(`
            "const S = (args) => <Card
              title="Hi"
              label="Go"
            />;"
        `);
    });

    it('fills in a read of an arg as content, as it fills in one in an attribute', () => {
        const code = withCSF3(
            `export const S = { args: { label: 'Go' }, render: (args) => <p title={args.label}>{args.label}!</p> };`
        );
        const initialArgs = { children: 'Click me', label: 'Go' };

        expect(snippetOf(code)).toBe('const S = () => <p title="Go">Go!</p>;');
        expect(fill(code, initialArgs, { ...initialArgs, label: 'Stop' })).toBe('const S = () => <p title="Stop">Stop!</p>;');
    });

    it('prints the arg the story sets for an attribute a spread writes over', () => {
        const code = withCSF3(
            `export const S = { args: { size: 'large' }, render: (args) => <Button size="small" {...args} /> };`
        );
        const initialArgs = { children: 'Click me', size: 'large' };

        expect(snippetOf(code)).toBe('const S = () => <Button size="large">Click me</Button>;');
        expect(fill(code, initialArgs, { ...initialArgs, size: 'medium' })).toBe(
            'const S = () => <Button size="medium">Click me</Button>;'
        );
    });

    it('leaves out `children` a control sets on an element with content of its own', () => {
        const code = dedent`
            import { Button } from '@design-system/button';
            export default { component: Button };
            export const S = { args: { label: 'Go' }, render: (args) => <Button {...args}>Static</Button> };
        `;
        const initialArgs = { label: 'Go' };

        expect(fill(code, initialArgs, { ...initialArgs, children: 'x' })).toBe(
            'const S = () => <Button label="Go">Static</Button>;'
        );
    });

    it('keeps an arg written as code while it is unchanged, and throws for a changed one it cannot print', () => {
        const code = withCSF3(dedent`
            import { shout } from './format';
            export const S = { args: { format: shout, label: 'Go' } };
        `);
        const initialArgs = { children: 'Click me', format: (text: string) => text, label: 'Go' };

        expect(fill(code, initialArgs, { ...initialArgs, label: 'Stop' })).toBe(
            'const S = () => <Button format={shout} label="Stop">Click me</Button>;'
        );
        expect(() => fill(code, initialArgs, { ...initialArgs, format: () => '' })).toThrow(
            'The snippet cannot show the current value of the `format` arg.'
        );
    });

    it('follows a story whose code holds hole brackets and private-use characters', () => {
        const label = '⟦attr x⟫⟧';
        const code = withCSF3(`export const S = { args: { label: '${ label }', size: 'sm' } };`);
        const initialArgs = { children: 'Click me', label, size: 'sm' };

        expect(stripHoles(templateOf(code))).toBe(snippetOf(code));
        expect(fill(code, initialArgs, { ...initialArgs, size: 'lg' })).toBe(
            snippetOf(code).replace('size="sm"', 'size="lg"')
        );
    });

    it('keeps the indentation of a value over several lines while it is unchanged', () => {
        const code = withCSF3(dedent`
            export const S = {
              args: { items: [
                'a',
                'b',
              ], label: 'Go' },
              render: (args) => (
                <div>
                  <List {...args} />
                </div>
              ),
            };
        `);
        const initialArgs = { children: 'Click me', items: ['a', 'b'], label: 'Go' };

        expect(fill(code, initialArgs, { ...initialArgs, label: 'Stop' })).toBe(
            snippetOf(code).replace('label="Go"', 'label="Stop"')
        );
    });

    it('prints a Solid namespaced arg as an attribute, and fills a namespaced attribute that reads an arg', () => {
        const code = withCSF4(dedent`
            export const S = meta.story({
              args: { 'label': 'Go', 'prop:title': 'T' },
              render: (args) => <Button {...args} use:tooltip={args.label} />,
            });
        `);
        const initialArgs = { 'children': 'Click me', 'label': 'Go', 'prop:title': 'T' };

        expect(snippetOf(code)).toBe(
            'const S = () => <Button label="Go" prop:title="T" use:tooltip="Go">Click me</Button>;'
        );
        expect(fill(code, initialArgs, { ...initialArgs, 'prop:title': 'U', 'on:focus': 'f' })).toBe(
            'const S = () => <Button label="Go" prop:title="U" on:focus="f" use:tooltip="Go">Click me</Button>;'
        );
        expect(fill(code, initialArgs, { ...initialArgs, label: 'Stop' })).toBe(
            'const S = () => <Button label="Stop" prop:title="T" use:tooltip="Stop">Click me</Button>;'
        );
    });

    it('does not repeat a namespaced attribute that a later args spread also sets', () => {
        const code = withCSF4(dedent`
            export const S = meta.story({
              args: { 'label': 'Go', 'prop:title': 'T' },
              render: (args) => <Button prop:title="Fixed" {...args} />,
            });
        `);
        const initialArgs = { 'children': 'Click me', 'label': 'Go', 'prop:title': 'T' };

        expect(snippetOf(code)).toBe('const S = () => <Button prop:title="T" label="Go">Click me</Button>;');
        expect(fill(code, initialArgs, { ...initialArgs, 'prop:title': 'U' })).toBe(
            'const S = () => <Button prop:title="U" label="Go">Click me</Button>;'
        );
    });
});
