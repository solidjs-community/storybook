import './button.css';

/**
 * Primary UI component for user interaction
 *
 * @param {object} props
 * @param {boolean} [props.primary=false] Is this the principal call to action on the page?
 * @param {string} [props.backgroundColor] What background color to use
 * @param {'small' | 'medium' | 'large'} [props.size='medium'] How large should the button be?
 * @param {string} props.label Button contents
 * @param {() => void} [props.onClick] Optional click handler
 */
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
