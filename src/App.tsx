import { AuthProvider } from './modules/auth/context/AuthContext';
import { AppContent } from './AppContent';
import './styles/fonts.css';
import './index.css'; // Make sure this imports your main CSS file

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;