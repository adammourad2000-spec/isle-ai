/**
 * Cayman Islands Knowledge Base
 * Re-exports from the original data file - NO CHANGES to actual data
 *
 * This file simply provides the same data through the new structure
 * The original file (data/cayman-islands-knowledge.ts) remains unchanged
 */

// Import ALL the knowledge from the original location
import {
  CAYMAN_KNOWLEDGE_BASE,
  CAYMAN_GUIDES
} from '../../../../data/cayman-islands-knowledge';

// Re-export with standard names for the island loader
export const KNOWLEDGE_BASE = CAYMAN_KNOWLEDGE_BASE;
export const GUIDES = CAYMAN_GUIDES;

// Also export for backwards compatibility
export { CAYMAN_KNOWLEDGE_BASE, CAYMAN_GUIDES };
