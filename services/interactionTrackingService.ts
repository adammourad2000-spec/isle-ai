// ============================================
// ISLE AI - INTERACTION TRACKING SERVICE
// Tracks all user interactions: clicks, popup events, place interactions
// ============================================

import {
  InteractionEvent,
  InteractionEventType,
  InteractionSource,
  ActivityItem
} from '../types/analytics';
import { KnowledgeCategory } from '../types/chatbot';
import { analyticsStore } from './analyticsStore';
import { emitAnalyticsEvent } from './realTimeAnalytics';

// ============ POPUP TIMING TRACKER ============

interface PopupSession {
  placeId: string;
  placeName: string;
  placeCategory: KnowledgeCategory;
  openedAt: number;
  source: InteractionSource;
  coordinates?: { lat: number; lng: number };
}

const activePopups: Map<string, PopupSession> = new Map();

// ============ HELPER FUNCTIONS ============

function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getVisitorId(): string {
  if (typeof window === 'undefined') {
    return `visitor_${Math.random().toString(36).substr(2, 9)}`;
  }

  let visitorId = localStorage.getItem('isle_visitor_id');
  if (!visitorId) {
    visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('isle_visitor_id', visitorId);
  }
  return visitorId;
}

function getSessionId(): string {
  if (typeof window === 'undefined') {
    return `session_${Math.random().toString(36).substr(2, 9)}`;
  }

  let sessionId = sessionStorage.getItem('isle_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('isle_session_id', sessionId);
  }
  return sessionId;
}

// ============ CORE TRACKING FUNCTION ============

export function trackInteraction(
  eventType: InteractionEventType,
  placeId: string,
  placeName: string,
  placeCategory: KnowledgeCategory,
  source: InteractionSource,
  options?: {
    coordinates?: { lat: number; lng: number };
    duration?: number;
    metadata?: Record<string, any>;
  }
): InteractionEvent {
  const event: InteractionEvent = {
    id: generateEventId(),
    eventType,
    placeId,
    placeName,
    placeCategory,
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
    visitorId: getVisitorId(),
    source,
    coordinates: options?.coordinates,
    duration: options?.duration,
    metadata: options?.metadata
  };

  // Store the event
  analyticsStore.addInteraction(event);

  // Emit real-time event
  emitAnalyticsEvent({
    type: 'new_interaction',
    timestamp: event.timestamp,
    data: event
  });

  // Create activity item for significant events
  if (['phone_click', 'booking_click', 'directions_click'].includes(eventType)) {
    const activity: ActivityItem = {
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type: 'interaction',
      timestamp: event.timestamp,
      visitorId: event.visitorId,
      sessionId: event.sessionId,
      title: getActivityTitle(eventType, placeName),
      description: getActivityDescription(eventType, placeName, source),
      metadata: { eventType, placeId, source },
      significance: eventType === 'booking_click' ? 'high' : 'medium'
    };
    analyticsStore.addActivity(activity);
  }

  console.log(`[Tracking] ${eventType} on "${placeName}" from ${source}`);

  return event;
}

function getActivityTitle(eventType: InteractionEventType, placeName: string): string {
  switch (eventType) {
    case 'phone_click': return `Phone click: ${placeName}`;
    case 'website_click': return `Website visit: ${placeName}`;
    case 'directions_click': return `Directions requested: ${placeName}`;
    case 'booking_click': return `Booking initiated: ${placeName}`;
    case 'place_click': return `Place viewed: ${placeName}`;
    case 'save_place': return `Place saved: ${placeName}`;
    default: return `Interaction: ${placeName}`;
  }
}

function getActivityDescription(
  eventType: InteractionEventType,
  placeName: string,
  source: InteractionSource
): string {
  const sourceLabel = source === 'map' ? 'map popup' : source === 'chat' ? 'chat panel' : source;
  switch (eventType) {
    case 'phone_click': return `Visitor clicked phone number for ${placeName} from ${sourceLabel}`;
    case 'website_click': return `Visitor opened website for ${placeName} from ${sourceLabel}`;
    case 'directions_click': return `Visitor requested directions to ${placeName} from ${sourceLabel}`;
    case 'booking_click': return `Visitor initiated booking for ${placeName} from ${sourceLabel}`;
    default: return `Visitor interacted with ${placeName} from ${sourceLabel}`;
  }
}

// ============ SPECIALIZED TRACKING FUNCTIONS ============

/**
 * Track phone number click
 */
export function trackPhoneClick(
  placeId: string,
  placeName: string,
  placeCategory: KnowledgeCategory,
  source: InteractionSource,
  phoneNumber?: string,
  coordinates?: { lat: number; lng: number }
): void {
  trackInteraction('phone_click', placeId, placeName, placeCategory, source, {
    coordinates,
    metadata: { phoneNumber }
  });
}

