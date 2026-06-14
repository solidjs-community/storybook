import { definePreview as definePreviewBase } from 'storybook/internal/csf';

import * as solidDocsAnnotations from '../docs/entry-preview';
import * as solidArgTypesAnnotations from '../docs/entry-preview-argtypes';

import type { PreviewAddon } from 'storybook/internal/csf';
import type { ProjectAnnotations } from 'storybook/internal/types';

export function createDefinePreview(solidAnnotations: PreviewAddon<never>) {
    return function definePreview<Addons extends PreviewAddon<never>[] = []>(
        input: { addons?: Addons } & ProjectAnnotations<any>
    ) {
        const { addons, ...projectAnnotations } = input;

        const preview = definePreviewBase({
            ...projectAnnotations,
            addons: [
                solidAnnotations,
                solidArgTypesAnnotations,
                solidDocsAnnotations,
                ...(addons ?? []),
            ],
        });

        const defineMeta = preview.meta.bind(preview);

        preview.meta = (_input) => {
            const meta = defineMeta(_input);
            const defineStory = meta.story.bind(meta);

            meta.story = (__input: any) => {
                const story = defineStory(__input);

                // @ts-ignore this is a private property used only here
                story.Component = story.__compose();

                return story;
            };

            return meta;
        };

        return preview;
    };
}
