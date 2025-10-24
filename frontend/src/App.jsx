import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './config/wagmi';
import { ThemeProvider } from './context/ThemeContext';
import { WalletProvider } from './context/WalletContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import CreateChallenge from './pages/CreateChallenge';
import MyChallenges from './pages/MyChallenges';
import MyParticipations from './pages/MyParticipations';
import Dashboard from './pages/Dashboard';
import JoinChallenge from './pages/JoinChallenge';
import SubmitAnswer from './pages/SubmitAnswer';

const queryClient = new QueryClient();

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <WalletProvider>
            <Router>
              <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
                <Navbar />
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/create" element={<CreateChallenge />} />
                  <Route path="/my-challenges" element={<MyChallenges />} />
                  <Route path="/my-participations" element={<MyParticipations />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/challenge/:id/join" element={<JoinChallenge />} />
                  <Route path="/challenge/:id/submit" element={<SubmitAnswer />} />
                </Routes>
              </div>
            </Router>
          </WalletProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
