/**
 * EXEMPLE D'INTÉGRATION
 * ChatbotPanel avec système de suggestions immobilières
 *
 * Copiez ce code dans votre ChatbotPanel.tsx existant
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles } from 'lucide-react';

// Imports pour le système de propriétés
import { usePropertySuggestions } from '../hooks/usePropertySuggestions';
import { PropertySuggestionBanner } from '../components/PropertySuggestionBanner';
import { ChatMessage } from '../types/chatbot';

interface ChatbotPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatbotPanelWithProperties: React.FC<ChatbotPanelProps> = ({ isOpen, onClose }) => {
  // État des messages du chat
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your Isle AI travel concierge. How can I help you discover the Cayman Islands today?',
      timestamp: new Date().toISOString(),
    },
  ]);

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ========================================
  // PROPERTY SUGGESTIONS SYSTEM
  // ========================================

  // Extraire uniquement le texte des messages pour l'analyse
  const chatTexts = messages.map(m => m.content);

  // Hook de suggestions de propriétés avec configuration
  const {
    currentSuggestion,
    shouldShowSuggestion,
    handleInterest,
    dismissSuggestion,
    messagesUntilNext,
    suggestionsShown,
  } = usePropertySuggestions(chatTexts, {
    enabled: true,              // Activer les suggestions
    suggestionInterval: 10,     // Suggérer tous les 10 messages
    maxSuggestions: 5,          // Max 5 suggestions par session
  });

  // Log pour debug (à retirer en production)
  useEffect(() => {
    console.log('📊 Property Suggestions Stats:', {
      messagesUntilNext,
      suggestionsShown,
      shouldShow: shouldShowSuggestion,
      hasSuggestion: !!currentSuggestion,
    });
  }, [messagesUntilNext, suggestionsShown, shouldShowSuggestion, currentSuggestion]);

  // ========================================
  // CHAT FUNCTIONALITY
  // ========================================

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Message utilisateur
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // Simuler réponse de l'IA (remplacer par votre RAG service)
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: `Great question about "${inputValue.slice(0, 50)}...". Let me help you with that!`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  // Auto-scroll vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ========================================
  // RENDER
  // ========================================

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl h-[90vh] bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-slate-800/50 border-b border-white/10 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Isle AI Concierge</h2>
              <p className="text-gray-400 text-sm">
                {messagesUntilNext > 0 && suggestionsShown < 5 && (
                  <span className="text-purple-400">
                    💎 Property suggestion in {messagesUntilNext} messages
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message, index) => (
            <div key={message.id}>
              {/* Message Bubble */}
              <div
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-4 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                      : 'bg-slate-800/50 text-gray-100'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <span className="text-xs opacity-70 mt-2 block">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              {/* ========================================
                  PROPERTY SUGGESTION BANNER
                  S'affiche après le dernier message quand c'est le bon timing
                  ======================================== */}
              {shouldShowSuggestion &&
               currentSuggestion &&
               index === messages.length - 1 && (
                <PropertySuggestionBanner
                  recommendation={currentSuggestion}
                  onInterested={(interested) => {
                    handleInterest(interested);

                    // Ajouter un message de confirmation
                    const confirmMessage: ChatMessage = {
                      id: `msg-${Date.now()}-confirm`,
                      role: 'assistant',
                      content: interested
                        ? "Excellent choice! 🎉 I've noted your interest. Our property specialist will contact you with more details about this amazing property."
                        : "No problem! I have many more properties to show you. Let me know what else you'd like to explore in the Cayman Islands.",
                      timestamp: new Date().toISOString(),
                    };
                    setTimeout(() => {
                      setMessages(prev => [...prev, confirmMessage]);
                    }, 500);
                  }}
                  onDismiss={dismissSuggestion}
                />
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-slate-800/50 border-t border-white/10 p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me anything about Cayman Islands..."
              className="flex-1 bg-slate-700/50 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
            />
            <button
              onClick={handleSendMessage}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-3 rounded-xl hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ChatbotPanelWithProperties;

/**
 * ========================================
 * NOTES D'IMPLÉMENTATION
 * ========================================
 *
 * 1. Le hook usePropertySuggestions analyse automatiquement les messages
 * 2. Suggestions apparaissent tous les 10 messages (configurable)
 * 3. Maximum 5 suggestions par session (configurable)
 * 4. Le banner s'affiche après le dernier message
 * 5. Tracking automatique des intérêts (localStorage + API)
 *
 * CONFIGURATION:
 * - Modifier suggestionInterval pour changer la fréquence
 * - Modifier maxSuggestions pour limiter le nombre total
 * - Désactiver avec enabled: false
 *
 * ANALYTICS:
 * - Les intérêts sont trackés automatiquement
 * - Accessibles via getInterests() et getInterestedProperties()
 * - Envoyés à l'API backend (configurable)
 *
 * PERFORMANCE:
 * - Caching des résultats (1h)
 * - Fallback automatique si API échoue
 * - Lazy loading des images
 *
 * ========================================
 */
