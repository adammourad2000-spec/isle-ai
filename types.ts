export enum UserRole {
  EXPLORER = 'EXPLORER',      // Regular tourist
  VIP = 'VIP',                // Premium user with concierge access
  ADMIN = 'ADMIN'             // Platform administrator
}

export enum DestinationStatus {
  NOT_VISITED = 'NOT_VISITED',
  EXPLORING = 'EXPLORING',
  VISITED = 'VISITED'
}

export type ContentType = 'video' | 'info' | 'challenge' | 'gallery' | 'panorama';

export interface ChallengeQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  funFact?: string;  // Fun fact revealed after answering
}

export interface ChallengeResult {
  score: number;
  totalQuestions: number;
  percentage: number;
  passed: boolean;
  passingScore: number;
  badgeEarned?: string;
}

export interface Activity {
  id: string;
  title: string;
  type: ContentType;
  durationMin: number;
  videoUrl?: string;
  content?: string;

  // Media
  fileUrl?: string;
  fileName?: string;
  imageGallery?: string[];
  panoramaUrl?: string;

  // Location
  latitude?: number;
  longitude?: number;
  address?: string;

  // Ordering
  orderIndex?: number;

  // Interactive challenge (replaces quiz)
  challenge?: ChallengeQuestion[];
  isCompleted?: boolean;

  // Progress tracking
  progressPercent?: number;
  challengeScore?: number;
  lastAccessedAt?: string;

  // Challenge requirements
  passingScore?: number;
  passed?: boolean;

  // Tips & recommendations
  bestTimeToVisit?: string;
  insiderTip?: string;
  estimatedCost?: string;
}

export interface Destination {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  category: 'Beach' | 'Nature' | 'Culture' | 'Adventure' | 'Gastronomy' | 'Nightlife' | 'Historical';
  totalDuration: string;
  activities: Activity[];
  progress: number;
  status: DestinationStatus;

  // Location
  zone: string;  // Area/district of the island
  latitude?: number;
  longitude?: number;

  // Ordering
  orderIndex?: number;

  // Popularity & ratings
  visitCount?: number;
  avgTimeSpent?: number;
  rating?: number;
  reviewCount?: number;

  // Availability
  openingHours?: string;
  seasonalInfo?: string;
  isOpen?: boolean;

  // Journey prerequisites
  prerequisiteDestinationId?: string;
  isLocked?: boolean;

  // Pricing
  priceRange?: '$' | '$$' | '$$$' | '$$$$';
  isFree?: boolean;
}

export interface Journey {
  id: string;
  title: string;
  description: string;
  destinationIds: string[];
  theme: 'Adventure' | 'Relaxation' | 'Culture' | 'Family' | 'Romance' | 'All';
  estimatedDays: number;
  difficulty: 'Easy' | 'Moderate' | 'Challenging';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  nationality?: string;
  savedDestinations: string[];
  completedJourneys: string[];
  explorerLevel?: number;
  totalPointsEarned?: number;
  badges?: string[];
}

// Local business listing
export interface LocalBusiness {
  id: string;
  name: string;
  category: 'Restaurant' | 'Cafe' | 'Shop' | 'Tour' | 'Transport' | 'Accommodation' | 'Service';
  description: string;
  thumbnail: string;
  images?: string[];
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  priceRange?: '$' | '$$' | '$$$' | '$$$$';
  rating?: number;
  reviewCount?: number;
  openingHours?: string;
  isVerified?: boolean;
  isPremium?: boolean;  // Paid listing with priority
}

// VIP Services
export interface VIPService {
  id: string;
  title: string;
  category: 'Boat' | 'Flight' | 'Chauffeur' | 'Guide' | 'Concierge' | 'RealEstate' | 'Investment';
  description: string;
  priceFrom: number;
  currency: string;
  provider: string;
  contactInfo: string;
  thumbnail: string;
}

// Analytics
export interface AnalyticData {
  name: string;
  value: number;
}

export interface ZoneStats {
  zone: string;
  destinationId: string;
  destinationTitle: string;
  visitCount: number;
  completedCount: number;
  avgRating: number;
}

export interface IslandProgressData {
  name: string;
  totalExplorers: number;
  activeExplorers: number;
  destinationsVisited: number;
  avgExplorationRate: number;
  zoneBreakdown?: ZoneStats[];
}

export interface AdminDashboardStats {
  totalExplorers: number;
  totalDestinations: number;
  totalActivities: number;
  totalVisits: number;
  explorationRate: number;
  totalHoursExplored: number;
  activeBusinessListings: number;
  averageChallengeScore: number;
}

// Island exploration progress (for the circle fill effect)
export interface ExplorationProgress {
  totalDestinations: number;
  visitedDestinations: number;
  percentComplete: number;
  zonesProgress: {
    zone: string;
    total: number;
    visited: number;
  }[];
  currentStreak: number;  // Days in a row exploring
  badges: string[];
}

// ============ LEGACY TYPES FOR BACKWARDS COMPATIBILITY ============
// These types maintain compatibility with the existing learning platform code
// They will be gradually migrated to the new tourism-focused types

// Legacy UserRole with LEARNER
export { UserRole as UserRoleNew };
export const LegacyUserRole = {
  LEARNER: 'EXPLORER' as const,
  SUPERUSER: 'VIP' as const,
  ADMIN: 'ADMIN' as const
};

export enum CourseStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export type LegacyContentType = 'video' | 'text' | 'quiz' | 'pdf' | 'presentation';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface QuizResult {
  score: number;
  totalQuestions: number;
  percentage: number;
  passed: boolean;
  passingScore: number;
}

export interface Lesson {
  id: string;
  title: string;
  type: LegacyContentType;
  durationMin: number;
  videoUrl?: string;
  content?: string;
  fileUrl?: string;
  fileName?: string;
  pageCount?: number;
  orderIndex?: number;
  quiz?: QuizQuestion[];
  isCompleted?: boolean;
  progressPercent?: number;
  quizScore?: number;
  lastAccessedAt?: string;
  passingScore?: number;
  passed?: boolean;
}

export interface Course {
  id: string;
  code?: string;
  title: string;
  description: string;
  thumbnail: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  totalDuration: string;
  lessons: Lesson[];
  progress: number;
  status: CourseStatus;
  orderIndex?: number;
  enrolledCount?: number;
  avgCompletionTime?: number;
  rating?: number;
  deadline?: string;
  isMandatory?: boolean;
  isOverdue?: boolean;
  daysRemaining?: number;
  prerequisiteCourseId?: string;
  isLocked?: boolean;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  courseIds: string[];
  role: 'ALL' | 'SUPERUSER';
}

// Legacy User interface with ministry
export interface LegacyUser {
  id: string;
  name: string;
  email: string;
  role: 'LEARNER' | 'SUPERUSER' | 'ADMIN';
  ministry: string;
  enrolledCourses: string[];
  completedPaths: string[];
}

export interface MinistryCourseStat {
  ministry: string;
  courseId: string;
  courseTitle: string;
  enrolledCount: number;
  completedCount: number;
  avgScore: number;
  overdueCount: number;
}

export interface MinistryProgressData {
  name: string;
  totalLearners: number;
  activeLearners: number;
  coursesCompleted: number;
  overdueCount: number;
  avgCompletionRate: number;
  courseBreakdown?: MinistryCourseStat[];
}

export interface DeadlineInfo {
  deadline: string;
  daysRemaining: number;
  isOverdue: boolean;
  urgency: 'none' | 'low' | 'medium' | 'high' | 'overdue';
}
