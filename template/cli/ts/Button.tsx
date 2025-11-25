import { mergeProps, splitProps } from 'solid-js';
import './button.css';

export interface ButtonProps {
    primary?: boolean;
    backgroundColor?: string;
    size?: 'small' | 'medium' | 'large';
    label: string;
    [key: string]: any;
}

/** Primary UI component for user interaction */
export const Button = (_props: ButtonProps) => {
    const [props, rest] = splitProps(
        mergeProps({ primary: false, backgroundColor: null, size: 'medium' }, _props),
        ['primary', 'backgroundColor', 'size', 'label']
    );
    
    const mode = () => props.primary ? 'storybook-button--primary' : 'storybook-button--secondary';

    return (
        <button
            type="button"
            class={ [
                'storybook-button',
                `storybook-button--${ props.size }`,
                mode(),
            ].join(' ') }
            style={ props.backgroundColor ? { 'background-color': props.backgroundColor } : undefined }
            { ...rest }
        >
            {props.label}
        </button>
    );
};

