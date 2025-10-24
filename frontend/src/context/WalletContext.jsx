import { createContext, useContext, useState, useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';

const WalletContext = createContext();

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }) => {
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const [email, setEmail] = useState('');
  useEffect(() => {
    const savedEmail = localStorage.getItem('creatorEmail');
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);
  const saveEmail = (newEmail) => {
    setEmail(newEmail);
    if (newEmail) {
      localStorage.setItem('creatorEmail', newEmail);
    } else {
      localStorage.removeItem('creatorEmail');
    }
  };

  const logout = () => {
    disconnect();
    setEmail('');
    localStorage.removeItem('creatorEmail');
  };

  const isFullyAuthenticated = isConnected && !!email;
  const hasEmail = !!email;

  const value = {
    address,
    isConnected,
    chain,
    disconnect,

    email,
    saveEmail,
    hasEmail,
    isFullyAuthenticated,
    logout,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
