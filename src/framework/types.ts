import type { BuilderOptions, StorybookConfigVite } from '@storybook/builder-vite';
import type {
    CompatibleString,
    StorybookConfig as StorybookConfigBase,
} from 'storybook/internal/types';

type FrameworkName = CompatibleString<'storybook-solidjs-vite' | 'storybook-solidjs-vite/next'>;
type BuilderName = CompatibleString<'@storybook/builder-vite'>;

export type SolidVersion = 1 | 2;

export type FrameworkOptions = {
    builder?: BuilderOptions;
    /** Set to `false` to disable Solid component-meta docgen (Controls, Docs, manifest). */
    docgen?: false;
};

/** Value of the `framework` field in `.storybook/main.ts` (and from `presets.apply('framework')`). */
export type FrameworkConfig
    = | FrameworkName
      | {
          name: FrameworkName;
          options?: FrameworkOptions;
      };

type StorybookConfigFramework = {
    framework: FrameworkConfig;
    core?: StorybookConfigBase['core'] & {
        builder?:
          | BuilderName
          | {
              name: BuilderName;
              options: BuilderOptions;
          };
    };
    features?: StorybookConfigBase['features'] & {
        /**
         * Enable the experimental `.test` function in CSF Next
         *
         * @see https://storybook.js.org/docs/10/api/main-config/main-config-features#experimentalTestSyntax
         */
        experimentalTestSyntax?: boolean;
    };
};

/** The interface for Storybook configuration in `main.ts` files. */
export type StorybookConfig = Omit<StorybookConfigBase, keyof StorybookConfigVite | keyof StorybookConfigFramework> & StorybookConfigVite & StorybookConfigFramework;
