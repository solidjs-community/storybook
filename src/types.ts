import type { BuilderOptions, StorybookConfigVite } from '@storybook/builder-vite';
import type { ParserOptions } from 'react-docgen-typescript';
import type {
    CompatibleString,
    StorybookConfig as StorybookConfigBase,
} from 'storybook/internal/types';

type FrameworkName = CompatibleString<'storybook-solidjs-vite'>;
type BuilderName = CompatibleString<'@storybook/builder-vite'>;

export type FrameworkOptions = {
    builder?: BuilderOptions;
    docgen?: boolean | ParserOptions;
};

type StorybookConfigFramework = {
    framework:
      | FrameworkName
      | {
          name: FrameworkName;
          options: FrameworkOptions;
      };
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
