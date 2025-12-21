import React from 'react';
import { useTheme } from './ThemeContext';

interface ThemeToggleProps {
    variant?: 'light' | 'dark' | 'glass';
    className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'dark', className = '' }) => {
    const { isDark, toggleTheme } = useTheme();

    const baseClasses = "p-2 rounded-full transition-all duration-200 flex items-center justify-center active:scale-95";
    
    let variantClasses = "";
    if (variant === 'light') {
        variantClasses = "text-white hover:bg-white/20";
    } else if (variant === 'glass') {
         variantClasses = "bg-white/10 text-white backdrop-blur-md border border-white/20 hover:bg-white/20 shadow-sm";
    } else {
        variantClasses = "text-text-primary-light dark:text-text-primary-dark hover:bg-gray-100 dark:hover:bg-gray-800";
    }

    return (
        <button 
            onClick={toggleTheme} 
            className={`${baseClasses} ${variantClasses} ${className}`}
            aria-label="Alternar tema"
            title={isDark ? "Modo Claro" : "Modo Escuro"}
        >
            <span className="material-symbols-rounded text-xl">
                {isDark ? 'light_mode' : 'dark_mode'}
            </span>
        </button>
    );
};

export default ThemeToggle;