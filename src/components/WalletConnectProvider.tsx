import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum, bsc, polygon, optimism } from '@reown/appkit/networks'
import type { AppKitNetwork } from '@reown/appkit/networks'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import React from 'react'

// 1. Get projectId at https://cloud.reown.com
const projectId = 'b5ca08745d4e138a2e7c4f1c1f510ad6' // Placeholder for prototype

// 2. Create a metadata object
const metadata = {
  name: 'CapitolDbro Protocol',
  description: 'AI-Powered Mining Dashboard',
  url: window.location.origin,
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

// 3. Create Wagmi Adapter
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet, arbitrum, bsc, polygon, optimism]
const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false
})

// 4. Create modal
createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  features: {
    analytics: true
  }
})

const queryClient = new QueryClient()

export function WalletConnectProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
