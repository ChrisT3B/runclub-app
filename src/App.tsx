import { AuthProvider } from './modules/auth/context/AuthContext';
import { AppContent } from './AppContent';
import './styles/fonts.css';
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;