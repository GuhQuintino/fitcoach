import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const BottomNav: React.FC = () => {
    const location = useLocation();
    const currentPath = location.pathname;
    const { role } = useAuth();

    const coachLinks = [
        { path: '/coach/dashboard', icon: 'home', label: 'Home' },
        { path: '/coach/library', icon: 'fitness_center', label: 'Treinos' },
        { path: '/coach/students', icon: 'groups', label: 'Alunos' },
        { path: '/coach/plans', icon: 'card_membership', label: 'Planos' },
        { path: '/coach/profile', icon: 'person', label: 'Perfil' },
    ];

    const studentLinks = [
        { path: '/student/dashboard', icon: 'home', label: 'Home' },
        { path: '/student/selection', icon: 'fitness_center', label: 'Treino' },
        { path: '/student/history', icon: 'history', label: 'Histórico' },
        { path: '/student/profile', icon: 'person', label: 'Perfil' },
    ];

    const links = role === 'coach' ? coachLinks : (role === 'student' ? studentLinks : []);

    if (!role || links.length === 0) return null;

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 pb-safe pt-2 px-2 z-50 max-w-md mx-auto shadow-soft">
            <div className="flex justify-between items-end pb-2">
                {links.map((link) => {
                    const isActive = currentPath === link.path;
                    return (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`flex flex-col items-center gap-1 p-2 flex-1 transition-colors ${isActive
                                ? 'text-primary'
                                : 'text-slate-400 dark:text-slate-500 hover:text-primary'
                                }`}
                        >
                            <span className={`material-symbols-rounded text-2xl ${isActive ? 'filled' : ''}`}>
                                {link.icon}
                            </span>
                            <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                                {link.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;