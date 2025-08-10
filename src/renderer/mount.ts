import type { SolidRenderer, StoryContext } from './public-types';

import type { BaseAnnotations } from 'storybook/internal/types';


export const mount: BaseAnnotations<SolidRenderer>['mount']
  = (context: StoryContext) => async(ui) => {
      if (ui != null) {
          context.originalStoryFn = () => ui;
      }

      await context['renderToCanvas']();

      return context.canvas;
  };
