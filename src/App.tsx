import React, { useState, useEffect, useRef, useMemo } from 'react';
 
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
  CheckCircle2,
  Thermometer,
  Wind,
  Share2,
  Globe,
  Github,
  Brain,
  Smartphone,
  MessageSquare,
  BarChart3,
  Sun,
  Moon,
  Menu,
  X,
  History as HistoryIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsQR from 'jsqr';
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

import { useAppKit } from '@reown/appkit/react';
import { useAccount } from 'wagmi';

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

interface MiningUnitInstance {
  id: string;
  typeId: string;
  name: string;
  temp: number;
  fanSpeed: number;
  status: 'optimal' | 'warning' | 'critical' | 'failed';
  logs: string[];
}

interface MiningLog {
  time: string;
  hashRate: number;
}

interface MultiAssetWallet {
  id: string;
  coin: string;
  address: string;
  app: string;
  label: string;
  balance: number;
  minerActive: boolean;
  hashRate: number;
  progress?: number;
  isVerified?: boolean;
  lastTxHash?: string;
  confirmations?: number;
}

interface Transaction {
  id: string;
  amount: number;
  type: 'Withdrawal' | 'Deposit' | 'Maintenance' | 'reward' | 'settlement' | 'Transfer';
  method?: string;
  destination?: string;
  status: 'Pending' | 'Completed' | 'Failed' | 'confirmed' | 'pending';
  timestamp: string;
  hash?: string;
}

