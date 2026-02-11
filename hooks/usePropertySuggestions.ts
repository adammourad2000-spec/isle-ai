/**
 * usePropertySuggestions Hook
 * Intelligent property recommendation system with stealth marketing
 * Suggests properties every 10 messages based on conversation context
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Property, PropertyRecommendation, UserPropertyInterest } from '../types/property';
import { propertyService } from '../services/propertyService';

interface UsePropertySuggestionsOptions {
  enabled?: boolean;
  suggestionInterval?: number; // Show suggestion every N messages
  maxSuggestions?: number; // Max suggestions per session
}

interface PropertySuggestionState {
  currentSuggestion: PropertyRecommendation | null;
  isLoading: boolean;
  messageCount: number;
  suggestionsShown: number;
  userInterests: UserPropertyInterest[];
  shouldShowSuggestion: boolean;
}

export const usePropertySuggestions = (
  chatMessages: string[],
  options: UsePropertySuggestionsOptions = {}
) => {
  const {
    enabled = true,
    suggestionInterval = 10,
    maxSuggestions = 5,
  } = options;

  const [state, setState] = useState<PropertySuggestionState>({
    currentSuggestion: null,
    isLoading: false,
    messageCount: 0,
    suggestionsShown: 0,
    userInterests: [],
    shouldShowSuggestion: false,
  });

  const lastSuggestionAt = useRef<number>(0);
  const sessionId = useRef<string>(`session-${Date.now()}`);

  /**
   * Check if it's time to show a suggestion
   */
  const checkSuggestionTiming = useCallback(() => {
    if (!enabled) return false;
    if (state.suggestionsShown >= maxSuggestions) return false;

    const messagesSinceLastSuggestion = chatMessages.length - lastSuggestionAt.current;

    return messagesSinceLastSuggestion >= suggestionInterval;
  }, [enabled, state.suggestionsShown, maxSuggestions, chatMessages.length, suggestionInterval]);

  /**
   * Fetch property suggestion based on chat context
   */
  const fetchSuggestion = useCallback(async () => {
    if (!checkSuggestionTiming()) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const recommendations = await propertyService.getSmartRecommendations(
        chatMessages,
        1 // Get 1 suggestion at a time
      );

      if (recommendations.length > 0) {
        setState(prev => ({
          ...prev,
          currentSuggestion: recommendations[0],
          isLoading: false,
          shouldShowSuggestion: true,
          suggestionsShown: prev.suggestionsShown + 1,
        }));
        lastSuggestionAt.current = chatMessages.length;
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Failed to fetch property suggestion:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [chatMessages, checkSuggestionTiming]);

  /**
   * Handle user interest response
   */
  const handleInterest = useCallback((interested: boolean) => {
    if (!state.currentSuggestion) return;

    const interest: UserPropertyInterest = {
      propertyId: state.currentSuggestion.property.id,
      sessionId: sessionId.current,
      interested,
      timestamp: new Date().toISOString(),
      source: 'chatbot-suggestion',
      userMessage: chatMessages[chatMessages.length - 1],
    };

    setState(prev => ({
      ...prev,
      userInterests: [...prev.userInterests, interest],
      shouldShowSuggestion: false,
      currentSuggestion: null,
    }));

    // Save to localStorage for analytics
    try {
      const stored = localStorage.getItem('property_interests') || '[]';
      const interests = JSON.parse(stored);
      interests.push(interest);
      localStorage.setItem('property_interests', JSON.stringify(interests));
    } catch (error) {
      console.error('Failed to save property interest:', error);
    }

    // Optional: Send to backend analytics
    sendAnalytics(interest);
  }, [state.currentSuggestion, chatMessages]);

  /**
   * Dismiss current suggestion
   */
  const dismissSuggestion = useCallback(() => {
    setState(prev => ({
      ...prev,
      shouldShowSuggestion: false,
      currentSuggestion: null,
    }));
  }, []);

  /**
   * Reset suggestion state
   */
  const reset = useCallback(() => {
    setState({
      currentSuggestion: null,
      isLoading: false,
      messageCount: 0,
      suggestionsShown: 0,
      userInterests: [],
      shouldShowSuggestion: false,
    });
    lastSuggestionAt.current = 0;
  }, []);

  /**
   * Get all user interests from this session
   */
  const getInterests = useCallback(() => {
    return state.userInterests;
  }, [state.userInterests]);

  /**
   * Get interested properties only
   */
  const getInterestedProperties = useCallback(() => {
    return state.userInterests
      .filter(i => i.interested)
      .map(i => i.propertyId);
  }, [state.userInterests]);

  // Monitor message count and fetch suggestions
  useEffect(() => {
    if (!enabled) return;

    if (checkSuggestionTiming() && !state.isLoading && !state.shouldShowSuggestion) {
      // Add small delay for natural timing
      const timer = setTimeout(() => {
        fetchSuggestion();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [chatMessages.length, enabled, checkSuggestionTiming, fetchSuggestion, state.isLoading, state.shouldShowSuggestion]);

  return {
    // State
    currentSuggestion: state.currentSuggestion,
    isLoading: state.isLoading,
    shouldShowSuggestion: state.shouldShowSuggestion,
    suggestionsShown: state.suggestionsShown,
    messageCount: chatMessages.length,
    messagesUntilNext: Math.max(0, suggestionInterval - (chatMessages.length - lastSuggestionAt.current)),

    // Actions
    handleInterest,
    dismissSuggestion,
    reset,
    getInterests,
    getInterestedProperties,

    // Manual control
    fetchSuggestion,
  };
};

/**
 * Send analytics to backend
 */
async function sendAnalytics(interest: UserPropertyInterest) {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const response = await fetch(`${apiUrl}/api/analytics/property-interest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(interest),
    });

    if (!response.ok) {
      throw new Error(`Analytics API returned ${response.status}`);
    }

    const data = await response.json();
    console.log('Analytics tracked:', data);
  } catch (error) {
    console.error('Failed to send analytics:', error);
    // Fail silently - analytics should not break user experience
  }
}
