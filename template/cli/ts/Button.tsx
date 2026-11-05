import './button.css';

export interface ButtonProps {
    /** Is this the principal call to action on the page? */
    primary?: boolean;
    /** What background color to use */
    backgroundColor?: string;
    /** How large should the button be? */
    size?: 'small' | 'medium' | 'large';
    /** Button contents */
    label: string;
    /** Optional click handler */
    onClick?: () => void;
}

/** Primary UI component for user interaction */
export const Button = (props: ButtonProps) => {
    const mode = () => props.primary ? 'storybook-button--primary' : 'storybook-button--secondary';
    const size = () => props.size ?? 'medium';

    return (
        <button
            type="button"
            class={ [
                'storybook-button',
                `storybook-button--${ size() }`,
                mode(),
            ].join(' ') }
            style={ props.backgroundColor ? { 'background-color': props.backgroundColor } : undefined }
            onClick={ props.onClick }
        >
            {props.label}
        </button>
    );
};
