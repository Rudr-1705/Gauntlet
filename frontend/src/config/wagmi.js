import { createConfig, http } from 'wagmi';
import { mainnet, sepolia, polygon, polygonAmoy } from 'wagmi/chains';
import { injected, metaMask, walletConnect } from 'wagmi/connectors';

// WalletConnect Project ID (you should get this from https://cloud.walletconnect.com/)
const projectId = 'YOUR_PROJECT_ID'; // Replace with actual project ID

export const config = createConfig({
  chains: [mainnet, sepolia, polygon, polygonAmoy],
  connectors: [
    injected(),
    metaMask({
      dappMetadata: {
        name: 'Gauntlet',
        description: 'AI-Powered Challenges with PYUSD Rewards',
        url: 'https://gauntlet.app',
        iconUrl: 'https://gauntlet.app/icon.png',
      },
    }),
    // Uncomment when you have a WalletConnect project ID
    // walletConnect({ projectId }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygon.id]: http(),
    [polygonAmoy.id]: http(),
  },
});
