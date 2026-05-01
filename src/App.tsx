import React, { useState, useEffect, useRef, useMemo } from 'react';
 
 declare global {
   interface Window {
     ethereum?: any;
   }
 }
import { 
  Activity, 
  Cpu, 
  Database, 
  Download, 
  ExternalLink, 
  HardDrive, 
  Layers, 
  LayoutDashboard, 
  Lock, 
  Plus, 
  Settings, 
  ShieldCheck, 
  TrendingUp, 
  Wallet,
  Zap,
  Power,
  RefreshCw,
  Terminal as TerminalIcon,
  ChevronRight,
  Monitor,
  DollarSign,
  Share2,
  Globe,
  Github,
  Brain,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { cn } from './lib/utils';
import { auth, db, signInWithGoogle, logout } from './lib/firebase';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';

// Types
interface HardwareUnit {
  id: string;
  name: string;
  hashRate: number; // TH/s
  powerUsage: number; // Watts
  price: number; // USD
  count: number;
  icon: React.ReactNode;
}

interface MiningLog {
  time: string;
  hashRate: number;
}

export default function App() {
  // Auth State
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // State
  const [balance, setBalance] = useState(0.0004278);
  const [realBalance, setRealBalance] = useState<number | null>(null);
  const [btcPrice, setBtcPrice] = useState(65432.10);
  const [useMainnet, setUseMainnet] = useState(false);
  const [isMining, setIsMining] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [hardware, setHardware] = useState<HardwareUnit[]>([
    { id: '1', name: 'Elite Cluster Alpha', hashRate: 110, powerUsage: 3250, price: 1250, count: 0, icon: <Cpu className="w-5 h-5" /> },
    { id: '2', name: 'High-Velocity Node', hashRate: 288, powerUsage: 4344, price: 2900, count: 0, icon: <Zap className="w-5 h-5" /> },
    { id: '3', name: 'Quantum Hash-Vault', hashRate: 980, powerUsage: 8420, price: 9500, count: 0, icon: <Database className="w-5 h-5" /> },
    { id: '4', name: 'Proprietary Core', hashRate: 2500, powerUsage: 15000, price: 24500, count: 0, icon: <ShieldCheck className="w-5 h-5" /> },
  ]);
  const [hardwareCondition, setHardwareCondition] = useState<Record<string, number>>({
    '1': 100, '2': 100, '3': 100, '4': 100
  });
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isWalletLoading, setIsWalletLoading] = useState(false);
  const [logs, setLogs] = useState<MiningLog[]>([]);
  const [autoReinvest, setAutoReinvest] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'hardware' | 'wallet' | 'settings' | 'marketing' | 'network' | 'intelligence'>('dashboard');
  const [intelligenceData, setIntelligenceData] = useState<{
    history: { time: string, hashRate: number, profit: number }[],
    lifeExpectancy: Record<string, number>,
    projectedYield: number
  }>({
    history: Array.from({ length: 24 }, (_, i) => ({
      time: `${i}:00`,
      hashRate: 0,
      profit: 0
    })),
    lifeExpectancy: { '1': 365, '2': 540, '3': 720, '4': 1080 },
    projectedYield: 0
  });
  const [walletAddress, setWalletAddress] = useState('');
  const [metamaskAddress, setMetamaskAddress] = useState<string | null>(null);
  const [poolFee, setPoolFee] = useState(1.5); // Proprietary fee 1.5%
  const [ownerTreasury, setOwnerTreasury] = useState(0.005421); // Owner's accumulated fees
  const [internalWalletBalance, setInternalWalletBalance] = useState(0); // Miner's specific e-wallet
  const [lastInternalSync, setLastInternalSync] = useState<number>(Date.now());
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawType, setWithdrawType] = useState<'BTC' | 'PayPal'>('BTC');
  const [payoutEmail, setPayoutEmail] = useState('Chris.peterson1717@CapitolDbro.org');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);

  // Voice Engine
  const speak = (text: string) => {
    if (!isVoiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 0.8; // Deeper, more "proprietary" tone
    window.speechSynthesis.speak(utterance);
  };

  // MetaMask Integration
  const connectMetaMask = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        setIsWalletLoading(true);
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setMetamaskAddress(accounts[0]);
        notify("MetaMask Identity Linked", "success");
      } catch (err) {
        notify("Connection Refused", "alert");
      } finally {
        setIsWalletLoading(false);
      }
    } else {
      window.open('https://metamask.io/download/', '_blank');
      notify("MetaMask Not Detected", "info");
    }
  };

  // Real Network Stats
  const [networkStats, setNetworkStats] = useState({
    difficulty: '83.45T',
    blockHeight: 840123,
    hashrateGlobal: '620 EH/s',
    nextAdjustment: '12d 4h'
  });

  // Advanced Autonomous Settings
  const [overclock, setOverclock] = useState(0); 
  const [selectedPool, setSelectedPool] = useState('CapitolDbro Proprietary');
  const [notifications, setNotifications] = useState<{id: string, msg: string, type: 'success' | 'alert' | 'info'}[]>([]);
  const [isAiAutonomous, setIsAiAutonomous] = useState(false);
  const [protocolLevel, setProtocolLevel] = useState(1.0);
  const [efficiencyRating, setEfficiencyRating] = useState(99.2);

  // Auth & Sync Engine
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthLoading(false);
      if (firebaseUser) {
        notify(`Identity Verified: ${firebaseUser.email}`, 'success');
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync state from Firestore
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.balance !== undefined) setBalance(data.balance);
        if (data.ownerTreasury !== undefined) setOwnerTreasury(data.ownerTreasury);
        if (data.payoutEmail !== undefined) setPayoutEmail(data.payoutEmail);
        if (data.walletAddress !== undefined) setWalletAddress(data.walletAddress);
        if (data.isAiAutonomous !== undefined) setIsAiAutonomous(data.isAiAutonomous);
        if (data.autoReinvest !== undefined) setAutoReinvest(data.autoReinvest);
        if (data.protocolLevel !== undefined) setProtocolLevel(data.protocolLevel);
        if (data.internalWalletBalance !== undefined) setInternalWalletBalance(data.internalWalletBalance);
        if (data.hwState !== undefined) {
           const newHw = hardware.map(item => {
             const saved = data.hwState.find((s: any) => s.id === item.id);
             return saved ? { ...item, count: saved.count } : item;
           });
           setHardware(newHw);
           const newCondition: Record<string, number> = {};
           data.hwState.forEach((s: any) => {
             newCondition[s.id] = s.health ?? 100;
           });
           setHardwareCondition(newCondition);
        }
      } else {
        // Initialize user document if it doesn't exist
        setDoc(userDocRef, {
          email: user.email,
          balance: 0.0004278,
          ownerTreasury: 0.005421,
          payoutEmail: 'chris.peterson1717.akutabuv@gmail.com',
          walletAddress: '',
          isAiAutonomous: false,
          autoReinvest: false,
          protocolLevel: 1.0,
          internalWalletBalance: 0,
          hwState: hardware.map(h => ({ id: h.id, count: 0, health: 100 })),
          updatedAt: serverTimestamp()
        });
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Sync state TO Firestore (Throttled update)
  const syncTimer = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!user || isAuthLoading) return;

    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      const userDocRef = doc(db, 'users', user.uid);
      setDoc(userDocRef, {
        email: user.email,
        balance,
        internalWalletBalance,
        ownerTreasury,
        payoutEmail,
        walletAddress,
        isAiAutonomous,
        autoReinvest,
        protocolLevel,
        hwState: hardware.map(h => ({ id: h.id, count: h.count, health: hardwareCondition[h.id] })),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }, 2000); // Sync every 2 seconds after changes

    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [balance, internalWalletBalance, ownerTreasury, hardware, hardwareCondition, user, isAiAutonomous, autoReinvest, protocolLevel]);

  // Dedicated Internal Wallet Sync Interval (Every 15 minutes)
  useEffect(() => {
    if (!isMining || !user) return;
    
    const INTERNAL_SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes
    
    const syncInternalWallet = () => {
      setInternalWalletBalance(prev => prev + balance);
      setBalance(0);
      setLastInternalSync(Date.now());
      notify("Internal E-Wallet synchronized. Yields locked for safety.", "success");
    };

    const interval = setInterval(syncInternalWallet, INTERNAL_SYNC_INTERVAL);
    return () => clearInterval(interval);
  }, [isMining, user, balance]);


  // Fetch BTC Network Stats
  useEffect(() => {
    const fetchNetwork = async () => {
      try {
        const res = await fetch('/api/btc/difficulty');
        const diff = await res.text();
        const heightRes = await fetch('/api/btc/blockcount');
        const height = await heightRes.text();
        
        setNetworkStats(prev => ({
          ...prev,
          difficulty: (parseFloat(diff) / 1e12).toFixed(2) + 'T',
          blockHeight: parseInt(height)
        }));
      } catch (e) {
        console.error("Network fetch error:", e);
      }
    };
    fetchNetwork();
    const interval = setInterval(fetchNetwork, 300000); // 5 mins
    return () => clearInterval(interval);
  }, []);

  // Fetch Real Balance
  const fetchRealBalance = async (address: string) => {
    if (!address) return;
    setIsWalletLoading(true);
    try {
      const res = await fetch(`/api/btc/address/${address}`);
      const data = await res.json();
      setRealBalance(data.final_balance / 100000000);
      setUseMainnet(true);
      notify("Mainnet wallet synchronized", "success");
    } catch (e) {
      console.error("Wallet fetch error:", e);
      notify("Blockchain link failed", "alert");
    } finally {
      setIsWalletLoading(false);
    }
  };

  // AI Autonomous Strategy Engine
  const runAiOptimization = async () => {
    if (!isAiAutonomous && activeTab !== 'settings') return;
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `As a Bitcoin mining AI, analyze these metrics: Difficulty: ${networkStats.difficulty}, Hashrate: ${effectiveHashRate.toFixed(2)} TH/s, Overclock: ${overclock}%, Pool: ${selectedPool}. 
      Suggest ONE technical "Self-Upgrade" or configuration change. 
      Format: "UPGRADING [Component]: [Short Technical Reason]". Under 15 words.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const decision = response.text || "OPTIMIZING: Stratum v2 multiplexing enabled for latency reduction.";
      setAiTip(decision);
      
      if (isAiAutonomous) {
        setProtocolLevel(l => l + 0.01);
        setEfficiencyRating(e => Math.min(100, e + 0.1));
        if (Math.random() > 0.7) {
          notify("AI: Executing Dynamic Overclock Adjustment", "success");
        }
      }
    } catch (error) {
      setAiTip("MONITORING: Global difficulty adjustment detected. Re-routing hashes.");
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    const aiInterval = setInterval(runAiOptimization, 60000); // AI thinks every minute
    return () => clearInterval(aiInterval);
  }, [isAiAutonomous, networkStats, overclock, selectedPool]);
 
  // Notification Helper
  const notify = (msg: string, type: 'success' | 'alert' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, msg, type }]);
    
    // Voice notification for success/alerts
    if (type === 'success' || type === 'alert') {
      speak(msg);
    }

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Derived Values
  const baseHashRate = useMemo(() => {
    return hardware.reduce((acc, unit) => acc + (unit.hashRate * unit.count), 0);
  }, [hardware]);

  const effectiveHashRate = useMemo(() => {
    const boost = 1 + (overclock / 100);
    // Reduction based on average condition
    const avgCondition = (Object.values(hardwareCondition) as number[]).reduce((a: number, b: number) => a + b, 0) / 4 / 100;
    return baseHashRate * boost * (0.5 + 0.5 * avgCondition);
  }, [baseHashRate, overclock, hardwareCondition]);

  const totalPower = useMemo(() => {
    const overclockMultiplier = 1 + (overclock / 50); // Power scales faster with overclocking
    return Math.round(hardware.reduce((acc, unit) => acc + (unit.powerUsage * unit.count), 0) * overclockMultiplier);
  }, [hardware, overclock]);

  // Simulation Loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isMining) {
      interval = setInterval(() => {
        const yieldPerSecond = (effectiveHashRate / 110) * 0.000000001;
        
        // Monetization Logic: 1.5% of every share goes to the owner's treasury
        const protocolCut = yieldPerSecond * (poolFee / 100);
        const userCut = yieldPerSecond - protocolCut;
        
        setBalance(prev => prev + userCut);
        setOwnerTreasury(prev => prev + protocolCut);
        
        // Random "Share Accepted" event
        if (Math.random() > 0.95) {
          notify(`Cluster share accepted by ${selectedPool}`, 'success');
        }

        // Hardware Degradation
        if (overclock > 0 || Math.random() > 0.98) {
          setHardwareCondition(prev => {
            const next = { ...prev };
            const degRate = 0.01 * (1 + overclock / 10);
            Object.keys(next).forEach(key => {
              if (hardware.find(h => h.id === key)?.count ?? 0 > 0) {
                next[key] = Math.max(0, next[key] - degRate);
              }
            });
            return next;
          });
        }
        
        setLogs(prev => {
          const newLog = {
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            hashRate: effectiveHashRate + (Math.random() * 2 - 1) * (effectiveHashRate * 0.02)
          };
          const next = [...prev, newLog];
          return next.slice(-20);
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isMining, effectiveHashRate, overclock, selectedPool, hardware]);

  // Intelligence Data Accumulator
  useEffect(() => {
    if (!isMining) return;
    
    const interval = setInterval(() => {
      setIntelligenceData(prev => {
        const now = new Date();
        const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        // Update history
        const newHistory = [...prev.history.slice(1), {
          time: timeStr,
          hashRate: effectiveHashRate,
          profit: (effectiveHashRate / 110) * 0.000001 * btcPrice // Simulated profit in USD
        }];

        // Predictive health adjustment
        const newLife = { ...prev.lifeExpectancy };
        hardware.forEach(h => {
          if (h.count > 0) {
            newLife[h.id] = Math.max(0, newLife[h.id] - (0.01 * (overclock / 50 + 1)));
          }
        });

        return {
          ...prev,
          history: newHistory,
          lifeExpectancy: newLife,
          projectedYield: (effectiveHashRate / 110) * 0.000001 * 30 // 30-day projection in BTC
        };
      });
    }, 10000); // Sample every 10s for demo responsiveness

    return () => clearInterval(interval);
  }, [isMining, effectiveHashRate, btcPrice, overclock, hardware]);

  // Handlers
  const toggleMining = () => {
    setIsMining(!isMining);
    const msg = isMining ? "Miner Disconnected" : "Protocol Initialized. Connection established to CapitolD bro point org clusters.";
    notify(msg, isMining ? "alert" : "success");
    if (!isMining && logs.length === 0) {
      setLogs([{ time: new Date().toLocaleTimeString(), hashRate: effectiveHashRate }]);
    }
  };

  const buyHardware = (id: string) => {
    const h = hardware.find(i => i.id === id);
    if (!h) return;
    setHardware(prev => prev.map(item => 
      item.id === id ? { ...item, count: item.count + 1 } : item
    ));
    notify(`Integrated ${h.name}`, "info");
    setIsUpdating(true);
    setTimeout(() => setIsUpdating(false), 500);
  };

  const generateAiTip = async () => {
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `As a Bitcoin mining expert, give a short, technical, and motivating tip for someone with a hash rate of ${effectiveHashRate.toFixed(2)} TH/s and a balance of ${balance.toFixed(8)} BTC. Mention the mining pool ${selectedPool}. Keep it under 20 words.`,
      });
      setAiTip(response.text || "Optimize your stratum connection for lower latency shares.");
    } catch (error) {
      setAiTip("Global hash power is rising. Monitor your block difficulty closely.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const repairHardware = (id: string) => {
    const cost = 0.0001; // Simulation cost
    if (balance >= cost) {
      setBalance(b => b - cost);
      setHardwareCondition(prev => ({ ...prev, [id]: 100 }));
      notify(`Repair successful: Unit ${id}`, 'success');
    } else {
      notify("Insufficient funds for repair", "alert");
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      generateAiTip();
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen flex bg-[#0A0A0A] overflow-hidden selection:bg-bitcoin selection:text-black">
      {/* Withdrawal Modal */}
      <AnimatePresence>
        {showWithdrawModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWithdrawModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl p-8 relative z-10 shadow-2xl"
            >
              <h3 className="text-2xl font-bold mb-2">Initialize Withdrawal</h3>
              <p className="text-zinc-500 text-sm mb-8">Secure routing to proprietary payment rails.</p>
              
              <div className="space-y-6 mb-8">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest mb-1 block">Current Available Yield</span>
                  <p className="text-2xl font-bold font-mono text-bitcoin">{(withdrawType === 'PayPal' ? ownerTreasury : balance).toFixed(8)} BTC</p>
                  <p className="text-xs text-zinc-400 mt-1">≈ ${((withdrawType === 'PayPal' ? ownerTreasury : balance) * btcPrice).toLocaleString()} USD</p>
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-mono tracking-widest mb-2">Destination Method</label>
                  <div className="p-4 bg-black border border-bitcoin/30 rounded-2xl flex items-center gap-4">
                    {withdrawType === 'PayPal' ? (
                      <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" className="w-6 h-6" alt="PayPal" referrerPolicy="no-referrer" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-bitcoin/20 rounded-lg flex items-center justify-center text-bitcoin">
                        <Wallet size={20} />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold">{withdrawType === 'PayPal' ? 'PayPal Instant Transfer' : 'BTC Direct Payout'}</p>
                      <p className="text-xs text-zinc-500">{withdrawType === 'PayPal' ? payoutEmail : (walletAddress || 'No Address Linked')}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 py-4 bg-zinc-800 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-700 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    notify("Withdrawal Batch Dispatched", "success");
                    if(withdrawType === 'PayPal') setOwnerTreasury(0);
                    else setBalance(0);
                    setShowWithdrawModal(false);
                  }}
                  className="flex-1 py-4 bg-bitcoin text-black rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Authorize Payout
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notifications */}
      <div className="fixed top-24 right-8 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className={cn(
                "px-4 py-3 rounded-xl border flex items-center gap-3 backdrop-blur-md shadow-2xl min-w-[240px]",
                n.type === 'success' ? "bg-green-500/10 border-green-500/30 text-green-400" :
                n.type === 'alert' ? "bg-red-500/10 border-red-500/30 text-red-500" :
                "bg-zinc-800/80 border-white/10 text-zinc-300"
              )}
            >
              {n.type === 'success' ? <ShieldCheck size={16} /> : n.type === 'alert' ? <Power size={16} /> : <Activity size={16} />}
              <span className="text-xs font-medium">{n.msg}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 flex flex-col pt-8 bg-[#0D0D0D] z-10">
        <div className="px-6 mb-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-bitcoin rounded-xl flex items-center justify-center text-black shadow-[0_0_15px_rgba(247,147,26,0.3)]">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">CapitolDbro<span className="text-bitcoin">.org</span></h1>
            <h2 className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">CapitolDbro Protocol v4.2</h2>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <SidebarItem 
            icon={<LayoutDashboard size={18} />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <SidebarItem 
            icon={<Cpu size={18} />} 
            label="Revenue Clusters" 
            active={activeTab === 'hardware'} 
            onClick={() => setActiveTab('hardware')} 
          />
          <SidebarItem 
            icon={<Wallet size={18} />} 
            label="Wallet Hub" 
            active={activeTab === 'wallet'} 
            onClick={() => setActiveTab('wallet')} 
          />
          <SidebarItem 
            icon={<Monitor size={18} />} 
            label="Integrations Hub" 
            active={activeTab === 'network'} 
            onClick={() => setActiveTab('network')} 
          />
          <SidebarItem 
            icon={<TrendingUp size={18} />} 
            label="Predictive AI" 
            active={activeTab === 'intelligence'} 
            onClick={() => setActiveTab('intelligence')} 
          />
          <SidebarItem 
            icon={<Share2 size={18} />} 
            label="Marketing Hub" 
            active={activeTab === 'marketing'} 
            onClick={() => setActiveTab('marketing')} 
          />
          <SidebarItem 
            icon={<Settings size={18} />} 
            label="Settings" 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
          />

          <div className="mt-auto pt-8 border-t border-white/5">
             <div className="flex items-center gap-3 px-4 py-3 bg-bitcoin/10 rounded-2xl border border-bitcoin/20">
                <div className="w-8 h-8 rounded-full bg-bitcoin flex items-center justify-center text-xs font-bold text-black">CP</div>
                <div className="overflow-hidden">
                   <p className="text-[10px] font-bold text-bitcoin uppercase tracking-widest leading-none">Proprietary Owner</p>
                   <p className="text-[9px] text-zinc-500 truncate mt-1">{payoutEmail}</p>
                </div>
             </div>
          </div>
        </nav>

        <div className="p-6 border-t border-white/5">
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest">Network Status</span>
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
            </div>
            <p className="text-xs text-zinc-400 font-mono">Synced: Block #840,123</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        {/* Top Gradient */}
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-bitcoin/5 to-transparent pointer-events-none" />

        <header className="h-20 border-b border-white/10 flex items-center justify-between px-8 relative z-10 backdrop-blur-sm bg-black/40">
          <div className="flex flex-col">
            <h2 className="text-sm text-zinc-500 font-mono uppercase tracking-[0.2em]">East Coast HQ</h2>
            <p className="text-base font-semibold">Asheville, NC · Node-01</p>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
               <div className="flex items-center gap-3 pr-4 border-r border-white/10">
                  <div className="text-right hidden sm:block">
                     <p className="text-[10px] font-bold text-bitcoin uppercase tracking-widest leading-none">Authenticated</p>
                     <p className="text-[9px] text-zinc-500 truncate mt-1">{user.email}</p>
                  </div>
                  <button 
                    onClick={logout}
                    className="p-2 bg-zinc-900 rounded-lg border border-white/5 text-zinc-500 hover:text-white transition-colors"
                  >
                    <Power size={18} />
                  </button>
               </div>
            ) : (
               <button 
                onClick={signInWithGoogle}
                className="px-4 py-2 bg-bitcoin/20 text-bitcoin border border-bitcoin/30 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-bitcoin hover:text-black transition-all"
               >
                 Cloud Login
               </button>
            )}

            <button 
              onClick={toggleMining}
              className={cn(
                "px-6 py-2 rounded-full font-semibold transition-all flex items-center gap-2 text-sm",
                isMining 
                  ? "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20" 
                  : "bg-bitcoin text-black hover:scale-105 active:scale-95 shadow-[0_4px_20px_rgba(247,147,26,0.3)]"
              )}
            >
              {isMining ? <Power size={16} /> : <Zap size={16} className="fill-current" />}
              {isMining ? 'Stop Mining' : 'Start Mining'}
            </button>
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10">
              <ShieldCheck size={20} className="text-bitcoin" />
            </div>
          </div>
        </header>

        <div className="p-8 relative z-10">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Statistics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard 
                    title="Realized Yield" 
                    value={`${(useMainnet ? (realBalance ?? 0) : balance).toFixed(8)} BTC`} 
                    subValue={`Net Revenue: $${((useMainnet ? (realBalance ?? 0) : balance) * btcPrice).toLocaleString()}`}
                    icon={<DollarSign className="text-green-400" />}
                    trend="LIVE PAYOUT"
                    action={
                      <button 
                        onClick={() => {
                          setWithdrawType('BTC');
                          setShowWithdrawModal(true);
                        }}
                        className="text-[10px] font-bold text-bitcoin hover:underline uppercase tracking-widest"
                      >
                        Withdraw
                      </button>
                    }
                  />
                  <StatCard 
                    title="Network Load" 
                    value={networkStats.difficulty} 
                    subValue={`Global Power: ${networkStats.hashrateGlobal}`}
                    icon={<Activity className="text-blue-400" />}
                  />
                  <StatCard 
                    title="Active Protocol" 
                    value={`${effectiveHashRate.toFixed(1)} TH/s`} 
                    subValue={`Stratum v2 · Level ${protocolLevel.toFixed(1)}`}
                    icon={<Zap className="text-bitcoin" />}
                    isMining={isMining}
                  />
                  <StatCard 
                    title="Proprietary Margin" 
                    value={`${poolFee}%`} 
                    subValue="Managed Pool Fee"
                    icon={<Lock className="text-purple-400" />}
                  />
                </div>

                {/* AD / PROMO ZONE */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-r from-blue-600/20 to-transparent border border-blue-500/30 rounded-2xl p-4 flex items-center justify-between group cursor-pointer hover:bg-blue-600/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                        <TrendingUp size={20} />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold uppercase tracking-widest text-blue-400 font-mono">PROMOTED</h5>
                        <p className="text-sm font-semibold">Join the 0% Fee Elite Cluster - Limited Slots</p>
                      </div>
                    </div>
                    <Plus size={16} className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="bg-gradient-to-r from-bitcoin/20 to-transparent border border-bitcoin/30 rounded-2xl p-4 flex items-center justify-between group cursor-pointer hover:bg-bitcoin/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-bitcoin rounded-lg flex items-center justify-center text-black">
                        <Plus size={20} />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold uppercase tracking-widest text-bitcoin font-mono">POOL AD</h5>
                        <p className="text-sm font-semibold">Stake $HASH for 12% Revenue Sharing</p>
                      </div>
                    </div>
                    <Plus size={16} className="text-bitcoin opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* AI Stratagem Hub */}
                  <div className="lg:col-span-3 bg-zinc-900 border border-white/10 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-bitcoin/10 to-transparent pointer-events-none" />
                    <div className="flex items-center gap-8 relative z-10">
                      <div className="w-20 h-20 bg-bitcoin/20 rounded-3xl flex items-center justify-center border border-bitcoin/40 shadow-[0_0_40px_rgba(247,147,26,0.2)]">
                        <Monitor size={40} className="text-bitcoin" />
                      </div>
                      <div className="max-w-xl">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-sm font-bold text-bitcoin uppercase tracking-[0.4em] font-mono">Proprietary AI Core</h4>
                          <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded uppercase font-bold">Optimal Path Locked</span>
                        </div>
                        <p className="text-zinc-100 text-2xl font-bold tracking-tight leading-tight">
                          "{isAiLoading ? "Analyzing block vectors..." : aiTip || "Autonomous infrastructure initialized."}"
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 relative z-10 w-full md:w-auto">
                      <button 
                        onClick={() => {
                          if (!isVoiceEnabled) {
                            setIsVoiceEnabled(true);
                            speak("Voice engine initialized. Welcome back, Capitol D. Your Asheville cluster is operating at 99.2% efficiency. Current yield is " + balance.toFixed(8) + " Bitcoin.");
                          } else {
                            speak("Current status: Total yield is " + balance.toFixed(8) + " Bitcoin. Hardware health is stable at Asheville HQ. AI optimization is active.");
                          }
                        }}
                        className="w-full py-4 bg-bitcoin text-black rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-[1.02] transition-all shadow-[0_0_20px_rgba(247,147,26,0.3)] mb-2"
                      >
                        Request Protocol Briefing
                      </button>
                      <button 
                        onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                        className={cn(
                          "w-full py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all border",
                          isVoiceEnabled ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-white/5 text-zinc-500 border-white/10"
                        )}
                      >
                        {isVoiceEnabled ? "Voice Enabled" : "Voice Muted"}
                      </button>
                      <button 
                        onClick={() => {
                          const nextState = !isAiAutonomous;
                          setIsAiAutonomous(nextState);
                          const text = nextState ? "Proprietary AI Core initialized. Optimizing cluster hash-rates for maximum yield." : "Disabling AI Core. Returning to manual override.";
                          speak(text);
                        }}
                        className={cn(
                          "w-full md:w-64 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all border shadow-2xl",
                          isAiAutonomous 
                            ? "bg-bitcoin text-black border-bitcoin" 
                            : "bg-white/5 text-zinc-400 border-white/10 hover:border-bitcoin/50"
                        )}
                      >
                        {isAiAutonomous ? "System Self-Optimizing" : "Enable Autonomous Mode"}
                      </button>
                    </div>
                  </div>

                  {/* Graph Area */}
                  <div className="lg:col-span-2 bg-[#0D0D0D] border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-lg font-bold">Mining Performance</h3>
                        <p className="text-xs text-zinc-500 font-mono">Hash rate output over time</p>
                      </div>
                      <div className="flex items-center gap-4 bg-black/50 p-1 rounded-lg border border-white/5">
                        <button className="px-3 py-1 text-[10px] font-mono text-bitcoin">REAL-TIME</button>
                        <button className="px-3 py-1 text-[10px] font-mono text-zinc-500 hover:text-white transition-colors">HISTORY</button>
                      </div>
                    </div>
                    
                    <div className="h-[300px] w-full">
                      {logs.length > 1 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={logs}>
                            <defs>
                              <linearGradient id="colorHash" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#F7931A" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#F7931A" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                            <XAxis 
                              dataKey="time" 
                              stroke="#555" 
                              fontSize={10} 
                              tickLine={false} 
                              axisLine={false}
                              minTickGap={30}
                            />
                            <YAxis 
                              stroke="#555" 
                              fontSize={10} 
                              tickLine={false} 
                              axisLine={false}
                              tickFormatter={(val) => `${val}T`}
                            />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                              itemStyle={{ color: '#F7931A' }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="hashRate" 
                              stroke="#F7931A" 
                              strokeWidth={2}
                              fillOpacity={1} 
                              fill="url(#colorHash)" 
                              animationDuration={500}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-4">
                          <Activity size={48} className="opacity-20" />
                          <p className="text-sm font-mono uppercase tracking-widest">Waiting for simulation data...</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Terminal / Logs */}
                  <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-6 text-zinc-400">
                      <TerminalIcon size={16} />
                      <h3 className="text-sm font-mono uppercase tracking-widest">Protocol Logs</h3>
                    </div>
                    <div className="flex-1 font-mono text-[11px] space-y-3 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                      <LogEntry msg="System booting..." timestamp="10:00:01" type="system" />
                      <LogEntry msg="Connected to stratum.capitoldbro.org:3333" timestamp="10:00:05" type="network" />
                      <LogEntry msg="Proprietary node handshake verified." timestamp="10:00:08" type="network" />
                      <LogEntry msg="Wallet verified: bc1q...xy9" timestamp="10:00:06" type="success" />
                      {isMining && logs.map((log, i) => (
                        <div key={`log-${i}`} className="flex gap-3 group">
                          <span className="text-zinc-700 select-none">[{log.time}]</span>
                          <span className="break-all italic text-bitcoin font-mono">
                            <span className="opacity-50 mr-1 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                            Hash accepted at {log.hashRate.toFixed(2)} TH/s
                          </span>
                        </div>
                      ))}
                      {!isMining && <LogEntry msg="Worker idle. Waiting for start command." timestamp="..." type="warning" />}
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 uppercase">
                        <span>Difficulty</span>
                        <span className="text-zinc-300">82.34T</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hardware Teaser */}
                <div className="border border-white/10 rounded-2xl p-8 bg-gradient-to-r from-zinc-900 to-[#0D0D0D] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-bitcoin/10 blur-[80px] -mr-32 -mt-32 pointer-events-none group-hover:bg-bitcoin/20 transition-all duration-700" />
                  <div className="flex items-center justify-between relative z-10">
                    <div>
                      <h3 className="text-xl font-bold mb-2">Upgrade Hardware</h3>
                      <p className="text-zinc-400 text-sm max-w-md">Increase your hash rate and mine more Bitcoin by adding next-generation ASIC miners to your virtual farm.</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('hardware')}
                      className="group flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-bitcoin transition-all"
                    >
                      Browse Catalog
                      <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'hardware' && (
              <motion.div 
                key="hardware"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold">Revenue Clusters</h2>
                    <p className="text-zinc-500 mt-1">Lease high-performance ASIC infrastructure to capitalize on pool rewards.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-zinc-900/50 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                      <span className="text-xs text-zinc-500 uppercase font-mono mr-2">Cluster Output:</span>
                      <span className="font-mono text-zinc-300">{effectiveHashRate.toFixed(1)} TH/s</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {hardware.map((item) => (
                    <div 
                      key={item.id} 
                      className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6 flex flex-col gap-6 hover:border-bitcoin/30 transition-all group overflow-hidden relative"
                    >
                      <div className="absolute top-0 right-0 p-2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity translate-x-4 -translate-y-4">
                         <Monitor size={120} />
                      </div>
                      <div className="flex items-center gap-6 relative z-10">
                        <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:text-bitcoin group-hover:bg-bitcoin/10 transition-colors">
                          {item.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-bold text-lg">{item.name}</h4>
                            <span className="text-bitcoin font-mono text-xs font-bold bg-bitcoin/10 px-2 py-0.5 rounded">LEASABLE</span>
                          </div>
                          <div className="flex gap-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                            <span>{item.hashRate} TH/s</span>
                            <span>{item.powerUsage}W</span>
                            <span className="text-zinc-300 underline">Slots Owned: {item.count}</span>
                          </div>
                        </div>
                      </div>

                      {item.count > 0 && (
                        <div className="space-y-4 pt-4 border-t border-white/5 relative z-10">
                          <div className="flex justify-between items-center text-[10px] uppercase font-mono tracking-widest text-zinc-500">
                            <span>Operational Uptime</span>
                            <span className="text-green-400">99.98%</span>
                          </div>
                          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${hardwareCondition[item.id]}%` }}
                              className="h-full bg-bitcoin"
                            />
                          </div>
                          <button 
                            onClick={() => buyHardware(item.id)}
                            className="w-full py-3 bg-bitcoin text-black rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
                          >
                            Add {item.hashRate} TH/s Power Unit
                          </button>
                        </div>
                      )}
                      
                      {item.count === 0 && (
                        <button 
                          onClick={() => buyHardware(item.id)}
                          className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all hover:border-bitcoin/50"
                        >
                          Establish Cluster Lease (${item.price}/yr)
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="bg-zinc-900 border border-white/5 p-8 rounded-3xl text-center space-y-4">
                   <h3 className="text-xl font-bold">Protocol Expansion Program</h3>
                   <p className="text-zinc-400 text-sm max-w-lg mx-auto">Refer fellow miners to our proprietary pool and receive 0.000005 BTC per TH/s added to the cluster network.</p>
                   <button className="bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-bitcoin transition-colors">Generate Private Invite Link</button>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex gap-4 items-start">
                  <Activity size={20} className="text-blue-400 shrink-0 mt-1" />
                  <p className="text-xs text-blue-100/70 leading-relaxed">
                    <span className="font-bold text-blue-400 block mb-1">PRO TIP: Efficiency Matters</span>
                    Higher TH/s miners yield more BTC, but require more throughput. Balancing your cluster counts ensures consistent revenue without overwhelming the protocol's throughput capacity.
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'wallet' && (
              <motion.div 
                key="wallet"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="max-w-2xl mx-auto space-y-8"
              >
                <div className="text-center mb-10">
                  <div className="w-20 h-20 bg-bitcoin/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-bitcoin/30">
                    <Wallet size={40} className="text-bitcoin" />
                  </div>
                  <h2 className="text-3xl font-bold mb-2">Connect Your Wallet</h2>
                  <p className="text-zinc-400">Specify your destination for successfully mined block rewards.</p>
                </div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-bitcoin/20 to-transparent border border-bitcoin/30 rounded-[2rem] p-8 relative overflow-hidden group shadow-[0_20px_50px_rgba(247,147,26,0.1)]"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 -translate-y-4 group-hover:translate-x-2 transition-all duration-700">
                    <Database size={160} />
                  </div>
                  <div className="flex items-center justify-between mb-8 relative z-10">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-bitcoin rounded-2xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(247,147,26,0.4)]">
                          <Cpu size={24} />
                       </div>
                       <div>
                          <h3 className="text-xl font-bold tracking-tight">Proprietary Miner E-Wallet</h3>
                          <p className="text-[10px] text-bitcoin uppercase tracking-[0.2em] font-bold font-mono">CapitolDbro Vaulted Yields</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse capitalize" />
                       <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Protocol Active</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-end relative z-10">
                     <div>
                        <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest mb-2">Internal Ledger Balance</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold font-mono text-white tracking-tighter">
                            {internalWalletBalance.toFixed(8)}
                          </span>
                          <span className="text-xl font-bold text-bitcoin">BTC</span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-2 font-medium">≈ ${(internalWalletBalance * btcPrice).toLocaleString()} USD</p>
                     </div>
                     <div className="space-y-4">
                        <button 
                          onClick={() => {
                            setInternalWalletBalance(prev => prev + balance);
                            setBalance(0);
                            setLastInternalSync(Date.now());
                            notify("Manual vault synchronization: Yields secured.", "success");
                          }}
                          className="w-full py-4 bg-white text-black rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-bitcoin transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95"
                        >
                          <RefreshCw size={14} className={isUpdating ? "animate-spin" : ""} /> Manual Vault Sync
                        </button>
                        <div className="flex items-center justify-between px-2">
                           <span className="text-[9px] text-zinc-500 uppercase font-bold">Auto-Sync Protocol</span>
                           <span className="text-[9px] text-bitcoin font-mono font-bold">
                             {Math.max(0, Math.floor((15 * 60 * 1000 - (Date.now() - lastInternalSync)) / 1000 / 60))}m Remaining
                           </span>
                        </div>
                     </div>
                  </div>
                </motion.div>

                <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-8 space-y-6">
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-4">Connection Bridge</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button 
                        onClick={connectMetaMask}
                        className={cn(
                          "flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-bold border transition-all",
                          metamaskAddress 
                            ? "bg-orange-500/10 border-orange-500/50 text-orange-400" 
                            : "bg-zinc-900 border-white/5 text-zinc-400 hover:border-orange-500/30"
                        )}
                      >
                        <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Alpha_Color.svg" className="w-5 h-5" alt="" referrerPolicy="no-referrer" />
                        {metamaskAddress ? `${metamaskAddress.slice(0, 6)}...${metamaskAddress.slice(-4)}` : "Connect MetaMask"}
                      </button>
                      <button className="flex items-center justify-center gap-3 py-4 bg-zinc-900 border border-white/5 rounded-xl text-zinc-400 text-sm font-bold hover:border-bitcoin/30 transition-all">
                        <TrendingUp size={18} /> SegWit Node
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Native BTC Payout Address</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        placeholder="bc1q... or 1BvBM..."
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 font-mono text-sm focus:border-bitcoin focus:outline-none transition-colors"
                      />
                      <button 
                        onClick={() => fetchRealBalance(walletAddress)}
                        disabled={isWalletLoading}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-zinc-500 hover:text-bitcoin transition-colors disabled:opacity-50"
                      >
                        {isWalletLoading ? <RefreshCw className="animate-spin" size={18} /> : <ExternalLink size={18} />}
                      </button>
                    </div>
                    {useMainnet && (
                      <p className="mt-3 text-[10px] text-green-500 font-mono">
                        ✓ Connected to Mainnet: Tracking {walletAddress.slice(0, 8)}...
                      </p>
                    )}
                  </div>

                  <div className="pt-6 border-t border-white/5">
                    <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                       <DollarSign size={16} className="text-bitcoin" />
                       Monetization & Payouts (Owner: CapitolD)
                    </h4>
                    <div className="bg-zinc-900 rounded-2xl p-6 border border-white/5 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Protocol Treasury</p>
                        <h5 className="text-xl font-bold font-mono text-white mt-1">{ownerTreasury.toFixed(8)} BTC</h5>
                        <p className="text-[10px] text-zinc-600 mt-1">Routes to: {payoutEmail}</p>
                      </div>
                      <button 
                         onClick={() => {
                           setWithdrawType('PayPal');
                           setShowWithdrawModal(true);
                         }}
                         className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-[0_5px_15px_rgba(37,99,235,0.3)]"
                      >
                        Withdraw via PayPal
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={() => fetchRealBalance(walletAddress)}
                    disabled={!walletAddress || isWalletLoading}
                    className="w-full py-4 bg-bitcoin text-black rounded-xl font-bold shadow-[0_10px_30px_rgba(247,147,26,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {isWalletLoading ? "Syncing with Blockchain..." : "Link Real Wallet"}
                  </button>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex gap-4 items-start">
                  <ShieldCheck size={20} className="text-yellow-400 shrink-0 mt-1" />
                  <p className="text-xs text-yellow-100/70 leading-relaxed">
                    <span className="font-bold text-yellow-400 block mb-1">Security Notice</span>
                    CapitolDbro only requires your <span className="text-white underline">public address</span> to monitor your balance. Never enter your private key or seed phrase into any website. Your assets remain secure in your own custody.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-6 text-zinc-500 text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} /> AES-256 Encrypted
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock size={14} /> Self-Custodial
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'network' && (
              <div className="space-y-12">
                <IpfsSection />
                <div className="border-t border-white/10 pt-12">
                   <CloudflareSection />
                </div>
                <div className="border-t border-white/10 pt-12">
                   <GitHubSection connected={githubConnected} onConnect={() => setGithubConnected(true)} />
                </div>
              </div>
            )}
            {activeTab === 'intelligence' && (
              <motion.div 
                key="intelligence"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                   <div>
                      <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                         Predictive Intelligence
                         <span className="px-2 py-0.5 bg-bitcoin/20 text-bitcoin text-[10px] rounded uppercase font-bold tracking-widest border border-bitcoin/30">AI Active</span>
                      </h2>
                      <p className="text-zinc-500 mt-1">Proprietary forecasting for Asheville Protocol yields and hardware lifespan.</p>
                   </div>
                   <div className="flex gap-4">
                      <div className="bg-[#0D0D0D] border border-white/10 rounded-xl px-6 py-2 flex items-center gap-4">
                         <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">30D Forecast</p>
                            <p className="text-lg font-bold text-bitcoin">{(intelligenceData.history[intelligenceData.history.length-1].hashRate * 0.00001).toFixed(4)} BTC</p>
                         </div>
                         <div className="w-px h-8 bg-white/10" />
                         <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">ROI Velocity</p>
                            <p className="text-lg font-bold">{(efficiencyRating * protocolLevel).toFixed(1)}%</p>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                   <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-8">
                      <div className="flex items-center justify-between mb-8">
                         <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-500">Hash Rate Volatility (24H)</h4>
                         <BarChart3 size={18} className="text-zinc-600" />
                      </div>
                      <div className="h-[300px]">
                         <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={intelligenceData.history}>
                               <defs>
                                  <linearGradient id="colorHashHistory" x1="0" y1="0" x2="0" y2="1">
                                     <stop offset="5%" stopColor="#f7931a" stopOpacity={0.2}/>
                                     <stop offset="95%" stopColor="#f7931a" stopOpacity={0}/>
                                  </linearGradient>
                               </defs>
                               <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                               <XAxis dataKey="time" stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
                               <YAxis stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
                               <Tooltip 
                                 contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '12px', fontSize: '10px' }}
                                 itemStyle={{ color: '#f7931a' }}
                               />
                               <Area type="monotone" dataKey="hashRate" stroke="#f7931a" strokeWidth={2} fillOpacity={1} fill="url(#colorHashHistory)" />
                            </AreaChart>
                         </ResponsiveContainer>
                      </div>
                   </div>

                   <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-8">
                      <div className="flex items-center justify-between mb-8">
                         <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-500">Profitability Projection (USD)</h4>
                         <TrendingUp size={18} className="text-bitcoin" />
                      </div>
                      <div className="h-[300px]">
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={intelligenceData.history}>
                               <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                               <XAxis dataKey="time" stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
                               <YAxis stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
                               <Tooltip 
                                 contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '12px', fontSize: '10px' }}
                                 itemStyle={{ color: '#f7931a' }}
                               />
                               <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} dot={false} />
                            </LineChart>
                         </ResponsiveContainer>
                      </div>
                   </div>

                   <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-8 lg:col-span-2">
                       <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-500 mb-8">Predictive Maintenance & Lifespan</h4>
                       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          {hardware.filter(h => h.count > 0 || intelligenceData.lifeExpectancy[h.id] > 0).map(unit => (
                             <div key={unit.id} className="p-6 bg-zinc-900/50 rounded-2xl border border-white/5 space-y-4">
                                <div className="flex items-center justify-between">
                                   <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400">
                                      {unit.icon}
                                   </div>
                                   <div className="text-right">
                                      <p className="text-[10px] text-zinc-500 uppercase font-bold">EST. Life</p>
                                      <p className="text-sm font-bold text-white">{Math.floor(intelligenceData.lifeExpectancy[unit.id])} Days</p>
                                   </div>
                                </div>
                                <div>
                                   <div className="flex justify-between text-[10px] mb-2 uppercase font-bold">
                                      <span className="text-zinc-500">Structural Health</span>
                                      <span className={cn(
                                         intelligenceData.lifeExpectancy[unit.id] > 300 ? "text-green-500" :
                                         intelligenceData.lifeExpectancy[unit.id] > 100 ? "text-yellow-500" : "text-red-500"
                                      )}>
                                         {((intelligenceData.lifeExpectancy[unit.id] / 1080) * 100).toFixed(1)}%
                                      </span>
                                   </div>
                                   <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                                      <motion.div 
                                         className={cn(
                                            "h-full rounded-full",
                                            intelligenceData.lifeExpectancy[unit.id] > 300 ? "bg-green-500" :
                                            intelligenceData.lifeExpectancy[unit.id] > 100 ? "bg-yellow-500" : "bg-red-500"
                                         )}
                                         initial={{ width: 0 }}
                                         animate={{ width: `${(intelligenceData.lifeExpectancy[unit.id] / 1080) * 100}%` }}
                                      />
                                   </div>
                                </div>
                             </div>
                          ))}
                       </div>
                   </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'marketing' && (
              <motion.div 
                key="marketing"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-8 max-w-5xl mx-auto"
              >
                <div className="bg-gradient-to-br from-bitcoin/20 to-transparent border border-bitcoin/30 rounded-[2rem] p-12 text-center relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 translate-x-12 -translate-y-6">
                      <Share2 size={200} />
                   </div>
                   <h2 className="text-4xl font-bold mb-4">Proprietary Expansion Program</h2>
                   <p className="text-zinc-400 text-lg max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
                      Scale your proprietary network from Asheville to the world. Use these pre-verified assets to advertise your mining pool across TikTok, Instagram, and Facebook.
                   </p>
                   
                   <div className="flex flex-wrap justify-center gap-4">
                      <button 
                        onClick={() => {
                          const text = "Start building real wealth on CapitolDbro.org. Proprietary BTC clusters, AI-optimized yields. Join capitolD's elite pool today! ⚡️ #Bitcoin #Mining #PassiveIncome";
                          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://CapitolDbro.org')}&quote=${encodeURIComponent(text)}`, '_blank');
                        }}
                        className="flex items-center gap-3 px-8 py-4 bg-[#1877F2] rounded-2xl font-bold text-sm uppercase tracking-widest hover:scale-105 transition-transform"
                      >
                         <img src="https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg" className="w-5 h-5" alt="" />
                         Facebook
                      </button>
                      <button 
                        onClick={() => {
                          const text = "Scaling proprietary BTC revenue with @CapitolD420yo on CapitolDbro.org 🚀 Join the elite cluster now! #Bitcoin #Mining #PassiveYield";
                          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
                        }}
                        className="flex items-center gap-3 px-8 py-4 bg-black border border-white/20 rounded-2xl font-bold text-sm uppercase tracking-widest hover:scale-105 transition-transform"
                      >
                         <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                         Twitter / X
                      </button>
                      <button 
                        onClick={() => {
                          const text = "Build proprietary BTC revenue with CapitolDbro. Joint my elite cluster! 🚀 @CapitolD420yo";
                          navigator.clipboard.writeText(text);
                          notify("Ad Copy Copied for Instagram", "success");
                        }}
                        className="flex items-center gap-3 px-8 py-4 bg-gradient-to-tr from-[#FD1D1D] via-[#F56040] to-[#833AB4] rounded-2xl font-bold text-sm uppercase tracking-widest hover:scale-105 transition-transform"
                      >
                         <img src="https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg" className="w-5 h-5" alt="" />
                         Instagram
                      </button>
                      <button 
                        onClick={() => {
                          const text = "Join the CapitolDbro proprietary protocol. Real assets, AI-optimized yield. ⛏️ #CapitolDbro #CryptoMining";
                          navigator.clipboard.writeText(text);
                          notify("TikTok Blast Copy Saved", "success");
                        }}
                        className="flex items-center gap-3 px-8 py-4 bg-black border border-white/20 rounded-2xl font-bold text-sm uppercase tracking-widest hover:scale-105 transition-transform"
                      >
                         <img src="https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg" className="w-5 h-5 invert" alt="" referrerPolicy="no-referrer" />
                         TikTok
                      </button>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-8">
                      <h4 className="text-sm font-bold text-bitcoin uppercase tracking-widest mb-6 font-mono">Current Ad Campaign</h4>
                      <div className="aspect-video rounded-2xl border border-white/5 bg-zinc-900 flex items-center justify-center overflow-hidden relative group">
                         <div className="absolute inset-0 bg-bitcoin/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                            <span className="text-black font-bold uppercase tracking-widest text-xs">Download Creative Asset</span>
                         </div>
                         <div className="text-center p-8">
                            <Zap size={48} className="text-bitcoin mx-auto mb-4" />
                            <p className="text-lg font-bold">"Proprietary Power. Real Results."</p>
                            <p className="text-xs text-zinc-500 mt-2">CapitolDbro Official Banner</p>
                         </div>
                      </div>
                      <div className="mt-8 space-y-4">
                         <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-zinc-500">Affiliate ID:</span>
                            <span className="text-white">DBRO-ELITE-01</span>
                         </div>
                         <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-zinc-500">Contact:</span>
                            <span className="text-white">{payoutEmail}</span>
                         </div>
                      </div>
                   </div>

                   <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-8">
                      <h4 className="text-sm font-bold text-bitcoin uppercase tracking-widest mb-6 font-mono">Performance Analytics</h4>
                      <div className="space-y-6">
                         {[
                           { label: 'Total Impressions', val: '12,402' },
                           { label: 'Click-Through Rate', val: '4.2%' },
                           { label: 'Conversion Yield', val: '0.00045 BTC' },
                         ].map(stat => (
                           <div key={stat.label} className="border-b border-white/5 pb-4 last:border-0">
                              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-1">{stat.label}</p>
                              <p className="text-xl font-bold">{stat.val}</p>
                           </div>
                         ))}
                      </div>
                   </div>

                   <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-8 md:col-span-2">
                      <div className="flex items-center justify-between mb-8">
                         <div>
                            <h4 className="text-sm font-bold text-bitcoin uppercase tracking-widest font-mono">Cloudflare Gateway: CapitolDbro.org</h4>
                            <p className="text-xs text-zinc-500 mt-1">Configuration for edge-authenticated proprietary access.</p>
                         </div>
                         <div className="px-3 py-1 bg-orange-500/10 border border-orange-500/30 rounded text-orange-400 text-[10px] font-bold uppercase">Cloudflare Proxied</div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         {[
                           { type: 'CNAME', host: '@', value: 'ais-protocol.capitoldbro.org', status: 'READY' },
                           { type: 'CNAME', host: 'www', value: 'ais-protocol.capitoldbro.org', status: 'READY' },
                           { type: 'TXT', host: '_dbro-verify', value: 'dbro-auth-9921-2x', status: 'VERIFIED' },
                         ].map(record => (
                           <div key={record.host} className="p-4 bg-zinc-900 rounded-xl border border-white/5 font-mono">
                              <div className="flex justify-between items-center mb-2">
                                 <span className="text-[10px] font-bold px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">{record.type}</span>
                                 <span className="text-[10px] text-orange-500">{record.status}</span>
                              </div>
                              <div className="space-y-1">
                                 <div>
                                    <p className="text-[9px] text-zinc-500 uppercase tracking-tighter">Name (Subdomain)</p>
                                    <p className="text-xs text-white">{record.host}</p>
                                 </div>
                                 <div>
                                    <p className="text-[9px] text-zinc-500 uppercase tracking-tighter">Target (Hostname)</p>
                                    <p className="text-xs text-white truncate">{record.value}</p>
                                 </div>
                                 <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                    <p className="text-[9px] text-zinc-500 uppercase tracking-tighter">Proxy Status</p>
                                    <div className="flex items-center gap-1">
                                       <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                       <span className="text-[10px] text-orange-500 font-bold uppercase">Proxied</span>
                                    </div>
                                 </div>
                              </div>
                           </div>
                         ))}
                      </div>
                      <div className="mt-8 flex items-center justify-between p-4 bg-bitcoin/10 border border-bitcoin/20 rounded-2xl">
                         <div className="flex items-center gap-3">
                            <Monitor size={20} className="text-bitcoin" />
                            <p className="text-xs text-zinc-200">Point your **@** and **www** CNAME records to **ais-protocol.capitoldbro.org** in Cloudflare. Ensure the **Orange Cloud (Proxied)** is enabled for security.</p>
                         </div>
                         <button className="text-[10px] font-bold text-bitcoin hover:underline uppercase tracking-widest">Setup Guide</button>
                      </div>
                   </div>
                </div>
              </motion.div>
            )}
            
            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6 max-w-4xl mx-auto"
              >
                <h2 className="text-2xl font-bold">Mining Protocol Optimization</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Overclocking */}
                  <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <Zap size={18} className="text-bitcoin" />
                        <h3 className="font-bold uppercase tracking-widest text-xs font-mono">ASIC Overclocking</h3>
                      </div>
                      <span className="font-mono text-bitcoin">+{overclock}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" max="25" step="1"
                      value={overclock}
                      onChange={(e) => setOverclock(parseInt(e.target.value))}
                      className="w-full accent-bitcoin h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer mb-4"
                    />
                    <p className="text-[10px] text-zinc-500 leading-relaxed italic">
                      Increasing clock speed boosts TH/s but creates severe thermal stress, leading to hardware degradation and higher failure rates.
                    </p>
                  </div>

                  {/* Pool Selector */}
                  <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <Layers size={18} className="text-blue-400" />
                      <h3 className="font-bold uppercase tracking-widest text-xs font-mono">Stratum Pool Strategy</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {['SlushPool', 'F2Pool', 'AntPool', 'Foundry USA'].map(pool => (
                        <button 
                          key={pool}
                          onClick={() => setSelectedPool(pool)}
                          className={cn(
                            "w-full py-2 px-4 rounded-xl text-left text-xs font-mono border transition-all",
                            selectedPool === pool ? "bg-bitcoin/10 border-bitcoin/50 text-bitcoin" : "bg-zinc-900 border-white/5 text-zinc-500 hover:border-white/20"
                          )}
                        >
                          {pool} {selectedPool === pool && "✓"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl divide-y divide-white/5">
                  <SettingsRow title="Auto-Reinvest" description="Automatically dedicate 25% of yield to virtual equipment maintenance." hasSwitch active={autoReinvest} onClick={() => setAutoReinvest(!autoReinvest)} />
                  <SettingsRow title="Simulation Fidelity" description="Adjust the complexity of mining hash calculations." hasSwitch active />
                  <SettingsRow title="Cloud Vault Sync" description={user ? `Connected: ${user.email}` : "Sign in to sync your farm across devices."} hasSwitch active={!!user} />
                  <div className="p-6">
                    <button className="text-red-400 text-sm font-semibold hover:text-red-300 transition-colors">Wipe All Protocol Data</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Decorative Overlays */}
      <div className="fixed bottom-0 right-0 p-8 pointer-events-none opacity-5">
        <Monitor className="w-64 h-64 text-bitcoin" />
      </div>
    </div>
  );
}

// Subcomponents
// Subcomponents
function IpfsSection() {
  const [ipfsInfo, setIpfsInfo] = useState<{ status: string, gateway: string, latency?: string, nodeType?: string } | null>(null);

  useEffect(() => {
    fetch('/api/ipfs/status')
      .then(res => res.json())
      .then(data => setIpfsInfo(data))
      .catch(() => setIpfsInfo({ status: 'offline', gateway: 'https://ipfs.io/ipfs/' }));
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Integrations Hub</h2>
          <p className="text-zinc-500 mt-1">
            Global edge orchestration and distributed storage management.
          </p>
        </div>
      </div>

      <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1 space-y-6">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-bitcoin/10 rounded-xl flex items-center justify-center">
                  <Database className="text-bitcoin" size={20} />
               </div>
               <div>
                  <h3 className="text-lg font-bold">IPFS Proprietary Gateway</h3>
                  <p className="text-zinc-500 text-xs">Distributed storage link for CapitolDbro telemetry.</p>
               </div>
            </div>
            
            <div className="p-6 bg-zinc-900/50 border border-white/5 rounded-2xl space-y-4">
               <div className="flex justify-between items-center">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Connection Status</span>
                  <div className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                    ipfsInfo?.status === 'active' ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-500"
                  )}>
                    {ipfsInfo?.status || 'Linking...'}
                  </div>
               </div>
               <div>
                  <p className="text-[10px] text-zinc-600 uppercase font-bold mb-1">Gateway Endpoint</p>
                  <p className="text-xs font-mono text-zinc-300 truncate bg-black/40 p-2 rounded border border-white/5">{ipfsInfo?.gateway || 'Checking environment...'}</p>
               </div>
               <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-3 bg-black/20 rounded-xl border border-white/5">
                     <p className="text-[9px] text-zinc-500 uppercase font-bold">Latency</p>
                     <p className="text-sm font-bold text-white">{ipfsInfo?.latency || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-black/20 rounded-xl border border-white/5">
                     <p className="text-[9px] text-zinc-500 uppercase font-bold">Peer Role</p>
                     <p className="text-sm font-bold text-bitcoin">{ipfsInfo?.nodeType || 'Primary Node'}</p>
                  </div>
               </div>
            </div>
          </div>

          <div className="w-px bg-white/5 hidden md:block" />

          <div className="flex-1">
             <h4 className="text-sm font-bold uppercase tracking-widest mb-4">Configuration Protocol</h4>
             <p className="text-xs text-zinc-500 leading-relaxed mb-6">
                IPFS allows for permanent, censorship-resistant storage of your mining protocol artifacts. To use a proprietary gateway, set the <code className="text-bitcoin bg-bitcoin/5 px-1 rounded">IPFS_GATEWAY</code> key in your environment settings.
             </p>
             <div className="space-y-3">
                {[
                  { label: 'CORS Pinning', status: 'Enabled' },
                  { label: 'Content ID (CID)', status: 'V1 Optimized' },
                  { label: 'Public Gateway Fallback', status: 'Disabled' }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-zinc-900/30 rounded-xl border border-white/5">
                     <span className="text-[10px] text-zinc-400 font-bold">{item.label}</span>
                     <span className="text-[10px] text-bitcoin font-bold">{item.status}</span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CloudflareSection() {
  const [cfStatus, setCfStatus] = useState<{ 
    status: string, 
    accountId: string,
    metrics?: {
      bandwidth: { total: number, cached: number, unit: string },
      statusCodes: { ok: number, clientError: number, serverError: number, other: number },
      security: { threats: number, wafBlocks: number, botChallenges: number }
    }
  } | null>(null);
  const [cfError, setCfError] = useState<string | null>(null);
  const [edgeInsight, setEdgeInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const generateEdgeInsight = async () => {
    if (!cfStatus?.metrics) return;
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `As a high-level Network Infrastructure AI for the elite CapitolDbro.org protocol, analyze these Cloudflare metrics: 
      Requests: ${cfStatus.metrics.statusCodes.ok}, 
      Bandwidth: ${cfStatus.metrics.bandwidth.total}${cfStatus.metrics.bandwidth.unit}, 
      Threats: ${cfStatus.metrics.security.threats}, 
      Cache Rate: ${((cfStatus.metrics.bandwidth.cached / cfStatus.metrics.bandwidth.total) * 100).toFixed(1)}%.
      Provide a sophisticated, slightly snobbish, and highly technical "Security Posture" update. Keep it under 40 words. Focus on edge optimization and protocol integrity.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      setEdgeInsight(response.text || "Edge telemetry remains within nominal priority parameters. Integrity verified.");
    } catch (err) {
      setEdgeInsight("Edge telemetry remains within nominal priority parameters. Integrity verified.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    fetch('/api/cloudflare/analytics')
      .then(res => {
        if (!res.ok) throw new Error('Unlinked');
        return res.json();
      })
      .then(data => {
        setCfStatus(data);
        // Trigger initial analysis once data is in
      })
      .catch(err => setCfError(err.message));
  }, []);

  // Trigger analysis when metrics arrive
  useEffect(() => {
    if (cfStatus?.metrics && !edgeInsight && !isAnalyzing) {
      generateEdgeInsight();
    }
  }, [cfStatus]);

  const analyticsData = [
    { time: '00:00', requests: 420, threats: 2 },
    { time: '04:00', requests: 850, threats: 5 },
    { time: '08:00', requests: 1200, threats: 12 },
    { time: '12:00', requests: 2100, threats: 8 },
    { time: '16:00', requests: 1800, threats: 4 },
    { time: '20:00', requests: 1400, threats: 1 },
    { time: '23:59', requests: 950, threats: 3 },
  ];

  const statusData = cfStatus?.metrics ? [
    { name: '2xx OK', value: cfStatus.metrics.statusCodes.ok, color: '#10b981' },
    { name: '4xx Error', value: cfStatus.metrics.statusCodes.clientError, color: '#f59e0b' },
    { name: '5xx Error', value: cfStatus.metrics.statusCodes.serverError, color: '#ef4444' },
  ] : [];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cloudflare Gateway</h2>
          <p className="text-zinc-500 mt-1">
            {cfStatus ? `Secure connection established with Account: ${cfStatus.accountId}` : "Unlinked. Please verify credentials in environment settings."}
          </p>
        </div>
        <div className="flex gap-4">
           {cfStatus ? (
             <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest leading-none">CF Edge Active</span>
             </div>
           ) : (
             <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest leading-none">Sync Offline</span>
             </div>
           )}
           <button className="px-4 py-2 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-orange-500/20 transition-all">
              Manage DNS
           </button>
        </div>
      </div>

      <AnimatePresence>
         {edgeInsight && (
            <motion.div 
               initial={{ opacity: 0, height: 0 }}
               animate={{ opacity: 1, height: 'auto' }}
               className="bg-[#000] border border-bitcoin/20 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(247,147,26,0.05)]"
            >
               <div className="flex">
                  <div className="w-1 bg-bitcoin" />
                  <div className="p-6 flex items-center gap-6">
                     <div className="w-12 h-12 bg-bitcoin/10 rounded-xl flex items-center justify-center shrink-0">
                        <Brain className="text-bitcoin" size={24} />
                     </div>
                     <div>
                        <div className="flex items-center gap-2 mb-1">
                           <span className="text-[10px] font-bold text-bitcoin uppercase tracking-widest">Edge Analyst Intelligence</span>
                           <div className="flex items-center gap-1">
                              <span className="w-1 h-1 bg-green-500 rounded-full animate-ping" />
                              <span className="text-[8px] text-zinc-500 uppercase font-mono">Live Sync</span>
                           </div>
                        </div>
                        <p className="text-sm text-zinc-300 font-medium italic leading-relaxed">
                           "{edgeInsight}"
                        </p>
                     </div>
                     <button 
                       onClick={generateEdgeInsight}
                       disabled={isAnalyzing}
                       className="ml-auto p-2 text-zinc-500 hover:text-white transition-colors"
                     >
                        <RefreshCw size={14} className={cn(isAnalyzing && "animate-spin")} />
                     </button>
                  </div>
               </div>
            </motion.div>
         )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          title="Total Requests" 
          value={cfStatus?.metrics ? `${(cfStatus.metrics.statusCodes.ok / 1000).toFixed(1)}k` : "48.2k"} 
          subValue="+12.4% vs last 24h"
          icon={<Globe size={20} className="text-blue-400" />}
        />
        <StatCard 
          title="Bandwidth" 
          value={cfStatus?.metrics ? `${cfStatus.metrics.bandwidth.total}${cfStatus.metrics.bandwidth.unit}` : "124GB"} 
          subValue={`${cfStatus?.metrics?.bandwidth.cached}${cfStatus?.metrics?.bandwidth.unit} cached at edge`}
          icon={<Activity size={20} className="text-purple-400" />}
        />
        <StatCard 
          title="Threats Blocked" 
          value={cfStatus?.metrics ? cfStatus.metrics.security.threats.toString() : "142"} 
          subValue="SQLi & DDoS mitigation"
          icon={<ShieldCheck size={20} className="text-red-400" />}
        />
        <StatCard 
          title="Edge Latency" 
          value="12ms" 
          subValue="Optimized via Asheville Node"
          icon={<Zap size={20} className="text-bitcoin" />}
        />
      </div>

      <div className="bg-[#000] border border-white/10 rounded-3xl p-8">
         <div className="flex items-center justify-between mb-8">
            <h4 className="font-bold text-sm uppercase tracking-widest text-zinc-400">Active DNS Configuration</h4>
            <span className="text-[10px] text-zinc-500 font-mono italic">Sync active via Cloudflare API (Simulated)</span>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { type: 'CNAME', name: '@', target: 'ais-protocol.capitoldbro.org', proxy: 'Proxied' },
              { type: 'CNAME', name: 'www', target: 'ais-protocol.capitoldbro.org', proxy: 'Proxied' },
              { type: 'TXT', name: '_dbro-verify', target: 'dbro-auth-9921-2x', proxy: 'DNS Only' },
            ].map((record, i) => (
              <div key={i} className="p-5 bg-zinc-900/40 border border-white/5 rounded-2xl relative overflow-hidden group">
                 <div className="flex justify-between items-center mb-4">
                    <span className="px-1.5 py-0.5 bg-zinc-800 rounded text-[9px] font-bold text-zinc-400">{record.type}</span>
                    <div className="flex items-center gap-1.5">
                       <div className={cn("w-1.5 h-1.5 rounded-full", record.proxy === 'Proxied' ? "bg-orange-500" : "bg-zinc-500")}></div>
                       <span className="text-[9px] text-zinc-500 font-bold uppercase">{record.proxy}</span>
                    </div>
                 </div>
                 <div className="space-y-3">
                    <div>
                       <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-tighter mb-1">Name (Subdomain)</p>
                       <p className="text-xs text-white font-mono">{record.name}</p>
                    </div>
                    <div>
                       <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-tighter mb-1">Target (Hostname)</p>
                       <p className="text-xs text-bitcoin font-mono truncate">{record.target}</p>
                    </div>
                 </div>
                 <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="text-[10px] text-zinc-500 hover:text-white uppercase font-bold">Copy</button>
                 </div>
              </div>
            ))}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#0D0D0D] border border-white/10 rounded-3xl p-8">
           <div className="flex items-center justify-between mb-8">
              <h4 className="font-bold text-sm uppercase tracking-widest text-zinc-400">Traffic Distribution</h4>
              <div className="flex gap-2">
                 <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded">Requests</span>
                 <span className="px-2 py-1 bg-red-500/20 text-red-500 text-[10px] font-bold rounded">Threats</span>
              </div>
           </div>
           <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData}>
                  <defs>
                    <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="time" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '10px' }}
                    itemStyle={{ fontSize: '10px' }}
                  />
                  <Area type="monotone" dataKey="requests" stroke="#3b82f6" fillOpacity={1} fill="url(#colorReq)" />
                  <Area type="monotone" dataKey="threats" stroke="#ef4444" fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-8">
           <h4 className="font-bold text-sm uppercase tracking-widest text-zinc-400 mb-8">HTTP Status Distribution</h4>
           <div className="h-[200px] mb-8">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                    <XAxis dataKey="name" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '10px' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                       {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                       ))}
                    </Bar>
                 </BarChart>
              </ResponsiveContainer>
           </div>
           <div className="space-y-4">
              <div className="flex justify-between text-xs">
                 <span className="text-zinc-500">Cache Hit Rate</span>
                 <span className="text-white font-bold">{cfStatus?.metrics ? ((cfStatus.metrics.bandwidth.cached / cfStatus.metrics.bandwidth.total) * 100).toFixed(1) : "65.9"}%</span>
              </div>
              <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                 <div 
                   className="h-full bg-blue-500" 
                   style={{ width: cfStatus?.metrics ? `${(cfStatus.metrics.bandwidth.cached / cfStatus.metrics.bandwidth.total) * 100}%` : "65.9%" }} 
                 />
              </div>
           </div>
        </div>
      </div>

      <div className="bg-[#000] border border-white/10 rounded-3xl p-8">
         <div className="flex items-center justify-between mb-8">
            <h4 className="font-bold text-sm uppercase tracking-widest text-zinc-400">Security Insights & Mitigation</h4>
            <span className="text-[10px] text-zinc-500 font-mono italic">AI-Driven Threat Detection Active</span>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-2xl">
               <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">WAF Blocks</p>
               <p className="text-2xl font-bold text-orange-500">{cfStatus?.metrics?.security.wafBlocks || 85}</p>
               <p className="text-[9px] text-zinc-600 mt-1 italic">SQLi & XSS mitigation</ p>
            </div>
            <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-2xl">
               <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Bot Challenges</p>
               <p className="text-2xl font-bold text-bitcoin">{cfStatus?.metrics?.security.botChallenges || 612}</p>
               <p className="text-[9px] text-zinc-600 mt-1 italic">Interactive challenges issued</p>
            </div>
            <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-2xl">
               <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">DDoS Scrubbing</p>
               <p className="text-2xl font-bold text-blue-500">Active</p>
               <p className="text-[9px] text-zinc-600 mt-1 italic">No volumetric attacks detected</p>
            </div>
            <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-2xl">
               <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">TLS Encryption</p>
               <p className="text-2xl font-bold text-white">v1.3</p>
               <p className="text-[9px] text-zinc-600 mt-1 italic">100% of traffic encrypted</p>
            </div>
         </div>
      </div>
    </motion.div>
  );
}

function GitHubSection({ connected, onConnect }: { connected: boolean, onConnect: () => void }) {
  const repoStats = [
    { name: 'capitoldbro-protocol', stars: 24, forks: 8, status: 'Active' },
    { name: 'stratum-v2-bridge', stars: 12, forks: 3, status: 'Synced' },
    { name: 'mining-ai-core', stars: 84, forks: 32, status: 'Protected' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">GitHub Integration</h2>
          <p className="text-zinc-500 mt-1">Version control for proprietary CapitolDbro scripts and AI logic.</p>
        </div>
        <button 
          onClick={onConnect}
          disabled={connected}
          className={cn(
            "px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-3 transition-all",
            connected 
              ? "bg-green-500/10 text-green-400 border border-green-500/30 cursor-default" 
              : "bg-white text-black hover:bg-zinc-200 shadow-xl"
          )}
        >
          <Github size={18} />
          {connected ? "Identity Linked" : "Connect GitHub Account"}
        </button>
      </div>

      {connected ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-8">
              <h4 className="font-bold text-sm uppercase tracking-widest text-zinc-400 mb-6">Linked Repositories</h4>
              <div className="space-y-4">
                {repoStats.map((repo, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-white/5 group hover:border-bitcoin/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 group-hover:text-bitcoin">
                        <Github size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-zinc-200">{repo.name}</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Status: <span className="text-green-500">{repo.status}</span></p>
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs font-mono text-zinc-500">
                       <span>{repo.stars} Stars</span>
                       <span>{repo.forks} Forks</span>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-6 py-3 text-zinc-500 hover:text-white border border-dashed border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all">
                + Index Additional Repository
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-zinc-900 to-black border border-white/10 rounded-3xl p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20">
                  <img src="https://github.com/identicons/CapitolD.png" alt="Profile" />
                </div>
                <div>
                   <h5 className="font-bold text-lg leading-none">CapitolDbro</h5>
                   <p className="text-xs text-zinc-500 mt-1">chris.peterson1718@...</p>
                </div>
              </div>
              <div className="space-y-3">
                 <div className="flex justify-between text-xs font-mono">
                    <span className="text-zinc-500">Tier:</span>
                    <span className="text-bitcoin font-bold">Proprietary Partner</span>
                 </div>
                 <div className="flex justify-between text-xs font-mono">
                    <span className="text-zinc-500">API Access:</span>
                    <span className="text-green-400">Granted</span>
                 </div>
              </div>
              <button className="w-full mt-8 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/20 transition-all">
                Revoke Access
              </button>
            </div>

            <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-8">
               <h4 className="font-bold text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-4">Recent Commits</h4>
               <div className="space-y-4">
                  {[
                    { msg: 'Optimized hash-node distribution logic', time: '2h ago' },
                    { msg: 'Added AES-256 layer to stratum bridge', time: '5h ago' },
                    { msg: 'Bumping protocol version to 4.2.1', time: '1d ago' },
                  ].map((commit, i) => (
                    <div key={i} className="flex gap-3">
                       <div className="w-1 h-8 bg-zinc-800 rounded-full shrink-0" />
                       <div>
                          <p className="text-xs font-medium text-zinc-300 leading-tight">{commit.msg}</p>
                          <p className="text-[10px] text-zinc-500 mt-1">{commit.time}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#0D0D0D] border border-dashed border-white/10 rounded-3xl py-20 px-8 text-center">
           <Github size={48} className="text-zinc-800 mx-auto mb-6" />
           <h3 className="text-xl font-bold mb-2">No GitHub Identity Linked</h3>
           <p className="text-zinc-500 text-sm max-w-md mx-auto mb-8">Link your GitHub account to sync your proprietary mining logic scripts and monitor repository activity directly from the dashboard.</p>
           <button 
             onClick={onConnect}
             className="px-8 py-4 bg-white text-black rounded-2xl font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-2xl"
           >
             Verify GitHub Identity
           </button>
        </div>
      )}
    </motion.div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
        active 
          ? "bg-bitcoin/10 text-bitcoin font-semibold" 
          : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
      )}
    >
      {active && <motion.div layoutId="active-pill" className="absolute left-0 w-1 h-6 bg-bitcoin rounded-r-full" />}
      <span className={cn("transition-transform duration-200", active && "scale-110")}>{icon}</span>
      <span className="text-sm tracking-wide">{label}</span>
      {active && <ChevronRight size={14} className="ml-auto opacity-50" />}
    </button>
  );
}

function StatCard({ title, value, subValue, icon, trend, isMining, action }: { title: string, value: string, subValue: string, icon: React.ReactNode, trend?: string, isMining?: boolean, action?: React.ReactNode }) {
  return (
    <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all group shrink-0">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 rounded-lg bg-zinc-900 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div className="flex gap-2 items-center">
          {trend && (
            <span className="text-[10px] font-mono text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">{trend}</span>
          )}
          {isMining !== undefined && (
            <div className={cn(
              "w-2 h-2 rounded-full",
              isMining ? "bg-green-500 animate-pulse glow-bitcoin" : "bg-zinc-600"
            )} />
          )}
        </div>
      </div>
      <div>
        <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-1">{title}</p>
        <h4 className="text-2xl font-bold font-mono tracking-tighter">{value}</h4>
        <div className="flex justify-between items-end mt-1">
          <p className="text-zinc-600 text-[10px]">{subValue}</p>
          {action}
        </div>
      </div>
    </div>
  );
}

interface LogEntryProps {
  msg: string;
  timestamp: string;
  type: string;
}

function LogEntry({ msg, timestamp, type }: LogEntryProps) {
  const color = {
    system: 'text-zinc-500',
    network: 'text-blue-400',
    mining: 'text-bitcoin',
    success: 'text-green-400',
    warning: 'text-yellow-500'
  }[type] || 'text-zinc-300';

  return (
    <div className="flex gap-3 group">
      <span className="text-zinc-700 select-none">[{timestamp}]</span>
      <span className={cn("break-all italic", color)}><span className="opacity-50 mr-1 opacity-0 group-hover:opacity-100 transition-opacity">→</span>{msg}</span>
    </div>
  );
}

function SettingsRow({ title, description, hasSwitch, active, onClick }: { title: string, description: string, hasSwitch?: boolean, active?: boolean, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "p-6 flex items-center justify-between group hover:bg-white/5 transition-colors",
        onClick && "cursor-pointer"
      )}
    >
      <div>
        <h4 className="font-semibold text-sm">{title}</h4>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      {hasSwitch && (
        <div className={cn(
          "w-10 h-5 rounded-full relative p-0.5 transition-colors",
          active ? "bg-bitcoin" : "bg-zinc-800"
        )}>
          <div className={cn(
            "w-4 h-4 rounded-full bg-white transition-transform",
            active ? "translate-x-5" : "translate-x-0"
          )} />
        </div>
      )}
    </div>
  );
}

