/**
 * Map Transition Manager
 * Handles smooth animations for map marker transitions
 *
 * Features:
 * - Enter/exit animations for markers
 * - Pulsing highlight effects
 * - Staggered transitions
 * - 60fps animation loop
 */

import type { MapMarker } from '../types/chatbot';

// Types
export type MarkerAnimationState = 'entering' | 'visible' | 'highlighted' | 'exiting' | 'hidden';

export interface MarkerState {
  id: string;
  state: MarkerAnimationState;
  opacity: number;
  scale: number;
  pulsePhase?: number;
}

export interface TransitionConfig {
  enterDuration: number;     // ms for new markers to appear
  exitDuration: number;      // ms for old markers to fade
  staggerDelay: number;      // ms between each marker animation
  highlightPulsePeriod: number; // ms for one pulse cycle
  easeFunction: 'linear' | 'easeOut' | 'easeOutBack' | 'easeInOut';
}

export type StateChangeCallback = (states: Map<string, MarkerState>) => void;

// Default configuration
const DEFAULT_CONFIG: TransitionConfig = {
  enterDuration: 350,
  exitDuration: 200,
  staggerDelay: 30,
  highlightPulsePeriod: 1500,
  easeFunction: 'easeOutBack'
};

/**
 * Easing functions for animations
 */
