import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import BottomNav from '../BottomNav';

import { Toaster } from 'react-hot-toast'; // Optional, but good for feedback

interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const { session, loading } = useAuth();

    // Determine if we should show navigation
    const showNav = !!session;

    return (
        <div className="min-h-screen w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 transition-colors duration-300 overflow-x-hidden">
            {/* Main Content Container */}
            <div className="w-full max-w-5xl mx-auto min-h-screen relative flex flex-col shadow-2xl bg-white dark:bg-slate-900">

                {/* Main Content Area */}
                <main className={`flex-1 relative z-10 w-full ${showNav ? 'pb-28' : ''}`}>
                    {/* Fade-in animation for page transitions */}
                    <div className="animate-fade-in h-full flex flex-col">
                        {children}
                    </div>
                </main>

                {/* Navigation */}
                {showNav && <BottomNav />}
            </div>

            {/* Global Toaster for Notifications */}
            <Toaster
                position="top-center"
                toastOptions={{
                    className: 'glass text-sm font-medium text-slate-900 dark:text-white shadow-elevated',
                    duration: 3000,
                }}
            />
        </div>
    );
};

export default MainLayout;
