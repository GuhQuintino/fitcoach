import React from 'react';

export interface ToggleSwitchProps {
    id?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    label: string;
    size?: 'sm' | 'md';
    className?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
    id,
    checked,
    onChange,
    disabled = false,
    label,
    size = 'md',
    className = ''
}) => {
    const isSm = size === 'sm';

    return (
        <button
            id={id}
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            className={`
                relative inline-flex items-center shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800
                before:absolute before:-inset-2.5 before:min-w-[44px] before:min-h-[44px] before:content-['']
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
                ${isSm ? 'w-11 h-6 px-0.5' : 'w-14 h-8 px-1'}
                ${checked ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}
                ${className}
            `}
        >
            <span className="sr-only">{label}</span>
            <span
                aria-hidden="true"
                className={`
                    pointer-events-none inline-block rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out
                    ${isSm ? 'w-5 h-5' : 'w-6 h-6'}
                    ${checked ? (isSm ? 'translate-x-5' : 'translate-x-6') : 'translate-x-0'}
                `}
            />
        </button>
    );
};

export default React.memo(ToggleSwitch);
