import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeContext';
import ThemeToggle from './components/ThemeToggle';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';

// Coach Pages
import CoachDashboard from './pages/coach/Dashboard';
import Library from './pages/coach/Library';
import Editor from './pages/coach/Editor';
import Students from './pages/coach/Students';
import StudentProfileView from './pages/coach/StudentProfileView';
import Plans from './pages/coach/Plans';
import SubscriptionDetails from './pages/coach/SubscriptionDetails';
import RoutineDetails from './pages/coach/RoutineDetails';
import CoachProfile from './pages/coach/Profile';
import InviteStudent from './pages/coach/InviteStudent';
import Feedbacks from './pages/coach/Feedbacks';
import Updates from './pages/coach/Updates';
import Exercises from './pages/coach/Exercises';

// Student Pages
import StudentDashboard from './pages/student/Dashboard';
import Selection from './pages/student/Selection';
import WorkoutExecution from './pages/student/WorkoutExecution';
import History from './pages/student/History';
import StudentProfile from './pages/student/Profile';

const LoadingScreen = () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
);

const RequireAuth: React.FC<{ children: React.ReactNode; allowedRole?: 'coach' | 'student' | 'admin' }> = ({ children, allowedRole }) => {
    const { session, role, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <LoadingScreen />;
    }

    if (!session) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Admin tem acesso a tudo (Coach e Student)
    if (allowedRole && role !== allowedRole && role !== 'admin') {
        // Redirecionar para o dashboard correto se tentar acessar rota não autorizada
        return <Navigate to={role === 'coach' || role === 'admin' ? '/coach/dashboard' : '/student/dashboard'} replace />;
    }

    return <>{children}</>;
};

const AuthenticatedRedirect = () => {
    const { session, role, loading } = useAuth();

    if (loading) return <LoadingScreen />;

    if (session) {
        return <Navigate to={role === 'coach' || role === 'admin' ? '/coach/dashboard' : '/student/dashboard'} replace />;
    }

    return <Navigate to="/login" replace />;
};

const AppContent = () => {
    return (
        <div className="max-w-md mx-auto bg-slate-50 dark:bg-slate-900 min-h-screen shadow-2xl overflow-hidden relative transition-colors duration-300">
            {/* Theme Toggle Global (Opcional, pode ser removido das páginas individuais se quiser um global) */}
            {/* <div className="absolute top-4 right-4 z-50 pointer-events-auto">
                <ThemeToggle />
            </div> */}

            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Root Redirect */}
                <Route path="/" element={<AuthenticatedRedirect />} />

                {/* Coach Routes */}
                <Route path="/coach/*" element={
                    <RequireAuth allowedRole="coach">
                        <Routes>
                            <Route path="dashboard" element={<CoachDashboard />} />
                            <Route path="library" element={<Library />} />
                            <Route path="editor" element={<Editor />} />
                            <Route path="students" element={<Students />} />
                            <Route path="student/:id" element={<StudentProfileView />} />
                            <Route path="plans" element={<Plans />} />
                            <Route path="subscription" element={<SubscriptionDetails />} />
                            <Route path="routine-details" element={<RoutineDetails />} />
                            <Route path="profile" element={<CoachProfile />} />
                            <Route path="invite" element={<InviteStudent />} />
                            <Route path="feedbacks" element={<Feedbacks />} />
                            <Route path="updates" element={<Updates />} />
                            <Route path="exercises" element={<Exercises />} />
                        </Routes>
                    </RequireAuth>
                } />

                {/* Student Routes */}
                <Route path="/student/*" element={
                    <RequireAuth allowedRole="student">
                        <Routes>
                            <Route path="dashboard" element={<StudentDashboard />} />
                            <Route path="selection" element={<Selection />} />
                            <Route path="workout/:id" element={<WorkoutExecution />} />
                            <Route path="history" element={<History />} />
                            <Route path="profile" element={<StudentProfile />} />
                        </Routes>
                    </RequireAuth>
                } />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}

const App = () => {
    return (
        <ThemeProvider>
            <AuthProvider>
                <HashRouter>
                    <AppContent />
                </HashRouter>
            </AuthProvider>
        </ThemeProvider>
    );
};

export default App;