const EASING = {
  linear: (t: number) => t,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
  easeOutBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInOut: (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
};

/**
 * Map Transition Manager Class
 */
export class MapTransitionManager {
  private markerStates: Map<string, MarkerState> = new Map();
  private animationFrameId: number | null = null;
  private onStateChange: StateChangeCallback;
  private config: TransitionConfig;
  private lastTime: number = 0;
  private enterQueue: { id: string; delay: number }[] = [];

  constructor(
    onStateChange: StateChangeCallback,
    config: Partial<TransitionConfig> = {}
  ) {
    this.onStateChange = onStateChange;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Transition to a new set of markers
   */
  transitionTo(
    newMarkers: MapMarker[],
    highlightedIds: string[],
    animate: boolean = true
  ): void {
    const newIds = new Set(newMarkers.map(m => m.id));
    const highlightSet = new Set(highlightedIds);

    // Clear enter queue
    this.enterQueue = [];

    // 1. Mark exiting markers
    for (const [id, state] of this.markerStates) {
      if (!newIds.has(id) && state.state !== 'exiting' && state.state !== 'hidden') {
        state.state = 'exiting';
      }
    }

    // 2. Add or update markers
    let enterIndex = 0;
    for (const marker of newMarkers) {
      const existing = this.markerStates.get(marker.id);

      if (!existing) {
        // New marker - queue for staggered entry
        if (animate) {
          this.markerStates.set(marker.id, {
            id: marker.id,
            state: 'entering',
            opacity: 0,
            scale: 0.5
          });
          this.enterQueue.push({
            id: marker.id,
            delay: enterIndex * this.config.staggerDelay
          });
          enterIndex++;
        } else {
          // Instant add
          this.markerStates.set(marker.id, {
            id: marker.id,
            state: highlightSet.has(marker.id) ? 'highlighted' : 'visible',
            opacity: 1,
            scale: 1,
            pulsePhase: highlightSet.has(marker.id) ? 0 : undefined
          });
        }
      } else if (existing.state === 'exiting') {
        // Was exiting, now staying
        existing.state = highlightSet.has(marker.id) ? 'highlighted' : 'visible';
        existing.pulsePhase = highlightSet.has(marker.id) ? 0 : undefined;
      } else if (highlightSet.has(marker.id) && existing.state !== 'highlighted') {
        // Newly highlighted
        existing.state = 'highlighted';
        existing.pulsePhase = 0;
      } else if (!highlightSet.has(marker.id) && existing.state === 'highlighted') {
        // No longer highlighted
        existing.state = 'visible';
        existing.scale = 1;
        delete existing.pulsePhase;
      }
    }

    // 3. Start animation loop
    if (animate) {
      this.startAnimationLoop();
    } else {
      this.notifyChange();
    }
  }

  /**
   * Highlight specific markers
   */
  setHighlights(ids: string[]): void {
    const highlightSet = new Set(ids);

    for (const [id, state] of this.markerStates) {
      if (highlightSet.has(id)) {
        if (state.state !== 'highlighted' && state.state !== 'entering') {
          state.state = 'highlighted';
          state.pulsePhase = 0;
        }
      } else {
        if (state.state === 'highlighted') {
          state.state = 'visible';
          state.scale = 1;
          delete state.pulsePhase;
        }
      }
    }

    // Start animation for pulsing
    if (ids.length > 0) {
      this.startAnimationLoop();
    }

    this.notifyChange();
  }

  /**
   * Clear all highlights
   */
  clearHighlights(): void {
    let hasHighlights = false;

    for (const state of this.markerStates.values()) {
      if (state.state === 'highlighted') {
        state.state = 'visible';
        state.scale = 1;
        delete state.pulsePhase;
        hasHighlights = true;
      }
    }

    if (hasHighlights) {
      this.notifyChange();
    }
  }

  /**
   * Get current marker state
   */
  getMarkerState(id: string): MarkerState | undefined {
    return this.markerStates.get(id);
  }

  /**
   * Get all visible marker states
   */
  getVisibleStates(): Map<string, MarkerState> {
    const visible = new Map<string, MarkerState>();
    for (const [id, state] of this.markerStates) {
      if (state.state !== 'hidden') {
        visible.set(id, state);
      }
    }
    return visible;
  }

  /**
   * Start the animation loop
   */
  private startAnimationLoop(): void {
    if (this.animationFrameId !== null) return;

    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame((t) => this.animate(t));
  }

  /**
   * Stop the animation loop
   */
  private stopAnimationLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Animation frame handler
   */
  private animate(currentTime: number): void {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    let hasChanges = false;
    let hasActiveAnimations = false;
    const toRemove: string[] = [];

    const ease = EASING[this.config.easeFunction];

    // Process enter queue
    for (const item of this.enterQueue) {
      item.delay -= deltaTime;
    }

    // Update each marker state
    for (const [id, state] of this.markerStates) {
      switch (state.state) {
        case 'entering': {
          // Check if still waiting in queue
          const queueItem = this.enterQueue.find(q => q.id === id);
          if (queueItem && queueItem.delay > 0) {
            hasActiveAnimations = true;
            break;
          }

          // Animate entry
          const progress = Math.min(1, state.opacity + deltaTime / this.config.enterDuration);
          state.opacity = progress;
          state.scale = 0.5 + 0.5 * ease(progress);

          if (progress >= 1) {
            state.state = 'visible';
            state.opacity = 1;
            state.scale = 1;
          } else {
            hasActiveAnimations = true;
          }
          hasChanges = true;
          break;
        }

        case 'exiting': {
          // Animate exit
          state.opacity = Math.max(0, state.opacity - deltaTime / this.config.exitDuration);
          state.scale = state.opacity * 0.8 + 0.2;

          if (state.opacity <= 0) {
            toRemove.push(id);
          } else {
            hasActiveAnimations = true;
          }
          hasChanges = true;
          break;
        }

        case 'highlighted': {
          // Pulsing animation
          state.pulsePhase = ((state.pulsePhase || 0) + deltaTime) % this.config.highlightPulsePeriod;
          const pulseProgress = state.pulsePhase / this.config.highlightPulsePeriod;
          state.scale = 1 + 0.12 * Math.sin(pulseProgress * Math.PI * 2);
          hasChanges = true;
          hasActiveAnimations = true;
          break;
        }
      }
    }

    // Remove completed exit animations
    for (const id of toRemove) {
      this.markerStates.delete(id);
      hasChanges = true;
    }

    // Remove processed queue items
    this.enterQueue = this.enterQueue.filter(q => q.delay > 0);

    // Notify of changes
    if (hasChanges) {
      this.notifyChange();
    }

    // Continue or stop animation loop
    if (hasActiveAnimations) {
      this.animationFrameId = requestAnimationFrame((t) => this.animate(t));
    } else {
      this.animationFrameId = null;
    }
  }

  /**
   * Notify listener of state change
   */
  private notifyChange(): void {
    // Create a new map to trigger React re-render
    this.onStateChange(new Map(this.markerStates));
  }

  /**
   * Reset all states
   */
  reset(): void {
    this.stopAnimationLoop();
    this.markerStates.clear();
    this.enterQueue = [];
    this.notifyChange();
  }

  /**
   * Cleanup on destroy
   */
  destroy(): void {
    this.stopAnimationLoop();
    this.markerStates.clear();
    this.enterQueue = [];
  }
}

/**
 * Create a transition manager instance
 */
export function createTransitionManager(
  onStateChange: StateChangeCallback,
  config?: Partial<TransitionConfig>
): MapTransitionManager {
  return new MapTransitionManager(onStateChange, config);
}
