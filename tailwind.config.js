/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./**/*.{js,ts,jsx,tsx}", // Catch files in root if any
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./layouts/**/*.{js,ts,jsx,tsx}"
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                // Clean Blue Palette - Refined & Intentional
                primary: {
                    DEFAULT: "#0EA5E9", // Sky 500
                    light: "#38BDF8",   // Sky 400
                    dark: "#0284C7",    // Sky 600
                    50: "#F0F9FF",
                    100: "#E0F2FE",
                    500: "#0EA5E9",
                    600: "#0284C7",
                    700: "#0369A1",
                },
                // Slate-based neutrals
                slate: {
                    50: "#F8FAFC",
                    100: "#F1F5F9",
                    200: "#E2E8F0",
                    300: "#CBD5E1",
                    400: "#94A3B8",
                    500: "#64748B",
                    600: "#475569",
                    700: "#334155",
                    800: "#1E293B",
                    900: "#0F172A",
                    950: "#020617",
                },
                // Semantic colors
                success: { DEFAULT: "#22C55E", light: "#86EFAC", dark: "#16A34A" },
                warning: { DEFAULT: "#F59E0B", light: "#FCD34D", dark: "#D97706" },
                danger: { DEFAULT: "#EF4444", light: "#FCA5A5", dark: "#DC2626" },
                // Legacy aliases support
                "background-light": "#F8FAFC",
                "background-dark": "#0F172A",
                "surface-light": "#FFFFFF",
                "surface-dark": "#1E293B",
                "text-primary-light": "#0F172A",
                "text-primary-dark": "#F8FAFC",
                "text-secondary-light": "#64748B",
                "text-secondary-dark": "#94A3B8",
            },
            fontFamily: {
                display: ["Outfit", "system-ui", "sans-serif"],
                body: ["DM Sans", "system-ui", "sans-serif"],
            },
            borderRadius: {
                'xl': '0.875rem',
                '2xl': '1rem',
                '3xl': '1.25rem',
                '4xl': '1.5rem',
            },
            boxShadow: {
                'soft': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
                'card': '0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -2px rgba(0, 0, 0, 0.03)',
                'elevated': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
                'glow': '0 0 20px rgba(14, 165, 233, 0.15)',
            },
            animation: {
                'fade-in': 'fadeIn 0.4s ease-out',
                'slide-up': 'slideUp 0.4s ease-out',
                'scale-in': 'scaleIn 0.3s ease-out',
                'float': 'float 6s ease-in-out infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
                slideUp: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
                scaleIn: { '0%': { opacity: '0', transform: 'scale(0.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
        require('@tailwindcss/typography'),
        require('@tailwindcss/aspect-ratio'),
        require('@tailwindcss/container-queries'),
    ],
}
