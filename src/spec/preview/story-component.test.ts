import { createComponent, createRoot, createSignal, createStore } from 'solid-js';
import { definePreviewAddon } from 'storybook/internal/csf';
import { describe, expect, it } from 'vitest';

import { createSolidDefinePreview } from '../../preview/define-preview';
import { createApplyDecorators } from '../../renderer/shared/apply-decorators';
import { createDefaultRender } from '../../renderer/shared/default-render';

const definePreview = createSolidDefinePreview(definePreviewAddon({
    applyDecorators: createApplyDecorators({
        storyStore: {
            isStoryRendered: () => false,
        },
    } as any),
    render: createDefaultRender(createComponent),
} as any));

describe('Story.Component', () => {
    it('updates when props change and keeps the component mounted', () => {
        const preview = definePreview({});
        let mounts = 0;
        let readLabel = () => '';

        const Counter = (props: { label?: string }) => {
            mounts += 1;
            readLabel = () => props.label ?? '';

            return null;
        };

        const meta = preview.meta({
            component: Counter,
            args: { label: 'from args' },
        });
        const Story = meta.story();
        const [label, setLabel] = createSignal('Label');
        const props = {
            get label() {
                return label();
            },
        };

        createRoot((dispose) => {
            createComponent(Story.Component, props);
            expect(readLabel()).toBe('Label');
            expect(mounts).toBe(1);

            setLabel('New label');

            expect(readLabel()).toBe('New label');
            expect(mounts).toBe(1);
            dispose();
        });
    });

    it('keeps meta args when a prop is omitted', () => {
        const preview = definePreview({});
        let readLabel = () => '';

        const Counter = (props: { label?: string }) => {
            readLabel = () => props.label ?? '';

            return null;
        };

        const Story = preview.meta({
            component: Counter,
            args: { label: 'from args' },
        }).story();

        createRoot((dispose) => {
            createComponent(Story.Component, {});
            expect(readLabel()).toBe('from args');
            dispose();
        });
    });

    it('tracks props for each mounted instance', () => {
        const preview = definePreview({});
        const readLabel: Array<() => string> = [];

        const Counter = (props: { label?: string }) => {
            readLabel.push(() => props.label ?? '');

            return null;
        };

        const Story = preview.meta({ component: Counter }).story();
        const [first, setFirst] = createSignal('one');
        const [second, setSecond] = createSignal('two');

        createRoot((dispose) => {
            createComponent(Story.Component, {
                get label() {
                    return first();
                },
            });
            createComponent(Story.Component, {
                get label() {
                    return second();
                },
            });

            expect(readLabel.map(read => read())).toEqual(['one', 'two']);

            setFirst('one-b');

            expect(readLabel.map(read => read())).toEqual(['one-b', 'two']);

            setSecond('two-b');

            expect(readLabel.map(read => read())).toEqual(['one-b', 'two-b']);
            dispose();
        });
    });

    it('still runs story decorators and follows props through them', () => {
        const preview = definePreview({});
        let readLabel = () => '';
        let decoratorRuns = 0;
        const userDecorator = (storyFn: (context: { args: { label?: string } }) => unknown, context: { args: { label?: string } }) => {
            decoratorRuns += 1;

            return storyFn(context);
        };
        const annotations = {
            decorators: [userDecorator],
        };
        const Story = preview.meta({
            component: (props: { label?: string }) => {
                readLabel = () => props.label ?? '';

                return null;
            },
        }).story(annotations as never);

        expect(annotations.decorators).toEqual([userDecorator]);
        const [label, setLabel] = createSignal('Label');

        createRoot((dispose) => {
            createComponent(Story.Component, {
                get label() {
                    return label();
                },
            });

            expect(decoratorRuns).toBe(1);
            expect(readLabel()).toBe('Label');

            setLabel('New label');

            expect(readLabel()).toBe('New label');
            expect(decoratorRuns).toBe(1);
            dispose();
        });
    });

    it('reads args from a custom render when those args change', () => {
        const preview = definePreview({});
        let readLabel = () => '';
        const Story = preview.meta({
            args: { label: 'from args' },
        }).story({
            render: (args: { label?: string }) => {
                readLabel = () => args.label ?? '';

                return null;
            },
        });
        const [label, setLabel] = createSignal('Label');

        createRoot((dispose) => {
            createComponent(Story.Component, {
                get label() {
                    return label();
                },
            });

            expect(readLabel()).toBe('Label');

            setLabel('New label');

            expect(readLabel()).toBe('New label');
            dispose();
        });
    });

    it('lets story args override meta args and keeps the rest from meta', () => {
        const preview = definePreview({});
        let readLabel = () => '';
        let readHint = () => '';

        const Story = preview.meta({
            component: (props: { label?: string; hint?: string }) => {
                readLabel = () => props.label ?? '';
                readHint = () => props.hint ?? '';

                return null;
            },
            args: { label: 'from meta', hint: 'meta hint' },
        }).story({
            args: { label: 'from story' },
        });

        createRoot((dispose) => {
            createComponent(Story.Component, {});

            expect(readLabel()).toBe('from story');
            expect(readHint()).toBe('meta hint');
            dispose();
        });
    });

    it('lets component props override story args', () => {
        const preview = definePreview({});
        let readLabel = () => '';
        let readHint = () => '';
        const Story = preview.meta({
            component: (props: { label?: string; hint?: string }) => {
                readLabel = () => props.label ?? '';
                readHint = () => props.hint ?? '';

                return null;
            },
            args: { hint: 'meta hint' },
        }).story({
            args: { label: 'from story', hint: 'story hint' },
        });
        const [label, setLabel] = createSignal('from component');

        createRoot((dispose) => {
            createComponent(Story.Component, {
                get label() {
                    return label();
                },
            });

            expect(readLabel()).toBe('from component');
            expect(readHint()).toBe('story hint');

            setLabel('updated');

            expect(readLabel()).toBe('updated');
            expect(readHint()).toBe('story hint');
            dispose();
        });
    });

    it('snapshots args from meta.story and ignores later changes', () => {
        const preview = definePreview({});
        let readLabel = () => '';
        const Counter = (props: { label?: string }) => {
            readLabel = () => props.label ?? '';

            return null;
        };
        const storyArgs = { label: 'original' };
        const plain = preview.meta({ component: Counter }).story({ args: storyArgs });

        storyArgs.label = 'changed';

        const [storeArgs, setStoreArgs] = createStore({ label: 'from store' });
        const stored = preview.meta({ component: Counter }).story({ args: storeArgs });

        createRoot((dispose) => {
            createComponent(plain.Component, {});
            expect(readLabel()).toBe('original');

            createComponent(stored.Component, {});
            expect(readLabel()).toBe('from store');

            setStoreArgs((store) => {
                store.label = 'updated';
            });

            expect(readLabel()).toBe('from store');
            dispose();
        });
    });
});
