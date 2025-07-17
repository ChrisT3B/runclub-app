import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './modules/auth/context/AuthContext';
import { AppContent } from './AppContent';
import { AuthContent } from './modules/auth/components/AuthContent';
import './styles/fonts.css';
import './index.css';

function App() {
  return (
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
  );
}

export default App;