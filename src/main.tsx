import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { VisualProvider } from './context/VisualContext';
import { LanguageProvider } from './context/LanguageContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <VisualProvider>
        <App />
      </VisualProvider>
    </LanguageProvider>
  </StrictMode>,
);
