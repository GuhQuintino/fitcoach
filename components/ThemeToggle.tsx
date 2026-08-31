import React from 'react';
import { useTheme } from './ThemeContext';

interface ThemeToggleProps {
    variant?: 'light' | 'dark' | 'glass';
    className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'dark', className = '' }) => {
    const { isDark, toggleTheme } = useTheme();

    const baseClasses = "min-w-[44px] min-h-[44px] p-2.5 rounded-full transition-all duration-200 flex items-center justify-center active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary";
    
    let variantClasses = "";
    if (variant === 'light') {
        variantClasses = "text-white hover:bg-white/20";
    } else if (variant === 'glass') {
         variantClasses = "bg-white/10 text-white backdrop-blur-md border border-white/20 hover:bg-white/20 shadow-sm";
    } else {
        variantClasses = "text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800";
    }

    return (
        <button 
            type="button"
            onClick={toggleTheme} 
            className={`${baseClasses} ${variantClasses} ${className}`}
            aria-label={isDark ? "Alternar para modo claro" : "Alternar para modo escuro"}
            title={isDark ? "Modo Claro" : "Modo Escuro"}
        >
            <span className="material-symbols-rounded text-xl" aria-hidden="true">
                {isDark ? 'light_mode' : 'dark_mode'}
            </span>
        </button>
    );
};

export default ThemeToggle;