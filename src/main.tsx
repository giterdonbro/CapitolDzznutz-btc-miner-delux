import './safe-json';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { WalletConnectProvider } from './components/WalletConnectProvider';
import { MetaMaskProvider } from '@metamask/sdk-react';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MetaMaskProvider
      debug={false}
      sdkOptions={{
        dappMetadata: {
          name: "CapitolDbro Protocol",
          url: window.location.href,
        }
      }}
    >
      <PayPalScriptProvider options={{ clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || "test", currency: "USD" }}>
        <WalletConnectProvider>
          <App />
        </WalletConnectProvider>
      </PayPalScriptProvider>
    </MetaMaskProvider>
  </StrictMode>,
);
