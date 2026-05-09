import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { WalletConnectProvider } from './components/WalletConnectProvider';
import { MetaMaskProvider } from '@metamask/sdk-react';
import { ErrorBoundary } from './components/ErrorBoundary';

console.log('[AJI_INIT] main.tsx starting...');
try {
  const container = document.getElementById('root');
  if (!container) throw new Error('Root container not found');
  
  console.log('[AJI_INIT] Rendering bridge to DOM...');
  createRoot(container).render(
    <ErrorBoundary>
      <MetaMaskProvider
        debug={false}
        sdkOptions={{
          dappMetadata: {
            name: "CapitolDbro Protocol",
            url: window.location.href,
          }
        }}
      >
        <WalletConnectProvider>
          <App />
        </WalletConnectProvider>
      </MetaMaskProvider>
    </ErrorBoundary>
  );
  console.log('[AJI_INIT] Render loop initialized.');
} catch(e: any) {
  console.error('[AJI_CRITICAL] Startup sequence failure:', e);
  const errDiv = document.createElement('div');
  errDiv.style.position = 'fixed';
  errDiv.style.background = 'red';
  errDiv.style.color = 'white';
  errDiv.style.zIndex = '99999999';
  errDiv.innerHTML = 'CRASH: ' + e.message + '<br>' + e.stack;
  document.body.appendChild(errDiv);
}

