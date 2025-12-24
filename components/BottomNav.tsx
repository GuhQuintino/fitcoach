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

    const adminLinks = [
        { path: '/coach/dashboard', icon: 'home', label: 'Home' },
        { path: '/admin/dashboard', icon: 'shield_person', label: 'Coaches' },
        { path: '/coach/students', icon: 'groups', label: 'Alunos' },
        { path: '/coach/exercises', icon: 'dataset', label: 'Exercícios' },
        { path: '/coach/profile', icon: 'person', label: 'Perfil' },
    ];

    const links = role === 'admin' ? adminLinks : (role === 'coach' ? coachLinks : (role === 'student' ? studentLinks : []));

    if (!role || links.length === 0) return null;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 max-w-5xl mx-auto">
            {/* Glass Background Container */}
            <div className="absolute inset-0 top-4 glass rounded-t-3xl shadow-elevated"></div>

            {/* Content */}
            <div className="relative flex justify-between items-end pb-safe pt-6 px-4">
                {links.map((link) => {
                    const isActive = currentPath === link.path;
                    return (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`flex flex-col items-center gap-1 flex-1 relative group`}
                        >
                            {/* Active Indicator Glow */}
                            {isActive && (
                                <div className="absolute -top-10 w-12 h-12 bg-sky-500/20 rounded-full blur-xl animate-pulse"></div>
                            )}

                            <span className={`material-symbols-rounded text-[28px] transition-all duration-300 ${isActive
                                ? 'text-sky-500 scale-110 filled drop-shadow-sm'
                                : 'text-slate-400 dark:text-slate-500 group-hover:text-sky-400 group-active:scale-95'
                                }`}>
                                {link.icon}
                            </span>
                            <span className={`text-[10px] font-medium transition-all duration-300 ${isActive
                                ? 'text-sky-500 scale-105'
                                : 'text-slate-400 dark:text-slate-500'
                                }`}>
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