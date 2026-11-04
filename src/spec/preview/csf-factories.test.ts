// Type tests for CSF Next, adapted from `@storybook/react`'s `csf-factories.test.tsx`
// and `@storybook/react-vite`'s `define-preview.test.ts`. `bun run typecheck` checks
// the types; Vitest runs the few runtime assertions.
import { createComponent } from 'solid-js';
import { definePreviewAddon } from 'storybook/internal/csf';
import { fn, mocked } from 'storybook/test';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { createSolidDefinePreview } from '../../preview/define-preview';
import * as solidDocsAnnotations from '../../renderer/docs';
import { createApplyDecorators } from '../../renderer/shared/apply-decorators';
import { createDefaultRender } from '../../renderer/shared/default-render';

import type { Args, StoryAnnotations } from 'storybook/internal/types';
import type { Decorator, SolidComponent, SolidMeta, StoryFnReturnType } from '../../preview/public-api';

const definePreview = createSolidDefinePreview(definePreviewAddon({
    applyDecorators: createApplyDecorators({
        storyStore: {
            isStoryRendered: () => false,
        },
    } as any),
    render: createDefaultRender(createComponent),
} as any));

type ButtonProps = { label: string; disabled: boolean; onKeyDown?: () => void };
const Button = (_props: ButtonProps): StoryFnReturnType => null;

const preview = definePreview({ addons: [] });

/** The `tags` type a story of this meta accepts. */
type StoryTags<M> = M extends SolidMeta<infer T, any> ? StoryAnnotations<T, T['args']>['tags'] : never;

describe('definePreview addons', () => {
    it('requires addons', () => {
        // @ts-expect-error addons is required
        definePreview({});
    });

    it('accepts legacy annotation namespaces as addons', () => {
        const legacyAnnotations = {
            default: {
                parameters: {
                    legacyAddon: true,
                },
            },
        };
        const previewWithLegacyAnnotations = definePreview({
            addons: [legacyAnnotations, solidDocsAnnotations],
        });

        const meta = previewWithLegacyAnnotations.meta({
            component: Button,
            args: { disabled: false },
            parameters: { layout: 'centered' },
            decorators: [Story => Story()],
        });
        const story = meta.story({ args: { label: 'Legacy' } });

        expect(story.input.args?.label).toBe('Legacy');
        expect(previewWithLegacyAnnotations.composed.parameters).toMatchObject({
            legacyAddon: true,
        });
    });

    it('takes types from typed addons', () => {
        const typedAddon = definePreviewAddon<{ parameters: { typedAddon?: { enabled: boolean } } }>({});
        const typedPreview = definePreview({
            addons: [typedAddon, solidDocsAnnotations],
            parameters: { typedAddon: { enabled: true } },
        });

        typedPreview.meta({
            component: Button,
            parameters: { typedAddon: { enabled: false } },
        });
        typedPreview.meta({
            component: Button,
            // @ts-expect-error enabled is a boolean
            parameters: { typedAddon: { enabled: 'yes' } },
        });
    });
});

describe('custom tags', () => {
    it('supports a strict set of tags with autocompletion', () => {
        const meta = definePreview({ addons: [] }).type<{ tags: Array<'foo' | 'bar'> }>().meta({});

        meta.story({ tags: ['foo', 'bar'] });

        // @ts-expect-error bad tags
        meta.story({ tags: ['baz', 'qux'] });
    });

    it('supports extensible tags with autocompletion', () => {
        const meta = definePreview({ addons: [] })
            .type<{ tags: Array<'foo' | 'bar' | (string & {})> }>()
            .meta({ tags: ['foo', 'dog'] });

        meta.story({ tags: ['bar', 'cat'] });

        expectTypeOf<StoryTags<typeof meta>>().toEqualTypeOf<
            Array<'foo' | 'bar' | (string & {})> | undefined
        >();
    });
});

