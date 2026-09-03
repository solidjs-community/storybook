import { expect } from 'storybook/test';

import preview from './preview';

import { Page } from './Page';

const meta = preview.meta({
    title: 'Example/Page',
    component: Page,
    parameters: {
        layout: 'fullscreen',
    },
});

export const LoggedOut = meta.story({});

LoggedOut.test('shows the login action', async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: /Log in/i })).toBeInTheDocument();
});

export const LoggedIn = meta.story({});

LoggedIn.test('logs in from the page header', async ({ canvas, userEvent }) => {
    const loginButton = canvas.getByRole('button', { name: /Log in/i });

    await expect(loginButton).toBeInTheDocument();
    await userEvent.click(loginButton);
    await expect(loginButton).not.toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /Log out/i })).toBeInTheDocument();
});
