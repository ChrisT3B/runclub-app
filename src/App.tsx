import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './modules/auth/context/AuthContext';
import { AppContent } from './AppContent';
import { AuthContent } from './modules/auth/components/AuthContent';
import './styles/fonts.css';
import './index.css';

// ADD this QueryClient before the App function
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
          {/* Handle /auth path specifically for email verification */}
          <Route path="/auth" element={<AuthContent />} />
          
          {/* All other paths go to AppContent (which handles auth state) */}
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </Router>
    </AuthProvider>
    <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;