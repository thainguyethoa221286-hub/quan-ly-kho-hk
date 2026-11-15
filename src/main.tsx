import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider, AuthGate } from './context/AuthContext';
import LoginScreen from './components/auth/LoginScreen';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AuthGate login={<LoginScreen />}>
        <App />
      </AuthGate>
    </AuthProvider>
  </StrictMode>,
);