/**
 * Track website click
 */
export function trackWebsiteClick(
  placeId: string,
  placeName: string,
  placeCategory: KnowledgeCategory,
  source: InteractionSource,
  websiteUrl?: string,
  coordinates?: { lat: number; lng: number }
): void {
  trackInteraction('website_click', placeId, placeName, placeCategory, source, {
    coordinates,
    metadata: { websiteUrl }
  });
}

/**
 * Track directions click
 */
export function trackDirectionsClick(
  placeId: string,
  placeName: string,
  placeCategory: KnowledgeCategory,
  source: InteractionSource,
  coordinates?: { lat: number; lng: number }
): void {
  trackInteraction('directions_click', placeId, placeName, placeCategory, source, {
    coordinates
  });
}

/**
 * Track booking click
 */
export function trackBookingClick(
  placeId: string,
  placeName: string,
  placeCategory: KnowledgeCategory,
  source: InteractionSource,
  bookingUrl?: string,
  coordinates?: { lat: number; lng: number }
): void {
  trackInteraction('booking_click', placeId, placeName, placeCategory, source, {
    coordinates,
    metadata: { bookingUrl }
  });
}

/**
 * Track popup open - starts timing
 */
export function trackPopupOpen(
  placeId: string,
  placeName: string,
  placeCategory: KnowledgeCategory,
  source: InteractionSource,
  coordinates?: { lat: number; lng: number }
): void {
  // Store popup session for duration tracking
  activePopups.set(placeId, {
    placeId,
    placeName,
    placeCategory,
    openedAt: Date.now(),
    source,
    coordinates
  });

  trackInteraction('popup_open', placeId, placeName, placeCategory, source, {
    coordinates
  });
}

/**
 * Track popup close - calculates duration
 */
export function trackPopupClose(placeId: string): void {
  const popupSession = activePopups.get(placeId);
  if (!popupSession) return;

  const duration = Date.now() - popupSession.openedAt;

  trackInteraction('popup_close', placeId, popupSession.placeName, popupSession.placeCategory, popupSession.source, {
    coordinates: popupSession.coordinates,
    duration,
    metadata: { durationMs: duration, durationSeconds: Math.round(duration / 1000) }
  });

  activePopups.delete(placeId);
}

/**
 * Track place click from chat
 */
export function trackChatPlaceClick(
  placeId: string,
  placeName: string,
  placeCategory: KnowledgeCategory,
  coordinates?: { lat: number; lng: number }
): void {
  trackInteraction('chat_place_click', placeId, placeName, placeCategory, 'chat', {
    coordinates
  });
}

/**
 * Track map marker click
 */
export function trackMapMarkerClick(
  placeId: string,
  placeName: string,
  placeCategory: KnowledgeCategory,
  coordinates: { lat: number; lng: number }
): void {
  trackInteraction('map_marker_click', placeId, placeName, placeCategory, 'map', {
    coordinates
  });
}

/**
 * Track "Ask AI" button click
 */
export function trackAskAIClick(
  placeId: string,
  placeName: string,
  placeCategory: KnowledgeCategory,
  source: InteractionSource
): void {
  trackInteraction('ask_ai_click', placeId, placeName, placeCategory, source);
}

/**
 * Track place save action
 */
export function trackSavePlace(
  placeId: string,
  placeName: string,
  placeCategory: KnowledgeCategory,
  source: InteractionSource
): void {
  trackInteraction('save_place', placeId, placeName, placeCategory, source);
}

// ============ BATCH TRACKING ============

/**
 * Get all interactions for current session
 */
export function getSessionInteractions(): InteractionEvent[] {
  const sessionId = getSessionId();
  return analyticsStore.getInteractionsBySession(sessionId);
}

/**
 * Get all interactions for current visitor
 */
export function getVisitorInteractions(): InteractionEvent[] {
  const visitorId = getVisitorId();
  return analyticsStore.getInteractionsByVisitor(visitorId);
}

/**
 * Get interaction counts by type
 */
export function getInteractionCounts(): Record<InteractionEventType, number> {
  const interactions = analyticsStore.getAllInteractions();
  const counts: Partial<Record<InteractionEventType, number>> = {};

  for (const interaction of interactions) {
    counts[interaction.eventType] = (counts[interaction.eventType] || 0) + 1;
  }

  return counts as Record<InteractionEventType, number>;
}

// ============ CLEANUP ============

/**
 * Close any open popups (call on component unmount)
 */
export function cleanupPopups(): void {
  for (const [placeId] of activePopups) {
    trackPopupClose(placeId);
  }
}

// Export for use in components
export {
  getVisitorId,
  getSessionId
};
