import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, User, Star, ArrowRight, CornerDownRight, MessageSquareCode, Tag } from 'lucide-react';
import { Product, UserProfile } from '../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestedIds?: string[];
}

interface AiAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onViewProductDetails: (product: Product) => void;
  currentUser?: UserProfile | null;
  userPincode?: string;
  userCity?: string;
  userState?: string;
}

export default function AiAssistant({
  isOpen,
  onClose,
  products,
  onViewProductDetails,
  currentUser,
  userPincode = '110001',
  userCity = 'New Delhi',
  userState = 'Delhi'
}: AiAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I am your **AURA Retail Concierge**. I evaluate deliverability to your pincode, active promotional offers, and your shopping preferences to give you real-time recommendations. What are you looking for today?"
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [promotionalBanner, setPromotionalBanner] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAiConfigBanner();
    }
  }, [isOpen]);

  const fetchAiConfigBanner = async () => {
    try {
      const res = await fetch('/api/admin/ai-config');
      if (res.ok) {
        const data = await res.json();
        if (data.promotionalBanner) {
          setPromotionalBanner(data.promotionalBanner);
        }
      }
    } catch (err) {
      // Silently catch
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  if (!isOpen) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const formattedHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage,
          chatHistory: formattedHistory,
          userPincode,
          userCity,
          userState,
          userEmail: currentUser?.email,
          userId: currentUser?.uid
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response,
          suggestedIds: data.suggestedProducts || []
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "I apologize, but I am currently unable to reach the recommendation service. Please try asking again shortly!"
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please verify your internet connection or check if the server is running."
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleRecommendClick = (prod: Product) => {
    onViewProductDetails(prod);
  };

  // Helper to parse markdown-like bold (**text**) in messages
  const renderMessageContent = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-neutral-900">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity" 
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div 
          id="assistant-sidebar-panel"
          className="w-screen max-w-md transform bg-white shadow-2xl transition-all duration-300 flex flex-col h-full border-l border-neutral-100"
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between border-b border-indigo-50 px-6 py-4 bg-indigo-50/50">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm animate-pulse-slow">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-sans font-bold text-base text-neutral-900 leading-none">
                  AURA Retail Concierge
                </h2>
                <span className="font-mono text-[9px] text-indigo-700 font-bold uppercase tracking-wider block mt-1">
                  📍 {userCity} ({userPincode})
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-neutral-400 hover:text-neutral-950 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Dynamic Promotional Banner from DB */}
          {promotionalBanner && (
            <div className="bg-gradient-to-r from-indigo-900 to-purple-950 px-4 py-2.5 text-white text-[11px] font-medium flex items-center gap-2 shadow-inner">
              <Tag className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <span className="truncate">{promotionalBanner}</span>
            </div>
          )}

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 bg-neutral-50/30">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              
              // Map suggested product details
              const suggestedProducts = products.filter(p => msg.suggestedIds?.includes(p.id));

              return (
                <div key={index} className={`flex gap-3.5 ${isUser ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 text-xs shadow-xs ${
                    isUser 
                      ? 'bg-neutral-900 text-white' 
                      : 'bg-indigo-600 text-white font-bold'
                  }`}>
                    {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                  </div>

                  {/* Bubble content */}
                  <div className="flex-1 max-w-[80%] space-y-3">
                    <div className={`p-4 rounded-2xl text-xs sm:text-sm shadow-xs leading-relaxed ${
                      isUser 
                        ? 'bg-neutral-900 text-white rounded-tr-none' 
                        : 'bg-white text-neutral-700 border border-neutral-100 rounded-tl-none'
                    }`}>
                      <p className="whitespace-pre-wrap">
                        {renderMessageContent(msg.content)}
                      </p>
                    </div>

                    {/* Interactive Embedded Suggestions */}
                    {!isUser && suggestedProducts.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <span className="text-[10px] font-bold font-mono text-indigo-600 uppercase tracking-wider block flex items-center gap-1 pl-1">
                          <CornerDownRight className="h-3 w-3" />
                          Curated Recommendations:
                        </span>
                        
                        <div className="grid gap-2">
                          {suggestedProducts.map(prod => (
                            <div 
                              key={prod.id}
                              onClick={() => handleRecommendClick(prod)}
                              className="flex items-center gap-3 p-2.5 bg-white border border-indigo-100 rounded-xl hover:border-indigo-400 cursor-pointer shadow-xs transition-all hover:shadow-md hover:translate-x-0.5"
                            >
                              <img 
                                src={prod.image} 
                                alt={prod.name} 
                                className="h-11 w-11 object-cover rounded-lg flex-shrink-0 border border-neutral-100" 
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-semibold text-neutral-900 truncate leading-tight">
                                  {prod.name}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] font-bold text-neutral-800">₹{prod.price}</span>
                                  <span className="text-neutral-300">•</span>
                                  <span className="text-[10px] text-neutral-400 capitalize">{prod.category}</span>
                                </div>
                              </div>
                              <ArrowRight className="h-3.5 w-3.5 text-indigo-500 mr-1 flex-shrink-0" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 bg-indigo-600 text-white shadow-xs">
                  <Sparkles className="h-4 w-4 animate-spin-slow" />
                </div>
                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-neutral-100 shadow-xs flex items-center gap-1 h-10 w-20 justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Bar input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-neutral-100 bg-white">
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask Concierge: 'Recommend a wireless setup...'"
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-3 pl-4 pr-12 text-xs sm:text-sm outline-none transition-all placeholder:text-neutral-400 focus:border-indigo-500 focus:bg-white"
              />
              <button
                type="submit"
                className="absolute right-2 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all active:scale-95 shadow-sm"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-[9px] text-center text-neutral-400 mt-2">
              Contextual product recommendations & support assistance
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
