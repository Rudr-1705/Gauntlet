import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Home, PlusCircle, Trophy, User, BarChart3, LogOut, Wallet, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import { useConnect } from 'wagmi';
import { useState } from 'react';

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { email, address, isConnected, disconnect, logout } = useWallet();
  const { connect, connectors } = useConnect();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout? This will disconnect your wallet and clear your email.')) {
      logout();
      setShowUserMenu(false);
      navigate('/');
    }
  };

  const handleDisconnectWallet = () => {
    if (confirm('Disconnect wallet? You can reconnect anytime.')) {
      disconnect();
      setShowUserMenu(false);
    }
  };

  const handleConnectWallet = async () => {
    if (!email) {
      navigate('/login');
      return;
    }
    const metamaskConnector = connectors.find(c => c.name === 'MetaMask' || c.name === 'Injected');
    if (metamaskConnector) {
      try {
        await connect({ connector: metamaskConnector });
      } catch (error) {
        console.error('Failed to connect wallet:', error);
      }
    }
  };

  const navItems = [
    { path: '/', label: 'Explore', icon: Home },
    { path: '/create', label: 'Create', icon: PlusCircle },
    { path: '/my-challenges', label: 'My Challenges', icon: Trophy },
    { path: '/my-participations', label: 'Participations', icon: User },
    { path: '/dashboard', label: 'Stats', icon: BarChart3 },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-700 shadow-lg"
    >
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-3 group"
            >
              <div className="relative">
                {/* Animated power glow effect */}
                <motion.div 
                  className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-blue-500 to-yellow-500 rounded-2xl blur-lg opacity-40 group-hover:opacity-70 transition-opacity"
                  animate={{
                    rotate: 360,
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                ></motion.div>
                
                {/* Infinity Gauntlet - Large Closed Fist */}
                <motion.div 
                  className="relative bg-gradient-to-br from-yellow-500 via-amber-600 to-yellow-800 p-3 rounded-2xl shadow-2xl border border-yellow-400/60"
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.3 }}
                >
                  <svg 
                    width="32" 
                    height="32" 
                    viewBox="0 0 60 60" 
                    fill="none"
                  >
                    {/* Gauntlet Wrist/Cuff - Bottom */}
                    <path 
                      d="M 20 50 L 20 55 Q 20 57 22 57 L 38 57 Q 40 57 40 55 L 40 50 Z" 
                      fill="url(#goldGrad)"
                      stroke="#92400e"
                      strokeWidth="1"
                    />
                    <rect x="20" y="52" width="20" height="2" fill="#78350f" opacity="0.3"/>
                    
                    {/* Main Fist Body - Large Closed Hand */}
                    <ellipse 
                      cx="30" 
                      cy="32" 
                      rx="14" 
                      ry="18" 
                      fill="url(#goldGrad)"
                      stroke="#92400e"
                      strokeWidth="1.2"
                    />
                    
                    {/* Top Knuckles Ridge - Curved top of fist */}
                    <path 
                      d="M 20 22 Q 22 18 25 17 Q 28 16 30 15 Q 32 16 35 17 Q 38 18 40 22 L 40 28 Q 40 30 38 30 L 22 30 Q 20 30 20 28 Z" 
                      fill="url(#goldDark)"
                      stroke="#92400e"
                      strokeWidth="1"
                    />
                    
                    {/* Thumb - Side bulge */}
                    <ellipse 
                      cx="16" 
                      cy="35" 
                      rx="4" 
                      ry="7" 
                      fill="url(#goldGrad)"
                      stroke="#92400e"
                      strokeWidth="0.8"
                      transform="rotate(-15 16 35)"
                    />
                    
                    {/* Knuckle separation lines */}
                    <path d="M 23 18 L 23 24" stroke="#78350f" strokeWidth="0.8" opacity="0.5"/>
                    <path d="M 28 16 L 28 23" stroke="#78350f" strokeWidth="0.8" opacity="0.5"/>
                    <path d="M 32 16 L 32 23" stroke="#78350f" strokeWidth="0.8" opacity="0.5"/>
                    <path d="M 37 18 L 37 24" stroke="#78350f" strokeWidth="0.8" opacity="0.5"/>
                    
                    {/* Palm/finger creases */}
                    <path d="M 24 38 Q 30 40 36 38" stroke="#78350f" strokeWidth="0.6" opacity="0.4"/>
                    <path d="M 22 42 Q 30 44 38 42" stroke="#78350f" strokeWidth="0.6" opacity="0.4"/>
                    
                    {/* ========== INFINITY STONES - Large and Visible ========== */}
                    
                    {/* Power Stone - Purple (Index knuckle) */}
                    <motion.circle 
                      cx="23" 
                      cy="19" 
                      r="3.5" 
                      fill="#a855f7"
                      stroke="#7c3aed"
                      strokeWidth="1.2"
                      filter="url(#stoneGlow)"
                      animate={{ 
                        opacity: [0.9, 1, 0.9],
                      }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0 }}
                    />
                    <circle cx="23" cy="19" r="1.3" fill="#c084fc" opacity="0.9"/>
                    <circle cx="22" cy="18" r="0.6" fill="#e9d5ff" opacity="0.7"/>
                    
                    {/* Space Stone - Blue (Middle knuckle - tallest) */}
                    <motion.circle 
                      cx="30" 
                      cy="16" 
                      r="3.8" 
                      fill="#3b82f6"
                      stroke="#2563eb"
                      strokeWidth="1.2"
                      filter="url(#stoneGlow)"
                      animate={{ 
                        opacity: [0.9, 1, 0.9],
                      }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                    />
                    <circle cx="30" cy="16" r="1.4" fill="#60a5fa" opacity="0.9"/>
                    <circle cx="29" cy="15" r="0.7" fill="#dbeafe" opacity="0.7"/>
                    
                    {/* Reality Stone - Red (Ring knuckle) */}
                    <motion.circle 
                      cx="37" 
                      cy="19" 
                      r="3.5" 
                      fill="#ef4444"
                      stroke="#dc2626"
                      strokeWidth="1.2"
                      filter="url(#stoneGlow)"
                      animate={{ 
                        opacity: [0.9, 1, 0.9],
                      }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                    />
                    <circle cx="37" cy="19" r="1.3" fill="#f87171" opacity="0.9"/>
                    <circle cx="36" cy="18" r="0.6" fill="#fecaca" opacity="0.7"/>
                    
                    {/* Soul Stone - Orange (Center of hand - largest) */}
                    <motion.circle 
                      cx="30" 
                      cy="32" 
                      r="4.5" 
                      fill="#f97316"
                      stroke="#ea580c"
                      strokeWidth="1.4"
                      filter="url(#stoneGlow)"
                      animate={{ 
                        opacity: [0.9, 1, 0.9],
                      }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0.9 }}
                    />
                    <circle cx="30" cy="32" r="1.6" fill="#fb923c" opacity="0.9"/>
                    <circle cx="29" cy="31" r="0.8" fill="#fed7aa" opacity="0.7"/>
                    
                    {/* Time Stone - Green (Thumb) */}
                    <motion.circle 
                      cx="16" 
                      cy="35" 
                      r="3" 
                      fill="#10b981"
                      stroke="#059669"
                      strokeWidth="1.1"
                      filter="url(#stoneGlow)"
                      animate={{ 
                        opacity: [0.9, 1, 0.9],
                      }}
                      transition={{ duration: 2, repeat: Infinity, delay: 1.2 }}
                    />
                    <circle cx="16" cy="35" r="1.1" fill="#34d399" opacity="0.9"/>
                    <circle cx="15.5" cy="34.5" r="0.5" fill="#d1fae5" opacity="0.7"/>
                    
                    {/* Mind Stone - Yellow (Pinky side - lower right) */}
                    <motion.circle 
                      cx="42" 
                      cy="28" 
                      r="2.8" 
                      fill="#facc15"
                      stroke="#eab308"
                      strokeWidth="1.1"
                      filter="url(#stoneGlow)"
                      animate={{ 
                        opacity: [0.9, 1, 0.9],
                      }}
                      transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
                    />
                    <circle cx="42" cy="28" r="1" fill="#fde047" opacity="0.9"/>
                    <circle cx="41.5" cy="27.5" r="0.5" fill="#fef9c3" opacity="0.7"/>
                    
                    {/* Gradients and Filters */}
                    <defs>
                      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fbbf24" />
                        <stop offset="50%" stopColor="#d97706" />
                        <stop offset="100%" stopColor="#b45309" />
                      </linearGradient>
                      <linearGradient id="goldDark" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#d97706" />
                        <stop offset="100%" stopColor="#92400e" />
                      </linearGradient>
                      <filter id="stoneGlow" x="-100%" y="-100%" width="300%" height="300%">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                  </svg>
                </motion.div>
              </div>
              <div className="flex flex-col">
                <motion.span 
                  className="text-2xl font-bold bg-gradient-to-r from-yellow-500 via-purple-500 to-blue-500 bg-clip-text text-transparent"
                  style={{ backgroundSize: "200% auto" }}
                  animate={{
                    backgroundPosition: ["0% center", "200% center", "0% center"],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                >
                  Gauntlet
                </motion.span>
                <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 tracking-wider">
                  ∞ POWERED
                </span>
              </div>
            </motion.div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link key={path} to={path}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`relative px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                    isActive(path)
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon size={20} />
                    <span>{label}</span>
                  </div>
                  {isActive(path) && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-primary-600"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.div>
              </Link>
            ))}
          </div>

          {/* Theme Toggle & User Status */}
          <div className="flex items-center space-x-3">
            {/* Theme Toggle Button */}
            <motion.button
              whileHover={{ scale: 1.1, rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-300"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="text-yellow-500" size={22} />
              ) : (
                <Moon className="text-gray-700" size={22} />
              )}
            </motion.button>

            {/* User Status: Email + Wallet */}
            {email ? (
              <div className="relative flex items-center space-x-2">
                {/* Email Display */}
                <span className="hidden md:inline text-sm text-gray-600 dark:text-gray-300 font-mono bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg">
                  {email.length > 20 ? `${email.slice(0, 10)}...${email.slice(-8)}` : email}
                </span>

                {/* Wallet Status */}
                {isConnected && address ? (
                  <div className="hidden md:flex items-center space-x-2 bg-green-100 dark:bg-green-900/30 px-3 py-2 rounded-lg cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    title="Click for options"
                  >
                    <Wallet className="text-green-600 dark:text-green-400" size={16} />
                    <span className="text-sm font-mono text-green-700 dark:text-green-300">
                      {`${address.slice(0, 6)}...${address.slice(-4)}`}
                    </span>
                  </div>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleConnectWallet}
                    className="hidden md:flex items-center space-x-2 bg-yellow-100 dark:bg-yellow-900/30 px-3 py-2 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
                    title="Connect Wallet"
                  >
                    <Wallet className="text-yellow-600 dark:text-yellow-400" size={16} />
                    <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">
                      Connect
                    </span>
                  </motion.button>
                )}

                {/* User Menu Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  title="User Menu"
                >
                  <User size={20} className="text-gray-700 dark:text-gray-300" />
                </motion.button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {showUserMenu && (
                    <>
                      {/* Backdrop */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowUserMenu(false)}
                      />
                      
                      {/* Menu */}
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 top-12 z-50 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                      >
                        {/* User Info */}
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Logged in as</p>
                          <p className="text-sm font-mono text-gray-900 dark:text-gray-100 break-all">{email}</p>
                          {isConnected && address && (
                            <>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 mb-1">Wallet</p>
                              <p className="text-sm font-mono text-green-600 dark:text-green-400 break-all">{address}</p>
                            </>
                          )}
                        </div>

                        {/* Menu Options */}
                        <div className="py-2">
                          {isConnected && address && (
                            <button
                              onClick={handleDisconnectWallet}
                              className="w-full px-4 py-2 text-left text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors flex items-center space-x-2"
                            >
                              <X size={16} />
                              <span>Disconnect Wallet</span>
                            </button>
                          )}
                          
                          <button
                            onClick={handleLogout}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center space-x-2"
                          >
                            <LogOut size={16} />
                            <span>Logout (Clear All)</span>
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-gradient px-6 py-2 text-white font-medium rounded-lg shadow-md hover:shadow-lg"
                onClick={() => navigate('/login')}
              >
                Get Started
              </motion.button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden mt-4 flex justify-around border-t border-gray-200 dark:border-gray-700 pt-4">
          {navItems.map(({ path, icon: Icon }) => (
            <Link key={path} to={path}>
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={`p-2 rounded-lg ${
                  isActive(path)
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-gray-800'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                <Icon size={24} />
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
