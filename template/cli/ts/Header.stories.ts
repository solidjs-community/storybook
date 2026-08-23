import { expect, fn } from 'storybook/test';

import preview from './preview';

import { Header } from './Header';

const meta = preview.meta({
    title: 'Example/Header',
    component: Header,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen',
    },
    args: {
        onLogin: fn(),
        onLogout: fn(),
        onCreateAccount: fn(),
    },
});

export const LoggedIn = meta.story({
    args: {
        user: {
            name: 'Jane Doe',
        },
    },
});

LoggedIn.test('shows the welcome message', async ({ canvas }) => {
    await expect(canvas.getByText(/Welcome,/)).toBeInTheDocument();
    await expect(canvas.getByText('Jane Doe')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /Log out/i })).toBeInTheDocument();
});

export const LoggedOut = meta.story({});

LoggedOut.test('shows auth actions and calls onLogin', async ({ canvas, userEvent, args }) => {
    const loginButton = canvas.getByRole('button', { name: /Log in/i });

    await expect(loginButton).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /Sign up/i })).toBeInTheDocument();

    await userEvent.click(loginButton);
    await expect(args.onLogin).toHaveBeenCalledOnce();
});
