import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function AuthLoadingScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
      <p>{message}</p>
    </div>
  );
}

interface AuthGuardProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AuthLoadingScreen message="Checking your session..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

export function GuestRoute({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLoadingScreen message="Loading sign-in..." />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
