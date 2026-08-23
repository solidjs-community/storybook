import { fileURLToPath } from 'node:url';

export async function experimental_docgenProvider(existing: unknown[] = []) {
    const workerPath = fileURLToPath(
        import.meta.resolve('storybook-solidjs-vite/internal/docgen-worker')
    );

    return [
        ...(Array.isArray(existing) ? existing : []),
        { moduleSpecifier: workerPath },
    ];
}
