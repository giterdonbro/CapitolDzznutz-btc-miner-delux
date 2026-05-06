import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { WalletConnectProvider } from './components/WalletConnectProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WalletConnectProvider>
      <App />
    </WalletConnectProvider>
  </StrictMode>,
);
