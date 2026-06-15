import type { ArgsStoryFn } from 'storybook/internal/types';
import type { SolidRenderer } from '../../preview/public-api';
import type { SolidRuntimeCreateComponent } from './render-to-canvas';

/** Default render for meta/stories with `component` + `args` and no custom `render` (CSF 3+). */
export function createDefaultRender(createComponent: SolidRuntimeCreateComponent): ArgsStoryFn<SolidRenderer> {
    return (_, context) => {
        if (!context.component) {
            throw new Error(
                `Unable to render story ${ context.id } as the component annotation is missing from the default export`
            );
        }

        return createComponent(context.component, context.args);
    };
}
