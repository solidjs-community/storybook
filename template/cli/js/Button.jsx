import './button.css';

/** Primary UI component for user interaction */
export const Button = (props) => {
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
