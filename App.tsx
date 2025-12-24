import React, { useEffect, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoadingScreen from './components/shared/LoadingScreen';
import { Toaster } from 'react-hot-toast';

// Auth Pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const WaitingApproval = lazy(() => import('./pages/WaitingApproval'));
const SubscriptionExpired = lazy(() => import('./pages/SubscriptionExpired'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));

// Coach Pages
const CoachDashboard = lazy(() => import('./pages/coach/Dashboard'));
const Library = lazy(() => import('./pages/coach/Library'));
const Editor = lazy(() => import('./pages/coach/Editor'));
const Students = lazy(() => import('./pages/coach/Students'));
const StudentProfileView = lazy(() => import('./pages/coach/StudentProfileView'));
const Plans = lazy(() => import('./pages/coach/Plans'));
const SubscriptionDetails = lazy(() => import('./pages/coach/SubscriptionDetails'));
const RoutineDetails = lazy(() => import('./pages/coach/RoutineDetails'));
const CoachProfile = lazy(() => import('./pages/coach/Profile'));
const InviteStudent = lazy(() => import('./pages/coach/InviteStudent'));
const Feedbacks = lazy(() => import('./pages/coach/Feedbacks'));
const Updates = lazy(() => import('./pages/coach/Updates'));
const Exercises = lazy(() => import('./pages/coach/Exercises'));

// Student Pages
const StudentDashboard = lazy(() => import('./pages/student/Dashboard'));
const Selection = lazy(() => import('./pages/student/Selection'));
const WorkoutExecution = lazy(() => import('./pages/student/WorkoutExecution'));
const History = lazy(() => import('./pages/student/History'));
const StudentProfile = lazy(() => import('./pages/student/Profile'));

const RequireAuth: React.FC<{ children: React.ReactNode; allowedRole?: 'coach' | 'student' | 'admin'; skipExpirationCheck?: boolean }> = ({ children, allowedRole, skipExpirationCheck }) => {
    const { session, role, loading, status, expiresAt, coachExpiresAt } = useAuth();
    const location = useLocation();

    if (loading) {
        return <LoadingScreen />;
    }

    if (!session) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (status === 'pending' && role !== 'admin') {
        return <Navigate to="/waiting-approval" replace />;
    }

    if (!skipExpirationCheck && expiresAt && role !== 'admin') {
        const graceDate = new Date(expiresAt);
        graceDate.setDate(graceDate.getDate() + 1); // 1 day grace period
        if (new Date() > graceDate) {
            return <Navigate to="/subscription-expired" replace />;
        }
    }

    // Cascading Lock: Check if Coach is expired
    if (!skipExpirationCheck && role === 'student' && coachExpiresAt) {
        const coachGraceDate = new Date(coachExpiresAt);
        coachGraceDate.setDate(coachGraceDate.getDate() + 1);
        if (new Date() > coachGraceDate) {
            return <Navigate to="/subscription-expired" replace state={{ coachExpired: true }} />;
        }
    }

    // Admin tem acesso a tudo (Coach e Student)
    if (allowedRole && role !== allowedRole && role !== 'admin') {
        // Redirecionar para o dashboard correto se tentar acessar rota não autorizada
        return <Navigate to={role === 'coach' ? '/coach/dashboard' : '/student/dashboard'} replace />;
    }

    return <>{children}</>;
};

const AuthenticatedRedirect = () => {
    const { session, role, status, expiresAt, coachExpiresAt, loading } = useAuth();

    if (loading) return <LoadingScreen />;

    if (session) {
        if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
        if (status === 'pending') return <Navigate to="/waiting-approval" replace />;

        if (expiresAt) {
            const graceDate = new Date(expiresAt);
            graceDate.setDate(graceDate.getDate() + 1);
            if (new Date() > graceDate) return <Navigate to="/subscription-expired" replace />;
        }

        if (role === 'student' && coachExpiresAt) {
            const coachGraceDate = new Date(coachExpiresAt);
            coachGraceDate.setDate(coachGraceDate.getDate() + 1);
            if (new Date() > coachGraceDate) return <Navigate to="/subscription-expired" replace state={{ coachExpired: true }} />;
        }

        return <Navigate to={role === 'coach' ? '/coach/dashboard' : '/student/dashboard'} replace />;
    }

    return <Navigate to="/login" replace />;
};

const AppContent = () => {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/waiting-approval" element={
                    <RequireAuth>
                        <WaitingApproval />
                    </RequireAuth>
                } />
                <Route path="/subscription-expired" element={
                    <RequireAuth skipExpirationCheck>
                        <SubscriptionExpired />
                    </RequireAuth>
                } />

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

                {/* Admin Routes */}
                <Route path="/admin/*" element={
                    <RequireAuth allowedRole="admin">
                        <Routes>
                            <Route path="dashboard" element={<AdminDashboard />} />
                        </Routes>
                    </RequireAuth>
                } />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
    );
}

const App = () => {
    return (
        <ThemeProvider>
            <AuthProvider>
                <HashRouter>
                    <Toaster position="top-right" />
                    <AppContent />
                </HashRouter>
            </AuthProvider>
        </ThemeProvider>
    );
};

export default App;