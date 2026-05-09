import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Bot, RefreshCw, Sparkles, Terminal, Cpu, Zap, ShieldCheck } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface GeminiAssistantProps {
  isEmbedded?: boolean;
  appContext: {
    balance: number;
    btcPrice: number;
    isMining: boolean;
    networkStats: {
      difficulty: string;
      blockHeight: string;
      hashrateGlobal: string;
    };
    efficiencyRating: number;
    hardwareSummary: string;
    internalWalletBalance: number;
    vaultBalance: number;
  };
}

export const GeminiAssistant: React.FC<GeminiAssistantProps> = ({ appContext, isEmbedded = false }) => {
  const [isOpen, setIsOpen] = useState(isEmbedded);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Protocol assistant online. How can I assist with your autonomous mining cluster today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      const systemContext = `
        You are the Aji Protocol Intelligence Assistant. 
        Current State of User's Protocol:
        - Active Balance: ${appContext.balance.toFixed(8)} BTC (≈ $${(appContext.balance * appContext.btcPrice).toLocaleString()})
        - Internal Wallet: ${appContext.internalWalletBalance.toFixed(8)} BTC
        - Vault Balance: ${appContext.vaultBalance.toFixed(8)} BTC
        - BTC Market Index: $${appContext.btcPrice.toLocaleString()}
        - Mining Status: ${appContext.isMining ? 'ACTIVE (Autonomous)' : 'INACTIVE'}
        - Protocol Efficiency: ${appContext.efficiencyRating}%
        - Hardware Configuration: ${appContext.hardwareSummary}
        - Network Difficulty: ${appContext.networkStats.difficulty}
        - Block Height: ${appContext.networkStats.blockHeight}
        - Global Hashrate: ${appContext.networkStats.hashrateGlobal}

        Guidelines:
        1. Be technical, helpful, and concise.
        2. Explain protocol operations (mining, yields, vaulting, adjustments).
        3. troubleshoot issues like "missing yields" (explain autonomous intervals).
        4. Use a futuristic, high-tech tone.
        5. If the user asks about "fixing problems", provide specific technical advice based on the state above.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: systemContext + "\n\nUser Question: " + userMessage,
      });

      const text = response.text || "I'm having trouble connecting to the protocol hive-mind. Please retry.";
      
      setMessages(prev => [...prev, { role: 'assistant', content: text }]);
    } catch (error: any) {
      console.error("Gemini API Error:", error?.message || String(error));
      setMessages(prev => [...prev, { role: 'assistant', content: `An error occurred: ${error?.message || String(error)}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isEmbedded) {
    return (
      <div className="w-full h-full flex flex-col bg-black">
        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-black"
        >
          {messages.map((m, i) => (
            <div 
              key={i} 
              className={cn(
                "flex flex-col gap-2 max-w-[90%]",
                m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div className={cn(
                "p-4 rounded-2xl text-[13px] leading-relaxed",
                m.role === 'user' 
                  ? "bg-bitcoin text-black font-bold rounded-tr-none shadow-[0_0_15px_rgba(57,255,20,0.4)]" 
                  : "bg-zinc-900/50 border border-bitcoin/20 text-[#39FF14] rounded-tl-none prose prose-invert max-w-none"
              )}>
                {m.role === 'assistant' ? (
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                ) : (
                  m.content
                )}
              </div>
              <span className="text-[10px] text-bitcoin/40 font-mono uppercase tracking-widest">
                {m.role === 'user' ? 'Operator Command' : 'Aji-AI System Response'}
              </span>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-3 text-bitcoin/60 italic text-xs animate-pulse">
              <RefreshCw size={14} className="animate-spin" />
              Processing protocol vectors...
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-6 border-t border-bitcoin/20 bg-black/40">
          <div className="relative max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Insert protocol maintenance command..."
              className="w-full bg-black border border-bitcoin/30 rounded-2xl px-6 py-4 text-sm text-[#39FF14] focus:outline-none focus:border-bitcoin transition-all pr-14 placeholder:text-zinc-800 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
            />
            <button 
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-3 text-bitcoin hover:text-white transition-all disabled:opacity-30"
            >
              <Send size={20} />
            </button>
          </div>
          <p className="text-center text-[9px] text-bitcoin/30 mt-4 uppercase tracking-[0.3em]">Authorized Protocol Control Access Only</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[60]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-4 w-[350px] md:w-[400px] h-[500px] bg-zinc-950/95 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-black">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-bitcoin/20 flex items-center justify-center border border-bitcoin/30">
                  <Sparkles size={16} className="text-bitcoin" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-bitcoin uppercase tracking-widest">Protocol Intelligence</h3>
                  <p className="text-[9px] text-[#39FF14]/60 font-mono italic">Gemini 1.5 Neural Link</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-black"
            >
              {messages.map((m, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "flex flex-col gap-1 max-w-[85%]",
                    m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-2xl text-[11px] leading-relaxed",
                    m.role === 'user' 
                      ? "bg-bitcoin text-black font-bold rounded-tr-none shadow-[0_0_10px_rgba(57,255,20,0.3)]" 
                      : "bg-zinc-900 border border-bitcoin/20 text-[#39FF14] rounded-tl-none prose prose-invert prose-xs"
                  )}>
                    {m.role === 'assistant' ? (
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    ) : (
                      m.content
                    )}
                  </div>
                  <span className="text-[8px] text-[#39FF14]/40 font-mono uppercase">
                    {m.role === 'user' ? 'Operator' : 'System Intelligence'}
                  </span>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-[#39FF14]/60 italic text-[10px]">
                  <RefreshCw size={12} className="animate-spin text-bitcoin" />
                  Analyzing protocol vectors...
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-zinc-800 bg-black">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Insert protocol command..."
                  className="w-full bg-zinc-950 border border-bitcoin/20 rounded-xl px-4 py-3 text-[11px] text-[#39FF14] focus:outline-none focus:border-bitcoin transition-colors pr-10 placeholder:text-zinc-700"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-bitcoin hover:text-white transition-colors disabled:opacity-30"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-black border border-bitcoin/50 text-bitcoin rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(57,255,20,0.2)] hover:border-bitcoin transition-colors"
      >
        <div className="relative">
          <Bot size={28} />
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }} 
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -top-1 -right-1 w-3 h-3 bg-bitcoin rounded-full border-2 border-black shadow-[0_0_10px_rgba(57,255,20,0.8)]" 
          />
        </div>
      </motion.button>
    </div>
  );
};

// Helper inside the file to avoid import issues
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