describe('Args can be provided in multiple ways', () => {
    it('all required args may be provided in meta', () => {
        const meta = preview.meta({
            component: Button,
            args: { label: 'good', disabled: false },
        });

        meta.story({});
        meta.story();
    });

    it('required args may be split between meta and the story', () => {
        const meta = preview.meta({
            component: Button,
            args: { label: 'good' },
        });

        meta.story({ args: { disabled: false } });
    });

    it('rejects stories that leave a required arg unset', () => {
        {
            const meta = preview.meta({ component: Button });

            // @ts-expect-error disabled not provided
            meta.story({ args: { label: 'good' } });
        }
        {
            const meta = preview.meta({ component: Button, args: { label: 'good' } });

            // @ts-expect-error disabled not provided
            meta.story();
        }
    });

    it('needs no args when the story renders without args', () => {
        const meta = preview.meta({ component: Button, args: { label: 'good' } });

        meta.story({ render: () => null });
        meta.story(() => null);
    });

    it('needs the required args when render takes args', () => {
        const meta = preview.meta({ component: Button, args: { label: 'good' } });

        // @ts-expect-error disabled not provided
        meta.story({
            args: { label: 'good' },
            render: _args => null,
        });
    });

    it('infers args from a widened render', () => {
        type ThemeData = 'light' | 'dark';
        const meta = preview.meta({
            component: Button,
            args: { disabled: false },
            render: (args: ButtonProps & { theme: ThemeData }) => Button(args),
        });

        meta.story({ args: { theme: 'light', label: 'good' } });
    });

    it('infers args from decorators', () => {
        const withDecorator: Decorator<{ decoratorArg: number }> = Story => Story();
        const secondDecorator: Decorator<{ decoratorArg2: string }> = Story => Story();
        const argsDecorator: Decorator<Args> = Story => Story();

        const meta = preview.meta({
            component: Button,
            args: { disabled: false },
            decorators: [withDecorator, secondDecorator, argsDecorator],
        });

        meta.story({ args: { decoratorArg: 0, decoratorArg2: '', label: 'good' } });
    });

    it('reuses and extends stories', () => {
        const meta = preview.meta({ component: Button });
        const Enabled = meta.story({ args: { label: 'hello', disabled: false } });

        meta.story({ args: { ...Enabled.input.args, disabled: true } });
        Enabled.extend({ args: { disabled: true } });
    });
});

describe('Custom args types written by the csf-factories codemod', () => {
    type Icon = { name: string };
    type CustomArgs = { pageIcon: Icon };

    it('sets a custom arg in meta and reads it in a story', () => {
        const meta = preview.type<{ args: CustomArgs }>().meta({
            component: Button,
            args: { pageIcon: { name: 'organization' } },
        });

        meta.story({
            args: { label: 'good', disabled: false },
            render: ({ pageIcon, ...args }) => {
                expectTypeOf(pageIcon).toEqualTypeOf<Icon>();

                return Button(args);
            },
        });
        meta.story({ args: { label: 'good', disabled: false, pageIcon: { name: 'user' } } });
    });

    it('keeps component args required when the custom type includes them', () => {
        const meta = preview.type<{ args: ButtonProps & { footer?: string } }>().meta({ component: Button });

        meta.story({ args: { label: 'good', disabled: false, footer: 'footer' } });
        // @ts-expect-error disabled not provided
        meta.story({ args: { label: 'good' } });
    });

    it('works when meta has no component', () => {
        const meta = preview.type<{ args: CustomArgs }>().meta({
            render: args => args.pageIcon.name,
            args: { pageIcon: { name: 'organization' } },
        });

        meta.story();
        meta.story({ args: { pageIcon: { name: 'user' } } });
    });
});

describe('Meta args are typed by the keys you provide', () => {
    enum Size {
        Small = 'small',
        Large = 'large',
    }
    type CardProps = {
        label: string;
        variant: 'primary' | 'secondary';
        size: Size;
        icon: `icon-${ string }`;
        range: [min: number, max: number];
        config: { theme: { mode: 'light' | 'dark' } };
        onClick: () => void;
        onChange: (value: number) => void;
    };
    const Card = (_props: CardProps): StoryFnReturnType => null;

    const meta = preview.meta({
        component: Card,
        args: {
            variant: 'primary',
            size: Size.Small,
            icon: 'icon-star',
            range: [0, 10],
            config: { theme: { mode: 'dark' } },
            onClick: () => {},
            onChange: value => expectTypeOf(value).toEqualTypeOf<number>(),
        },
    });

    it('needs no `as const` for literal, enum and template literal props', () => {
        expectTypeOf(meta.input.args.variant).toEqualTypeOf<'primary' | 'secondary'>();
        expectTypeOf(meta.input.args.size).toEqualTypeOf<Size>();
        expectTypeOf(meta.input.args.icon).toEqualTypeOf<`icon-${ string }`>();
        expectTypeOf(meta.input.args.range).toEqualTypeOf<[min: number, max: number]>();

        meta.story({ args: { label: 'Hi' } });
        // @ts-expect-error label is required
        meta.story();
    });

    it('rejects invalid meta args', () => {
        // @ts-expect-error not a variant
        preview.meta({ component: Card, args: { variant: 'tertiary' } });
        // @ts-expect-error not a mode
        preview.meta({ component: Card, args: { config: { theme: { mode: 'dim' } } } });
        // @ts-expect-error not a prop of Card
        preview.meta({ component: Card, args: { variant: 'primary', unknown: true } });
    });

    it('rejects non-arg keys from a variable or a spread', () => {
        const shared = { label: 'Hi', extra: 1 };

        // @ts-expect-error extra is not an arg
        preview.meta({ component: Button, args: shared });
        // @ts-expect-error extra is not an arg
        preview.meta({ component: Button, args: { ...shared, disabled: false } });
    });

    it('treats an Args record as setting no args', () => {
        const record: Args = { label: 'Hi' };
        const recordMeta = preview.meta({ component: Button, args: record });

        // @ts-expect-error label is still required
        recordMeta.story({ args: { disabled: false } });
    });

    it('lets stories override meta args', () => {
        const Default = meta.story({ args: { label: 'Hi', variant: 'secondary' } });

        Default.extend({ args: { variant: 'primary' } });
        // @ts-expect-error not a variant
        Default.extend({ args: { variant: 'tertiary' } });
    });

    it('types args in play as declared, with the mock API through mocked()', () => {
        type Props = { label: string; onClick: () => void; getUsers: () => Promise<string[]> };
        const TestButton = (_props: Props): StoryFnReturnType => null;
        const testMeta = preview.meta({
            component: TestButton,
            args: { label: 'label', onClick: fn(), getUsers: fn() },
        });

        testMeta.story({
            play: async ({ args }) => {
                expectTypeOf(args.onClick).toEqualTypeOf<() => void>();
                mocked(args.getUsers).mockResolvedValue(['Ada']);
            },
        });
    });

    it('keeps optional args set in meta present in its own hooks', () => {
        preview.meta({
            component: Button,
            args: { onKeyDown: fn() },
            beforeEach: ({ args }) => {
                mocked(args.onKeyDown).mockClear();
            },
        });
    });

    it('composes meta and story args at runtime', () => {
        const Default = meta.story({ args: { label: 'Hi', variant: 'secondary' } });

        expect(Default.composed.args).toMatchObject({
            label: 'Hi',
            variant: 'secondary',
            size: Size.Small,
            range: [0, 10],
        });
    });
});

