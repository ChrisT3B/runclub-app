import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './modules/auth/context/AuthContext';
import { AppContent } from './AppContent';
import { RunDetailsPage } from './modules/admin/components/RunDetailsPage';
import { ProtectedRoute } from './utils/ProtectedRoute';
import { EmailVerificationHandler } from './modules/auth/components/EmailVerificationHandler';
import { PWAInstallPrompt } from './shared/components/ui/PWAInstallPrompt';
import { SessionSecurityWrapper } from './modules/auth/components/SessionSecurityWrapper';
import './styles/fonts.css';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Handle email verification specifically */}
            <Route 
              path="/auth" 
              element={<EmailVerificationHandler />} 
            />
            
            {/* Handle shared run links */}
            <Route 
              path="/runs/:runId" 
              element={
                <ProtectedRoute redirectPath={window.location.pathname}>
                  <SessionSecurityWrapper>
                    <RunDetailsPage />
                  </SessionSecurityWrapper>
                </ProtectedRoute>
              } 
            />
            
            {/* All other paths go to AppContent */}
            <Route 
              path="/*" 
              element={
                <SessionSecurityWrapper>
                  <AppContent />
                </SessionSecurityWrapper>
              } 
            />
          </Routes>
        </Router>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
      <PWAInstallPrompt />
    </QueryClientProvider>
  );
}

export default App;

