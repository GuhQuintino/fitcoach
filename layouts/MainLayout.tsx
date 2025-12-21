import React from 'react';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../contexts/AuthContext';

interface MainLayoutProps {
    children: React.ReactNode;
    className?: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, className = '' }) => {
    const { role } = useAuth();

    return (
        <div className={`min-h-screen flex flex-col relative pb-safe transition-colors duration-300 bg-slate-50 dark:bg-slate-900 ${className}`}>
            {children}
            {role && <BottomNav />}
        </div>
    );
};

export default MainLayout;
