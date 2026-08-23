import './button.css';

export interface ButtonProps {
    primary?: boolean;
    backgroundColor?: string;
    size?: 'small' | 'medium' | 'large';
    label: string;
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