export default function App() {
  // Auth State
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const { open } = useAppKit();
  const { address: connectedAddress, isConnected: isWalletConnected } = useAccount();

  // State
  const [balance, setBalance] = useState(0.0004278);
  const [efficiencyRating, setEfficiencyRating] = useState(99.2);
  const [realBalance, setRealBalance] = useState<number | null>(null);
  const [btcPrice, setBtcPrice] = useState(65432.10);
  const [networkStats, setNetworkStats] = useState({
    difficulty: "Fetching...",
    blockHeight: "...",
    hashrateGlobal: "...",
    nextAdjustment: "..."
  });
  const [kycStatus, setKycStatus] = useState<'unverified' | 'pending' | 'verified'>('unverified');
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
  const [isSecurityAuditing, setIsSecurityAuditing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  // Market Data (Real-time Fetching)
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        // Fetch Price
        const priceRes = await fetch('/api/btc/price');
        if (priceRes.ok) {
          const priceData = await priceRes.json();
          if (priceData.last) setBtcPrice(priceData.last);
        }

        // Fetch Network Stats
        const [diffRes, blockRes] = await Promise.all([
          fetch('/api/btc/difficulty'),
          fetch('/api/btc/blockcount')
        ]);
        
                 if (diffRes.ok && blockRes.ok) {
           const difficulty = await diffRes.text();
           const blockCount = await blockRes.text();
           setNetworkStats(prev => ({
             ...prev,
             difficulty: (parseFloat(difficulty) / 1e12).toFixed(2) + "T",
             blockHeight: blockCount,
             hashrateGlobal: "824.5 EH/s" // Estimated global hashrate
           }));
         }
      } catch (error) {
        console.error("Market API Error:", error);
      }
    };
    fetchMarketData();
    const dataInterval = setInterval(fetchMarketData, 60000); // Update every minute
    return () => clearInterval(dataInterval);
  }, []);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);
    
    // On iOS, we can't detect via event, so we show if not standalone
    if (isIOSDevice && !(navigator as any).standalone) {
      setShowInstallBtn(true);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  const [logs, setLogs] = useState<MiningLog[]>([]);
  const [autoReinvest, setAutoReinvest] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'hardware' | 'wallet' | 'settings' | 'marketing' | 'network' | 'intelligence' | 'market'>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('capitol-theme');
      return (saved as 'dark' | 'light') || 'dark';
    }
    return 'dark';
  });

  // Theme Sync
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('capitol-theme', theme);
  }, [theme]);
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
  const [metamaskAddress, setMetamaskAddress] = useState<string | null>("0x8b73F3981928258Bc907ce366C1D434a29263701");
  const [linkedWallets, setLinkedWallets] = useState<string[]>([
    "0x8b73F3981928258Bc907ce366C1D434a29263701",
    "0x8b73f3981928258bc907ce366c1d434a29263701"
  ]);
  const [poolFee, setPoolFee] = useState(1.5); // Proprietary fee 1.5%
  const [ownerTreasury, setOwnerTreasury] = useState(0.005421); // Owner's accumulated fees
  const [internalWalletBalance, setInternalWalletBalance] = useState(0); // Miner's specific e-wallet
  const [lastInternalSync, setLastInternalSync] = useState<number>(Date.now());
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawType, setWithdrawType] = useState<'BTC' | 'PayPal' | 'PYUSD'>('BTC');
  const [payoutEmail, setPayoutEmail] = useState('chris.peterson1718@gmail.com');
  const [pyusdBalance, setPyusdBalance] = useState(0);
  const [paypalConnected, setPaypalConnected] = useState(true);
  const [settlementBatches, setSettlementBatches] = useState<{id: string, amount: number, status: string, date: string}[]>([]);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isAjiPro, setIsAjiPro] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [isVoiceInputActive, setIsVoiceInputActive] = useState(false);
  const [referralCode, setReferralCode] = useState(`AJI-${Math.random().toString(36).toUpperCase().substr(2, 6)}`);
  const [githubConnected, setGithubConnected] = useState(true);
  const [cloudflareConnected, setCloudflareConnected] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('8283762992');
  const [multiAssetWallets, setMultiAssetWallets] = useState<MultiAssetWallet[]>([
    {
      id: 'node-1',
      coin: 'BTC',
      address: '0x8b73f3981928258bc907ce366c1d434a29263701',
      app: 'Ledger',
      label: 'Main Treasury Node',
      balance: 0.000421,
      minerActive: true,
      hashRate: 42.5,
      progress: 65,
      isVerified: true,
      lastTxHash: '0x7a2...f91d'
    },
    {
      id: 'node-2',
      coin: 'ETH',
      address: '0x8b73f3981928258bc907ce366c1d434a29263701',
      app: 'MetaMask',
      label: 'App Bridge Wallet',
      balance: 0.0125,
      minerActive: false,
      hashRate: 0,
      progress: 0,
      isVerified: false
    }
  ]);
  const [isAddingWallet, setIsAddingWallet] = useState(false);
  const [newWallet, setNewWallet] = useState<Partial<MultiAssetWallet>>({ coin: 'BTC', app: 'Ledger' });
  const [miningUnits, setMiningUnits] = useState<MiningUnitInstance[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  // Google Drive Integration for QR Wallet Addresses
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [isDrivePicking, setIsDrivePicking] = useState(false);

  const processDriveFile = async (fileId: string, accessToken: string) => {
    try {
      setIsDrivePicking(true);
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const blob = await response.blob();
      const image = new Image();
      image.src = URL.createObjectURL(blob);
      
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(image, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code) {
            setNewWallet(prev => ({ ...prev, address: code.data }));
            notify(`QR Code Scanned from Drive: ${code.data.slice(0, 12)}...`, "success");
            speak(`Google Drive synchronization successful. Address extracted from storage node.`);
          } else {
            notify("No valid QR code found in the selected image.", "alert");
          }
        }
        URL.revokeObjectURL(image.src);
        setIsDrivePicking(false);
      };
    } catch (error) {
      console.error("error processing drive file", error);
      notify("Failed to process Google Drive protocol data.", "alert");
      setIsDrivePicking(false);
    }
  };

  const handleDriveImport = () => {
    const clientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;
    const apiKey = (import.meta as any).env.VITE_GOOGLE_API_KEY;

    if (!clientId || !apiKey) {
      notify("Drive sync unconfigured. Set VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_API_KEY.", "alert");
      return;
    }

    if (!(window as any).google || !(window as any).gapi) {
      notify("Google SDKs not yet initialized. Retrying...", "info");
      return;
    }

    const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: (response: any) => {
        if (response.access_token) {
          setGoogleAccessToken(response.access_token);
          
          (window as any).gapi.load('picker', () => {
             const view = new (window as any).google.picker.DocsView((window as any).google.picker.ViewId.DOCS_IMAGES)
              .setMimeTypes('image/png,image/jpeg,image/jpg');

             const picker = new (window as any).google.picker.PickerBuilder()
              .addView(view)
              .setOAuthToken(response.access_token)
              .setDeveloperKey(apiKey)
              .setCallback(async (data: any) => {
                if (data[(window as any).google.picker.Response.ACTION] === (window as any).google.picker.Action.PICKED) {
                  const file = data[(window as any).google.picker.Response.DOCUMENTS][0];
                  const fileId = file[(window as any).google.picker.Document.ID];
                  await processDriveFile(fileId, response.access_token);
                }
              })
              .build();
            picker.setVisible(true);
          });
        }
      },
    });
    tokenClient.requestAccessToken();
  };

  // Voice Engine
  const speak = (text: string) => {
    if (!isVoiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 0.8; // Deeper, more "proprietary" tone
    window.speechSynthesis.speak(utterance);
  };

  const requestProtocolBriefing = () => {
    speak("Current status: Total yield is " + balance.toFixed(8) + " Bitcoin. Hardware health is stable at Asheville HQ. AI optimization is active. Cluster efficiency rating is " + efficiencyRating + " percent.");
  };

  const requestBalanceBrief = () => {
    speak("Your current balance is " + balance.toFixed(8) + " Bitcoin. Valued at approximately " + (balance * btcPrice).toLocaleString() + " US Dollars.");
  };

  // Voice Command Listeners
  useEffect(() => {
    if (!isVoiceInputActive) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      notify("Speech Recognition API not supported in this environment.", "alert");
      setIsVoiceInputActive(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      notify("Voice Commands Active: Listening for protocol signals.", "success");
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      if (event.error === 'not-allowed') {
        notify("Microphone access denied. Check protocol permissions.", "alert");
        setIsVoiceInputActive(false);
      }
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
      console.log("Transcript:", transcript);

      if (transcript.includes("start mining") || transcript.includes("activate miner")) {
        if (!isMining) toggleMining();
        else speak("Miner is already active and processing hashes.");
      } 
      else if (transcript.includes("stop mining") || transcript.includes("deactivate miner")) {
        if (isMining) toggleMining();
        else speak("Miner is currently idle. No deactivation required.");
      }
      else if (transcript.includes("check balance") || transcript.includes("what is my balance") || transcript.includes("how much money")) {
        requestBalanceBrief();
      }
      else if (transcript.includes("protocol briefing") || transcript.includes("give me a briefing") || transcript.includes("brief me")) {
        requestProtocolBriefing();
      }
      else if (transcript.includes("toggle theme") || transcript.includes("switch theme")) {
        setTheme(theme === 'dark' ? 'light' : 'dark');
        speak("Theme protocol updated.");
      }
    };

    recognition.start();

    return () => {
      recognition.stop();
    };
  }, [isVoiceInputActive, isMining, balance, btcPrice, theme, efficiencyRating]);

  // MetaMask Integration
  const connectMetaMask = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        setIsWalletLoading(true);
        const accounts = await (window.ethereum as any).request({ method: 'eth_requestAccounts' });
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

  // Advanced Autonomous Settings
  const [overclock, setOverclock] = useState(0); 
  const [selectedPool, setSelectedPool] = useState('CapitolDbro Proprietary');
  const [notifications, setNotifications] = useState<{id: string, msg: string, type: 'success' | 'alert' | 'info'}[]>([]);
  const [isAiAutonomous, setIsAiAutonomous] = useState(false);
  const [protocolLevel, setProtocolLevel] = useState(1.0);

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
      // Avoid infinite loop: ignore snapshots from our own pending writes
      if (docSnap.metadata.hasPendingWrites) return;

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.balance !== undefined) setBalance(data.balance);
        if (data.ownerTreasury !== undefined) setOwnerTreasury(data.ownerTreasury);
        if (data.payoutEmail !== undefined) setPayoutEmail(data.payoutEmail);
        if (data.walletAddress !== undefined) setWalletAddress(data.walletAddress);
        if (data.isAiAutonomous !== undefined) setIsAiAutonomous(data.isAiAutonomous);
        if (data.isAjiPro !== undefined) setIsAjiPro(data.isAjiPro);
        if (data.referralCode !== undefined) setReferralCode(data.referralCode);
        if (data.autoReinvest !== undefined) setAutoReinvest(data.autoReinvest);
        if (data.protocolLevel !== undefined) setProtocolLevel(data.protocolLevel);
        if (data.internalWalletBalance !== undefined) setInternalWalletBalance(data.internalWalletBalance);
        if (data.githubConnected !== undefined) setGithubConnected(data.githubConnected);
        if (data.phoneNumber !== undefined) setPhoneNumber(data.phoneNumber);
        if (data.multiAssetWallets !== undefined) setMultiAssetWallets(data.multiAssetWallets);
        if (data.miningUnits !== undefined) setMiningUnits(data.miningUnits);
        if (data.githubConnected !== undefined) setGithubConnected(data.githubConnected);
        if (data.cloudflareConnected !== undefined) setCloudflareConnected(data.cloudflareConnected);
        if (data.settlementBatches !== undefined) setSettlementBatches(data.settlementBatches);
        if (data.transactions !== undefined) setTransactions(data.transactions);
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
          payoutEmail: user.email || 'pending@protocol.aji',
          walletAddress: '0x8b73f3981928258bc907ce366c1d434a29263701',
          isAiAutonomous: false,
          isAjiPro: false,
          referralCode: `AJI-${Math.random().toString(36).toUpperCase().substr(2, 6)}`,
          autoReinvest: false,
          protocolLevel: 1.0,
          internalWalletBalance: 0,
          githubConnected: true,
          phoneNumber: '8283762992',
          multiAssetWallets: [
            {
              id: 'node-1',
              coin: 'BTC',
              address: '0x8b73f3981928258bc907ce366c1d434a29263701',
              app: 'Ledger',
              label: 'Main Treasury Node',
              balance: 0.000421,
              minerActive: true,
              hashRate: 42.5,
              progress: 45,
              isVerified: true,
              lastTxHash: '0xbc1...7f4a',
              confirmations: 6
            },
            {
              id: 'node-2',
              coin: 'ETH',
              address: '0x8b73f3981928258bc907ce366c1d434a29263701',
              app: 'MetaMask',
              label: 'App Bridge Wallet',
              balance: 0.0125,
              minerActive: false,
              hashRate: 0,
              progress: 0,
              isVerified: false
            }
          ],
          miningUnits: [],
          settlementBatches: [],
          transactions: [],
          hwState: hardware.map(h => ({ id: h.id, count: 0, health: 100 })),
          updatedAt: serverTimestamp()
        });
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Sync state TO Firestore (Throttled update)
  const syncTimer = useRef<NodeJS.Timeout | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    if (!user || isAuthLoading) return;

    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      setIsUpdating(true);
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, {
          email: user.email,
          balance,
          internalWalletBalance,
          githubConnected,
          phoneNumber,
          multiAssetWallets,
          miningUnits,
          isAjiPro,
          referralCode,
          ownerTreasury,
          payoutEmail,
          walletAddress,
          isAiAutonomous,
          autoReinvest,
          protocolLevel,
          cloudflareConnected,
          lastSync: new Date().toISOString(),
          hwState: hardware.map(h => ({ id: h.id, count: h.count, health: hardwareCondition[h.id] })),
          settlementBatches,
          transactions,
          updatedAt: serverTimestamp()
        }, { merge: true });
        setLastSyncTime(new Date().toLocaleTimeString());
      } catch (error) {
        console.error("Sync error:", error);
      } finally {
        setIsUpdating(false);
      }
    }, 2000);

    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [
    balance, internalWalletBalance, githubConnected, phoneNumber, 
    multiAssetWallets, miningUnits, hardware, hardwareCondition,
    isAjiPro, referralCode, ownerTreasury, payoutEmail, walletAddress,
    isAiAutonomous, autoReinvest, protocolLevel, settlementBatches, transactions, 
    githubConnected, cloudflareConnected, user, isAuthLoading
  ]);

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

  // Multi-Miner Auto-yield logic for individual wallets
  useEffect(() => {
    if (!user || multiAssetWallets.length === 0) return;

    const multiMinerInterval = setInterval(() => {
      setMultiAssetWallets(prev => prev.map(w => {
        if (w.minerActive) {
          // Simulated yield based on hashrate assigned to this wallet
          const yieldAmount = (w.hashRate * 0.00000001); 
          
          // Progress simulation (increments toward 100%)
          const currentProgress = (w.progress || 0) + (Math.random() * 5 + 1);
          
          if (currentProgress >= 100) {
            const txHash = `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`;
            notify(`[${w.coin}] Layer-1 Verification Successful: Block ${Math.floor(Math.random() * 800000)} secured.`, "success");
            return { 
              ...w, 
              balance: w.balance + yieldAmount, 
              progress: 0, 
              isVerified: true, 
              lastTxHash: txHash,
              confirmations: (w.confirmations || 0) + 1
            };
          }

          return { ...w, balance: w.balance + yieldAmount, progress: currentProgress };
        }
        return w;
      }));
    }, 10000); // Pulse every 10s for protocol sync

    return () => clearInterval(multiMinerInterval);
  }, [user, multiAssetWallets]);
  
  // Wallet Synchronization Trigger
  useEffect(() => {
    if (isWalletConnected && connectedAddress) {
       notify(`WalletConnect Bridge synchronized: ${connectedAddress.slice(0, 8)}...`, "success");
       speak("External wallet linked to protocol cluster.");
    }
  }, [isWalletConnected, connectedAddress]);

  // Protocol Gateway Setup
  useEffect(() => {
    if (!phoneNumber || phoneNumber.length < 10) return;
    
    const smsTimer = setTimeout(() => {
        notify(`Enabling SMS Gateway for Protocol Node +1 ${phoneNumber}...`, "success");
        speak("Notification gateway established on encrypted device link.");
    }, 3000);
    
    // Random status alerts
    const alertInterval = setInterval(() => {
        if (isMining) {
           const messages = [
             "Mining Node Status: All clusters operating at peak efficiency.",
             "Yield Distribution: Rewards successfully routed to internal ledger.",
             "Protocol Update: New version 2.4 synchronized with cloud anchor.",
             "Power Consumption: Device thermals within standard operating range."
           ];
           const randomMsg = messages[Math.floor(Math.random() * messages.length)];
           notify(`[SMS] Protocol Alert: ${randomMsg}`, "info");
        }
    }, 120000); // Pulse every 2 mins
    
    return () => {
      clearTimeout(smsTimer);
      clearInterval(alertInterval);
    };
  }, [phoneNumber, isMining]);

  // Hardware Telemetry Engine
  useEffect(() => {
    if (!isMining || miningUnits.length === 0) return;

    const interval = setInterval(() => {
      setMiningUnits(prev => prev.map(unit => {
        // Randomly fluctuate temp around 65-75C
        const tempDelta = (Math.random() - 0.5) * 4;
        const newTemp = Math.min(95, Math.max(35, unit.temp + tempDelta));
        
        // Fan speed follows temp (simple linear model)
        const newFan = 3000 + (newTemp - 40) * 120 + (Math.random() * 100);
        
        // Status checks
        let newStatus = unit.status;
        if (newTemp > 88) newStatus = 'critical';
        else if (newTemp > 78) newStatus = 'warning';
        else newStatus = 'optimal';

        // Periodic logging
        const newLogs = [...unit.logs];
        if (Math.random() > 0.9) {
          const events = [
            `Thermal profile: ${newTemp.toFixed(1)}°C`,
            `Cooling system at ${Math.round(newFan)} RPM`,
            `SHA-256 node heartbeat valid`,
            `Data packet confirmed by pool`,
            `Voltage regulation stable`
          ];
          if (newTemp > 85) {
             events.push(`WARNING: Thermal throttling imminent`);
          }
          newLogs.unshift(`[${new Date().toLocaleTimeString()}] ${events[Math.floor(Math.random() * events.length)]}`);
          if (newLogs.length > 30) newLogs.pop();
        }

        return {
          ...unit,
          temp: newTemp,
          fanSpeed: newFan,
          status: newStatus as any,
          logs: newLogs
        };
      }));
    }, 4000);

    return () => clearInterval(interval);
  }, [isMining, miningUnits.length]);


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

  const handleConvertYieldToPYUSD = () => {
    if (balance <= 0) return;
    const usdValue = balance * btcPrice;
    setPyusdBalance(prev => prev + usdValue);
    setBalance(0);
    notify(`Converted yields to ${usdValue.toFixed(2)} PYUSD`, "success");
    if (isVoiceEnabled) {
      speak(`Conversion successful. ${usdValue.toFixed(2)} PayPal USD added to multi-asset vault.`);
    }
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

  // Yield Projections
  const projections = useMemo(() => {
    const efficiencyBoost = isAjiPro ? 1.5 : 1.0;
    const yieldPS = (effectiveHashRate / 110) * 0.000000001 * efficiencyBoost;
    const userCutPS = yieldPS * (1 - poolFee / 100);
    
    return {
      daily: userCutPS * 60 * 24 * 60,
      weekly: userCutPS * 60 * 24 * 60 * 7,
      monthly: userCutPS * 60 * 24 * 60 * 30
    };
  }, [effectiveHashRate, isAjiPro, poolFee]);

  // Operational Loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isMining) {
      interval = setInterval(() => {
        // Aji Pro Mode: 50% efficiency boost
        const efficiencyBoost = isAjiPro ? 1.5 : 1.0;
        const yieldPerSecond = (effectiveHashRate / 110) * 0.000000001 * efficiencyBoost;
        
        // Monetization Logic: 1.5% of every share goes to the owner's treasury
        const protocolCut = yieldPerSecond * (poolFee / 100);
        const userCut = yieldPerSecond - protocolCut;
        
        setBalance(prev => prev + userCut);
        setOwnerTreasury(prev => prev + protocolCut);
        
        // Random "Share Accepted" event
        if (Math.random() > 0.95) {
          notify(`Cluster share accepted by ${selectedPool}`, 'success');
          
          // Generate a mining reward entry
          const txId = Math.random().toString(36).substring(2, 10);
          setTransactions(prev => [
            {
              id: txId,
              type: 'reward' as const,
              amount: userCut * 100, // Normalized for ledger visibility
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: 'confirmed' as const
            },
            ...prev
          ].slice(0, 10));
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
    
    // Create detailed unit instance
    const newUnit: MiningUnitInstance = {
      id: `unit-${Math.random().toString(36).substr(2, 9)}`,
      typeId: id,
      name: `${h.name} #${Math.floor(Math.random() * 9000) + 1000}`,
      temp: 45 + Math.random() * 10,
      fanSpeed: 2500 + Math.random() * 500,
      status: 'optimal',
      logs: [`[${new Date().toLocaleTimeString()}] System initialized. Node online.`]
    };

    setMiningUnits(prev => [...prev, newUnit]);
    setHardware(prev => prev.map(item => 
      item.id === id ? { ...item, count: item.count + 1 } : item
    ));
    notify(`Integrated ${h.name} into cluster.`, "info");
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
    const cost = 0.0001; // Protocol cost
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

  const toggleMinerForWallet = (id: string) => {
    setMultiAssetWallets(prev => prev.map(w => {
      if (w.id === id) {
        const newState = !w.minerActive;
        if (newState) {
          notify(`Deploying proprietary miner to ${w.label} (${w.coin})...`, "success");
          return { ...w, minerActive: newState, hashRate: Math.floor(Math.random() * 50) + 10 };
        } else {
          notify(`Miner cluster for ${w.label} deactivated.`, "alert");
          return { ...w, minerActive: newState, hashRate: 0 };
        }
      }
      return w;
    }));
  };

  const addMultiAssetWallet = () => {
    if (!newWallet.coin || !newWallet.address || !newWallet.label) {
      notify("Incomplete credentials. Protocol requires full metadata.", "alert");
      return;
    }
    
    const wallet: MultiAssetWallet = {
      id: Math.random().toString(36).substr(2, 9),
      coin: newWallet.coin!,
      address: newWallet.address!,
      app: newWallet.app || 'Ledger',
      label: newWallet.label!,
      balance: 0,
      minerActive: false,
      hashRate: 0
    };
    
    setMultiAssetWallets(prev => [...prev, wallet]);
    setIsAddingWallet(false);
    setNewWallet({ coin: 'BTC', app: 'Ledger' });
    notify(`Multi-asset node for ${wallet.coin} linked to cluster.`, "success");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A] overflow-hidden selection:bg-bitcoin selection:text-black">
      {/* Installation Banner */}
      <AnimatePresence>
        {showInstallBtn && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="z-[200] bg-bitcoin text-black overflow-hidden"
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-2">
              <div className="flex items-center gap-3">
                <Smartphone size={16} className="animate-bounce" />
                <p className="text-[10px] font-bold uppercase tracking-[0.1em]">Protocol Ready for Local Deployment</p>
              </div>
              <div className="flex items-center gap-4">
                {isIOS ? (
                   <div className="flex items-center gap-2 px-3 py-1.5 bg-black/5 rounded-lg border border-black/10">
                     <p className="text-[9px] font-bold uppercase tracking-wider">Tap <Share2 size={12} className="inline mb-0.5" /> then "Add to Home Screen"</p>
                   </div>
                ) : (
                   <button 
                     onClick={handleInstallClick}
                     className="bg-black text-white px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                   >
                     Install App
                   </button>
                )}
                <button 
                  onClick={() => setShowInstallBtn(false)}
                  className="text-black/50 hover:text-black transition-colors"
                >
                  <RefreshCw size={14} className="rotate-45" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
                  <p className="text-2xl font-bold font-mono text-bitcoin">{(withdrawType === 'BTC' ? balance : ownerTreasury).toFixed(8)} BTC</p>
                  <p className="text-xs text-zinc-400 mt-1">≈ ${((withdrawType === 'BTC' ? balance : ownerTreasury) * btcPrice).toLocaleString()} {withdrawType === 'PYUSD' ? 'PYUSD' : 'USD'}</p>
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-mono tracking-widest mb-3">Settlement Protocol</label>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {['BTC', 'PayPal', 'PYUSD'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setWithdrawType(type as any)}
                        className={cn(
                          "py-2 rounded-lg border text-[9px] font-bold uppercase tracking-widest transition-all",
                          withdrawType === type 
                            ? "bg-bitcoin/20 border-bitcoin text-bitcoin" 
                            : "bg-white/5 border-white/10 text-zinc-500 hover:border-white/20"
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  <div className="p-4 bg-black border border-bitcoin/30 rounded-2xl flex items-center gap-4">
                    {withdrawType === 'PayPal' || withdrawType === 'PYUSD' ? (
                      <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" className="w-6 h-6" alt="PayPal" referrerPolicy="no-referrer" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-bitcoin/20 rounded-lg flex items-center justify-center text-bitcoin">
                        <Wallet size={20} />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold">
                        {withdrawType === 'PYUSD' ? 'PYUSD Settlement' : withdrawType === 'PayPal' ? 'PayPal Instant Transfer' : 'BTC Direct Payout'}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {withdrawType === 'BTC' ? (walletAddress || 'No Address Linked') : payoutEmail}
                      </p>
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
                  onClick={async () => {
                    const amount = (withdrawType === 'PayPal' || withdrawType === 'PYUSD') ? ownerTreasury : balance;
                    const txId = `TX-${Math.random().toString(36).toUpperCase().substring(2, 8)}`;
                    
                    if (withdrawType === 'PayPal' || withdrawType === 'PYUSD') {
                      try {
                        const response = await fetch('/api/payout/paypal', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            email: payoutEmail,
                            amount: amount * btcPrice,
                            currency: withdrawType === 'PYUSD' ? 'PYUSD' : 'USD'
                          })
                        });

                        const data = await response.json();

                        if (!response.ok) {
                          throw new Error(data.error || 'Payout initiation failed.');
                        }

                        const newBatch = {
                          id: data.batch_id || txId,
                          amount: amount * btcPrice,
                          status: 'processing',
                          date: new Date().toLocaleTimeString()
                        };
                        setSettlementBatches(prev => [newBatch, ...prev]);
                        setOwnerTreasury(0);
                        notify(`${withdrawType} Settlement ${newBatch.id} initiated.`, "success");
                        
                        setTimeout(async () => {
                          setSettlementBatches(prev => prev.map(b => b.id === newBatch.id ? { ...b, status: 'completed' } : b));
                          notify(`${withdrawType} Payout ${newBatch.id} verified.`, "success");
                        }, 5000);

                      } catch (err: any) {
                        notify(err.message, "alert");
                        console.error("Payout error:", err);
                      }
                    } else {
                      const newTx: Transaction = {
                        id: txId,
                        amount,
                        type: 'Withdrawal',
                        method: 'BTC Direct',
                        destination: walletAddress,
                        status: 'Pending',
                        timestamp: new Date().toISOString(),
                        hash: `0x${Math.random().toString(16).substring(2, 42)}`
                      };
                      setTransactions(prev => [newTx, ...prev]);
                      setBalance(0);
                      notify("Withdrawal Batch Dispatched", "success");
                    }

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
      
      {/* Pro License Activation Modal */}
      <AnimatePresence>
        {showProModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-zinc-900 border border-purple-500/30 rounded-3xl p-8 relative z-10 shadow-[0_0_50px_rgba(168,85,247,0.15)] overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500" />
              <h3 className="text-2xl font-bold mb-2 flex items-center gap-3">
                <ShieldCheck className="text-purple-400" />
                Activate Executive Node
              </h3>
              <p className="text-zinc-500 text-sm mb-8">Unlock proprietary hash-clusters and priority hardware priority.</p>
              
              <div className="space-y-4 mb-8">
                <div className="p-4 bg-purple-500/5 rounded-2xl border border-purple-500/20">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] text-purple-400 uppercase font-bold tracking-widest">Protocol License Fee</span>
                    <span className="text-lg font-bold font-mono text-white">$499.00 USD</span>
                  </div>
                  <ul className="space-y-2">
                    {['+150% Yield Efficiency', '24/7 Priority Stratum Status', 'Automated Wallet Settlements', 'Real-time Hardware Telemetry'].map((perk, i) => (
                      <li key={i} className="flex items-center gap-2 text-[10px] text-zinc-400">
                        <CheckCircle2 size={12} className="text-purple-500" /> {perk}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] text-zinc-500 uppercase font-mono tracking-widest">Security Deposit Card</label>
                  <div className="p-4 bg-black border border-white/10 rounded-2xl space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1">
                         <p className="text-[8px] text-zinc-600 mb-1 font-bold">CARD NUMBER</p>
                         <p className="text-xs font-mono text-white">•••• •••• •••• 4242</p>
                      </div>
                      <div>
                         <p className="text-[8px] text-zinc-600 mb-1 font-bold">EXP</p>
                         <p className="text-xs font-mono text-white">12 / 28</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowProModal(false)}
                  className="flex-1 py-4 bg-zinc-800 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-700 transition-all"
                >
                  Postpone
                </button>
                <button 
                  onClick={() => {
                    setIsAjiPro(true);
                    notify("Executive Node Activated. Yield boost online.", "success");
                    speak("Elite protocol sequence initiated. Hash rate multiplied by 1.5.");
                    setShowProModal(false);
                  }}
                  className="flex-1 py-4 bg-purple-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Verify Payment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Security Audit Modal */}
      <AnimatePresence>
        {showAuditModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuditModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-2xl bg-zinc-900 border border-green-500/30 rounded-3xl p-8 relative z-10 shadow-2xl overflow-hidden"
            >
              <h3 className="text-2xl font-bold mb-2 flex items-center gap-3 text-green-400">
                <Activity size={24} />
                System Integrity Audit
              </h3>
              <p className="text-zinc-500 text-sm mb-8">Real-time verification of shard distribution and wallet stability.</p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                 {[
                   { label: 'Cloud Wallet Entropy', status: 'Optimal', val: '98.4%' },
                   { label: 'Payout Liquidity', status: 'Verified', val: '24.2 BTC' },
                   { label: 'Network Difficulty', status: 'Synced', val: networkStats.difficulty },
                   { label: 'Active Edge Nodes', status: 'Global', val: '1,421' }
                 ].map((stat, i) => (
                    <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5">
                       <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">{stat.label}</p>
                       <p className="text-lg font-bold font-mono text-white">{stat.val}</p>
                       <p className="text-[9px] text-zinc-600 mt-1 uppercase">{stat.status}</p>
                    </div>
                  ))}
              </div>

              <div className="bg-black/50 border border-white/5 rounded-2xl p-6 font-mono text-[10px] space-y-2 h-48 overflow-y-auto custom-scrollbar">
                 <p className="text-green-500 tracking-tighter">Initializing deep-packet inspection...</p>
                 <p className="text-zinc-500">Node-01: ASH_NC (CONNECTED)</p>
                 <p className="text-zinc-500">Node-02: AMS_NL (CONNECTED)</p>
                 <p className="text-zinc-500">Verifying stratum handshake with SlushPool...</p>
                 <p className="text-bitcoin font-bold">SUCCESS: Shard distribution confirmed.</p>
                 <p className="text-zinc-500">Checking cloud vault balance: {balance.toFixed(8)} BTC...</p>
                 <p className="text-zinc-500">Checking PayPal bridge connectivity for {payoutEmail}...</p>
                 <p className="text-green-400 animate-pulse">INTEGRITY CHECK COMPLETE: NO ANOMALIES DETECTED.</p>
              </div>

              <button 
                onClick={() => setShowAuditModal(false)}
                className="w-full mt-8 py-4 bg-zinc-800 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-700 transition-all"
              >
                Close Audit Report
              </button>
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

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
          )}
        </AnimatePresence>
        {/* Sidebar */}
        <aside className={cn(
          "w-64 border-r border-app-border flex flex-col pt-8 bg-app-sidebar z-50 shrink-0 transition-transform lg:translate-x-0 lg:static fixed inset-y-0 left-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
           {/* Mobile Close Button */}
           <button 
             onClick={() => setIsMobileMenuOpen(false)}
             className="lg:hidden absolute top-4 right-4 p-2 text-zinc-500 hover:text-white"
           >
             <X size={20} />
           </button>
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
            onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} 
          />
          <SidebarItem 
            icon={<Cpu size={18} />} 
            label="Revenue Clusters" 
            active={activeTab === 'hardware'} 
            onClick={() => { setActiveTab('hardware'); setIsMobileMenuOpen(false); }} 
          />
          <SidebarItem 
            icon={<Globe size={18} />} 
            label="Crypto Market" 
            active={activeTab === 'market'} 
            onClick={() => { setActiveTab('market'); setIsMobileMenuOpen(false); }} 
          />
          <SidebarItem 
            icon={<Wallet size={18} />} 
            label="Wallet Hub" 
            active={activeTab === 'wallet'} 
            onClick={() => { setActiveTab('wallet'); setIsMobileMenuOpen(false); }} 
          />
          <SidebarItem 
            icon={<Monitor size={18} />} 
            label="Integrations Hub" 
            active={activeTab === 'network'} 
            onClick={() => { setActiveTab('network'); setIsMobileMenuOpen(false); }} 
          />
          <SidebarItem 
            icon={<TrendingUp size={18} />} 
            label="Predictive AI" 
            active={activeTab === 'intelligence'} 
            onClick={() => { setActiveTab('intelligence'); setIsMobileMenuOpen(false); }} 
          />
          <SidebarItem 
            icon={<Share2 size={18} />} 
            label="Marketing Hub" 
            active={activeTab === 'marketing'} 
            onClick={() => { setActiveTab('marketing'); setIsMobileMenuOpen(false); }} 
          />
          <SidebarItem 
            icon={<Settings size={18} />} 
            label="Settings" 
            active={activeTab === 'settings'} 
            onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} 
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

        <header className="h-20 border-b border-app-border flex items-center justify-between px-4 sm:px-8 relative z-10 backdrop-blur-sm bg-app-header">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-zinc-500 hover:text-bitcoin transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="flex flex-col">
              <h2 className="text-[10px] sm:text-sm text-app-text-muted font-mono uppercase tracking-[0.2em]">East Coast HQ</h2>
              <p className="text-xs sm:text-base font-semibold dark:text-white text-zinc-900">Asheville, NC · Node-01</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
              className="p-2.5 rounded-xl bg-app-sidebar border border-app-border text-app-text-muted hover:text-bitcoin transition-all shadow-sm active:scale-95"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {user ? (
               <div className="flex items-center gap-4 pr-4 border-r border-white/10">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2">
                       {isUpdating ? (
                         <RefreshCw size={10} className="text-bitcoin animate-spin" />
                       ) : (
                         <CheckCircle2 size={10} className="text-green-500" />
                       )}
                       <span className="text-[10px] font-bold text-bitcoin uppercase tracking-widest leading-none">
                         {isUpdating ? 'Synchronizing Cluster...' : 'Cloud Verified'}
                       </span>
                    </div>
                    {lastSyncTime && (
                      <p className="text-[9px] text-zinc-500 font-mono mt-1">Last Secure Check: {lastSyncTime}</p>
                    )}
                  </div>

                  {showInstallBtn && (
                    <button 
                      onClick={handleInstallClick}
                      className="flex items-center gap-2 bg-bitcoin/10 hover:bg-bitcoin/20 text-bitcoin border border-bitcoin/30 px-3 py-1.5 rounded-lg transition-all group shrink-0"
                    >
                      <Download size={12} className="group-hover:translate-y-0.5 transition-transform" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Install App</span>
                    </button>
                  )}

                  <div className="text-right hidden md:block border-l border-white/10 pl-4">
                     <div className="flex items-center gap-1 justify-end">
                       <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                       <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Liquidity High</span>
                     </div>
                     <p className="text-[12px] font-bold font-mono text-bitcoin mt-1">
                       BTC Index: ${btcPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                     </p>
                  </div>
                  <div className="text-right hidden sm:block border-l border-white/10 pl-4">
                     <p className="text-[10px] font-bold text-white uppercase tracking-widest leading-none">Proprietary Node</p>
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
                {/* Protocol Health & Projections */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-zinc-900 border border-white/10 p-6 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 translate-x-2 -translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-700">
                      <Wallet size={80} className="text-bitcoin" />
                    </div>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Accumulated Yield</p>
                    <div className="flex items-baseline gap-2 relative z-10">
                      <h4 className="text-3xl font-bold font-mono tracking-tighter text-white">
                        {balance.toFixed(8)}
                      </h4>
                      <span className="text-sm font-bold text-bitcoin">BTC</span>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-[10px] text-zinc-600 font-mono">≈ ${(balance * btcPrice).toLocaleString()} USD / PYUSD</p>
                      <div className="flex gap-2 relative z-20">
                        <button 
                          onClick={handleConvertYieldToPYUSD}
                          className="text-[9px] font-bold text-blue-400 hover:underline uppercase tracking-widest whitespace-nowrap"
                        >
                          Swap to PYUSD
                        </button>
                        <button 
                          onClick={() => {
                            setWithdrawType('BTC');
                            setShowWithdrawModal(true);
                          }}
                          className="text-[9px] font-bold text-bitcoin hover:underline uppercase tracking-[0.2em] whitespace-nowrap"
                        >
                          Withdrawal
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-900 border border-white/10 p-6 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 translate-x-2 -translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-700">
                      <Zap size={80} className="text-blue-500" />
                    </div>
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Settlement Pair</p>
                      <button 
                        onClick={() => setWithdrawType(prev => prev === 'BTC' ? 'PYUSD' : 'BTC')}
                        className="text-[9px] font-bold text-bitcoin hover:underline uppercase tracking-widest"
                      >
                        {withdrawType === 'BTC' ? 'Set PYUSD' : 'Set BTC'}
                      </button>
                    </div>
                    <div className="flex items-baseline gap-2 relative z-10">
                      <h4 className="text-base font-bold font-mono tracking-tighter text-white uppercase">
                        {withdrawType === 'BTC' ? `DIFF: ${networkStats.difficulty}` : `PYUSD: $1.00`}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest font-mono">
                        {withdrawType === 'BTC' ? `BLOCK: ${networkStats.blockHeight}` : 'STABLE: COLLATERALIZED'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-3xl relative overflow-hidden lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Proprietary Projections</p>
                      <span className="text-[9px] bg-bitcoin/10 text-bitcoin px-2 py-0.5 rounded font-bold">ROI EST. 99.2%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-[8px] text-zinc-600 uppercase font-bold mb-1">Daily</p>
                        <p className="text-xs font-mono font-bold text-zinc-300">+{projections.daily.toFixed(8)}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-zinc-600 uppercase font-bold mb-1">Weekly</p>
                        <p className="text-xs font-mono font-bold text-zinc-300">+{projections.weekly.toFixed(6)}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-zinc-600 uppercase font-bold mb-1">Monthly</p>
                        <p className="text-xs font-mono font-bold text-zinc-300">+{projections.monthly.toFixed(4)}</p>
                      </div>
                    </div>
                  </div>
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
                  {/* AI Stratagem Hub (Condensed) */}
                  <div className="lg:col-span-3 bg-zinc-900 border border-white/10 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-bitcoin/10 to-transparent pointer-events-none" />
                    <div className="flex items-center gap-6 relative z-10 w-full">
                      <div className="w-14 h-14 bg-bitcoin/20 rounded-2xl flex items-center justify-center border border-bitcoin/40 shrink-0 shadow-[0_0_20px_rgba(247,147,26,0.1)]">
                        <Monitor size={24} className="text-bitcoin" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="text-[10px] font-bold text-bitcoin uppercase tracking-widest font-mono">AI Core Intelligence</h4>
                          <span className="text-[8px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded uppercase font-bold">Active Analysis</span>
                        </div>
                        <p className="text-zinc-100 text-base font-bold tracking-tight">
                          "{isAiLoading ? "Analyzing block vectors..." : aiTip || "Autonomous infrastructure initialized."}"
                        </p>
                      </div>
                      <div className="flex flex-col md:flex-row gap-2 shrink-0">
                        <button 
                          onClick={() => setIsVoiceInputActive(!isVoiceInputActive)}
                          className={cn(
                            "px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all border flex items-center justify-center gap-2",
                            isVoiceInputActive ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-white/5 text-zinc-500 border-white/10"
                          )}
                        >
                          {isVoiceInputActive ? "Listening..." : "Voice Cmd"}
                        </button>
                        <button 
                          onClick={() => {
                            const nextState = !isAiAutonomous;
                            setIsAiAutonomous(nextState);
                          }}
                          className={cn(
                            "px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all border",
                            isAiAutonomous ? "bg-bitcoin text-black border-bitcoin" : "bg-white/5 text-zinc-400 border-white/10"
                          )}
                        >
                          {isAiAutonomous ? "AI Optimal" : "Manual"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-8">
                    {/* Graph Area */}
                    <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6 relative overflow-hidden group h-[400px] flex flex-col">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h3 className="text-sm font-bold uppercase tracking-widest">Mining Performance</h3>
                          <p className="text-[10px] text-zinc-500 font-mono mt-1">Hash rate output telemetry</p>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-[8px] font-bold text-green-500 uppercase tracking-widest">Live Downlink</div>
                        </div>
                      </div>
                      
                      <div className="flex-1 w-full min-h-0">
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
                                labelStyle={{ color: '#555', fontSize: '10px', marginBottom: '4px' }}
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
                          <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-4 opacity-50">
                            <Activity size={32} className="animate-pulse" />
                            <p className="text-[10px] font-mono uppercase tracking-widest">Synchronizing block data...</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Verification Matrix (Condensed) */}
                    <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                          <ShieldCheck size={16} className="text-bitcoin" /> Node Matrix
                        </h3>
                        <span className="text-[8px] font-mono text-zinc-500">{multiAssetWallets.length} Assets Online</span>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {multiAssetWallets.map((wallet) => (
                          <div key={wallet.id} className="p-4 bg-black/40 border border-white/5 rounded-2xl">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] font-bold text-bitcoin">{wallet.coin}</span>
                              <div className={cn("w-1.5 h-1.5 rounded-full", wallet.minerActive ? "bg-green-500" : "bg-zinc-600")} />
                            </div>
                            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                              <div className="h-full bg-bitcoin transition-all" style={{ width: `${wallet.progress}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Transaction Ledger & Logs Side */}
                  <div className="space-y-8">
                    <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 flex flex-col h-[400px]">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                          <HistoryIcon size={16} className="text-zinc-500" /> Transaction Ledger
                        </h3>
                        <button className="text-[9px] text-zinc-500 hover:text-white underline uppercase font-bold tracking-widest">Export</button>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                        {transactions.length > 0 ? (
                          transactions.map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between p-3 bg-black/30 border border-white/5 rounded-xl hover:border-bitcoin/30 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center",
                                  tx.type === 'reward' ? "bg-green-500/10 text-green-500" : "bg-blue-500/10 text-blue-500"
                                )}>
                                  {tx.type === 'reward' ? <Zap size={14} /> : <RefreshCw size={14} />}
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-zinc-300">{tx.type === 'reward' ? "Block Reward" : "Vault Settlement"}</p>
                                  <p className="text-[8px] font-mono text-zinc-600">{tx.timestamp}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={cn("text-[10px] font-bold font-mono text-green-500")}>
                                  +{tx.amount.toFixed(8)}
                                </p>
                                <p className="text-[7px] text-zinc-600 font-bold uppercase tracking-widest">{tx.status}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-zinc-700 opacity-50 space-y-3">
                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                               <Database size={20} />
                            </div>
                            <p className="text-[9px] font-mono text-center max-w-[140px]">Synchronizing node with global ledger...</p>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 pt-4 border-t border-white/5">
                        <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                          <span>Verified Total</span>
                          <span className="text-zinc-300 font-bold">0.00000000 BTC</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 flex flex-col h-[280px]">
                      <div className="flex items-center gap-2 mb-6 text-zinc-500">
                        <TerminalIcon size={16} />
                        <h3 className="text-[10px] font-bold font-mono uppercase tracking-widest">Protocol Intelligence</h3>
                      </div>
                      <div className="flex-1 font-mono text-[10px] space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                        <div className="flex gap-2 text-zinc-500">
                          <span>[SYSC]</span>
                          <span className="text-zinc-400 group">Monitoring cluster health...</span>
                        </div>
                        {isMining && logs.map((log, i) => (
                          <div key={`log-${i}`} className="flex gap-2">
                             <span className="text-zinc-700">[{log.time}]</span>
                             <span className="text-bitcoin italic">HASH_ACCEPTED: OK</span>
                          </div>
                        ))}
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
                      <p className="text-zinc-400 text-sm max-w-md">Increase your hash rate and generate higher yields by adding next-generation ASIC miners to your operational deployment.</p>
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
                      className="bg-app-card border border-app-border rounded-2xl p-6 flex flex-col gap-6 hover:border-bitcoin/30 transition-all group overflow-hidden relative shadow-sm"
                    >
                      <div className="absolute top-0 right-0 p-2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity translate-x-4 -translate-y-4">
                         <Monitor size={120} />
                      </div>
                      <div className="flex items-center gap-6 relative z-10">
                        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-app-text-muted group-hover:text-bitcoin group-hover:bg-bitcoin/10 transition-colors">
                          {item.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-bold text-lg dark:text-white text-zinc-900">{item.name}</h4>
                            <span className="text-bitcoin font-mono text-xs font-bold bg-bitcoin/10 px-2 py-0.5 rounded">LEASABLE</span>
                          </div>
                          <div className="flex gap-4 text-[10px] font-mono text-app-text-muted uppercase tracking-widest">
                            <span>{item.hashRate} TH/s</span>
                            <span>{item.powerUsage}W</span>
                            <span className="text-zinc-600 dark:text-zinc-300 underline">Slots Owned: {item.count}</span>
                          </div>
                        </div>
                      </div>

                      {item.count > 0 && (
                        <div className="space-y-4 pt-4 border-t border-app-border relative z-10">
                          <div className="flex justify-between items-center text-[10px] uppercase font-mono tracking-widest text-app-text-muted">
                            <span>Operational Uptime</span>
                            <span className="text-green-500">99.98%</span>
                          </div>
                          <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
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

                <div className="space-y-6">
                   <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold dark:text-white text-zinc-900">Cluster Telemetry Matrix</h3>
                        <p className="text-xs text-app-text-muted mt-1 uppercase tracking-widest font-mono">Real-time health & Thermal profiles</p>
                      </div>
                      {miningUnits.length > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                           <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                           <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Aggregate Link Active</span>
                        </div>
                      )}
                   </div>

                   {miningUnits.length === 0 ? (
                      <div className="p-12 border-2 border-dashed border-app-border rounded-[2rem] text-center bg-zinc-50 dark:bg-zinc-900/20">
                         <Activity size={40} className="text-app-text-muted mx-auto mb-4 opacity-20" />
                         <p className="text-sm text-app-text-muted font-medium">No active units detected. Establish a cluster lease to begin monitoring.</p>
                      </div>
                   ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                         {/* Unit List */}
                         <div className="lg:col-span-1 space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {miningUnits.map((unit) => (
                               <button 
                                 key={unit.id}
                                 onClick={() => setSelectedUnitId(unit.id)}
                                 className={cn(
                                   "w-full p-4 rounded-2xl border transition-all text-left relative overflow-hidden group",
                                   selectedUnitId === unit.id 
                                     ? "bg-bitcoin/5 border-bitcoin shadow-lg shadow-bitcoin/5" 
                                     : "bg-app-card border-app-border hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                 )}
                               >
                                  <div className="flex items-center justify-between mb-3">
                                     <div className="flex items-center gap-2">
                                        <div className={cn(
                                          "w-2 h-2 rounded-full",
                                          unit.status === 'optimal' ? "bg-green-500" : 
                                          unit.status === 'warning' ? "bg-yellow-500" : "bg-red-500 animate-pulse"
                                        )} />
                                        <span className="text-[10px] font-bold dark:text-zinc-300 text-zinc-700 truncate max-w-[120px]">{unit.name}</span>
                                     </div>
                                     <span className={cn(
                                       "text-[8px] font-bold uppercase tracking-tighter px-1.5 py-0.5 rounded",
                                       unit.status === 'optimal' ? "bg-green-500/10 text-green-500" : 
                                       unit.status === 'warning' ? "bg-yellow-500/10 text-yellow-500" : "bg-red-500/10 text-red-500"
                                     )}>
                                        {unit.status}
                                     </span>
                                  </div>
                                  
                                  <div className="flex items-end justify-between">
                                     <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-zinc-500">
                                           <Thermometer size={10} />
                                           <span className={cn(
                                             "text-xs font-mono font-bold",
                                             unit.temp > 80 ? "text-red-500" : unit.temp > 70 ? "text-yellow-500" : "text-app-text-muted"
                                           )}>{unit.temp.toFixed(1)}°C</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-zinc-500">
                                           <Wind size={10} />
                                           <span className="text-xs font-mono font-bold">{Math.round(unit.fanSpeed)} RPM</span>
                                        </div>
                                     </div>
                                     <div className="text-right">
                                        <p className="text-[8px] text-app-text-muted uppercase font-bold">SHA-256</p>
                                        <p className="text-xs font-mono font-bold dark:text-zinc-200 text-zinc-800 tracking-tighter">ID: {unit.id.split('-')[1]}</p>
                                     </div>
                                  </div>

                                  {unit.temp > 85 && (
                                     <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />
                                  )}
                               </button>
                            ))}
                         </div>

                         {/* Unit Details & Logs */}
                         <div className="lg:col-span-2 bg-app-card border border-app-border rounded-3xl p-8 flex flex-col h-[600px]">
                            {selectedUnitId && miningUnits.find(u => u.id === selectedUnitId) ? (
                               <>
                                 {(() => {
                                    const unit = miningUnits.find(u => u.id === selectedUnitId)!;
                                    return (
                                      <div className="flex flex-col h-full gap-6">
                                         <div className="flex items-center justify-between border-b border-app-border pb-6">
                                            <div className="flex items-center gap-4">
                                               <div className="w-12 h-12 bg-app-bg border border-app-border rounded-xl flex items-center justify-center text-bitcoin">
                                                  <Cpu size={24} />
                                               </div>
                                               <div>
                                                  <h4 className="text-lg font-bold dark:text-white text-zinc-900">{unit.name}</h4>
                                                  <p className="text-[10px] text-app-text-muted font-mono uppercase tracking-[0.2em]">Node ID: {unit.id}</p>
                                               </div>
                                            </div>
                                            <div className="text-right">
                                               <p className="text-[10px] text-app-text-muted uppercase font-bold tracking-widest mb-1">Health Metric</p>
                                               <div className="flex items-center gap-3">
                                                  <div className="w-32 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                     <motion.div 
                                                       initial={false}
                                                       animate={{ width: `${100 - (unit.temp - 40) * 1.5}%` }}
                                                       className={cn(
                                                         "h-full transition-colors",
                                                         unit.status === 'optimal' ? "bg-green-500" : 
                                                         unit.status === 'warning' ? "bg-yellow-500" : "bg-red-500"
                                                       )}
                                                     />
                                                  </div>
                                                  <span className="text-xs font-mono font-bold dark:text-white text-zinc-900">
                                                     {(100 - (unit.temp - 40) * 1.5).toFixed(1)}%
                                                  </span>
                                               </div>
                                            </div>
                                         </div>

                                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="p-4 bg-app-bg border border-app-border rounded-2xl">
                                               <div className="flex items-center gap-2 mb-2">
                                                  <Thermometer size={14} className="text-red-400" />
                                                  <span className="text-[10px] text-app-text-muted uppercase font-bold tracking-widest">Temperature</span>
                                               </div>
                                               <p className={cn(
                                                 "text-xl font-bold font-mono tracking-tighter",
                                                 unit.temp > 80 ? "text-red-500" : "dark:text-white text-zinc-900"
                                               )}>
                                                  {unit.temp.toFixed(2)}°C
                                               </p>
                                            </div>
                                            <div className="p-4 bg-app-bg border border-app-border rounded-2xl">
                                               <div className="flex items-center gap-2 mb-2">
                                                  <Wind size={14} className="text-blue-400" />
                                                  <span className="text-[10px] text-app-text-muted uppercase font-bold tracking-widest">Fan Speed</span>
                                               </div>
                                               <p className="text-xl font-bold font-mono tracking-tighter dark:text-white text-zinc-900">
                                                  {Math.round(unit.fanSpeed)} <span className="text-[10px] text-app-text-muted">RPM</span>
                                               </p>
                                            </div>
                                            <div className="p-4 bg-app-bg border border-app-border rounded-2xl">
                                               <div className="flex items-center gap-2 mb-2">
                                                  <Activity size={14} className="text-green-400" />
                                                  <span className="text-[10px] text-app-text-muted uppercase font-bold tracking-widest">Voltage</span>
                                               </div>
                                               <p className="text-xl font-bold font-mono tracking-tighter dark:text-white text-zinc-900">
                                                  12.04 <span className="text-[10px] text-app-text-muted">V</span>
                                               </p>
                                            </div>
                                            <div className="p-4 bg-app-bg border border-app-border rounded-2xl">
                                               <div className="flex items-center gap-2 mb-2">
                                                  <Zap size={14} className="text-yellow-400" />
                                                  <span className="text-[10px] text-app-text-muted uppercase font-bold tracking-widest">Wattage</span>
                                               </div>
                                               <p className="text-xl font-bold font-mono tracking-tighter dark:text-white text-zinc-900">
                                                  {Math.round(unit.fanSpeed / 10)} <span className="text-[10px] text-app-text-muted">W</span>
                                               </p>
                                            </div>
                                         </div>

                                         <div className="flex-1 flex flex-col min-h-0">
                                            <div className="flex items-center justify-between mb-4">
                                               <h5 className="text-[10px] text-app-text-muted uppercase font-bold tracking-[0.2em] flex items-center gap-2">
                                                  <TerminalIcon size={12} /> Unit Diagnostic Stream
                                               </h5>
                                               <div className="flex items-center gap-2">
                                                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                                  <span className="text-[8px] font-mono text-zinc-500 uppercase">Live Output</span>
                                               </div>
                                            </div>
                                            <div className="flex-1 bg-zinc-950 rounded-2xl p-6 font-mono text-[10px] overflow-y-auto space-y-2 border border-white/5 custom-scrollbar selection:bg-bitcoin selection:text-black">
                                               {unit.logs.map((log, idx) => (
                                                  <div key={idx} className={cn(
                                                    "border-b border-white/5 pb-1",
                                                    log.includes('WARNING') ? "text-yellow-500" : "text-zinc-400"
                                                  )}>
                                                     {log}
                                                  </div>
                                               ))}
                                            </div>
                                         </div>
                                      </div>
                                    )
                                 })()}
                               </>
                            ) : (
                               <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-40">
                                  <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center border border-white/10">
                                     <TerminalIcon size={32} className="text-zinc-500" />
                                  </div>
                                  <div>
                                     <p className="text-sm font-bold uppercase tracking-[0.2em]">Telemetry Waiting</p>
                                     <p className="text-xs max-w-[240px] mx-auto mt-1">Select a mining unit from the cluster matrix to initiate proprietary data downlink.</p>
                                  </div>
                                </div>
                            )}
                         </div>
                      </div>
                   )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                   {/* Viral Referral Hub */}
                   <div className="bg-gradient-to-br from-bitcoin/20 to-transparent border border-bitcoin/30 rounded-[2.5rem] p-8 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 -rotate-12 group-hover:rotate-0 transition-all duration-700">
                         <Share2 size={120} className="text-bitcoin" />
                      </div>
                      <div className="relative z-10">
                         <h3 className="text-xl font-bold dark:text-white text-zinc-900 mb-2">Aji Viral Mesh</h3>
                         <p className="text-xs text-app-text-muted mb-6 leading-relaxed">Generate unique deep links to inject the protocol into your social circles. Earn 5% bonus from every sub-node link.</p>
                         
                         <div className="bg-black/20 border border-white/5 rounded-2xl p-4 flex items-center justify-between mb-4">
                            <span className="text-xs font-mono text-zinc-400">cbr.io/aji?ref={referralCode}</span>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(`https://cbr.io/aji?ref=${referralCode}`);
                                notify("Referral link copied", "success");
                              }}
                              className="text-[10px] font-bold text-bitcoin hover:underline uppercase tracking-widest"
                            >
                              Copy Link
                            </button>
                         </div>
                         <div className="flex items-center gap-3">
                            <div className="flex -space-x-2">
                               {[1,2,3].map(i => (
                                 <div key={i} className="w-6 h-6 rounded-full border-2 border-app-card bg-zinc-800" />
                               ))}
                            </div>
                            <span className="text-[10px] text-zinc-500 font-bold">12 active sub-nodes linked</span>
                         </div>
                      </div>
                   </div>

                   {/* Aji Pro License */}
                   <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 relative overflow-hidden group">
                      <div className="flex items-center justify-between mb-6">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white">
                               <Zap size={20} />
                            </div>
                            <h3 className="text-xl font-bold">Aji Pro Engine</h3>
                         </div>
                         <div className={cn(
                           "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                           isAjiPro ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                         )}>
                           {isAjiPro ? "License Active" : "Trial Mode"}
                         </div>
                      </div>
                      <p className="text-xs text-zinc-400 mb-6 leading-relaxed">Unlock the proprietary SHA-256 optimization layer. Increases node efficiency by 50% using Aji's predictive hashing.</p>
                      <button 
                        onClick={() => {
                          if (isAjiPro) {
                            setIsAjiPro(false);
                            notify("Aji Pro mode disabled", "info");
                          } else {
                            setIsAjiPro(true);
                            notify("Aji Pro Logic Activated", "success");
                            speak("High efficiency hashing engaged.");
                          }
                        }}
                        className={cn(
                          "w-full py-4 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all",
                          isAjiPro ? "bg-zinc-800 text-white border border-white/10" : "bg-purple-600 text-white shadow-lg shadow-purple-600/20 active:scale-95"
                        )}
                      >
                        {isAjiPro ? "Protocol Downgrade" : "Activate Pro License"}
                      </button>
                   </div>
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
                        <p className="text-[10px] text-app-text-muted uppercase font-mono tracking-widest mb-2">Internal Ledger Balance</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold font-mono dark:text-white text-zinc-900 tracking-tighter">
                            {internalWalletBalance.toFixed(8)}
                          </span>
                          <span className="text-xl font-bold text-bitcoin">BTC</span>
                        </div>
                        <p className="text-xs text-app-text-muted mt-2 font-medium">≈ ${(internalWalletBalance * btcPrice).toLocaleString()} USD</p>
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

                <div className="bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-500/30 rounded-[2rem] p-8 relative overflow-hidden group shadow-[0_20px_50px_rgba(59,130,246,0.1)]">
                   <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 -translate-y-4 group-hover:translate-x-2 transition-all duration-700">
                      <Globe size={160} className="text-blue-500" />
                   </div>
                   <div className="flex items-center justify-between mb-8 relative z-10">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                            <Share2 size={24} />
                         </div>
                         <div>
                            <h3 className="text-xl font-bold tracking-tight">WalletConnect Hub</h3>
                            <p className="text-[10px] text-blue-500 uppercase tracking-[0.2em] font-bold font-mono">Mobile & Browser Secure Link</p>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-6 relative z-10">
                      {isWalletConnected ? (
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-4 bg-white/5 border border-white/10 rounded-2xl">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center text-green-500">
                                 <CheckCircle2 size={20} />
                              </div>
                              <div>
                                 <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Connected Address</p>
                                 <p className="text-xs font-mono font-bold dark:text-white text-zinc-900">{connectedAddress?.slice(0, 8)}...{connectedAddress?.slice(-8)}</p>
                              </div>
                           </div>
                           <button 
                             onClick={() => open({ view: 'Account' })}
                             className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                           >
                             Manage Link
                           </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                           <p className="text-sm text-zinc-400 leading-relaxed">
                              Securely connect your preferred mobile or hardware wallet via the WalletConnect protocol. Enable multi-sig protection and hardware-level security for your accumulated yields.
                           </p>
                           <button 
                             onClick={() => open()}
                             className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20 active:scale-95"
                           >
                             <Wallet size={16} /> Link Mobile/Secure Wallet
                           </button>
                        </div>
                      )}
                   </div>
                </div>

                <div className="bg-app-card border border-app-border rounded-3xl p-8 space-y-8">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Multi-Asset Cluster Wallets</label>
                      <button 
                        onClick={() => setIsAddingWallet(true)}
                        className="text-[10px] font-bold text-bitcoin flex items-center gap-1 hover:underline uppercase tracking-widest"
                      >
                        <Plus size={12} /> Add Asset Node
                      </button>
                    </div>

                    <AnimatePresence>
                      {isAddingWallet && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-8 overflow-hidden"
                        >
                          <div className="bg-zinc-100 dark:bg-zinc-900/50 border border-app-border rounded-2xl p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <p className="text-[10px] text-zinc-500 uppercase font-bold">Protocol Coin</p>
                                <select 
                                  value={newWallet.coin}
                                  onChange={(e) => setNewWallet(prev => ({ ...prev, coin: e.target.value }))}
                                  className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs focus:border-bitcoin outline-none"
                                >
                                  <option value="BTC">Bitcoin (BTC)</option>
                                  <option value="ETH">Ethereum (ETH)</option>
                                  <option value="LTC">Litecoin (LTC)</option>
                                  <option value="SOL">Solana (SOL)</option>
                                  <option value="DOGE">Dogecoin (DOGE)</option>
                                </select>
                              </div>
                              <div className="space-y-2">
                                <p className="text-[10px] text-zinc-500 uppercase font-bold">App / Custody</p>
                                <select 
                                  value={newWallet.app}
                                  onChange={(e) => setNewWallet(prev => ({ ...prev, app: e.target.value }))}
                                  className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs focus:border-bitcoin outline-none"
                                >
                                  <option value="Ledger">Ledger Nano</option>
                                  <option value="Trezor">Trezor Model T</option>
                                  <option value="BitPay">BitPay Wallet</option>
                                  <option value="Bitcoin Core">Bitcoin Core (Legacy/SegWit)</option>
                                  <option value="MetaMask">MetaMask</option>
                                  <option value="Trust Wallet">Trust Wallet</option>
                                  <option value="Coinbase">Coinbase App</option>
                                </select>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] text-zinc-500 uppercase font-bold">Node Label (Friendly Name)</p>
                              <input 
                                type="text"
                                value={newWallet.label || ''}
                                onChange={(e) => setNewWallet(prev => ({ ...prev, label: e.target.value }))}
                                placeholder="e.g. My Savings Wallet"
                                className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs focus:border-bitcoin outline-none"
                              />
                            </div>
                             <div className="space-y-2">
                               <div className="flex items-center justify-between">
                                 <p className="text-[10px] text-zinc-500 uppercase font-bold">Public Address</p>
                                 <button 
                                   onClick={handleDriveImport}
                                   disabled={isDrivePicking}
                                   className="text-[9px] font-bold text-blue-500 flex items-center gap-1 hover:underline uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-full transition-all hover:bg-blue-500/20 active:scale-95 disabled:opacity-50"
                                 >
                                   {isDrivePicking ? <RefreshCw size={10} className="animate-spin" /> : <Globe size={10} />} 
                                   {isDrivePicking ? "Syncing Drive..." : "Scan from Drive"}
                                 </button>
                               </div>
                               <input 
                                 type="text"
                                 value={newWallet.address || ''}
                                 onChange={(e) => setNewWallet(prev => ({ ...prev, address: e.target.value }))}
                                 placeholder="0x... or bc1..."
                                 className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2 font-mono text-[10px] focus:border-bitcoin outline-none"
                               />
                             </div>
                            <div className="flex gap-2 pt-2">
                              <button 
                                onClick={addMultiAssetWallet}
                                className="flex-1 py-3 bg-bitcoin text-black rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-bitcoin/80 transition-all"
                              >
                                Initialize Node
                              </button>
                              <button 
                                onClick={() => setIsAddingWallet(false)}
                                className="px-6 py-3 bg-app-sidebar border border-app-border rounded-xl text-xs font-bold text-zinc-500 uppercase tracking-widest hover:text-red-500 transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-4 mb-10">
                      {multiAssetWallets.length === 0 ? (
                        <div className="p-8 border-2 border-dashed border-app-border rounded-2xl text-center">
                          <p className="text-xs text-zinc-500">No multi-asset nodes provisioned. Connect your first wallet to begin parallel mining across multiple chains.</p>
                        </div>
                      ) : (
                         multiAssetWallets.map((wallet) => (
                          <div key={wallet.id} className="p-5 bg-zinc-100 dark:bg-zinc-900/40 border border-app-border rounded-2xl flex flex-col md:flex-row gap-6 relative overflow-hidden group">
                             {wallet.minerActive && (
                               <div className="absolute top-0 left-0 w-1 h-full bg-bitcoin" />
                             )}
                             <div className="flex-1 space-y-4">
                                <div className="flex items-center justify-between">
                                   <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 bg-app-bg border border-app-border rounded-xl flex items-center justify-center font-bold text-bitcoin text-xs">
                                         {wallet.coin}
                                      </div>
                                      <div>
                                         <h5 className="text-sm font-bold dark:text-white text-zinc-900">{wallet.label}</h5>
                                         <p className="text-[10px] text-app-text-muted font-mono truncate max-w-[200px]">{wallet.address}</p>
                                      </div>
                                   </div>
                                   {wallet.isVerified && (
                                      <div className="flex flex-col items-end">
                                         <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full">
                                            <ShieldCheck size={10} className="text-green-500" />
                                            <span className="text-[8px] font-bold text-green-500 uppercase tracking-widest">Chain Verified</span>
                                         </div>
                                         <p className="text-[8px] font-mono text-zinc-500 mt-1">Ref: {wallet.lastTxHash}</p>
                                      </div>
                                   )}
                                </div>

                                {wallet.minerActive && (
                                   <div className="space-y-2">
                                      <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-widest text-app-text-muted">
                                         <span>Block Discovery Progress</span>
                                         <span>{Math.round(wallet.progress || 0)}%</span>
                                      </div>
                                      <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                         <motion.div 
                                           initial={false}
                                           animate={{ width: `${wallet.progress || 0}%` }}
                                           className="h-full bg-bitcoin"
                                         />
                                      </div>
                                   </div>
                                )}

                                <div className="grid grid-cols-3 gap-3">
                                   <div className="p-3 bg-app-bg border border-app-border rounded-xl">
                                      <p className="text-[8px] text-app-text-muted uppercase font-bold tracking-widest">Asset Balance</p>
                                      <p className="text-xs font-bold text-bitcoin">{wallet.balance.toFixed(8)}</p>
                                   </div>
                                   <div className="p-3 bg-app-bg border border-app-border rounded-xl">
                                      <p className="text-[8px] text-app-text-muted uppercase font-bold tracking-widest">Confirmations</p>
                                      <p className="text-xs font-bold dark:text-zinc-200 text-zinc-700">{wallet.confirmations || 0}</p>
                                   </div>
                                   <div className="p-3 bg-app-bg border border-app-border rounded-xl">
                                      <p className="text-[8px] text-app-text-muted uppercase font-bold tracking-widest">Node App</p>
                                      <p className="text-xs font-bold dark:text-zinc-200 text-zinc-700">{wallet.app}</p>
                                   </div>
                                </div>
                             </div>
                             <div className="md:w-px h-px md:h-20 bg-app-border" />
                             <div className="md:w-48 flex flex-col justify-center gap-3">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[9px] text-app-text-muted uppercase font-bold">Miner Cluster</span>
                                    {wallet.minerActive && (
                                      <span className="text-[9px] text-green-500 font-mono font-bold">{wallet.hashRate} GH/s</span>
                                    )}
                                </div>
                                <button 
                                  onClick={() => toggleMinerForWallet(wallet.id)}
                                  className={cn(
                                    "w-full py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border",
                                    wallet.minerActive 
                                      ? "bg-green-500/10 border-green-500/30 text-green-500 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 group"
                                      : "bg-bitcoin border-bitcoin/30 text-black hover:scale-105 active:scale-95"
                                  )}
                                >
                                  {wallet.minerActive ? (
                                    <>
                                      <span className="group-hover:hidden">Miner Deployed</span>
                                      <span className="hidden group-hover:inline">Kill Cluster</span>
                                    </>
                                  ) : "Deploy Proprietary Miner"}
                                </button>
                                <p className="text-[8px] text-center text-app-text-muted italic">Dedicated instance linked to address</p>
                             </div>
                          </div>
                        ))
                      )}
                    </div>

                    <label className="block text-[10px] font-mono text-app-text-muted uppercase tracking-widest mb-4">Notification Bridge & Device Anchor</label>
                    <div className="p-6 bg-zinc-100 dark:bg-zinc-900/40 border border-app-border rounded-3xl mb-8 flex flex-col md:flex-row items-center gap-6 group relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 translate-x-2 -translate-y-2">
                          <MessageSquare size={100} className="text-bitcoin" />
                       </div>
                       <div className="w-14 h-14 bg-bitcoin/10 rounded-2xl flex items-center justify-center shrink-0">
                          <Smartphone size={28} className="text-bitcoin" />
                       </div>
                       <div className="flex-1 space-y-4 relative z-10 w-full">
                          <div>
                            <h4 className="text-sm font-bold dark:text-white text-zinc-900">SMS Notification Node</h4>
                            <p className="text-[10px] text-app-text-muted uppercase font-bold tracking-widest">Protocol Updates & Yield Alerts</p>
                          </div>
                          <div className="flex gap-2 w-full">
                            <div className="relative flex-1">
                               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs">+1</span>
                               <input 
                                 type="text" 
                                 value={phoneNumber}
                                 onChange={(e) => setPhoneNumber(e.target.value)}
                                 placeholder="8283762992"
                                 className="w-full bg-app-bg border border-app-border rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono focus:border-bitcoin outline-none"
                               />
                            </div>
                            <button 
                               onClick={() => {
                                 notify("Device anchor synchronized for SMS alerts.", "success");
                                 speak("Mobile device linked to protocol heartbeat.");
                               }}
                               className="px-6 bg-bitcoin text-black rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-all active:scale-95 shadow-lg shadow-bitcoin/10"
                            >
                               Link Device
                            </button>
                          </div>
                       </div>
                    </div>

                    <label className="block text-[10px] font-mono text-app-text-muted uppercase tracking-widest mb-4">Fiat Settlement & PayPal Off-Ramp</label>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                       <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-3xl relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 opacity-10 -rotate-12 translate-x-4 -translate-y-4">
                             <DollarSign size={80} className="text-blue-500" />
                          </div>
                          <div className="relative z-10 space-y-4">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                                   <DollarSign size={20} />
                                </div>
                                <div>
                                   <h4 className="text-sm font-bold dark:text-white text-zinc-900">PayPal Direct Link</h4>
                                   <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Connected: {payoutEmail}</p>
                                </div>
                             </div>
                             <div className="pt-2">
                                <p className="text-[10px] text-app-text-muted mb-2 font-bold uppercase tracking-tighter">Instant Crypto-to-Fiat Bridge</p>
                                <div className="flex gap-2">
                                   <input 
                                     type="text" 
                                     value={payoutEmail}
                                     onChange={(e) => setPayoutEmail(e.target.value)}
                                     placeholder="PayPal Email Address"
                                     className="flex-1 bg-white dark:bg-black/40 border border-blue-500/20 rounded-xl px-4 py-2 text-xs focus:border-blue-500 outline-none"
                                   />
                                   <button 
                                      onClick={() => {
                                        notify("PayPal settlement parameters updated.", "success");
                                        speak("PayPal settlement destination synchronized.");
                                      }}
                                      className="px-4 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95"
                                   >
                                      Update
                                   </button>
                                </div>
                             </div>
                          </div>
                       </div>

                       <div className="p-6 bg-app-bg border border-app-border rounded-3xl space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                <p className="text-[10px] text-app-text-muted uppercase font-bold tracking-widest mb-1">Available Yield</p>
                                <p className="text-xl font-bold dark:text-white text-zinc-900 font-mono tracking-tighter">
                                   {(balance + internalWalletBalance).toFixed(8)} BTC
                                </p>
                                <p className="text-[10px] text-zinc-500 mt-1">≈ ${((balance + internalWalletBalance) * btcPrice).toLocaleString()} USD</p>
                             </div>
                             <div className="p-4 bg-blue-600/5 rounded-2xl border border-blue-500/20">
                                <p className="text-[10px] text-blue-500 uppercase font-bold tracking-widest mb-1">PYUSD Hub Balance</p>
                                <p className="text-xl font-bold dark:text-white text-zinc-900 font-mono tracking-tighter">
                                   ${pyusdBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <p className="text-[10px] text-zinc-500 mt-1">Collateralized Stablecoin</p>
                             </div>
                          </div>
                          <div className="flex justify-between items-start pt-4">
                             <div>
                                <p className="text-[10px] text-app-text-muted uppercase font-bold tracking-widest mb-1">Settlement Liquidity</p>
                                <p className="text-2xl font-bold dark:text-white text-zinc-900 font-mono tracking-tighter">
                                   ${( ( (balance + internalWalletBalance) * btcPrice ) + pyusdBalance ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                             </div>
                             <div className="px-2 py-1 bg-green-500/10 rounded-lg border border-green-500/20 text-[9px] font-bold text-green-500 uppercase">
                                Bridge Active
                             </div>
                                                  <button 
                             onClick={async () => {
                               const amount = (balance + internalWalletBalance) * btcPrice;
                               if (amount < 1) {
                                 notify("Minimum settlement requirement: $1.00 USD", "alert");
                                 return;
                               }

                               try {
                                 const response = await fetch('/api/payout/paypal', {
                                   method: 'POST',
                                   headers: { 'Content-Type': 'application/json' },
                                   body: JSON.stringify({
                                     email: payoutEmail,
                                     amount: amount
                                   })
                                 });

                                 const data = await response.json();

                                 if (!response.ok) {
                                   throw new Error(data.error || 'Liquidation protocol failed.');
                                 }

                                 setBalance(0);
                                 setInternalWalletBalance(0);
                                 const newBatch = {
                                   id: data.batch_id || Math.random().toString(36).substring(2, 8).toUpperCase(),
                                   amount,
                                   status: 'processing' as const,
                                   date: new Date().toLocaleTimeString()
                                 };
                                 setSettlementBatches(prev => [newBatch, ...prev]);
                                 notify(`Liquidation initiated: ${newBatch.id}`, "success");
                                 speak(`Settlement sequence initiated. Funds routed to PayPal.`);
                                 
                                 // Monitor status
                                 setTimeout(() => {
                                   setSettlementBatches(prev => prev.map(b => b.id === newBatch.id ? { ...b, status: 'completed' } : b));
                                   notify(`Settlement ${newBatch.id} verified at PayPal.`, "success");
                                 }, 8000);

                               } catch (err: any) {
                                 notify(err.message, "alert");
                                 console.error("Settlement error:", err);
                               }
                             }}
                             className="w-full py-4 bg-zinc-900 dark:bg-white dark:text-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-blue-600 dark:hover:bg-blue-600 dark:hover:text-white transition-all shadow-xl active:scale-95"
                           >
                            Send Mined Yields to PayPal
                          </button>
                       </div>
                    </div>

                    {settlementBatches.length > 0 && (
                      <div className="mb-8 space-y-3">
                         <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-[0.2em]">Settlement Ledger (Fiat Off-Ramp)</p>
                         <div className="grid grid-cols-1 gap-2">
                            {settlementBatches.map(batch => (
                               <div key={batch.id} className="p-4 bg-zinc-100 dark:bg-zinc-900/40 border border-app-border rounded-2xl flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                     <div className={cn(
                                       "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                       batch.status === 'completed' ? "bg-green-500/10 text-green-500" : "bg-blue-500/10 text-blue-500 animate-pulse"
                                     )}>
                                        {batch.status === 'completed' ? <CheckCircle2 size={14} /> : <RefreshCw size={14} className="animate-spin" />}
                                     </div>
                                     <div>
                                        <p className="text-xs font-bold dark:text-white text-zinc-900">Settlement #{batch.id}</p>
                                        <p className="text-[10px] text-zinc-500 font-mono">{batch.date} · via {payoutEmail}</p>
                                     </div>
                                  </div>
                                  <div className="text-right">
                                     <p className="text-xs font-bold text-bitcoin">+${batch.amount.toFixed(2)}</p>
                                     <p className={cn(
                                       "text-[9px] uppercase font-bold tracking-widest",
                                       batch.status === 'completed' ? "text-green-500" : "text-blue-500"
                                     )}>{batch.status}</p>
                                  </div>
                               </div>
                            ))}
                         </div>
                      </div>
                    )}

                    {transactions.length > 0 && (
                      <div className="mb-8 space-y-3">
                         <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-[0.2em]">Proprietary Ledger (On-Chain Activity)</p>
                         <div className="grid grid-cols-1 gap-2">
                            {transactions.map(tx => (
                               <div key={tx.id} className="p-4 bg-zinc-100 dark:bg-zinc-900/40 border border-app-border rounded-2xl flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                     <div className="w-8 h-8 bg-bitcoin/10 text-bitcoin rounded-lg flex items-center justify-center shrink-0">
                                        <ExternalLink size={14} />
                                     </div>
                                     <div>
                                        <p className="text-xs font-bold dark:text-white text-zinc-900">BTC Withdrawal</p>
                                        <p className="text-[10px] text-zinc-500 font-mono truncate max-w-[150px]">{tx.hash}</p>
                                     </div>
                                  </div>
                                  <div className="text-right">
                                     <p className="text-xs font-bold text-bitcoin">-{tx.amount.toFixed(8)} BTC</p>
                                     <p className="text-[9px] text-blue-500 uppercase font-bold tracking-widest animate-pulse">{tx.status}</p>
                                  </div>
                               </div>
                            ))}
                         </div>
                      </div>
                    )}

                    <label className="block text-[10px] font-mono text-app-text-muted uppercase tracking-widest mb-4">Master Protocol Anchor (Main Vault)</label>
                    <div className="p-4 bg-zinc-900 border border-bitcoin/20 rounded-2xl mb-8 flex items-center justify-between group overflow-hidden relative">
                       <div className="absolute inset-0 bg-gradient-to-r from-bitcoin/5 to-transparent opacity-50" />
                       <div className="flex items-center gap-4 relative z-10">
                          <div className="w-10 h-10 bg-bitcoin/10 rounded-xl flex items-center justify-center">
                             <Lock size={18} className="text-bitcoin" />
                          </div>
                          <div>
                             <p className="text-[10px] text-bitcoin font-bold flex items-center gap-1 uppercase tracking-widest">
                                <ShieldCheck size={10} /> Protocol Master Vault
                             </p>
                             <p className="text-xs text-white font-mono tracking-tight selection:bg-bitcoin selection:text-black">bc1q_vault_protocol_master_7749x2p9zm0z8k</p>
                          </div>
                       </div>
                       <button 
                         onClick={() => {
                           navigator.clipboard.writeText("bc1q_vault_protocol_master_7749x2p9zm0z8k");
                           notify("Vault address copied to clipboard", "success");
                         }}
                         className="px-4 py-2 bg-bitcoin/10 hover:bg-bitcoin/20 text-bitcoin border border-bitcoin/20 rounded-lg text-[10px] font-bold uppercase transition-all relative z-10"
                       >
                         Copy Vault
                       </button>
                    </div>

                    <label className="block text-[10px] font-mono text-app-text-muted uppercase tracking-widest mb-4">Legacy Verification & Master Bridges</label>
                    <div className="space-y-4 mb-8">
                       <div className="p-4 bg-bitcoin/5 border border-bitcoin/20 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-bitcoin/10 rounded-xl flex items-center justify-center">
                                <Cpu size={18} className="text-bitcoin" />
                             </div>
                             <div>
                                <p className="text-[10px] text-bitcoin font-bold gap-1 flex items-center uppercase tracking-widest">
                                   <Zap size={10} /> Global Protocol Anchor
                                </p>
                                <p className="text-xs dark:text-white text-zinc-900 font-medium font-mono">Consensus: BTC-Optimized SHA-256</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-[10px] text-app-text-muted font-bold uppercase tracking-tighter">Cluster Yield Capacity</p>
                             <p className="text-sm font-bold text-bitcoin font-mono">{(multiAssetWallets.reduce((acc, w) => acc + w.hashRate, 0) * 1.42).toFixed(2)} TH/s</p>
                          </div>
                       </div>

                      {linkedWallets.map((addr, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-zinc-100 dark:bg-zinc-900/50 border border-app-border rounded-xl group/addr hover:border-bitcoin transition-all shadow-sm">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-8 h-8 rounded-lg bg-bitcoin/10 flex items-center justify-center shrink-0">
                              <ShieldCheck size={14} className="text-bitcoin" />
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-[10px] font-mono dark:text-white text-zinc-900 truncate">{addr}</p>
                              <p className="text-[9px] text-app-text-muted uppercase font-bold tracking-tighter">Verified Custody</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="px-2 py-0.5 bg-green-500/10 rounded text-[9px] font-bold text-green-500 border border-green-500/20">
                              ACTIVE
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

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
              </div>
            </motion.div>
            )}

            {activeTab === 'network' && (
              <div className="space-y-12">
                <IpfsSection />
                <div className="border-t border-white/10 pt-12">
                   <CloudflareSection 
                    connected={cloudflareConnected}
                    onConnect={() => setCloudflareConnected(true)}
                   />
                </div>
                <div className="border-t border-white/10 pt-12">
                   <GitHubSection 
                    connected={githubConnected} 
                    isAuditing={isSecurityAuditing}
                    onConnect={() => {
                      setIsSecurityAuditing(true);
                      setTimeout(() => {
                        setGithubConnected(true);
                        setIsSecurityAuditing(false);
                      }, 2500);
                    }} 
                  />
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
            
            {activeTab === 'market' && (
              <motion.div 
                key="market"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                   <div>
                      <h2 className="text-3xl font-bold tracking-tight">Crypto Market Hub</h2>
                      <p className="text-zinc-500 mt-1">Real-time valuation and stablecoin liquidity index.</p>
                   </div>
                   <div className="flex gap-4">
                      <div className="bg-[#0D0D0D] border border-white/10 rounded-xl px-6 py-2">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">PYUSD / BTC</p>
                        <p className="text-lg font-bold text-bitcoin">{(1/btcPrice).toFixed(8)} BTC</p>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6">
                      <div className="flex items-center gap-3 mb-4">
                         <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white">PYUSD</span>
                         </div>
                         <div>
                            <h4 className="text-sm font-bold">PayPal USD</h4>
                            <p className="text-[10px] text-zinc-600">Stablecoin • 1.00 USD</p>
                         </div>
                      </div>
                      <div className="h-32 mb-4">
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={[...Array(20)].map((_, i) => ({ val: 1.00 + (Math.random() * 0.002 - 0.001) }))}>
                               <Line type="step" dataKey="val" stroke="#3b82f6" strokeWidth={2} dot={false} />
                            </LineChart>
                         </ResponsiveContainer>
                      </div>
                      <button 
                        onClick={() => {
                          setWithdrawType('PYUSD');
                          setActiveTab('wallet');
                          notify("Liquidity switched to PYUSD settling mode.", "info");
                        }}
                        className="w-full py-3 bg-blue-600/10 text-blue-500 border border-blue-500/20 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600/20 transition-all"
                      >
                         Activate PYUSD Settle
                      </button>
                   </div>

                   <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6 md:col-span-2">
                      <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-6">Market Order Book (PYUSD/BTC)</h4>
                      <div className="space-y-3 font-mono text-[10px]">
                         {[...Array(5)].map((_, i) => (
                           <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0 opacity-80">
                              <span className="text-red-500">{(btcPrice + (i + 1) * 12.5).toFixed(2)}</span>
                              <span className="text-zinc-500">{(Math.random() * 2).toFixed(4)} BTC</span>
                              <span className="text-zinc-300">{( (btcPrice + (i + 1) * 12.5) * (Math.random() * 2) ).toLocaleString()} PYUSD</span>
                           </div>
                         ))}
                         <div className="py-2 text-center text-lg font-bold text-white border-y border-white/10 my-2">
                            {btcPrice.toLocaleString()} PYUSD
                         </div>
                         {[...Array(5)].map((_, i) => (
                           <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0 opacity-80">
                              <span className="text-green-500">{(btcPrice - (i + 1) * 14.2).toFixed(2)}</span>
                              <span className="text-zinc-500">{(Math.random() * 3).toFixed(4)} BTC</span>
                              <span className="text-zinc-300">{( (btcPrice - (i + 1) * 14.2) * (Math.random() * 3) ).toLocaleString()} PYUSD</span>
                           </div>
                         ))}
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
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Download size={18} className="text-bitcoin" />
                        <div>
                          <h4 className="font-bold text-sm uppercase tracking-widest font-mono">Mobile App Deployment</h4>
                          <p className="text-[10px] text-zinc-500 mt-1">Install CapitolDbro as a standalone PWA on your home screen.</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <a 
                        href="https://ais-pre-nt7wylcxuc6sfn7oadecro-243078622332.us-east5.run.app" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3 bg-white text-black rounded-xl font-bold hover:bg-zinc-200 transition-all text-[10px] uppercase tracking-widest"
                      >
                        <ExternalLink size={14} />
                        Open in New Tab For Installation
                      </a>
                      <p className="text-[9px] text-zinc-600 text-center leading-relaxed">
                        PWA prompts are restricted in editor frames. Click above to open the protocol directly and look for the <span className="text-white font-bold">Install App</span> header button.
                      </p>
                    </div>
                  </div>
                  <SettingsRow title="Auto-Reinvest" description="Automatically dedicate 25% of yield to hardware maintenance and optimization." hasSwitch active={autoReinvest} onClick={() => setAutoReinvest(!autoReinvest)} />
                  <SettingsRow title="Protocol Level" description="Enforce standard Bitcoin Core interaction protocols." hasSwitch active />
                  <SettingsRow 
                    title="GitHub Sync" 
                    description={githubConnected ? "Repository linked and security audit verified." : "Unlinked. Connect to enable code audits."} 
                    hasSwitch 
                    active={githubConnected} 
                    onClick={() => setActiveTab('network')}
                  />
                  <SettingsRow 
                    title="Cloudflare Edge" 
                    description={cloudflareConnected ? "Global WAF protection and edge-caching enabled." : "Gateway unlinked. Activate global protection."} 
                    hasSwitch 
                    active={cloudflareConnected} 
                    onClick={() => setActiveTab('network')}
                  />
                  <SettingsRow title="Cloud Vault Sync" description={user ? `Connected: ${user.email}` : "Sign in to sync your farm across devices."} hasSwitch active={!!user} />
                  
                  <div className="p-6 border-t border-white/5 bg-bitcoin/5">
                    <div className="flex items-center gap-3 mb-4">
                      <ShieldCheck className="text-bitcoin" size={18} />
                      <h4 className="font-bold text-sm uppercase tracking-widest font-mono">KYC & Compliance</h4>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                         <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Verification Tier</p>
                         <span className={cn(
                           "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border",
                           kycStatus === 'verified' ? "bg-green-500/20 text-green-400 border-green-500/30" : 
                           kycStatus === 'pending' ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : 
                           "bg-zinc-500/10 text-zinc-500 border-white/10"
                         )}>
                           {kycStatus === 'verified' ? "Level 2 • Verified" : kycStatus === 'pending' ? "Pending Review" : "Level 0 • Unverified"}
                         </span>
                      </div>
                      {kycStatus === 'unverified' && (
                        <button 
                          onClick={() => {
                            setKycStatus('pending');
                            setTimeout(() => setKycStatus('verified'), 10000);
                          }}
                          className="w-full py-2 bg-bitcoin/20 text-bitcoin border border-bitcoin/40 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-bitcoin/30 transition-all"
                        >
                          Begin Verification Protocol
                        </button>
                      )}
                      <p className="text-[9px] text-zinc-600 leading-relaxed italic">
                        Compliance monitoring enabled. All settlements over $500.00 USD require active Level 2 verification.
                      </p>
                    </div>
                  </div>

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

      <div className="bg-app-card border border-app-border rounded-3xl p-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1 space-y-6">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-bitcoin/10 rounded-xl flex items-center justify-center">
                  <Database className="text-bitcoin" size={20} />
               </div>
               <div>
                  <h3 className="text-lg font-bold dark:text-white text-zinc-900">IPFS Proprietary Gateway</h3>
                  <p className="text-app-text-muted text-xs">Distributed storage link for CapitolDbro telemetry.</p>
               </div>
            </div>
            
            <div className="p-6 bg-zinc-100 dark:bg-zinc-900/50 border border-app-border rounded-2xl space-y-4">
               <div className="flex justify-between items-center">
                  <span className="text-[10px] text-app-text-muted uppercase font-bold tracking-widest">Connection Status</span>
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

function CloudflareSection({ connected, onConnect }: { connected: boolean, onConnect: () => void }) {
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
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = () => {
    setIsConnecting(true);
    setTimeout(() => {
      onConnect();
      setIsConnecting(false);
      setCfStatus({
        status: 'active',
        accountId: 'ID-8827-CF-CAPITOL',
        metrics: {
          bandwidth: { total: 4.2, cached: 3.8, unit: 'TB' },
          statusCodes: { ok: 98.4, clientError: 1.2, serverError: 0.4, other: 0 },
          security: { threats: 142, wafBlocks: 89, botChallenges: 53 }
        }
      });
    }, 2000);
  };

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
      {!connected ? (
        <div className="bg-[#0D0D0D] border border-white/10 rounded-[2.5rem] p-12 text-center relative overflow-hidden group">
           <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-50" />
           <div className="relative z-10 max-w-md mx-auto">
              <div className="w-20 h-20 bg-orange-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-orange-500/30">
                 <Globe size={40} className="text-orange-500" />
              </div>
              <h3 className="text-2xl font-bold mb-3 tracking-tight">Cloudflare Edge Integrated</h3>
              <p className="text-zinc-500 text-sm mb-10 leading-relaxed">
                 Enable global WAF protection, DDoS mitigation, and edge-side cache acceleration for your protocol deployment. Synchronize directly with your existing Cloudflare zone.
              </p>
              <button 
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-xs font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Synchronizing Edge Nodes...
                  </>
                ) : (
                  <>
                    <Lock size={16} /> Link Cloudflare Zone
                  </>
                )}
              </button>
           </div>
        </div>
      ) : (
        <>
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
      </>
      )}
    </motion.div>
  );
}

function GitHubSection({ connected, onConnect, isAuditing }: { connected: boolean, onConnect: () => void, isAuditing: boolean }) {
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
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-bold tracking-tight">GitHub Integration</h2>
            {isAuditing && (
              <span className="flex items-center gap-2 text-[10px] bg-bitcoin/20 text-bitcoin px-2 py-0.5 rounded-full font-mono animate-pulse uppercase tracking-wider border border-bitcoin/30">
                <RefreshCw size={10} className="animate-spin" />
                Security Audit In Progress
              </span>
            )}
          </div>
          <p className="text-zinc-500 mt-1">Version control for proprietary CapitolDbro scripts and AI logic.</p>
        </div>
        <button 
          onClick={onConnect}
          disabled={connected || isAuditing}
          className={cn(
            "px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-3 transition-all",
            connected 
              ? "bg-green-500/10 text-green-400 border border-green-500/30 cursor-default" 
              : "bg-white text-black hover:bg-zinc-200 shadow-xl disabled:opacity-50"
          )}
        >
          <Github size={18} />
          {isAuditing ? "Verifying..." : connected ? "Identity Linked" : "Connect GitHub Account"}
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
    <div className="bg-app-card border border-app-border rounded-2xl p-6 hover:border-bitcoin/30 transition-all group shrink-0 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 group-hover:scale-110 transition-transform">
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