describe('meta.type<>() types the stories created from it', () => {
    const meta = preview.meta({ component: Button, args: { disabled: false } });

    it('adds an arg to that story only', () => {
        meta.type<{ args: { icon: 'star' | 'heart' } }>().story({
            args: { label: 'Hi', icon: 'star' },
            render: ({ icon, ...args }) => {
                expectTypeOf(icon).toEqualTypeOf<'star' | 'heart'>();
                expectTypeOf(args.label).toEqualTypeOf<string>();

                return Button(args);
            },
        });

        meta.story({
            args: { label: 'Hi' },
            // @ts-expect-error icon is not an arg of the other stories
            render: ({ icon, ...args }) => Button(args),
        });
        // @ts-expect-error icon must be 'star' | 'heart'
        meta.type<{ args: { icon: 'star' | 'heart' } }>().story({ args: { label: 'Hi', icon: 'x' } });
    });

    it('keeps meta args optional and the others required', () => {
        const typed = meta.type<{ args: { icon: string } }>();

        typed.story({ args: { label: 'Hi', icon: 'star' } });
        // @ts-expect-error label is required
        typed.story({ args: { icon: 'star' } });
        // @ts-expect-error icon is required
        meta.type<{ args: { icon: string } }>().story({ args: { label: 'Hi' } });
    });

    it('requires a redeclared meta arg again', () => {
        // @ts-expect-error disabled is required, the meta sets it to false
        meta.type<{ args: { disabled: true } }>().story({ args: { label: 'Hi' } });
        meta.type<{ args: { disabled: true } }>().story({ args: { label: 'Hi', disabled: true } });
    });

    it('keeps the no-input and render-only story overloads', () => {
        const complete = preview.meta({ component: Button, args: { label: 'Hi', disabled: false } });

        complete.type<{ args: { icon?: string } }>().story();
        // @ts-expect-error icon is required
        complete.type<{ args: { icon: string } }>().story();
        complete.type<{ args: { icon: string } }>().story(() => null);
        complete.type<{ args: { icon: string } }>().story({ render: () => null });
    });

    it('returns a SolidMeta whose stories keep story.Component', () => {
        const WithIcon = meta.type<{ args: { icon: string } }>().story({
            args: { label: 'Hi', icon: 'star' },
        });
        const WithHeart = WithIcon.extend({ args: { icon: 'heart' } });

        expectTypeOf(meta.type<{ args: { icon: string } }>()).toExtend<SolidMeta<any, any>>();
        expectTypeOf(WithIcon.composed.args.icon).toEqualTypeOf<string>();
        expectTypeOf(WithIcon.Component).toEqualTypeOf<
            SolidComponent<Partial<ButtonProps & { icon: string }>>
        >();
        expect(WithIcon.composed.args).toEqual({ label: 'Hi', icon: 'star', disabled: false });
        expect(WithHeart.composed.args).toEqual({ label: 'Hi', icon: 'heart', disabled: false });
        expect(WithIcon.Component).toBeTypeOf('function');
    });
});
