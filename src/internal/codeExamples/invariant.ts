/** Like `invariant` in Storybook React — lazy message evaluation for code-frame errors. */
export function invariant(
    condition: unknown,
    message?: string | (() => string)
): asserts condition {
    if (condition) {
        return;
    }

    throw new Error((typeof message === 'function' ? message() : message) ?? 'Invariant failed');
}
