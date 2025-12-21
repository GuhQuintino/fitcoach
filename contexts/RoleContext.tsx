import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Role = 'coach' | 'student' | null;

interface RoleContextType {
    role: Role;
    setRole: (role: Role) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [role, setRoleState] = useState<Role>(() => {
        const savedRole = localStorage.getItem('userRole');
        return (savedRole as Role) || null;
    });

    const setRole = (newRole: Role) => {
        setRoleState(newRole);
        if (newRole) {
            localStorage.setItem('userRole', newRole);
        } else {
            localStorage.removeItem('userRole');
        }
    };

    return (
        <RoleContext.Provider value={{ role, setRole }}>
            {children}
        </RoleContext.Provider>
    );
};

export const useRole = () => {
    const context = useContext(RoleContext);
    if (!context) {
        throw new Error('useRole must be used within a RoleProvider');
    }
    return context;
};
