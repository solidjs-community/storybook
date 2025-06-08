import { afterAll, describe, expect, test, vi } from 'vitest';

import { generateSolidSource } from '../docs/sourceDecorator';

test('plain component', () => {
    const newSrc1 = generateSolidSource('{ }', 'Component', 'Component');

    expect(newSrc1).toMatchInlineSnapshot('"<Component />"');

    const newSrc2 = generateSolidSource('{ args: { } }', 'Component', 'Component');

    expect(newSrc2).toMatchInlineSnapshot('"<Component />"');
});

test('component with props', () => {
    const newSrc = generateSolidSource(
        '{ args: { foo: 32, bar: "Hello" } }',
        'Component',
        'Component'
    );

    expect(newSrc).toMatchInlineSnapshot(
        '"<Component foo={32} bar={\"Hello\"} />"'
    );
});

test('component with children', () => {
    const newSrc = generateSolidSource(
        '{ args: { children: "Hello" } }',
        'Component',
        'Component'
    );

    expect(newSrc).toMatchInlineSnapshot('"<Component>Hello</Component>"');
});

test('component with true prop', () => {
    const newSrc = generateSolidSource('{ args: { foo: true } }', 'Component', 'Component');

    expect(newSrc).toMatchInlineSnapshot('"<Component foo />"');
});

test('component with props and children', () => {
    const newSrc = generateSolidSource(
        '{ args: { foo: 32, children: "Hello" } }',
        'Component',
        'Component'
    );

    expect(newSrc).toMatchInlineSnapshot(
        '"<Component foo={32}>Hello</Component>"'
    );
});

test('component with method prop', () => {
    const newSrc = generateSolidSource(
        '{ args: { search() { return 32; } } }',
        'Component',
        'Component'
    );

    expect(newSrc).toMatchInlineSnapshot(`
    "<Component search={() => {\n  return 32;\n}} />"
  `);
});

test('component with typescript', () => {
    const newSrc = generateSolidSource(
        '{ args: { double: (x: number) => { return x * 2; } } }',
        'Component',
        'Component'
    );

    expect(newSrc).toMatchInlineSnapshot(`
    "<Component double={(x: number) => {\n  return x * 2;\n}} />"
  `);
});

test('component with expression children', () => {
    const newSrc = generateSolidSource(
        '{ args: { children: { do: () => { return 32; } } } }',
        'Component',
        'Component'
    );

    expect(newSrc).toMatchInlineSnapshot(`
    "<Component>{{\n    do: () => {\n      return 32;\n    }\n  }}</Component>"
  `);
});

test('component with render function', () => {
    const newSrc = generateSolidSource(
        '{ render: () => <Component foo={32}>Hello</Component> }',
        'Component',
        'Component'
    );

    expect(newSrc).toMatchInlineSnapshot(
        '"<Component foo={32}>Hello</Component>"'
    );
});

test('component with render function and args', () => {
    const newSrc = generateSolidSource(
        '{ args: { foo: 32 }, render: (args) => <Component {...args}>Hello</Component> }',
        'Component',
        'Component'
    );

    expect(newSrc).toMatchInlineSnapshot(`
    "const args = {\n  foo: 32\n};\n\n<Component {...args}>Hello</Component>"
  `);
});

test('component with render function and missing args', () => {
    const newSrc = generateSolidSource(
        '{ render: (args) => <Component {...args}>Hello</Component> }',
        'Component',
        'Component'
    );

    expect(newSrc).toMatchInlineSnapshot(`
    "const args = {};\n\n<Component {...args}>Hello</Component>"
  `);
});

test('component with render function and args and ctx', () => {
    const newSrc = generateSolidSource(
        '{ args: { foo: 32 }, render: (args, ctx) => <Component {...args}>Hello</Component> }',
        'Component',
        'Component'
    );

    expect(newSrc).toMatchInlineSnapshot(`
    "const args = {\n  foo: 32\n};\n\nvar ctx;\n\n<Component {...args}>Hello</Component>"
  `);
});

test('component missing story config', () => {
    const newSrc = () => generateSolidSource('5 + 4', 'Component', 'Component');

    expect(newSrc).toThrow('Expected `ObjectExpression` type');
});

test('component has invalid args', () => {
    const newSrc = () => generateSolidSource('{ args: 5 }', 'Component', 'Component');

    expect(newSrc).toThrow('Expected `ObjectExpression` type');
});

describe('catch warnings for skipped props', () => {
    const consoleMock = vi.spyOn(console, 'warn').mockImplementation(() => {});

    afterAll(() => {
        consoleMock.mockReset();
    });

    test('component prop has computed name', () => {
        const newSrc = generateSolidSource(
            '{ args: { ["foo"]: 32 } }',
            'Component',
            'Component'
        );

        expect(newSrc).toMatchInlineSnapshot('"<Component />"');
        expect(consoleMock).toHaveBeenCalledWith(
            'Encountered computed key, skipping...'
        );
    });

    test('component method has computed name', () => {
        const newSrc = generateSolidSource(
            '{ args: { ["foo"]() { return 32; } } }',
            'Component',
            'Component'
        );

        expect(newSrc).toMatchInlineSnapshot('"<Component />"');
        expect(consoleMock).toHaveBeenCalledWith(
            'Encountered computed key, skipping...'
        );
    });

    test('component method is a getter or setter', () => {
        const newSrc = generateSolidSource(
            '{ args: { get foo() { return 32; } } }',
            'Component',
            'Component'
        );

        expect(newSrc).toMatchInlineSnapshot('"<Component />"');
        expect(consoleMock).toHaveBeenCalledWith(
            'Encountered getter or setter, skipping...'
        );
    });

    test('component prop is a spread element', () => {
        const newSrc = generateSolidSource('{ args: { ...foo } }', 'Component', 'Component');

        expect(newSrc).toMatchInlineSnapshot('"<Component />"');
        expect(consoleMock).toHaveBeenCalledWith(
            'Encountered spread element, skipping...'
        );
    });
});
