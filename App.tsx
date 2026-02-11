import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BookOpen,
  Layout,
  Trophy,
  Settings,
  CheckCircle,
  LogOut,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Users,
  Menu,
  X,
  Plus,
  Save,
  ArrowLeft,
  Lock,
  FileText,
  Video,
  HelpCircle,
  Trash2,
  MonitorPlay,
  List,
  Download,
  PlayCircle,
  RefreshCw,
  Award,
  Clock,
  UserCheck,
  UserX,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  XCircle,
  Calendar,
  AlertTriangle,
  Target,
  GripVertical,
  Pencil,
  Maximize2,
  Minimize2,
  ExternalLink,
  FileSpreadsheet,
  MessageSquare,
  Sparkles,
  Bot,
  Layers,
  Star
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { LiquidBackground } from './components/LiquidBackground';
import { GlassCard, PrimaryButton, SecondaryButton, ProgressBar, Badge, FileDropZone, IconButton, ToastProvider, useToast, LiquidVideoFrame } from './components/UIComponents';
import { AnimatePresence, Reorder, motion, LayoutGroup, useScroll, useTransform, useSpring, useMotionValue, useInView } from 'framer-motion';
import { PageTransition } from './components/PageTransition';
import ChatbotPanel from './components/ChatbotPanel';
import { KnowledgeAdmin } from './components/admin';
import { dataService } from './services/dataService';
import { authAPI, setAuthToken, getAuthToken, PendingUser, adminAPI } from './services/api';
import api from './services/api';
import { MINISTRIES } from './constants';
import { Course, User, UserRole, Lesson, AnalyticData, LearningPath, ContentType } from './types';

// --- Types for Views ---
type View = 'LANDING' | 'AUTH' | 'DASHBOARD' | 'COURSE_PLAYER' | 'ADMIN' | 'AI_GUIDE';
type AdminSection = 'OVERVIEW' | 'USERS' | 'COURSES' | 'ANALYTICS';

// VideoFrame moved to components/UIComponents.tsx

// Helper to sort courses by level priority and orderIndex
const LEVEL_PRIORITY: Record<string, number> = { 'Beginner': 0, 'Intermediate': 1, 'Advanced': 2 };
const sortCourses = (coursesToSort: Course[]): Course[] => {
  return [...coursesToSort].sort((a, b) => {
    // First sort by level priority
    const levelDiff = (LEVEL_PRIORITY[a.level] || 0) - (LEVEL_PRIORITY[b.level] || 0);
    if (levelDiff !== 0) return levelDiff;
    // Then sort by orderIndex within the same level
    return (a.orderIndex ?? 999) - (b.orderIndex ?? 999);
  });
};

// Video Helpers
const isYouTubeUrl = (url: string) => {
  return url.includes('youtube.com') || url.includes('youtu.be');
};

const getYouTubeVideoId = (url: string) => {
  if (url.includes('youtu.be')) {
    return url.split('/').pop();
  }
  const urlParams = new URLSearchParams(new URL(url).search);
  return urlParams.get('v');
};

// Module Progress Indicator Component with elegant scroll
interface ModuleProgressIndicatorProps {
  courses: Course[];
  totalProgress: number;
}

const ModuleProgressIndicator: React.FC<ModuleProgressIndicatorProps> = ({ courses, totalProgress }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);

  const checkScrollability = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 1);
    }
  }, []);

  useEffect(() => {
    checkScrollability();
    const handleResize = () => checkScrollability();
    window.addEventListener('resize', handleResize);

    // Auto-scroll to current module on mount
    const container = scrollContainerRef.current;
    if (container) {
      const currentModuleIndex = courses.findIndex((_, idx) => {
        const moduleProgress = ((idx + 1) / courses.length) * 100;
        return totalProgress < moduleProgress;
      });
      if (currentModuleIndex > 0) {
        const scrollTarget = Math.max(0, (currentModuleIndex - 1) * 60);
        setTimeout(() => {
          container.scrollTo({ left: scrollTarget, behavior: 'smooth' });
        }, 300);
      }
    }

    return () => window.removeEventListener('resize', handleResize);
  }, [courses.length, checkScrollability, totalProgress]);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = 150;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollContainerRef.current?.offsetLeft || 0));
    setScrollLeftPos(scrollContainerRef.current?.scrollLeft || 0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (scrollContainerRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 1.5;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollLeftPos - walk;
    }
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  // Touch events for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].pageX - (scrollContainerRef.current?.offsetLeft || 0));
    setScrollLeftPos(scrollContainerRef.current?.scrollLeft || 0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const x = e.touches[0].pageX - (scrollContainerRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 1.5;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollLeftPos - walk;
    }
  };

  const handleTouchEnd = () => setIsDragging(false);

  return (
    <div className="relative mt-4 group/scroll">
      {/* Left fade & navigation button */}
      <div className={`absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-zinc-900/90 via-zinc-900/50 to-transparent z-10 pointer-events-none transition-opacity duration-300 rounded-l-xl ${canScrollLeft ? 'opacity-100' : 'opacity-0'}`} />
      <motion.button
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: canScrollLeft ? 1 : 0, x: canScrollLeft ? 0 : 10 }}
        onClick={() => scroll('left')}
        className={`absolute left-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-zinc-800/90 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-zinc-700/90 hover:border-[#D4AF37]/30 transition-all duration-200 shadow-lg backdrop-blur-sm ${canScrollLeft ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-label="Scroll left"
      >
        <ChevronLeft size={16} />
      </motion.button>

      {/* Right fade & navigation button */}
      <div className={`absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-zinc-900/90 via-zinc-900/50 to-transparent z-10 pointer-events-none transition-opacity duration-300 rounded-r-xl ${canScrollRight ? 'opacity-100' : 'opacity-0'}`} />
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: canScrollRight ? 1 : 0, x: canScrollRight ? 0 : -10 }}
        onClick={() => scroll('right')}
        className={`absolute right-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-zinc-800/90 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-zinc-700/90 hover:border-[#D4AF37]/30 transition-all duration-200 shadow-lg backdrop-blur-sm ${canScrollRight ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-label="Scroll right"
      >
        <ChevronRight size={16} />
      </motion.button>

      {/* Scrollable container */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScrollability}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`flex gap-2 overflow-x-auto px-3 py-2 ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {courses.map((course, idx) => {
          const moduleProgress = ((idx + 1) / courses.length) * 100;
          const isCompleted = totalProgress >= moduleProgress;
          const isCurrentModule = totalProgress < moduleProgress && (idx === 0 || totalProgress >= ((idx) / courses.length) * 100);
          const moduleCode = course.code || `BX${idx + 1}`;

          return (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.3 }}
              className={`flex flex-col items-center flex-shrink-0 min-w-[56px] p-2 rounded-xl transition-all duration-300 ${
                isCurrentModule
                  ? 'bg-[#D4AF37]/10 ring-1 ring-[#D4AF37]/30'
                  : 'hover:bg-white/5'
              }`}
              title={course.title}
            >
              <div className={`relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-helvetica-bold transition-all duration-300 ${
                isCompleted
                  ? 'bg-gradient-to-br from-[#D4AF37] to-[#B8962E] text-black shadow-[0_0_20px_rgba(212,175,55,0.4)]'
                  : isCurrentModule
                    ? 'bg-[#D4AF37]/20 text-[#D4AF37] ring-2 ring-[#D4AF37]/50'
                    : 'bg-white/10 text-zinc-500'
              }`}>
                {isCompleted ? <CheckCircle size={14} className="text-black" /> : idx + 1}
                {isCurrentModule && (
                  <motion.span
                    className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#D4AF37] rounded-full"
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </div>
              <span
                className={`text-[10px] mt-1.5 font-medium truncate max-w-[52px] text-center leading-tight ${
                  isCompleted
                    ? 'text-[#D4AF37]'
                    : isCurrentModule
                      ? 'text-[#D4AF37]/80'
                      : 'text-zinc-500'
                }`}
              >
                {moduleCode}
              </span>
              {isCurrentModule && (
                <motion.span
                  className="text-[8px] text-[#D4AF37]/70 mt-0.5 font-medium"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  En cours
                </motion.span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Scroll hint indicator - only shows when scrollable */}
      {(canScrollLeft || canScrollRight) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center mt-2"
        >
          <motion.div
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="text-[10px] text-zinc-500 flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full"
          >
            <ChevronLeft size={10} />
            <span>Glisser pour naviguer</span>
            <ChevronRight size={10} />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

// ============================================
// CONSTANTS - Defined outside App to prevent re-creation on every render
// ============================================

// Ultra high-quality 4K Cayman Islands & Caribbean images from Unsplash
const LANDING_IMAGES = {
  hero: 'https://images.unsplash.com/photo-1580541631950-7282082b53ce?auto=format&fit=crop&w=3840&q=90',
  beach: 'https://images.unsplash.com/photo-1520454974749-611b7248ffdb?auto=format&fit=crop&w=3840&q=90',
  underwater: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?auto=format&fit=crop&w=3840&q=90',
  yacht: 'https://images.unsplash.com/photo-1605281317010-fe5ffe798166?auto=format&fit=crop&w=3840&q=90',
  resort: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=3840&q=90',
  villa: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=3840&q=90',
  dining: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=3840&q=90',
  sunset: 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?auto=format&fit=crop&w=3840&q=90',
  tropical: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=3840&q=90',
  stingray: 'https://images.unsplash.com/photo-1591025207163-942350e47db2?auto=format&fit=crop&w=3840&q=90',
  aerial: 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?auto=format&fit=crop&w=3840&q=90',
  pool: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=3840&q=90',
};

// Testimonial data
const TESTIMONIALS_DATA = [
  { name: "Victoria St. Laurent", title: "Private Wealth Advisor, Geneva", quote: "Isle AI transformed our family vacation into an unforgettable journey. The AI concierge knew exactly what we wanted before we did.", avatar: "VS", image: LANDING_IMAGES.yacht },
  { name: "James Whitmore III", title: "CEO, Whitmore Holdings", quote: "The level of personalization is extraordinary. From private yacht charters to exclusive dining reservations, every detail was perfect.", avatar: "JW", image: LANDING_IMAGES.dining },
  { name: "Elizabeth Chen", title: "Art Collector, Singapore", quote: "Finally, a travel companion that understands luxury. The recommendations were impeccable, and the seamless experience was beyond expectations.", avatar: "EC", image: LANDING_IMAGES.villa },
];

// Premium animation variants
const FADE_UP_VARIANTS = {
  hidden: { opacity: 0, y: 60 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 1,
      delay,
      ease: [0.25, 0.4, 0.25, 1]
    }
  })
};

const SCALE_IN_VARIANTS = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.8,
      delay,
      ease: [0.25, 0.4, 0.25, 1]
    }
  })
};

// Premium Button Component - Defined outside App to prevent re-creation
const PremiumButton = ({ children, onClick, variant = 'primary', className = '' }: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.15);
    y.set((e.clientY - centerY) * 0.15);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const springConfig = { stiffness: 150, damping: 15, mass: 0.1 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const baseClasses = variant === 'primary'
    ? 'bg-gradient-to-r from-cyan-400 via-cyan-500 to-teal-500 text-white shadow-[0_0_40px_rgba(34,211,238,0.3)]'
    : variant === 'secondary'
    ? 'bg-white/5 backdrop-blur-sm border border-white/20 text-white'
    : 'bg-transparent border-2 border-white/30 text-white';

  return (
    <motion.button
      ref={buttonRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative px-8 py-4 rounded-full font-helvetica-bold text-lg overflow-hidden group ${baseClasses} ${className}`}
    >
      {variant === 'primary' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-cyan-300 via-teal-400 to-cyan-300"
          initial={{ x: '-100%' }}
          whileHover={{ x: '100%' }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        />
      )}
      <span className="relative z-10 flex items-center gap-3">
        {children}
      </span>
    </motion.button>
  );
};

// ============================================

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('LANDING');
  const [user, setUser] = useState<User | null>(null);
  const [quizPassed, setQuizPassed] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [adminStats, setAdminStats] = useState<AnalyticData[]>([]);
  const [isLoading, setIsLoading] = useState(() => dataService.isAuthenticated());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [adminSection, setAdminSection] = useState<AdminSection>('OVERVIEW');
  const [draggedCourseId, setDraggedCourseId] = useState<string | null>(null);
  const [playerSidebarCollapsed, setPlayerSidebarCollapsed] = useState(false); // Persists across lesson navigation
  const [userDashboardStats, setUserDashboardStats] = useState<{
    enrolledCourses: number;
    completedCourses: number;
    lessonsCompleted: number;
    averageQuizScore: number;
  } | null>(null);

  // Chatbot state
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  // Knowledge Admin state (for admin users)
  const [isKnowledgeAdminOpen, setIsKnowledgeAdminOpen] = useState(false);

  // Track if initial data has been loaded (declared early so it can be used in restoreSession)
  const [dataLoaded, setDataLoaded] = useState(false);

  // Restore session on page load/refresh
  useEffect(() => {
    const restoreSession = async () => {
      // Check if user is already authenticated (token in localStorage)
      if (!dataService.isAuthenticated()) {
        return; // No token, stay on landing
      }

      setIsLoading(true);
      try {
        // Validate token by fetching user data
        const fetchedUser = await dataService.getUser();
        setUser(fetchedUser);

        // --- NEW: Persistent View State Restore ---
        const savedView = localStorage.getItem('amini_active_view') as View | null;
        const savedCourseId = localStorage.getItem('amini_active_course_id');
        const savedLessonId = localStorage.getItem('amini_active_lesson_id');

        if (savedView) {
          if (savedView === 'COURSE_PLAYER' && savedCourseId) {
            // If they were in the player, we need to load courses first to find the active course
            const fetchedCourses = await dataService.getCourses();
            setCourses(sortCourses(fetchedCourses));
            setDataLoaded(true); // Mark as loaded so loadData doesn't run again

            const targetCourse = fetchedCourses.find(c => c.id === savedCourseId);
            if (targetCourse) {
              setActiveCourse(targetCourse);
              const targetLesson = targetCourse.lessons.find(l => l.id === savedLessonId);
              setActiveLesson(targetLesson || targetCourse.lessons[0]);
              setCurrentView('COURSE_PLAYER');
            } else {
              setCurrentView('DASHBOARD');
            }
          } else if (savedView === 'ADMIN' && (fetchedUser.role === 'ADMIN' || fetchedUser.role === 'SUPERUSER')) {
            setCurrentView('ADMIN');
          } else if (savedView === 'DASHBOARD') {
            setCurrentView('DASHBOARD');
          } else {
            // Default based on role
            setCurrentView(fetchedUser.role === 'ADMIN' || fetchedUser.role === 'SUPERUSER' ? 'ADMIN' : 'DASHBOARD');
          }
        } else {
          // No saved view, default based on role
          setCurrentView(fetchedUser.role === 'ADMIN' || fetchedUser.role === 'SUPERUSER' ? 'ADMIN' : 'DASHBOARD');
        }
      } catch (error) {
        // Token is invalid or expired, clear it
        console.error('Session restoration failed:', error);
        setAuthToken(null);
        setCurrentView('LANDING');
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []); // Run once on mount

  // --- NEW: Persistent View State Persistence ---
  useEffect(() => {
    if (user && currentView !== 'LANDING' && currentView !== 'AUTH') {
      localStorage.setItem('amini_active_view', currentView);
      if (activeCourse) {
        localStorage.setItem('amini_active_course_id', activeCourse.id);
      }
      if (activeLesson) {
        localStorage.setItem('amini_active_lesson_id', activeLesson.id);
      }
    }
  }, [currentView, activeCourse, activeLesson, user]);

  // Load initial data once when entering dashboard or admin views
  useEffect(() => {
    const loadData = async () => {
      // Only load if not already loaded and we're in a view that needs data
      if (currentView !== 'DASHBOARD' && currentView !== 'ADMIN') return;
      if (dataLoaded) return; // Skip if already loaded - removed courses.length check to prevent re-trigger

      setIsLoading(true);
      try {
        // Load courses and paths for all users
        const [fetchedCourses, fetchedPaths] = await Promise.all([
          dataService.getCourses(),
          dataService.getPaths(),
        ]);
        // Sort courses by level and orderIndex to ensure consistent display
        setCourses(sortCourses(fetchedCourses));
        setPaths(fetchedPaths);
        setDataLoaded(true);

        // Load user profile if not already loaded
        if (!user) {
          try {
            const fetchedUser = await dataService.getUser();
            setUser(fetchedUser);
          } catch (err) {
            console.error('Failed to load user:', err);
          }
        }
      } catch (error) {
        console.error("Failed to load data", error);
      } finally {
        // Small delay to ensure view state has propagated before revealing
        setTimeout(() => setIsLoading(false), 50);
      }
    };
    loadData();
  }, [currentView, dataLoaded]); // Removed courses.length and user from deps to prevent re-triggers

  // Track if stats have been loaded
  const [adminStatsLoaded, setAdminStatsLoaded] = useState(false);
  const [dashboardStatsLoaded, setDashboardStatsLoaded] = useState(false);

  // Load admin stats separately when admin view is active (only once)
  useEffect(() => {
    if (currentView !== 'ADMIN' || adminStatsLoaded) return;
    const loadAdminStats = async () => {
      try {
        const stats = await dataService.getAdminStats();
        setAdminStats(stats);
        setAdminStatsLoaded(true);
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      }
    };
    loadAdminStats();
  }, [currentView, adminStatsLoaded]);

  // Load dashboard stats when dashboard view is active (only once)
  useEffect(() => {
    if (currentView !== 'DASHBOARD' || dashboardStatsLoaded) return;
    const loadDashboardStats = async () => {
      try {
        const dashboardData = await dataService.getDashboardStats();
        setUserDashboardStats(dashboardData.stats);
        setDashboardStatsLoaded(true);
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      }
    };
    loadDashboardStats();
  }, [currentView, dashboardStatsLoaded]);

  // Learning Path Enforcement: Check if user can access a course based on level
  // Updated logic: User must complete ALL ENROLLED courses in previous level to unlock next level
  const canAccessCourse = (course: Course): { allowed: boolean; reason?: string; progressInfo?: string } => {
    const levelOrder = ['Beginner', 'Intermediate', 'Advanced'];
    const courseLevel = levelOrder.indexOf(course.level);

    // Beginner courses are always accessible
    if (courseLevel === 0) return { allowed: true };

    // For higher levels, check if ALL ENROLLED previous level courses are completed
    const previousLevel = levelOrder[courseLevel - 1];
    const previousLevelCourses = courses.filter(c => c.level === previousLevel);

    // Enrolled courses = those with progress > 0 (user has started them)
    const enrolledPreviousCourses = previousLevelCourses.filter(c => c.progress > 0);

    // If user hasn't enrolled in any previous level courses, they need to complete at least one
    if (enrolledPreviousCourses.length === 0) {
      return {
        allowed: false,
        reason: `Enroll in and complete at least one ${previousLevel} course first to unlock ${course.level} courses.`,
        progressInfo: `0 ${previousLevel} courses enrolled`
      };
    }

    // Count completed enrolled courses (100% progress)
    const completedEnrolledCourses = enrolledPreviousCourses.filter(c => c.progress >= 100);

    // All enrolled courses must be completed to unlock next level
    if (completedEnrolledCourses.length < enrolledPreviousCourses.length) {
      return {
        allowed: false,
        reason: `Complete all enrolled ${previousLevel} courses to unlock ${course.level} courses.`,
        progressInfo: `${completedEnrolledCourses.length}/${enrolledPreviousCourses.length} ${previousLevel} courses completed`
      };
    }

    return { allowed: true };
  };

  const handleStartCourse = async (course: Course) => {
    // Check level enforcement
    const accessCheck = canAccessCourse(course);
    if (!accessCheck.allowed) {
      alert(accessCheck.reason);
      return;
    }

    // Auto-enroll user in course if not already enrolled
    try {
      await dataService.enrollInCourse(course.id);
    } catch (error) {
      // User might already be enrolled, that's OK
      console.log('Enrollment:', error);
    }

    setActiveCourse(course);
    // Find the first uncompleted lesson, or the first one if all new
    const firstUncompleted = course.lessons.find(l => !l.isCompleted) || course.lessons[0];
    setActiveLesson(firstUncompleted || null);
    setCurrentView('COURSE_PLAYER');
  };

  // Handle course reorder via drag-and-drop (Admin only)
  const handleCourseDrop = async (level: 'Beginner' | 'Intermediate' | 'Advanced', fromIndex: number, toIndex: number): Promise<boolean> => {
    if (fromIndex === toIndex) return true;

    // Get courses for this level and reorder locally
    const levelCourses = courses.filter(c => c.level === level);
    const otherCourses = courses.filter(c => c.level !== level);
    const reordered = [...levelCourses];
    const [movedCourse] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, movedCourse);

    // Update orderIndex values to match new positions
    const reorderedWithIndex = reordered.map((course, idx) => ({
      ...course,
      orderIndex: idx
    }));

    // Update state immediately for smooth UX - maintain sorted order
    setCourses(sortCourses([...otherCourses, ...reorderedWithIndex]));

    // Sync with backend
    try {
      const orderedIds = reorderedWithIndex.map(c => c.id);
      await dataService.reorderCourses(level, orderedIds);
      return true; // Success
    } catch (err) {
      console.error('Failed to reorder courses:', err);
      return false; // Failure
    }
  };

  const handleLessonComplete = async (quizScore?: number, totalQuestions?: number) => {
    if (!activeCourse || !activeLesson) return;

    // 1. Call backend API to persist progress
    try {
      const result = await dataService.completeLesson(activeLesson.id, quizScore, totalQuestions);
      console.log('Lesson completed, course progress:', result.courseProgress, 'passed:', result.passed);

      // For quiz lessons, check if passed
      if (activeLesson.type === 'quiz' && !result.passed) {
        // Quiz not passed - show failure message but don't mark as complete
        setQuizPassed(false);
        return; // Don't proceed with completion
      }

      setQuizPassed(true);
    } catch (error) {
      console.error('Failed to save progress to backend:', error);
    }

    // 2. Mark current lesson as complete locally
    const updatedLessons = activeCourse.lessons.map(l =>
      l.id === activeLesson.id ? { ...l, isCompleted: true, passed: true } : l
    );

    // 3. Calculate new progress
    const completedCount = updatedLessons.filter(l => l.isCompleted).length;
    const newProgress = Math.round((completedCount / updatedLessons.length) * 100);

    // 4. Update Course State
    const updatedCourse = { ...activeCourse, lessons: updatedLessons, progress: newProgress };
    setActiveCourse(updatedCourse);

    // 5. Update Global Course List
    setCourses(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));

    // 6. Navigate to next lesson if available
    const currentIndex = updatedLessons.findIndex(l => l.id === activeLesson.id);
    if (currentIndex < updatedLessons.length - 1) {
      setActiveLesson(updatedLessons[currentIndex + 1]);
    }
  };

  // --- Sub-Components ---

  const Sidebar = () => (
    <div className={`fixed inset-y-0 left-0 z-50 w-64 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out ${draggedCourseId ? 'opacity-20 blur-sm pointer-events-none' : 'opacity-100'} transition-opacity`}>
      {/* Subtle glow accent on edge - Caribbean cyan */}
      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent" />

      <div className="h-full flex flex-col bg-[#0a0a0b] border-r border-white/[0.06]">
        {/* Logo section with premium treatment */}
        <div className="p-6 relative">
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setCurrentView('LANDING')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow">
              <Sparkles size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-helvetica-bold tracking-wider">
              <span className="text-white group-hover:text-cyan-300 transition-colors">ISLE</span>
              <span className="text-cyan-400">AI</span>
            </h1>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 py-2">
          {/* User Navigation */}
          {user?.role !== UserRole.ADMIN && (
            <>
              <SidebarItem icon={<Layout size={20} />} label="Dashboard" active={currentView === 'DASHBOARD'} onClick={() => setCurrentView('DASHBOARD')} />
              <SidebarItem icon={<Bot size={20} />} label="AI Guide" active={currentView === 'AI_GUIDE'} onClick={() => setCurrentView('AI_GUIDE')} />
              <SidebarItem icon={<BookOpen size={20} />} label="My Learning" active={false} />
              <SidebarItem icon={<Trophy size={20} />} label="Achievements" active={false} />
            </>
          )}

          {/* Admin Navigation */}
          {user?.role === UserRole.ADMIN && (
            <>
              <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-helvetica-bold px-4 pt-4 pb-2">Admin Portal</div>

              <SidebarItem
                icon={<Layout size={20} />}
                label="Overview"
                active={currentView === 'ADMIN' && adminSection === 'OVERVIEW'}
                onClick={() => { if (currentView !== 'ADMIN') setCurrentView('ADMIN'); setAdminSection('OVERVIEW'); }}
              />

              <SidebarItem
                icon={<UserCheck size={20} />}
                label="User Approvals"
                active={currentView === 'ADMIN' && adminSection === 'USERS'}
                onClick={() => { if (currentView !== 'ADMIN') setCurrentView('ADMIN'); setAdminSection('USERS'); }}
              />

              <SidebarItem
                icon={<BookOpen size={20} />}
                label="Course Manager"
                active={currentView === 'ADMIN' && adminSection === 'COURSES'}
                onClick={() => { if (currentView !== 'ADMIN') setCurrentView('ADMIN'); setAdminSection('COURSES'); }}
              />

              <SidebarItem
                icon={<Trophy size={20} />}
                label="Analytics"
                active={currentView === 'ADMIN' && adminSection === 'ANALYTICS'}
                onClick={() => { if (currentView !== 'ADMIN') setCurrentView('ADMIN'); setAdminSection('ANALYTICS'); }}
              />

              <div className="my-3 border-t border-white/[0.06]" />

              <SidebarItem
                icon={<Bot size={20} />}
                label="AI Guide"
                active={currentView === 'AI_GUIDE'}
                onClick={() => setCurrentView('AI_GUIDE')}
              />

              <SidebarItem
                icon={<Layout size={20} />}
                label="View as User"
                active={currentView === 'DASHBOARD'}
                onClick={() => setCurrentView('DASHBOARD')}
              />
            </>
          )}
        </nav>

        {/* User profile section */}
        <div className="p-6 relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 flex items-center justify-center font-helvetica-bold text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                {user?.name?.charAt(0) || 'U'}
              </div>
            </div>
            <div>
              <p className="text-sm font-helvetica-bold text-white">{user?.name || 'User'}</p>
              <p className="text-xs text-zinc-500 truncate w-32">{user?.ministry || 'Guest'}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setAuthToken(null); // Clear the JWT token
              setUser(null);
              setCurrentView('LANDING');
            }}
            className="flex items-center gap-2.5 text-sm text-zinc-500 hover:text-red-400 transition-all w-full group py-2 px-3 rounded-xl hover:bg-red-500/10"
          >
            <LogOut size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );

  const SidebarItem = ({ icon, label, active, onClick, badge }: any) => {
    const [isRadiating, setIsRadiating] = useState(false);
    const [clickPos, setClickPos] = useState({ x: 0, y: 0 });

    const handleClick = (e: React.MouseEvent) => {
      if (active) {
        onClick();
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      setClickPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });

      setIsRadiating(true);

      // Snappy mechanical feedback then navigation
      setTimeout(() => {
        onClick();
      }, 250); // Navigate at peak power

      setTimeout(() => {
        setIsRadiating(false);
      }, 600); // UI cleanup
    };

    return (
      <button
        onClick={handleClick}
        className={`
        relative w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 overflow-hidden
        ${active
            ? 'text-cyan-400 border border-cyan-500/30 bg-cyan-500/10'
            : 'text-zinc-500 hover:text-white hover:bg-white/[0.03]'
          }
        ${isRadiating ? 'scale-95 brightness-125' : 'scale-100'}
        active:scale-[0.96] active:duration-75
      `}
      >
        {/* Radiant Pulse Ring - Caribbean cyan */}
        {isRadiating && (
          <div
            className="absolute pointer-events-none rounded-full border-2 border-cyan-400 animate-radiant z-20"
            style={{
              left: clickPos.x,
              top: clickPos.y,
              width: '10px',
              height: '10px',
              marginLeft: '-5px',
              marginTop: '-5px'
            }}
          />
        )}

        {/* Internal Background Flood - Caribbean teal */}
        {isRadiating && (
          <div className="absolute inset-0 bg-cyan-500/20 animate-gold-flood z-0" />
        )}

        <span className="relative z-10 scale-90">{icon}</span>
        <span className={`relative z-10 font-helvetica text-[13px] tracking-wide ${active || isRadiating ? 'font-helvetica-bold' : ''}`}>{label}</span>
        {badge && <span className="relative z-10 ml-auto">{badge}</span>}
      </button>
    );
  };

  // --- Views ---

  const LandingView = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const heroRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll();
    const { scrollYProgress: heroScrollProgress } = useScroll({
      target: heroRef,
      offset: ["start start", "end start"]
    });

    // Smooth parallax transforms
    const heroY = useTransform(heroScrollProgress, [0, 1], [0, 200]);
    const heroOpacity = useTransform(heroScrollProgress, [0, 0.8], [1, 0]);
    const heroScale = useTransform(heroScrollProgress, [0, 1], [1, 1.1]);

    // Testimonial state - NOW INSIDE LandingView so it only runs when this view is mounted
    const [activeTestimonial, setActiveTestimonial] = useState(0);

    // Auto-rotate testimonials - ONLY runs when LandingView is mounted
    useEffect(() => {
      const interval = setInterval(() => {
        setActiveTestimonial(prev => (prev + 1) % TESTIMONIALS_DATA.length);
      }, 6000);
      return () => clearInterval(interval);
    }, []);

    // Header background opacity based on scroll
    const headerBg = useTransform(scrollYProgress, [0, 0.1], [0, 0.9]);
    const headerBgColor = useTransform(headerBg, (v) => {
      return `rgba(0,0,0,${v})`;
    });

    return (
    <div ref={containerRef} className="relative z-10 bg-black grain-overlay">
      {/* Navigation Header - Premium Glass effect */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06]"
        style={{ backgroundColor: headerBgColor }}
      >
        <div className="absolute inset-0 backdrop-blur-2xl" />
        <div className="relative px-6 lg:px-12 py-5 flex justify-between items-center max-w-[1800px] mx-auto w-full">
          <motion.div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/30"
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.6 }}
            >
              <Sparkles size={24} className="text-white" />
            </motion.div>
            <span className="text-2xl font-helvetica-bold tracking-tight text-white">Isle<span className="text-cyan-400">AI</span></span>
          </motion.div>
          <nav className="hidden lg:flex items-center gap-12">
            {['Discover', 'Experiences', 'Stay', 'AI Concierge'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(' ', '-')}`}
                className="link-premium text-sm text-white/70 hover:text-white transition-all duration-300 font-medium"
              >
                {item}
              </a>
            ))}
          </nav>
          <PremiumButton onClick={() => setCurrentView('AUTH')} variant="secondary" className="!py-3 !px-6 !text-sm">
            Start Planning
          </PremiumButton>
        </div>
      </motion.header>

      {/* HERO SECTION - Full Screen with Parallax */}
      <section ref={heroRef} className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image with Parallax Effect */}
        <motion.div className="absolute inset-0" style={{ y: heroY, scale: heroScale }}>
          <img
            src={LANDING_IMAGES.hero}
            alt="Crystal clear Caribbean waters"
            className="w-full h-full object-cover"
          />
        </motion.div>
        <motion.div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black" style={{ opacity: heroOpacity }} />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />

        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px] animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[150px] animate-float" style={{ animationDelay: '-3s' }} />

        {/* Hero Content */}
        <motion.div
          className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 w-full"
          style={{ opacity: heroOpacity }}
        >
          <div className="max-w-3xl">
            <motion.div
              variants={FADE_UP_VARIANTS}
              initial="hidden"
              animate="visible"
              custom={0.2}
              className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full glass-premium mb-10"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-sm text-white/90 font-medium tracking-wide">It's More Than a Vacation — It's vaCay</span>
            </motion.div>

            <motion.h1
              variants={FADE_UP_VARIANTS}
              initial="hidden"
              animate="visible"
              custom={0.4}
              className="text-5xl md:text-7xl lg:text-[6rem] font-helvetica-bold leading-[1.02] mb-8 text-white"
            >
              Discover Your
              <br />
              <span className="text-shimmer">
                Caribbean Paradise
              </span>
            </motion.h1>

            <motion.p
              variants={FADE_UP_VARIANTS}
              initial="hidden"
              animate="visible"
              custom={0.6}
              className="text-xl md:text-2xl text-white/60 max-w-2xl mb-12 leading-relaxed font-light"
            >
              Unparalleled natural beauty meets the warmth and vibrancy of the Caribbean.
              Your vaCay is one flight away.
            </motion.p>

            <motion.div
              variants={FADE_UP_VARIANTS}
              initial="hidden"
              animate="visible"
              custom={0.8}
              className="flex flex-col sm:flex-row gap-5"
            >
              <PremiumButton onClick={() => setCurrentView('AUTH')}>
                Create Free Account
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <ChevronRight size={22} />
                </motion.span>
              </PremiumButton>
              <PremiumButton onClick={() => document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth' })} variant="ghost">
                Explore Islands
              </PremiumButton>
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll Indicator - Premium */}
        <motion.div
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >
          <span className="text-white/40 text-xs uppercase tracking-[0.3em] mb-2">Scroll</span>
          <motion.div
            className="w-7 h-12 rounded-full border border-white/20 flex items-start justify-center p-2.5 backdrop-blur-sm"
          >
            <motion.div
              className="w-1.5 h-3 bg-gradient-to-b from-cyan-400 to-teal-400 rounded-full"
              animate={{ y: [0, 12, 0], opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        </motion.div>
      </section>

      {/* DISCOVER SECTION - Island Introduction */}
      <section id="discover" className="py-40 px-6 lg:px-12 bg-zinc-950 relative">
        <div className="section-divider absolute top-0 left-0 right-0" />
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: [0.25, 0.4, 0.25, 1] }}
            className="text-center mb-24"
          >
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-cyan-400 text-sm font-medium tracking-[0.25em] uppercase mb-6 block"
            >
              Three Unique Islands
            </motion.span>
            <h2 className="text-5xl md:text-7xl font-helvetica-bold text-white mb-8">
              The Cayman Islands
            </h2>
            <p className="text-xl text-zinc-400 max-w-3xl mx-auto leading-relaxed">
              Grand Cayman — Cosmopolitan heart with art, culture, and world-class beaches.
              Cayman Brac — Adventurous with its breathtaking bluff. Little Cayman — Tranquil remote wonderland.
            </p>
          </motion.div>

          {/* Feature Grid with Premium Cards */}
          <div className="grid lg:grid-cols-2 gap-10">
            {/* Large Feature Card */}
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 1, ease: [0.25, 0.4, 0.25, 1] }}
              className="luxury-card relative h-[650px] rounded-[2rem] overflow-hidden group cursor-pointer"
              onClick={() => setCurrentView('AUTH')}
            >
              <div className="absolute inset-0 overflow-hidden">
                <img src={LANDING_IMAGES.beach} alt="Seven Mile Beach" className="w-full h-full object-cover img-zoom" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-80" />
              <motion.div
                className="absolute bottom-0 left-0 right-0 p-10"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.8 }}
              >
                <span className="text-cyan-400 text-sm font-medium tracking-[0.2em] uppercase">Grand Cayman</span>
                <h3 className="text-4xl font-helvetica-bold text-white mt-3 mb-4">Seven Mile Beach</h3>
                <p className="text-white/70 text-lg mb-6 max-w-md">Top 25 Best Beaches globally (TripAdvisor 2024). Crystal-clear Caribbean waters meet pristine coral sand.</p>
                <motion.div
                  className="inline-flex items-center gap-2 text-cyan-400 font-medium"
                  whileHover={{ x: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  <span>Explore with AI Guide</span>
                  <ChevronRight size={20} />
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Right Column - Two Cards */}
            <div className="flex flex-col gap-10">
              <motion.div
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 1, delay: 0.15, ease: [0.25, 0.4, 0.25, 1] }}
                className="luxury-card relative h-[305px] rounded-[2rem] overflow-hidden group cursor-pointer"
                onClick={() => setCurrentView('AUTH')}
              >
                <div className="absolute inset-0 overflow-hidden">
                  <img src={LANDING_IMAGES.underwater} alt="Diving" className="w-full h-full object-cover img-zoom" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-80" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <span className="text-cyan-400 text-sm font-medium tracking-[0.2em] uppercase">365 Dive Sites</span>
                  <h3 className="text-2xl font-helvetica-bold text-white mt-2 mb-2">World-Class Diving</h3>
                  <p className="text-white/60 text-sm">Breathtaking coral reefs and historic wrecks. Proudly showing off our underwater world since 1957.</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 1, delay: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
                className="luxury-card relative h-[305px] rounded-[2rem] overflow-hidden group cursor-pointer"
                onClick={() => setCurrentView('AUTH')}
              >
                <div className="absolute inset-0 overflow-hidden">
                  <img src={LANDING_IMAGES.sunset} alt="Sunset" className="w-full h-full object-cover img-zoom" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-80" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <span className="text-cyan-400 text-sm font-medium tracking-[0.2em] uppercase">Romance</span>
                  <h3 className="text-2xl font-helvetica-bold text-white mt-2 mb-2">Unforgettable Sunsets</h3>
                  <p className="text-white/60 text-sm">Watch the Caribbean sun paint the sky in golden hues every evening.</p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* EXPERIENCES SECTION - Premium Cards */}
      <section id="experiences" className="py-40 px-6 lg:px-12 bg-black relative overflow-hidden">
        {/* Background gradient orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-cyan-500/[0.03] rounded-full blur-[200px]" />

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: [0.25, 0.4, 0.25, 1] }}
            className="flex flex-col md:flex-row md:items-end md:justify-between mb-20 gap-8"
          >
            <div>
              <span className="text-cyan-400 text-sm font-medium tracking-[0.25em] uppercase mb-6 block">Curated For You</span>
              <h2 className="text-5xl md:text-6xl font-helvetica-bold text-white">
                Unforgettable Experiences
              </h2>
            </div>
            <p className="text-zinc-400 max-w-md text-lg leading-relaxed">
              The culinary capital of the Caribbean. Walk along the world's most breathtaking beaches. Your perfect vaCay awaits.
            </p>
          </motion.div>

          {/* Experience Cards with Stagger */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: "Pristine Beaches", desc: "Some of the world's most breathtaking beaches await", image: LANDING_IMAGES.tropical, icon: "🏝️" },
              { title: "Yacht Charters", desc: "Explore three unique islands in Caribbean luxury", image: LANDING_IMAGES.yacht, icon: "🛥️" },
              { title: "Culinary Excellence", desc: "Diverse flavors where tradition meets innovation", image: LANDING_IMAGES.dining, icon: "🍽️" },
              { title: "Stingray City", desc: "The world's most famous animal encounter", image: LANDING_IMAGES.stingray, icon: "🤿" },
            ].map((exp, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{
                  duration: 0.8,
                  delay: idx * 0.12,
                  ease: [0.25, 0.4, 0.25, 1]
                }}
                onClick={() => setCurrentView('AUTH')}
                className="luxury-card group relative h-[450px] rounded-[2rem] overflow-hidden cursor-pointer bg-zinc-900/50 border border-white/[0.05]"
              >
                <div className="absolute inset-0 overflow-hidden">
                  <img src={exp.image} alt={exp.title} className="w-full h-full object-cover img-zoom" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90" />

                {/* Hover glow effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-t from-cyan-500/20 via-transparent to-transparent" />

                <div className="absolute inset-0 p-8 flex flex-col justify-end">
                  <motion.span
                    className="text-5xl mb-4"
                    whileHover={{ scale: 1.2, rotate: 10 }}
                    transition={{ duration: 0.3 }}
                  >
                    {exp.icon}
                  </motion.span>
                  <h3 className="text-2xl font-helvetica-bold text-white mb-3">{exp.title}</h3>
                  <p className="text-white/60 mb-5">{exp.desc}</p>
                  <motion.div
                    className="flex items-center gap-2 text-cyan-400 font-medium"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    whileHover={{ x: 10 }}
                    transition={{ duration: 0.3 }}
                  >
                    Book with AI <ChevronRight size={18} />
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI CONCIERGE SECTION - The Key Selling Point */}
      <section id="ai-concierge" className="py-40 px-6 lg:px-12 bg-gradient-to-b from-zinc-950 via-black to-zinc-950 relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-cyan-500/[0.04] rounded-full blur-[200px] animate-float" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-teal-500/[0.04] rounded-full blur-[200px] animate-float" style={{ animationDelay: '-3s' }} />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            {/* Left - Content */}
            <motion.div
              initial={{ opacity: 0, x: -60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, ease: [0.25, 0.4, 0.25, 1] }}
            >
              <span className="text-cyan-400 text-sm font-medium tracking-[0.25em] uppercase mb-6 block">Your Personal Guide</span>
              <h2 className="text-5xl md:text-6xl font-helvetica-bold text-white mb-8 leading-[1.1]">
                Meet Your AI
                <br />
                <span className="text-shimmer">Travel Concierge</span>
              </h2>
              <p className="text-xl text-zinc-400 mb-12 leading-relaxed">
                Your personal guide to 365 dive sites, award-winning beaches, world-class dining,
                and experiences across all three islands. Safety, hospitality, and relaxation — perfected.
              </p>

              <div className="space-y-8 mb-12">
                {[
                  { title: "365 Dive Sites", desc: "Explore world-class diving from Bloody Bay Wall to the USS Kittiwake wreck." },
                  { title: "Three Unique Islands", desc: "Grand Cayman's cosmopolitan vibe, Cayman Brac's adventure, Little Cayman's tranquility." },
                  { title: "Award-Winning Beaches", desc: "Seven Mile Beach, Starfish Point, and hidden coves across all three islands." },
                  { title: "Culinary Capital", desc: "From beachside fish fry to Michelin-quality fine dining experiences." },
                ].map((feature, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1, duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
                    className="flex gap-5 group"
                  >
                    <motion.div
                      className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0"
                      whileHover={{ scale: 1.1, backgroundColor: 'rgba(34, 211, 238, 0.2)' }}
                      transition={{ duration: 0.3 }}
                    >
                      <CheckCircle size={22} className="text-cyan-400" />
                    </motion.div>
                    <div>
                      <h4 className="text-white font-helvetica-bold mb-1.5 text-lg group-hover:text-cyan-400 transition-colors">{feature.title}</h4>
                      <p className="text-zinc-500 leading-relaxed">{feature.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <PremiumButton onClick={() => setCurrentView('AUTH')}>
                Try Isle AI Free
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <ChevronRight size={22} />
                </motion.span>
              </PremiumButton>
            </motion.div>

            {/* Right - Chat Preview */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, delay: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
              className="relative"
            >
              {/* Glow effect behind card */}
              <motion.div
                className="absolute -inset-6 bg-gradient-to-r from-cyan-500/20 via-teal-500/10 to-cyan-500/20 rounded-[3rem] blur-3xl"
                animate={{ opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              />

              <div className="relative glass-premium rounded-[2.5rem] p-8 shadow-2xl">
                {/* Chat Header */}
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/[0.06]">
                  <div className="flex items-center gap-4">
                    <motion.div
                      className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/30"
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Sparkles size={26} className="text-white" />
                    </motion.div>
                    <div>
                      <div className="text-white font-helvetica-bold text-lg">Isle AI</div>
                      <div className="text-sm text-emerald-400 flex items-center gap-2">
                        <motion.span
                          className="w-2.5 h-2.5 rounded-full bg-emerald-400"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        Ready to help
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chat Messages with stagger animation */}
                <div className="space-y-5 mb-8">
                  <motion.div
                    className="flex gap-3 justify-end"
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                  >
                    <div className="bg-gradient-to-r from-cyan-500 to-teal-500 rounded-2xl rounded-tr-md px-5 py-3.5 max-w-[80%] shadow-lg shadow-cyan-500/20">
                      <p className="text-white">I want a romantic dinner on the beach tonight for two</p>
                    </div>
                  </motion.div>

                  <motion.div
                    className="flex gap-4"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.7 }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center flex-shrink-0">
                      <Sparkles size={16} className="text-white" />
                    </div>
                    <div className="bg-zinc-800/60 rounded-2xl rounded-tl-md px-5 py-4 max-w-[85%] border border-white/[0.05]">
                      <p className="text-white mb-4">I have found the perfect experience for you:</p>
                      <div className="bg-black/40 rounded-xl overflow-hidden border border-white/[0.05]">
                        <img src={LANDING_IMAGES.dining} alt="Beach dining" className="w-full h-36 object-cover" />
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Star size={16} className="text-amber-400 fill-amber-400" />
                            <span className="text-amber-400 font-medium">4.9</span>
                            <span className="text-zinc-500">• Seven Mile Beach</span>
                          </div>
                          <h4 className="text-white font-helvetica-bold mb-1">Sunset Table for Two</h4>
                          <p className="text-zinc-400 text-sm">Private beachfront dining with personal chef</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Input Field */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ask me anything about Cayman Islands..."
                    className="w-full px-6 py-4 bg-black/40 border border-white/[0.08] rounded-2xl text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/30 transition-colors"
                    disabled
                  />
                  <motion.button
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/20"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ChevronRight size={20} className="text-white" />
                  </motion.button>
                </div>

                {/* Login overlay hint */}
                <motion.div
                  className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-[2.5rem] flex items-center justify-center opacity-0 hover:opacity-100 transition-all duration-500 cursor-pointer"
                  onClick={() => setCurrentView('AUTH')}
                  whileHover={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                >
                  <motion.div
                    className="text-center"
                    initial={{ scale: 0.9, opacity: 0 }}
                    whileHover={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div
                      className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto mb-5"
                      whileHover={{ rotate: 10, scale: 1.1 }}
                    >
                      <Lock size={32} className="text-white" />
                    </motion.div>
                    <p className="text-white font-helvetica-bold text-xl mb-2">Create Free Account</p>
                    <p className="text-white/60">to start chatting with Isle AI</p>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* STAY SECTION - Accommodations */}
      <section id="stay" className="py-40 px-6 lg:px-12 bg-black relative">
        <div className="section-divider absolute top-0 left-0 right-0" />
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: [0.25, 0.4, 0.25, 1] }}
            className="text-center mb-20"
          >
            <span className="text-cyan-400 text-sm font-medium tracking-[0.25em] uppercase mb-6 block">Where to Stay</span>
            <h2 className="text-5xl md:text-6xl font-helvetica-bold text-white mb-8">
              Your Perfect Escape
            </h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              From beachfront resorts to private villas, island hotels to exclusive retreats across all three islands.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              { name: "The Ritz-Carlton", type: "Grand Cayman", rating: "5.0", price: "From $1,200", image: LANDING_IMAGES.resort, features: ["Private Beach", "Spa", "Golf Course"] },
              { name: "Kimpton Seafire", type: "Seven Mile Beach", rating: "4.9", price: "From $800", image: LANDING_IMAGES.pool, features: ["Infinity Pool", "Fine Dining", "Water Sports"] },
              { name: "Private Villas", type: "Exclusive Rentals", rating: "5.0", price: "From $2,500", image: LANDING_IMAGES.villa, features: ["Full Privacy", "Personal Chef", "Ocean Views"] },
            ].map((hotel, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{
                  duration: 0.8,
                  delay: idx * 0.15,
                  ease: [0.25, 0.4, 0.25, 1]
                }}
                onClick={() => setCurrentView('AUTH')}
                className="luxury-card group bg-zinc-900/40 rounded-[2rem] overflow-hidden border border-white/[0.05] cursor-pointer"
              >
                <div className="relative h-72 overflow-hidden">
                  <img src={hotel.image} alt={hotel.name} className="w-full h-full object-cover img-zoom" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <motion.div
                    className="absolute top-5 right-5 px-4 py-2 bg-black/60 backdrop-blur-xl rounded-full border border-white/10"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="flex items-center gap-2">
                      <Star size={16} className="text-amber-400 fill-amber-400" />
                      <span className="text-white font-medium">{hotel.rating}</span>
                    </div>
                  </motion.div>
                </div>
                <div className="p-8">
                  <p className="text-cyan-400 text-sm font-medium tracking-wider mb-2">{hotel.type}</p>
                  <h3 className="text-2xl font-helvetica-bold text-white mb-4 group-hover:text-cyan-400 transition-colors">{hotel.name}</h3>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {hotel.features.map((f, i) => (
                      <span key={i} className="px-4 py-1.5 bg-white/[0.05] rounded-full text-sm text-zinc-400 border border-white/[0.05]">{f}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/[0.05]">
                    <span className="text-white font-helvetica-bold text-lg">{hotel.price}<span className="text-zinc-500 font-normal text-sm">/night</span></span>
                    <motion.span
                      className="text-cyan-400 font-medium flex items-center gap-2"
                      whileHover={{ x: 5 }}
                    >
                      View Details <ChevronRight size={16} />
                    </motion.span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section className="py-40 px-6 lg:px-12 bg-zinc-950 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTestimonial}
            className="absolute inset-0 opacity-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <img src={TESTIMONIALS_DATA[activeTestimonial].image} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-zinc-950/80" />
          </motion.div>
        </AnimatePresence>

        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: [0.25, 0.4, 0.25, 1] }}
            className="text-center mb-20"
          >
            <span className="text-cyan-400 text-sm font-medium tracking-[0.25em] uppercase mb-6 block">Guest Experiences</span>
            <h2 className="text-5xl md:text-6xl font-helvetica-bold text-white">
              Safety, Hospitality & Relaxation
            </h2>
          </motion.div>

          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTestimonial}
                initial={{ opacity: 0, y: 40, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -40, scale: 0.98 }}
                transition={{ duration: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
                className="glass-premium rounded-[2.5rem] p-12 md:p-16"
              >
                <motion.div
                  className="text-8xl text-cyan-500/10 mb-8 font-serif leading-none"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  "
                </motion.div>
                <p className="text-2xl md:text-4xl text-white leading-relaxed mb-12 font-light">
                  {TESTIMONIALS_DATA[activeTestimonial].quote}
                </p>
                <div className="flex items-center gap-6">
                  <motion.div
                    className="w-18 h-18 rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center text-white font-helvetica-bold text-2xl shadow-xl shadow-cyan-500/30"
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    style={{ width: '72px', height: '72px' }}
                  >
                    {TESTIMONIALS_DATA[activeTestimonial].avatar}
                  </motion.div>
                  <div>
                    <div className="text-white font-helvetica-bold text-xl">{TESTIMONIALS_DATA[activeTestimonial].name}</div>
                    <div className="text-zinc-400 text-lg">{TESTIMONIALS_DATA[activeTestimonial].title}</div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Dots - Premium */}
            <div className="flex justify-center gap-4 mt-14">
              {TESTIMONIALS_DATA.map((_, idx) => (
                <motion.button
                  key={idx}
                  onClick={() => setActiveTestimonial(idx)}
                  className={`rounded-full transition-all duration-500 ${
                    idx === activeTestimonial
                      ? 'w-12 h-3 bg-gradient-to-r from-cyan-400 to-teal-400'
                      : 'w-3 h-3 bg-zinc-700 hover:bg-zinc-500'
                  }`}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA SECTION */}
      <section className="py-48 px-6 lg:px-12 bg-black relative overflow-hidden">
        <div className="absolute inset-0">
          <motion.img
            src={LANDING_IMAGES.aerial}
            alt=""
            className="w-full h-full object-cover opacity-40"
            initial={{ scale: 1.1 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: [0.25, 0.4, 0.25, 1] }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/50" />
        </div>

        {/* Animated gradient orbs */}
        <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[200px] animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[200px] animate-float" style={{ animationDelay: '-3s' }} />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: [0.25, 0.4, 0.25, 1] }}
          >
            <h2 className="text-5xl md:text-7xl font-helvetica-bold text-white mb-8 leading-[1.1]">
              Your Perfect vaCay
              <br />
              <span className="text-shimmer">Is One Flight Away</span>
            </h2>
            <p className="text-xl md:text-2xl text-zinc-400 mb-14 max-w-2xl mx-auto leading-relaxed">
              Sunny skies, warm temps, and turquoise waters await. Discover the Cayman Islands
              with your personal AI concierge.
            </p>
            <PremiumButton onClick={() => setCurrentView('AUTH')} className="!text-xl !px-14 !py-5">
              Create Free Account
              <motion.span
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ChevronRight size={26} />
              </motion.span>
            </PremiumButton>
            <motion.p
              className="text-zinc-500 mt-8"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              No credit card required • Free forever
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* FOOTER - Premium */}
      <footer className="py-24 px-6 lg:px-12 bg-zinc-950 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-12 mb-16">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <Sparkles size={24} className="text-white" />
                </div>
                <span className="text-2xl font-helvetica-bold text-white">Isle<span className="text-cyan-400">AI</span></span>
              </div>
              <p className="text-zinc-400 leading-relaxed mb-6 max-w-sm">
                Your AI-powered gateway to the Cayman Islands. Discover paradise with personalized recommendations and seamless planning.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-white font-helvetica-bold mb-5">Explore</h4>
              <ul className="space-y-3 text-zinc-400">
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Beaches</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Diving</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Dining</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Activities</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-helvetica-bold mb-5">Stay</h4>
              <ul className="space-y-3 text-zinc-400">
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Resorts</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Villas</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Hotels</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Apartments</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-helvetica-bold mb-5">Company</h4>
              <ul className="space-y-3 text-zinc-400">
                <li><a href="#" className="hover:text-cyan-400 transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/[0.06] flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-zinc-500">
              &copy; 2025 Isle AI. Official Tourism Partner of the Cayman Islands.
            </p>
            <div className="flex items-center gap-4 text-zinc-500 text-sm">
              <span>Crafted with care in Grand Cayman</span>
              <span className="text-cyan-400">🇰🇾</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
  };

  const AuthView = () => {
    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
    const [formData, setFormData] = useState({
      email: '',
      password: '',
      name: '',
      ministry: MINISTRIES[0],
      role: UserRole.LEARNER
    });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [pendingApproval, setPendingApproval] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsSubmitting(true);

      try {
        if (authMode === 'login') {
          // Use dataService which handles mock mode
          const loggedInUser = await dataService.login(formData.email, formData.password);

          if (loggedInUser) {
            setUser(loggedInUser);
            setCurrentView(loggedInUser.role === 'ADMIN' ? 'ADMIN' : 'DASHBOARD');
          } else {
            throw new Error('Invalid credentials');
          }
        } else {
          // Use dataService which handles mock mode
          const registeredUser = await dataService.register({
            email: formData.email,
            password: formData.password,
            name: formData.name,
            ministry: formData.ministry,
            role: formData.role === UserRole.SUPERUSER ? 'SUPERUSER' : 'LEARNER'
          });

          if (registeredUser) {
            // In mock mode, directly log them in
            setUser(registeredUser);
            setCurrentView('DASHBOARD');
          } else {
            setPendingApproval(true);
          }
        }
      } catch (err: any) {
        if (err.message.includes('pending')) {
          setPendingApproval(true);
        } else {
          setError(err.message || 'Authentication failed. Please try again.');
        }
      } finally {
        setIsSubmitting(false);
      }
    };

    // Pending Approval Screen
    if (pendingApproval) {
      return (
        <div className="min-h-screen relative overflow-hidden bg-black">
          {/* Background */}
          <div className="absolute inset-0">
            <img src={LANDING_IMAGES.sunset} alt="" className="w-full h-full object-cover opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-br from-black via-black/90 to-cyan-950/50" />
          </div>

          <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md w-full"
            >
              <div className="bg-zinc-900/60 backdrop-blur-2xl rounded-3xl p-10 border border-white/10 text-center shadow-2xl">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-400/20 to-teal-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-6">
                  <Clock size={36} className="text-cyan-400" />
                </div>
                <h2 className="text-2xl font-helvetica-bold text-white mb-3">Registration Submitted</h2>
                <p className="text-zinc-400 mb-8 leading-relaxed">
                  Your account is pending approval from an administrator.
                  You will receive an email once your account has been approved.
                </p>
                <div className="bg-black/30 rounded-2xl p-4 mb-8 text-left border border-white/5">
                  <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wider">Email</p>
                  <p className="text-white font-medium">{formData.email}</p>
                </div>
                <button
                  onClick={() => {
                    setPendingApproval(false);
                    setAuthMode('login');
                    setFormData({ ...formData, password: '' });
                  }}
                  className="w-full py-4 rounded-2xl border border-white/20 text-white font-medium hover:bg-white/5 transition-all"
                >
                  Back to Sign In
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen relative overflow-hidden bg-black">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={authMode === 'login' ? LANDING_IMAGES.tropical : LANDING_IMAGES.aerial}
            alt=""
            className="w-full h-full object-cover opacity-50 transition-opacity duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black via-black/80 to-cyan-950/30" />
        </div>

        {/* Decorative Blurs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-cyan-500/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-teal-500/20 rounded-full blur-[150px]" />

        {/* Content */}
        <div className="relative z-10 min-h-screen flex">
          {/* Left Side - Branding (Desktop) */}
          <div className="hidden lg:flex flex-1 items-center justify-center p-12">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-lg"
            >
              <div className="flex items-center gap-3 mb-8 cursor-pointer" onClick={() => setCurrentView('LANDING')}>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <Sparkles size={28} className="text-white" />
                </div>
                <span className="text-3xl font-helvetica-bold text-white">Isle<span className="text-cyan-400">AI</span></span>
              </div>
              <h1 className="text-5xl font-helvetica-bold text-white leading-tight mb-6">
                Your Personal
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400">
                  Paradise Awaits
                </span>
              </h1>
              <p className="text-xl text-zinc-400 leading-relaxed mb-10">
                Create your free account to access your AI travel concierge
                and start planning your perfect Cayman Islands getaway.
              </p>
              <div className="flex items-center gap-6">
                <div className="flex -space-x-3">
                  {['VS', 'JW', 'EC', 'MR'].map((initials, i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 border-2 border-black flex items-center justify-center text-xs text-white font-bold">
                      {initials}
                    </div>
                  ))}
                </div>
                <div className="text-zinc-400 text-sm">
                  <span className="text-white font-medium">2,500+</span> travelers trust Isle AI
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Side - Auth Form */}
          <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="w-full max-w-md"
            >
              {/* Mobile Logo */}
              <div className="lg:hidden flex items-center gap-3 mb-8 justify-center cursor-pointer" onClick={() => setCurrentView('LANDING')}>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <Sparkles size={24} className="text-white" />
                </div>
                <span className="text-2xl font-helvetica-bold text-white">Isle<span className="text-cyan-400">AI</span></span>
              </div>

              <div className="bg-zinc-900/60 backdrop-blur-2xl rounded-3xl p-8 lg:p-10 border border-white/10 shadow-2xl">
                {/* Back Button */}
                <button
                  onClick={() => setCurrentView('LANDING')}
                  className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-6 text-sm"
                >
                  <ArrowLeft size={16} />
                  Back to Home
                </button>

                {/* Tabs */}
                <div className="flex mb-8 bg-black/30 rounded-2xl p-1.5">
                  <button
                    onClick={() => { setAuthMode('login'); setError(''); }}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                      authMode === 'login'
                        ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => { setAuthMode('register'); setError(''); }}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                      authMode === 'register'
                        ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Create Account
                  </button>
                </div>

                {/* Header */}
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-helvetica-bold text-white mb-2">
                    {authMode === 'login' ? 'Welcome Back' : 'Start Your Journey'}
                  </h2>
                  <p className="text-zinc-400">
                    {authMode === 'login' ? 'Access your AI travel concierge' : 'Create your free account'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Name - Register only */}
                  {authMode === 'register' && (
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Full Name</label>
                      <input
                        required
                        type="text"
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder-zinc-600"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                  )}

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Email Address</label>
                    <input
                      required
                      type="email"
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder-zinc-600"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={e => {
                        setFormData({ ...formData, email: e.target.value });
                        setError('');
                      }}
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Password</label>
                    <div className="relative">
                      <input
                        required
                        type={showPassword ? 'text' : 'password'}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3.5 pr-12 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder-zinc-600"
                        placeholder={authMode === 'register' ? 'Create a strong password' : 'Enter your password'}
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        minLength={authMode === 'register' ? 8 : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {authMode === 'register' && (
                      <p className="text-xs text-zinc-500 mt-2">Min 8 characters with uppercase, lowercase, and number</p>
                    )}
                  </div>

                  {/* Ministry & Role - Register only */}
                  {authMode === 'register' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Organization</label>
                        <select
                          className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none appearance-none cursor-pointer"
                          value={formData.ministry}
                          onChange={e => setFormData({ ...formData, ministry: e.target.value })}
                        >
                          {MINISTRIES.map(m => <option key={m} value={m} className="bg-zinc-900 text-white">{m}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Account Type</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, role: UserRole.LEARNER })}
                            className={`p-4 rounded-xl border text-sm transition-all ${
                              formData.role === UserRole.LEARNER
                                ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400'
                                : 'border-white/10 hover:bg-white/5 text-zinc-400'
                            }`}
                          >
                            <span className="font-medium">Traveler</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, role: UserRole.SUPERUSER })}
                            className={`p-4 rounded-xl border text-sm transition-all ${
                              formData.role === UserRole.SUPERUSER
                                ? 'bg-white/10 border-white/40 text-white'
                                : 'border-white/10 hover:bg-white/5 text-zinc-400'
                            }`}
                          >
                            <span className="font-medium">Business</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Error */}
                  {error && (
                    <div className="flex items-center gap-3 text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                      <AlertCircle size={18} />
                      {error}
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-helvetica-bold text-base shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 size={20} className="animate-spin" />
                        {authMode === 'login' ? 'Signing in...' : 'Creating account...'}
                      </span>
                    ) : (
                      authMode === 'login' ? 'Sign In' : 'Create Free Account'
                    )}
                  </button>

                  {/* Register note */}
                  {authMode === 'register' && (
                    <p className="text-xs text-zinc-500 text-center">
                      By creating an account, you agree to our Terms of Service and Privacy Policy.
                    </p>
                  )}
                </form>
              </div>

              {/* Bottom text */}
              <p className="text-center text-zinc-500 text-sm mt-6">
                {authMode === 'login' ? (
                  <>Do not have an account? <button onClick={() => setAuthMode('register')} className="text-cyan-400 hover:underline">Create one free</button></>
                ) : (
                  <>Already have an account? <button onClick={() => setAuthMode('login')} className="text-cyan-400 hover:underline">Sign in</button></>
                )}
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    );
  };

  const DashboardView = () => {
    // Course-level locking logic
    // Updated: User must complete ALL ENROLLED courses (progress > 0) in previous level
    const isCourseCompleted = (course: Course) => course.progress === 100;
    const isCourseEnrolled = (course: Course) => course.progress > 0;

    const getBeginnerCourses = () => courses.filter(c => c.level === 'Beginner');
    const getIntermediateCourses = () => courses.filter(c => c.level === 'Intermediate');
    const getAdvancedCourses = () => courses.filter(c => c.level === 'Advanced');

    // Get enrolled courses for each level
    const getEnrolledBeginnerCourses = () => getBeginnerCourses().filter(isCourseEnrolled);
    const getEnrolledIntermediateCourses = () => getIntermediateCourses().filter(isCourseEnrolled);

    // All ENROLLED courses must be completed to unlock next level
    const allEnrolledBeginnerCompleted = () => {
      const enrolledBeginner = getEnrolledBeginnerCourses();
      // Must have at least one enrolled course and all enrolled must be completed
      return enrolledBeginner.length > 0 && enrolledBeginner.every(isCourseCompleted);
    };

    const allEnrolledIntermediateCompleted = () => {
      const enrolledIntermediate = getEnrolledIntermediateCourses();
      return enrolledIntermediate.length > 0 && enrolledIntermediate.every(isCourseCompleted);
    };

    // All destinations are now unlocked - no lock/unlock restrictions for users
    // Admin ordering logic is preserved in the admin panel
    const isLevelUnlocked = (_level: string) => true;
    const isCourseUnlocked = (_course: Course) => true;
    const getLockedMessage = (_level: string) => '';

    // Calculate total progress (use API stats if available)
    const totalProgress = userDashboardStats
      ? Math.round((userDashboardStats.completedCourses / Math.max(userDashboardStats.enrolledCourses, 1)) * 100)
      : courses.length > 0
        ? Math.round(courses.reduce((sum, c) => sum + (c.progress || 0), 0) / courses.length)
        : 0;

    const completedCourses = userDashboardStats?.completedCourses || courses.filter(isCourseCompleted).length;
    const enrolledCount = userDashboardStats?.enrolledCourses || courses.length;
    const lessonsCompleted = userDashboardStats?.lessonsCompleted || 0;
    const avgQuizScore = userDashboardStats?.averageQuizScore || 0;

    return (
      <div className="md:ml-64 h-screen overflow-y-auto relative z-10 liquid-scroll">
        {/* Mobile Header */}
        <div className="md:hidden p-4 flex justify-between items-center bg-[#0c0c0e] border-b border-white/[0.04] sticky top-0 z-40">
          <span className="font-helvetica-bold text-[#D4AF37]">Isle Cayman</span>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10">
          {/* Header Section - Enhanced Liquid Glass */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 animate-fade-in">
            <div>
              <h2 className="text-4xl font-helvetica-bold mb-2">Welcome back, {user?.name?.split(' ')[0]}</h2>
              <div className="flex gap-2">
                {user?.role === UserRole.SUPERUSER && <Badge type="warning">VIP Explorer</Badge>}
                <span className="text-zinc-400">Your Caribbean adventure awaits</span>
              </div>
            </div>

            {/* Stats Cards - Liquid Glass Design */}
            <div className="flex gap-3">
              {/* Experiences Discovered */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400/20 to-cyan-500/10 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-center min-w-[80px]">
                  <div className="text-3xl font-helvetica-bold text-cyan-400">{lessonsCompleted}</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Discovered</div>
                </div>
              </div>

              <div className="w-px bg-white/10 h-16 hidden md:block self-center"></div>

              {/* Destinations Explored */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-white/20 to-white/5 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-center min-w-[80px]">
                  <div className="text-3xl font-helvetica-bold text-white">{completedCourses}<span className="text-lg text-zinc-500">/{enrolledCount || courses.length}</span></div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Explored</div>
                </div>
              </div>

              <div className="w-px bg-white/10 h-16 hidden md:block self-center"></div>

              {/* Fun Facts Learned */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400/20 to-emerald-500/10 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-center min-w-[80px]">
                  <div className="text-3xl font-helvetica-bold text-emerald-400">{avgQuizScore}%</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Fun Score</div>
                </div>
              </div>

              <div className="w-px bg-white/10 h-16 hidden md:block self-center"></div>

              {/* Overall Progress Circle */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#D4AF37]/20 to-cyan-400/10 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex items-center justify-center">
                  <div className="relative w-14 h-14">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="3"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="url(#dashboardGradient)"
                        strokeWidth="3"
                        strokeDasharray={`${totalProgress}, 100`}
                        strokeLinecap="round"
                        className="drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] transition-all duration-1000"
                      />
                      <defs>
                        <linearGradient id="dashboardGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#22d3ee" />
                          <stop offset="100%" stopColor="#D4AF37" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-sm font-helvetica-bold text-white">{totalProgress}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Island Discovery Progress - Liquid Glass */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 via-[#D4AF37]/10 to-emerald-500/20 rounded-[24px] blur-lg opacity-60" />
            <div className="relative rounded-3xl overflow-hidden backdrop-blur-2xl bg-gradient-to-r from-white/[0.06] via-white/[0.03] to-white/[0.06] border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-helvetica-bold text-white">Your Cayman Islands Journey</h3>
                  <p className="text-sm text-zinc-400">Discover all {courses.length} experiences across the islands</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-helvetica-bold text-cyan-400">{totalProgress}%</span>
                  <span className="text-zinc-500">explored</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-3 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 to-[#D4AF37] rounded-full shadow-[0_0_15px_rgba(34,211,238,0.5)] transition-all duration-1000"
                  style={{ width: `${totalProgress}%` }}
                />
                {/* Milestone markers */}
                {[25, 50, 75].map(milestone => (
                  <div
                    key={milestone}
                    className={`absolute top-0 bottom-0 w-0.5 ${totalProgress >= milestone ? 'bg-white/40' : 'bg-white/10'}`}
                    style={{ left: `${milestone}%` }}
                  />
                ))}
              </div>

              {/* Destination indicators - Dynamic with elegant scroll */}
              <ModuleProgressIndicator courses={courses} totalProgress={totalProgress} />
            </div>
          </div>

          {/* VIP Traveler Widget */}
          {user?.role === UserRole.SUPERUSER && (
            <GlassCard className="bg-gradient-to-br from-zinc-800/30 to-black border-cyan-500/30">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-helvetica-bold text-white flex items-center gap-2"><Star size={18} className="text-[#D4AF37]" /> VIP Traveler Status</h3>
                  <p className="text-sm text-zinc-400">Exclusive access to premium experiences</p>
                </div>
                <PrimaryButton className="py-1 px-4 text-xs h-8">Invite Friends</PrimaryButton>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                  <div className="text-xs text-zinc-500">Places Visited</div>
                  <div className="text-xl font-helvetica-bold">24</div>
                </div>
                <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                  <div className="text-xs text-zinc-500">Adventures</div>
                  <div className="text-xl font-helvetica-bold text-[#D4AF37]">8</div>
                </div>
                <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                  <div className="text-xs text-zinc-500">Island Score</div>
                  <div className="text-xl font-helvetica-bold text-cyan-400">33%</div>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Island Experiences - Grouped by Category */}
          <div className="space-y-12">
            {(['Beginner', 'Intermediate', 'Advanced'] as const).map((level) => {
              const levelCourses = courses.filter(c => c.level === level);
              if (levelCourses.length === 0) return null;

              // Tourism-focused titles and descriptions
              const levelTitle = level === 'Beginner' ? 'Must-See Attractions'
                : level === 'Intermediate' ? 'Hidden Gems & Adventures'
                  : 'VIP Experiences';
              const levelDescription = level === 'Beginner' ? 'Essential destinations every visitor should explore.'
                : level === 'Intermediate' ? 'Unique spots and thrilling activities for adventurers.'
                  : 'Exclusive luxury experiences and insider access.';
              const levelIcon = level === 'Beginner' ? '🏝️' : level === 'Intermediate' ? '🤿' : '✨';

              return (
                <div key={level} className="animate-fade-in">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-[#D4AF37]/10 text-2xl">
                      {levelIcon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-helvetica-bold text-white">{levelTitle}</h3>
                        <span className={`text-xs px-3 py-1 rounded-full ${level === 'Beginner' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                          level === 'Intermediate' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            'bg-[#D4AF37]/20 border-[#D4AF37]/30 text-[#D4AF37]'
                          }`}>{levelCourses.length} experience{levelCourses.length !== 1 ? 's' : ''}</span>
                      </div>
                      <p className="text-sm text-zinc-400 mt-1">{levelDescription}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {levelCourses.map((course, courseIndex) => {
                      const lessonCount = course.lessons?.length || 0;
                      const completedLessons = course.lessons?.filter(l => l.isCompleted).length || 0;

                      return (
                        <div
                          key={course.id}
                          className="group relative rounded-3xl overflow-hidden transition-all duration-500 cursor-pointer hover:-translate-y-2 hover:shadow-[0_20px_60px_-15px_rgba(34,211,238,0.3)]"
                          onClick={() => handleStartCourse(course)}
                        >
                          {/* Card Background with Glassmorphism */}
                          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/90 via-zinc-900/80 to-black/90 backdrop-blur-xl border border-white/10 rounded-3xl group-hover:border-cyan-400/50 transition-colors duration-500" />

                          {/* Ambient Glow Effect */}
                          <div className="absolute -inset-px bg-gradient-to-br from-cyan-400/0 via-transparent to-[#D4AF37]/0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl" />

                          <div className="relative">
                            {/* Image Container with Aspect Ratio */}
                            <div className="relative aspect-[16/10] overflow-hidden">
                              {/* Background Image */}
                              <img
                                src={course.thumbnail}
                                alt={course.title}
                                className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-110 saturate-90 group-hover:saturate-100"
                              />

                              {/* Gradient Overlays */}
                              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/50 to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-500" />
                              <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-cyan-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                              {/* Experience Number Badge */}
                              <div className="absolute top-3 left-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white text-sm font-helvetica-bold group-hover:bg-cyan-500/20 group-hover:border-cyan-400/30 transition-all duration-300">
                                  {courseIndex + 1}
                                </div>
                              </div>

                              {/* Category Badge */}
                              <div className="absolute top-3 right-3">
                                <div className={`px-3 py-1.5 rounded-full text-xs font-helvetica-bold backdrop-blur-md border ${course.level === 'Beginner'
                                  ? 'bg-cyan-500/20 border-cyan-400/30 text-cyan-400'
                                  : course.level === 'Intermediate'
                                    ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-400'
                                    : 'bg-[#D4AF37]/20 border-[#D4AF37]/30 text-[#D4AF37]'
                                  }`}>
                                  {course.level === 'Beginner' ? 'Must See' : course.level === 'Intermediate' ? 'Adventure' : 'VIP'}
                                </div>
                              </div>

                              {/* Play Button Overlay on Hover */}
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                                  <PlayCircle size={32} className="text-white ml-1" />
                                </div>
                              </div>

                              {/* Progress Ring - Bottom Right */}
                              {course.progress > 0 && (
                                <div className="absolute bottom-3 right-3">
                                  <div className="relative w-12 h-12">
                                    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                                      <circle
                                        cx="18" cy="18" r="15.5"
                                        fill="none"
                                        stroke="rgba(255,255,255,0.1)"
                                        strokeWidth="3"
                                      />
                                      <circle
                                        cx="18" cy="18" r="15.5"
                                        fill="none"
                                        stroke="url(#progressGradientCard)"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeDasharray={`${course.progress * 0.97} 100`}
                                      />
                                      <defs>
                                        <linearGradient id="progressGradientCard" x1="0%" y1="0%" x2="100%" y2="0%">
                                          <stop offset="0%" stopColor="#22d3ee" />
                                          <stop offset="100%" stopColor="#D4AF37" />
                                        </linearGradient>
                                      </defs>
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className="text-xs font-helvetica-bold text-white">{Math.round(course.progress)}%</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Content Section */}
                            <div className="relative p-5">
                              {/* Title */}
                              <h4 className="text-lg font-helvetica-bold mb-2 leading-tight transition-colors duration-300 text-white group-hover:text-cyan-400">
                                {course.title}
                              </h4>

                              {/* Description */}
                              <p className={`text-sm leading-relaxed mb-4 text-zinc-400 ${expandedDescriptions.has(course.id) ? '' : 'line-clamp-2'}`}>
                                {course.description}
                              </p>
                              {course.description && course.description.length > 80 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedDescriptions(prev => {
                                      const newSet = new Set(prev);
                                      if (newSet.has(course.id)) {
                                        newSet.delete(course.id);
                                      } else {
                                        newSet.add(course.id);
                                      }
                                      return newSet;
                                    });
                                  }}
                                  className="text-xs font-medium mb-3 text-cyan-400/80 hover:text-cyan-400 transition-colors"
                                >
                                  {expandedDescriptions.has(course.id) ? '← Show less' : 'Read more →'}
                                </button>
                              )}

                              {/* Stats Row */}
                              <div className="flex items-center gap-4 text-xs text-zinc-500">
                                <span className="flex items-center gap-1.5">
                                  <Clock size={14} className="text-zinc-400" />
                                  {course.totalDuration}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <PlayCircle size={14} className="text-zinc-400" />
                                  {lessonCount} videos
                                </span>
                                {course.progress > 0 && courseUnlocked && (
                                  <span className="flex items-center gap-1.5 text-[#D4AF37]">
                                    <CheckCircle size={14} />
                                    {completedLessons}/{lessonCount}
                                  </span>
                                )}
                              </div>

                              {/* Action Footer */}
                              {/* Action Footer */}
                              <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  {course.progress > 0 ? (
                                    <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-gradient-to-r from-cyan-400 to-[#D4AF37] rounded-full transition-all duration-500"
                                        style={{ width: `${course.progress}%` }}
                                      />
                                    </div>
                                  ) : (
                                    <span className="text-xs text-zinc-500">Ready to explore</span>
                                  )}
                                </div>
                                <span className={`flex items-center gap-1 text-sm font-helvetica-bold transition-all duration-300 ${course.progress > 0
                                  ? 'text-cyan-400 group-hover:text-cyan-300'
                                  : 'text-white group-hover:text-cyan-400'
                                  } group-hover:translate-x-1`}>
                                  {course.progress > 0 ? 'Continue Watching' : 'Start Experience'}
                                  <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const PlayerView = () => {
    // Quiz State
    const [quizState, setQuizState] = useState<'INTRO' | 'QUESTION' | 'RESULT'>('INTRO');
    const [currentQIdx, setCurrentQIdx] = useState(0);
    const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
    const [quizScore, setQuizScore] = useState(0);
    const [quizPassed, setQuizPassed] = useState<boolean | null>(null);
    const PASSING_SCORE = activeLesson?.passingScore || 70;

    // Download State
    const [isDownloaded, setIsDownloaded] = useState(false);

    // Sidebar collapse state
    // Sidebar collapse state moved to App level (playerSidebarCollapsed) for persistence

    // Video Progress Tracking State
    const [videoWatchedPercent, setVideoWatchedPercent] = useState(0);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [ytPlayer, setYtPlayer] = useState<any>(null);
    const html5VideoRef = React.useRef<HTMLVideoElement>(null);
    const ytPlayerContainerRef = React.useRef<HTMLDivElement>(null);

    // Helper: Check if URL is YouTube
    const isYouTubeUrl = (url: string) => {
      return url?.includes('youtube.com') || url?.includes('youtu.be');
    };

    // Helper: Extract YouTube video ID
    const getYouTubeVideoId = (url: string) => {
      if (!url) return null;
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
    };

    // Reset local state when active lesson changes
    useEffect(() => {
      setQuizState('INTRO');
      setCurrentQIdx(0);
      setQuizAnswers([]);
      setQuizScore(0);
      setIsDownloaded(false);
      setVideoWatchedPercent(0);
      setIsVideoPlaying(false);
      if (ytPlayer) {
        ytPlayer.destroy();
        setYtPlayer(null);
      }
    }, [activeLesson?.id]);

    // Load YouTube IFrame API
    useEffect(() => {
      if (activeLesson?.type !== 'video' || !activeLesson.videoUrl) return;
      if (!isYouTubeUrl(activeLesson.videoUrl)) return;

      // Load YouTube API script if not already loaded
      if (!(window as any).YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }

      // Initialize player when API is ready
      const initPlayer = () => {
        const videoId = getYouTubeVideoId(activeLesson.videoUrl!);
        if (!videoId || !ytPlayerContainerRef.current) return;

        const player = new (window as any).YT.Player(ytPlayerContainerRef.current, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
            origin: window.location.origin
          },
          events: {
            onReady: (event: any) => {
              console.log('YouTube player ready');
            },
            onStateChange: (event: any) => {
              // YT.PlayerState: PLAYING=1, PAUSED=2, ENDED=0
              setIsVideoPlaying(event.data === 1);
            }
          }
        });
        setYtPlayer(player);
      };

      // Wait for YT API to load
      if ((window as any).YT && (window as any).YT.Player) {
        initPlayer();
      } else {
        (window as any).onYouTubeIframeAPIReady = initPlayer;
      }

      return () => {
        if (ytPlayer) {
          ytPlayer.destroy();
        }
      };
    }, [activeLesson?.id, activeLesson?.videoUrl]);

    // YouTube Progress Tracking
    useEffect(() => {
      if (!ytPlayer || !isVideoPlaying) return;

      const progressInterval = setInterval(() => {
        try {
          const currentTime = ytPlayer.getCurrentTime();
          const duration = ytPlayer.getDuration();
          if (duration > 0) {
            const percent = Math.round((currentTime / duration) * 100);
            setVideoWatchedPercent(prev => Math.max(prev, percent)); // Only increase, never decrease
          }
        } catch (e) {
          // Player might not be ready
        }
      }, 1000);

      return () => clearInterval(progressInterval);
    }, [ytPlayer, isVideoPlaying]);

    // HTML5 Video Progress Tracking
    const handleHTML5VideoTimeUpdate = () => {
      const video = html5VideoRef.current;
      if (video && video.duration > 0) {
        const percent = Math.round((video.currentTime / video.duration) * 100);
        setVideoWatchedPercent(prev => Math.max(prev, percent));
      }
    };

    const handleHTML5VideoPlay = () => setIsVideoPlaying(true);
    const handleHTML5VideoPause = () => setIsVideoPlaying(false);

    // Auto-save video progress to backend every 10 seconds
    useEffect(() => {
      if (activeLesson?.type !== 'video' || videoWatchedPercent === 0) return;

      const saveInterval = setInterval(async () => {
        if (videoWatchedPercent > 0) {
          try {
            await dataService.updateVideoProgress(activeLesson.id, videoWatchedPercent);
            console.log(`Progress saved: ${videoWatchedPercent}%`);
          } catch (error) {
            console.error('Failed to save video progress:', error);
          }
        }
      }, 10000);

      return () => clearInterval(saveInterval);
    }, [activeLesson?.id, activeLesson?.type, videoWatchedPercent]);

    const handleQuizAnswer = (optionIndex: number) => {
      const newAnswers = [...quizAnswers];
      newAnswers[currentQIdx] = optionIndex;
      setQuizAnswers(newAnswers);
    };

    const handleNextQuestion = () => {
      if (!activeLesson?.quiz) return;
      if (currentQIdx < activeLesson.quiz.length - 1) {
        setCurrentQIdx(currentQIdx + 1);
      } else {
        let score = 0;
        activeLesson.quiz.forEach((q, idx) => {
          if (quizAnswers[idx] === q.correctAnswer) score++;
        });
        setQuizScore(score);
        setQuizState('RESULT');
      }
    };

    const downloadResource = () => {
      if (!activeLesson?.fileUrl) {
        console.error('No file URL available for download');
        return;
      }
      const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '');
      const fullUrl = activeLesson.fileUrl.startsWith('http')
        ? activeLesson.fileUrl
        : `${baseUrl}${activeLesson.fileUrl}`;

      const link = document.createElement('a');
      link.href = fullUrl;
      link.download = activeLesson.fileName || 'resource';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsDownloaded(true);
    };

    // Calculate completion stats
    const completedCount = activeCourse?.lessons.filter(l => l.isCompleted).length || 0;
    const totalCount = activeCourse?.lessons.length || 0;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // Hyper Glass Card for curriculum items
    // Curriculum Item - Now without locks, more fun and engaging
    const CurriculumItem = ({ lesson, idx, isActive, isCompleted, onClick }: any) => (
      <button
        onClick={onClick}
        className={`
          group/item w-full relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-500
          ${isActive
            ? 'bg-gradient-to-r from-cyan-400/20 via-cyan-500/10 to-transparent border border-cyan-400/40 shadow-[0_0_30px_rgba(34,211,238,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]'
            : 'bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] hover:border-cyan-400/30 hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
          }
        `}
      >
        {/* Active indicator glow */}
        {isActive && (
          <>
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-[#D4AF37] shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
            <div className="absolute inset-0 bg-cyan-400/5" />
          </>
        )}

        <div className="flex items-start gap-4 relative z-[1]">
          {/* Status indicator */}
          <div className={`
            relative flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
            ${isCompleted
              ? 'bg-gradient-to-br from-cyan-400 to-[#D4AF37] shadow-[0_0_20px_rgba(34,211,238,0.4)]'
              : isActive
                ? 'bg-cyan-400/20 border-2 border-cyan-400/50'
                : 'bg-white/5 border border-white/10 group-hover/item:border-cyan-400/30'
            }
          `}>
            {isCompleted ? (
              <CheckCircle size={18} className="text-black" />
            ) : (
              <span className={`text-sm font-helvetica-bold ${isActive ? 'text-cyan-400' : 'text-zinc-500 group-hover/item:text-cyan-400'}`}>
                {String(idx + 1).padStart(2, '0')}
              </span>
            )}

            {/* Pulse ring for active */}
            {isActive && !isCompleted && (
              <div className="absolute inset-0 rounded-xl border-2 border-cyan-400/50 animate-ping opacity-30" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {lesson.type === 'video' && <PlayCircle size={12} className={isActive ? 'text-cyan-400' : 'text-zinc-500 group-hover/item:text-cyan-400'} />}
              {lesson.type === 'quiz' && <Sparkles size={12} className={isActive ? 'text-cyan-400' : 'text-zinc-500 group-hover/item:text-cyan-400'} />}
              {(lesson.type === 'pdf' || lesson.type === 'presentation') && <FileText size={12} className={isActive ? 'text-cyan-400' : 'text-zinc-500 group-hover/item:text-cyan-400'} />}
              <span className={`text-[10px] uppercase tracking-wider font-medium ${isActive ? 'text-cyan-400/80' : 'text-zinc-600'}`}>
                {lesson.type === 'video' ? 'Watch' : lesson.type === 'quiz' ? 'Fun Quiz' : lesson.type}
              </span>
            </div>

            <h4 className={`font-helvetica-bold text-sm leading-tight mb-1 transition-colors ${isActive ? 'text-white' : isCompleted ? 'text-zinc-300' : 'text-zinc-400'
              } group-hover/item:text-white`}>
              {lesson.title}
            </h4>

            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-zinc-500">{lesson.durationMin} min</span>
              {isCompleted && (
                <span className="text-emerald-400/80 flex items-center gap-1">
                  <CheckCircle size={10} /> Watched
                </span>
              )}
            </div>
          </div>

          {/* Arrow indicator - always visible on hover */}
          {!isCompleted && (
            <ChevronRight size={16} className={`flex-shrink-0 transition-all duration-300 ${isActive ? 'text-cyan-400 translate-x-0 opacity-100' : 'text-zinc-600 -translate-x-2 opacity-0 group-hover/item:translate-x-0 group-hover/item:opacity-100'
              }`} />
          )}
        </div>
      </button>
    );

    return (
      <div className="h-screen flex flex-col relative z-20 overflow-hidden">
        {/* Clean background - no ambient effects */}

        {/* Top Nav - Hyper Glass */}
        <div className="relative z-30 sticky top-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-transparent" />
          <div className="relative h-20 flex items-center justify-between px-6 border-b border-white/[0.06] bg-[#0a0a0b]">
            <div className="flex items-center gap-5">
              <button
                onClick={() => setCurrentView('DASHBOARD')}
                className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
              >
                <ChevronRight className="rotate-180 text-zinc-400 group-hover:text-white transition-colors" size={18} />
                <span className="text-sm text-zinc-400 group-hover:text-white transition-colors hidden sm:inline">Exit</span>
              </button>

              <div className="hidden md:block">
                <Badge type="success">{activeCourse?.level}</Badge>
              </div>

              <div className="hidden md:block">
                <h1 className="font-helvetica-bold text-lg text-white truncate max-w-md">{activeCourse?.title}</h1>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Progress indicator */}
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-helvetica-bold text-white">{completedCount}/{totalCount}</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Lessons</div>
                </div>
                <div className="relative w-14 h-14">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="2"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="url(#progressGradient)"
                      strokeWidth="2.5"
                      strokeDasharray={`${progressPercent}, 100`}
                      strokeLinecap="round"
                      className="drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]"
                    />
                    <defs>
                      <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#FACC15" />
                        <stop offset="100%" stopColor="#FEF08A" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-helvetica-bold text-[#D4AF37]">{progressPercent}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10">
          {/* Sidebar Curriculum - Hyper Liquid Glass */}
          <div className={`
            transition-[width,transform] duration-200 hidden md:flex flex-col
            ${playerSidebarCollapsed ? 'w-20' : 'w-96'}
          `} style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div className="h-full relative">
              {/* Solid background - no gradient */}
              <div className="absolute inset-0 bg-[#0a0a0b] border-r border-white/[0.05]" />

              {/* Content */}
              <div className="relative h-full flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`transition-all duration-200 ${playerSidebarCollapsed ? 'opacity-0 -translate-x-10 scale-90' : 'opacity-100 translate-x-0 scale-100'} overflow-hidden`} style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>
                      <h2 className="text-sm font-helvetica-bold text-white uppercase tracking-wider">Curriculum</h2>
                      <p className="text-[11px] text-zinc-500 mt-1">{totalCount} lessons • {activeCourse?.totalDuration}</p>
                    </div>
                    <button
                      onClick={() => setPlayerSidebarCollapsed(!playerSidebarCollapsed)}
                      className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                    >
                      <List size={16} className="text-zinc-400" />
                    </button>
                  </div>

                  {/* Mini progress */}
                  {!playerSidebarCollapsed && (
                    <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 to-[#D4AF37] rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)] transition-all duration-700"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Video/Content list - No locks, free exploration */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent liquid-scroll">
                  {activeCourse?.lessons.map((lesson, idx) => {
                    const isActive = activeLesson?.id === lesson.id;

                    if (playerSidebarCollapsed) {
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => setActiveLesson(lesson)}
                          className={`
                            w-12 h-12 rounded-xl flex items-center justify-center mx-auto transition-all
                            ${isActive
                              ? 'bg-cyan-400/20 border border-cyan-400/40 text-cyan-400'
                              : lesson.isCompleted
                                ? 'bg-gradient-to-br from-cyan-400/10 to-[#D4AF37]/10 text-emerald-400'
                                : 'bg-white/5 border border-white/10 text-zinc-500 hover:bg-cyan-400/10 hover:border-cyan-400/30 hover:text-cyan-400'
                            }
                          `}
                        >
                          {lesson.isCompleted ? <CheckCircle size={16} /> : idx + 1}
                        </button>
                      );
                    }

                    return (
                      <CurriculumItem
                        key={lesson.id}
                        lesson={lesson}
                        idx={idx}
                        isActive={isActive}
                        isCompleted={lesson.isCompleted}
                        onClick={() => setActiveLesson(lesson)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto liquid-scroll">
            <div className="min-h-full p-6 md:p-10 flex flex-col items-center">
              {activeLesson ? (
                <div className={`
                    ${playerSidebarCollapsed ? 'max-w-screen-xl lg:px-12' : 'max-w-5xl'}
                    w-full space-y-10 transition-all duration-200
                  `} style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>

                  {/* Content Header - Fun and Engaging */}
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-400/10 to-[#D4AF37]/10 border border-cyan-400/20 mb-4">
                      {activeLesson.type === 'video' && <PlayCircle size={14} className="text-cyan-400" />}
                      {activeLesson.type === 'quiz' && <Sparkles size={14} className="text-[#D4AF37]" />}
                      {(activeLesson.type === 'pdf' || activeLesson.type === 'presentation') && <FileText size={14} className="text-cyan-400" />}
                      <span className="text-xs uppercase tracking-wider text-zinc-400">
                        {activeLesson.type === 'video' ? 'Watch & Discover' : activeLesson.type === 'quiz' ? 'Fun Facts Quiz' : 'Learn More'}
                      </span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-xs text-zinc-500">{activeLesson.durationMin} min</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-helvetica-bold text-white mb-2">{activeLesson.title}</h2>
                  </div>

                  {/* 1. Video Player - Hyper Liquid Glass with Real Progress Tracking */}
                  {activeLesson.type === 'video' && (
                    <div className="space-y-4">
                      <LiquidVideoFrame>
                        <div className="aspect-video w-full bg-black relative">
                          {/* YouTube Video Player */}
                          {isYouTubeUrl(activeLesson.videoUrl || '') ? (
                            <div
                              ref={ytPlayerContainerRef}
                              className="w-full h-full"
                              key={activeLesson.id} // Force re-render on lesson change
                            />
                          ) : (
                            /* HTML5 Video Player for uploaded videos */
                            <video
                              ref={html5VideoRef}
                              className="w-full h-full"
                              controls
                              playsInline
                              crossOrigin="anonymous"
                              onTimeUpdate={handleHTML5VideoTimeUpdate}
                              onPlay={handleHTML5VideoPlay}
                              onPause={handleHTML5VideoPause}
                            >
                              <source src={activeLesson.fileUrl || activeLesson.videoUrl || ''} type="video/mp4" />
                              <source src={activeLesson.fileUrl || activeLesson.videoUrl || ''} type="video/webm" />
                              Your browser does not support the video tag.
                            </video>
                          )}
                        </div>
                      </LiquidVideoFrame>
                    </div>
                  )}

                  {/* 2. Document View - Notion-style Embedded Viewer */}
                  {(activeLesson.type === 'pdf' || activeLesson.type === 'presentation') && (
                    <LiquidVideoFrame>
                      {activeLesson.fileUrl ? (
                        <div className="w-full flex flex-col">
                          {/* Document Header Bar */}
                          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/20">
                            <div className="flex items-center gap-3">
                              {activeLesson.type === 'presentation' ? (
                                <FileSpreadsheet size={18} className="text-[#D4AF37]" />
                              ) : (
                                <FileText size={18} className="text-[#D4AF37]" />
                              )}
                              <span className="text-white/90 text-sm font-medium truncate max-w-[200px] sm:max-w-[400px]">
                                {activeLesson.fileName || 'Document'}
                              </span>
                              <span className="text-zinc-500 text-xs hidden sm:inline">
                                {activeLesson.type === 'presentation'
                                  ? `${activeLesson.pageCount || '—'} slides`
                                  : `${activeLesson.pageCount || '—'} pages`
                                }
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '');
                                  const fullUrl = activeLesson.fileUrl?.startsWith('http')
                                    ? activeLesson.fileUrl
                                    : `${baseUrl}${activeLesson.fileUrl}`;
                                  window.open(fullUrl, '_blank');
                                }}
                                className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                                title="Open in new tab"
                              >
                                <ExternalLink size={16} />
                              </button>
                              <button
                                onClick={downloadResource}
                                className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                                title="Download"
                              >
                                <Download size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Embedded Document Viewer */}
                          <div className="w-full" style={{ height: 'calc(100vh - 300px)', minHeight: '600px' }}>
                            {(() => {
                              const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '');
                              const fullUrl = activeLesson.fileUrl?.startsWith('http')
                                ? activeLesson.fileUrl
                                : `${baseUrl}${activeLesson.fileUrl}`;

                              if (activeLesson.type === 'pdf') {
                                return (
                                  <iframe
                                    src={`${fullUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
                                    className="w-full h-full border-0 bg-zinc-900"
                                    title={activeLesson.fileName || 'PDF Document'}
                                    style={{ colorScheme: 'dark' }}
                                  />
                                );
                              } else {
                                // For PPT/PPTX - check if URL is publicly accessible
                                const isLocalUrl = fullUrl.includes('localhost') || fullUrl.includes('127.0.0.1') || fullUrl.includes('192.168.');
                                const encodedUrl = encodeURIComponent(fullUrl);
                                const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;

                                // For local files, show a styled preview interface
                                if (isLocalUrl) {
                                  return (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-8">
                                      {/* Presentation Icon */}
                                      <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 flex items-center justify-center mb-6 shadow-[0_0_60px_rgba(249,115,22,0.15)]">
                                        <FileSpreadsheet size={64} className="text-orange-400" />
                                      </div>

                                      {/* File Info */}
                                      <h3 className="text-xl font-bold text-white mb-2 text-center">
                                        {activeLesson.fileName || 'Presentation'}
                                      </h3>
                                      <p className="text-zinc-400 text-sm mb-6">
                                        PowerPoint Presentation • {activeLesson.pageCount || '—'} slides
                                      </p>

                                      {/* Action Buttons */}
                                      <div className="flex gap-3">
                                        <button
                                          onClick={() => window.open(fullUrl, '_blank')}
                                          className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-semibold transition-all flex items-center gap-2 shadow-lg shadow-orange-500/25"
                                        >
                                          <ExternalLink size={18} />
                                          Open Presentation
                                        </button>
                                        <button
                                          onClick={downloadResource}
                                          className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold transition-all flex items-center gap-2"
                                        >
                                          <Download size={18} />
                                          Download
                                        </button>
                                      </div>

                                      <p className="text-zinc-600 text-xs mt-6 text-center max-w-md">
                                        PowerPoint files open in your default presentation software for the best viewing experience.
                                      </p>
                                    </div>
                                  );
                                }

                                // For public URLs, use Office Online viewer
                                return (
                                  <iframe
                                    src={officeViewerUrl}
                                    className="w-full h-full border-0 bg-zinc-900"
                                    title={activeLesson.fileName || 'Presentation'}
                                    allowFullScreen
                                  />
                                );
                              }
                            })()}
                          </div>
                        </div>
                      ) : (
                        /* Fallback when no file uploaded yet */
                        <div className="aspect-video flex flex-col items-center justify-center text-center p-10 relative">
                          <div className="absolute inset-0 opacity-30">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(250,204,21,0.1),transparent_50%)]" />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(255,255,255,0.05),transparent_50%)]" />
                          </div>
                          <div className="relative z-10">
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-yellow-400/20 to-yellow-500/10 border border-[#D4AF37]/50 flex items-center justify-center mb-8 mx-auto shadow-[0_0_40px_rgba(250,204,21,0.2)]">
                              <FileText size={48} className="text-[#D4AF37] drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                            </div>
                            <h3 className="text-2xl font-helvetica-bold text-white mb-3">Document Not Available</h3>
                            <p className="text-zinc-400 max-w-md">
                              This document hasn't been uploaded yet. Please check back later.
                            </p>
                          </div>
                        </div>
                      )}
                    </LiquidVideoFrame>
                  )}

                  {/* 3. Quiz Runner - Hyper Liquid Glass */}
                  {activeLesson.type === 'quiz' && activeLesson.quiz && (
                    <LiquidVideoFrame>
                      <div className="min-h-[500px] flex flex-col justify-center p-10">
                        {quizState === 'INTRO' && (
                          <div className="text-center space-y-8">
                            <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-yellow-400/20 to-yellow-500/10 border border-[#D4AF37]/50 mx-auto flex items-center justify-center shadow-[0_0_50px_rgba(250,204,21,0.2)]">
                              <HelpCircle size={56} className="text-[#D4AF37] drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
                            </div>
                            <div>
                              <h2 className="text-3xl font-helvetica-bold text-white mb-3">Knowledge Check</h2>
                              <p className="text-zinc-400 text-lg">Test your understanding with {activeLesson.quiz.length} questions</p>
                            </div>
                            <PrimaryButton onClick={() => setQuizState('QUESTION')} className="px-10 py-4 text-lg">
                              Begin Quiz
                            </PrimaryButton>
                          </div>
                        )}

                        {quizState === 'QUESTION' && (
                          <div className="max-w-2xl mx-auto w-full animate-fade-in">
                            <div className="flex justify-between items-center mb-6">
                              <span className="text-sm text-zinc-400 font-mono">
                                Question {currentQIdx + 1} of {activeLesson.quiz.length}
                              </span>
                              <div className="flex items-center gap-2">
                                {activeLesson.quiz.map((_, i) => (
                                  <div key={i} className={`w-2 h-2 rounded-full transition-all ${i < currentQIdx ? 'bg-yellow-400'
                                    : i === currentQIdx ? 'bg-yellow-400 w-4'
                                      : 'bg-white/20'
                                    }`} />
                                ))}
                              </div>
                            </div>

                            <h3 className="text-2xl font-helvetica-bold text-white mb-8 leading-relaxed">
                              {activeLesson.quiz[currentQIdx].question}
                            </h3>

                            <div className="space-y-3 mb-10">
                              {activeLesson.quiz[currentQIdx].options.map((opt, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handleQuizAnswer(idx)}
                                  className={`
                                    w-full p-5 rounded-2xl text-left border transition-all duration-300 group/opt
                                    ${quizAnswers[currentQIdx] === idx
                                      ? 'bg-yellow-400/20 border-yellow-400/50 shadow-[0_0_25px_rgba(250,204,21,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]'
                                      : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20'
                                    }
                                  `}
                                >
                                  <div className="flex items-center gap-4">
                                    <div className={`
                                      w-10 h-10 rounded-xl flex items-center justify-center text-sm font-helvetica-bold transition-all
                                      ${quizAnswers[currentQIdx] === idx
                                        ? 'bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.4)]'
                                        : 'bg-white/10 text-zinc-400 group-hover/opt:bg-white/20'
                                      }
                                    `}>
                                      {String.fromCharCode(65 + idx)}
                                    </div>
                                    <span className={`text-lg ${quizAnswers[currentQIdx] === idx ? 'text-white' : 'text-zinc-300'}`}>
                                      {opt}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>

                            <div className="flex justify-end">
                              <PrimaryButton
                                onClick={handleNextQuestion}
                                disabled={quizAnswers[currentQIdx] === undefined}
                                className="px-8"
                              >
                                {currentQIdx === activeLesson.quiz.length - 1 ? 'See Results' : 'Next Question'}
                                <ChevronRight size={18} className="ml-1" />
                              </PrimaryButton>
                            </div>
                          </div>
                        )}

                        {quizState === 'RESULT' && (() => {
                          const scorePercent = Math.round((quizScore / activeLesson.quiz.length) * 100);
                          const passed = scorePercent >= PASSING_SCORE;
                          return (
                            <div className="text-center space-y-8 animate-fade-in">
                              <div className={`w-32 h-32 rounded-3xl mx-auto flex items-center justify-center ${passed
                                ? 'bg-gradient-to-br from-green-400/30 to-green-500/10 border border-green-400/40 shadow-[0_0_60px_rgba(34,197,94,0.3)]'
                                : 'bg-gradient-to-br from-red-400/30 to-red-500/10 border border-red-400/40 shadow-[0_0_60px_rgba(239,68,68,0.3)]'
                                }`}>
                                {passed ? (
                                  <Trophy size={64} className="text-green-400 drop-shadow-[0_0_25px_rgba(34,197,94,0.6)]" />
                                ) : (
                                  <XCircle size={64} className="text-red-400 drop-shadow-[0_0_25px_rgba(239,68,68,0.6)]" />
                                )}
                              </div>
                              <div>
                                <h2 className={`text-3xl font-helvetica-bold mb-4 ${passed ? 'text-green-400' : 'text-red-400'}`}>
                                  {passed ? 'Quiz Passed!' : 'Quiz Not Passed'}
                                </h2>
                                <div className={`text-7xl font-black bg-clip-text text-transparent bg-gradient-to-r mb-3 ${passed
                                  ? 'from-green-400 via-green-300 to-white'
                                  : 'from-red-400 via-red-300 to-white'
                                  }`}>
                                  {scorePercent}%
                                </div>
                                <p className="text-zinc-400 text-lg">
                                  You answered <span className={passed ? 'text-green-400' : 'text-red-400'} style={{ fontWeight: 'bold' }}>{quizScore}</span> out of <span className="text-white font-helvetica-bold">{activeLesson.quiz.length}</span> correctly
                                </p>
                                <p className="text-zinc-500 text-sm mt-2">
                                  Passing score: {PASSING_SCORE}%
                                </p>
                                {!passed && (
                                  <p className="text-[#D4AF37]/80 text-sm mt-4 px-4 py-2 rounded-lg bg-yellow-400/10 border border-yellow-400/20 inline-block">
                                    You need to score at least {PASSING_SCORE}% to complete this lesson
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-4 justify-center pt-4">
                                <SecondaryButton
                                  onClick={() => { setQuizState('INTRO'); setCurrentQIdx(0); setQuizAnswers([]); setQuizPassed(null); }}
                                  className="px-8"
                                >
                                  <RefreshCw size={16} className="mr-2" /> {passed ? 'Retry' : 'Try Again'}
                                </SecondaryButton>
                                {passed && (
                                  <PrimaryButton onClick={() => handleLessonComplete(quizScore, activeLesson?.quiz?.length)} className="px-8">
                                    <Award size={16} className="mr-2" /> Complete & Continue
                                  </PrimaryButton>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </LiquidVideoFrame>
                  )}

                  {/* Lesson Footer Controls - Hyper Glass with Progress Requirements */}
                  {activeLesson.type !== 'quiz' && (
                    <div className="relative rounded-2xl overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-white/[0.05] to-white/[0.02] backdrop-blur-xl border border-white/10" />
                      <div className="relative p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${activeLesson.isCompleted || (activeLesson.type === 'video' && videoWatchedPercent >= 80)
                            ? 'bg-green-500/20 border border-green-500/30'
                            : 'bg-white/5 border border-white/10'
                            }`}>
                            {activeLesson.isCompleted ? (
                              <CheckCircle size={28} className="text-green-400" />
                            ) : activeLesson.type === 'video' ? (
                              <div className="relative">
                                <PlayCircle size={28} className={videoWatchedPercent >= 80 ? 'text-green-400' : 'text-[#D4AF37]'} />
                                {videoWatchedPercent > 0 && videoWatchedPercent < 80 && (
                                  <span className="absolute -top-1 -right-1 text-[10px] bg-yellow-400 text-black px-1 rounded font-helvetica-bold">{videoWatchedPercent}%</span>
                                )}
                              </div>
                            ) : (
                              <FileText size={28} className="text-[#D4AF37]" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-helvetica-bold text-white text-lg">{activeLesson.title}</h4>
                            <p className="text-sm text-zinc-400">
                              {activeLesson.durationMin} min • {activeLesson.isCompleted ? (
                                <span className="text-green-400 flex items-center gap-1"><CheckCircle size={12} /> Completed</span>
                              ) : activeLesson.type === 'video' ? (
                                <span className={videoWatchedPercent >= 80 ? 'text-green-400' : 'text-[#D4AF37]'}>
                                  {videoWatchedPercent >= 80 ? 'Ready to complete' : `${videoWatchedPercent}% watched (80% required)`}
                                </span>
                              ) : 'In Progress'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {/* Document download requirement */}
                          {(activeLesson.type === 'pdf' || activeLesson.type === 'presentation') && !activeLesson.isCompleted && !isDownloaded && (
                            <div className="text-sm text-[#D4AF37]/80 flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
                              <Download size={14} /> Download required
                            </div>
                          )}

                          {/* Video progress requirement */}
                          {activeLesson.type === 'video' && !activeLesson.isCompleted && videoWatchedPercent < 80 && (
                            <div className="text-sm text-[#D4AF37]/80 flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
                              <PlayCircle size={14} /> Watch 80% to complete
                            </div>
                          )}

                          <PrimaryButton
                            onClick={() => handleLessonComplete()}
                            disabled={
                              activeLesson.isCompleted ||
                              ((activeLesson.type === 'pdf' || activeLesson.type === 'presentation') && !isDownloaded) ||
                              (activeLesson.type === 'video' && videoWatchedPercent < 80)
                            }
                            className={`px-8 ${activeLesson.type === 'video' && videoWatchedPercent >= 80 && !activeLesson.isCompleted
                              ? 'bg-green-500 hover:bg-green-400 border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                              : ''
                              }`}
                          >
                            {activeLesson.isCompleted ? (
                              <><CheckCircle size={18} className="mr-2" /> Completed</>
                            ) : (
                              <><ChevronRight size={18} className="mr-2" /> Complete & Next</>
                            )}
                          </PrimaryButton>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <div className="w-32 h-32 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-8">
                    <BookOpen size={64} className="text-zinc-600" />
                  </div>
                  <h3 className="text-2xl font-helvetica-bold text-zinc-300 mb-3">Select a Lesson</h3>
                  <p className="text-zinc-500 max-w-sm">Choose a lesson from the curriculum to begin your learning journey.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile lesson selector */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
          <div className="bg-[#0a0a0b] border-t border-white/[0.05] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-400/20 flex items-center justify-center text-[#D4AF37] font-helvetica-bold">
                  {(activeCourse?.lessons.findIndex(l => l.id === activeLesson?.id) || 0) + 1}
                </div>
                <div>
                  <p className="text-sm font-medium text-white truncate max-w-[300px]" title={activeLesson?.title}>{activeLesson?.title}</p>
                  <p className="text-xs text-zinc-500">{completedCount}/{totalCount} completed</p>
                </div>
              </div>
              <button className="p-3 rounded-xl bg-white/5 border border-white/10">
                <Menu size={20} className="text-zinc-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // AI Guide View - Full-screen chatbot integrated with sidebar
  const AIGuideView = () => {
    return (
      <div className="min-h-screen md:ml-64 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-zinc-900/80 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Bot size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-helvetica-bold text-white">Isle AI Guide</h1>
                <p className="text-sm text-zinc-400">Your personal Cayman Islands concierge</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
            </div>
          </div>
        </div>

        {/* Chatbot Panel - Embedded Full Screen */}
        <div className="h-[calc(100vh-73px)]">
          <ChatbotPanel
            isOpen={true}
            onClose={() => setCurrentView('DASHBOARD')}
          />
        </div>
      </div>
    );
  };

  const AdminView = () => {
    // Toast notifications
    const { showToast } = useToast();

    // Admin State
    const [viewMode, setViewMode] = useState<'DASHBOARD' | 'EDITOR'>('DASHBOARD');
    const [editingCourse, setEditingCourse] = useState<Partial<Course> | null>(null);
    const [editorTab, setEditorTab] = useState<'DETAILS' | 'CURRICULUM'>('DETAILS');
    const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
    const [newLessonType, setNewLessonType] = useState<ContentType>('video');
    const [isSaving, setIsSaving] = useState(false);
    // Track which item is uploading: null = none, 'thumbnail' = course thumbnail, lessonId = specific lesson
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Inline Editing State for Course Manager
    const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
    const [editingCourseTitle, setEditingCourseTitle] = useState<string>('');

    // Pending Users State
    const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [loadingPending, setLoadingPending] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [processingUser, setProcessingUser] = useState<string | null>(null);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [userFilterRole, setUserFilterRole] = useState<string>('ALL');

    // Track deleted lessons for backend sync
    const [deletedLessonIds, setDeletedLessonIds] = useState<string[]>([]);

    // Real Analytics State
    const [fullStats, setFullStats] = useState<{
      totalLearners: number;
      totalCourses: number;
      totalLessons: number;
      totalEnrollments: number;
      completionRate: number;
      totalStudyHours: number;
      overdueEnrollments?: number;
      averageQuizScore?: number;
      quizPassRate?: number;
    } | null>(null);
    const [ministryStats, setMinistryStats] = useState<any[]>([]);
    const [contentStats, setContentStats] = useState<any[]>([]);
    const [overdueLearners, setOverdueLearners] = useState<any[]>([]);
    const [selectedMinistry, setSelectedMinistry] = useState<string | null>(null);
    const [ministryCourseStats, setMinistryCourseStats] = useState<any[]>([]);



    // Track if data has been loaded (to prevent re-fetching)
    const [pendingUsersLoaded, setPendingUsersLoaded] = useState(false);
    const [allUsersLoaded, setAllUsersLoaded] = useState(false);
    const [statsLoaded, setStatsLoaded] = useState(false);

    // Load pending users only once
    useEffect(() => {
      if (pendingUsersLoaded) return;
      const loadPendingUsers = async () => {
        setLoadingPending(true);
        try {
          const response = await authAPI.getPendingUsers();
          setPendingUsers(response.pendingUsers);
          setPendingUsersLoaded(true);
        } catch (err) {
          console.error('Failed to load pending users:', err);
        } finally {
          setLoadingPending(false);
        }
      };
      loadPendingUsers();
    }, [pendingUsersLoaded]);

    // Load real analytics data
    useEffect(() => {
      if (statsLoaded) return;
      const loadStats = async () => {
        try {
          const [statsRes, ministryRes, contentRes, overdueRes] = await Promise.all([
            dataService.getFullAdminStats(),
            dataService.getMinistryStats(),
            dataService.getContentStats(),
            dataService.getOverdueLearners()
          ]);
          setFullStats(statsRes.stats);
          setMinistryStats(ministryRes.ministryStats || []);
          setContentStats(contentRes.contentStats || []);
          setOverdueLearners(overdueRes.overdueLearners || []);
          setStatsLoaded(true);
        } catch (err) {
          console.error('Failed to load admin stats:', err);
        }
      };
      loadStats();
    }, [statsLoaded]);

    // Load ministry course breakdown when a ministry is selected
    useEffect(() => {
      if (!selectedMinistry) {
        setMinistryCourseStats([]);
        return;
      }
      const loadMinistryCourseStats = async () => {
        try {
          const res = await dataService.getMinistryCourseStats(selectedMinistry);
          setMinistryCourseStats(res.ministryCourseStats || []);
        } catch (err) {
          console.error('Failed to load ministry course stats:', err);
        }
      };
      loadMinistryCourseStats();
    }, [selectedMinistry]);

    // Load all users when USERS section is active (only once)
    useEffect(() => {
      if (adminSection !== 'USERS' || allUsersLoaded) return;
      const loadAllUsers = async () => {
        setLoadingUsers(true);
        try {
          const response = await api.admin.getUsers({ limit: 100 });
          setAllUsers(response.users || []);
          setAllUsersLoaded(true);
        } catch (err) {
          console.error('Failed to load users:', err);
        } finally {
          setLoadingUsers(false);
        }
      };
      loadAllUsers();
    }, [adminSection, allUsersLoaded]);

    const handleApproveUser = async (userId: string) => {
      setProcessingUser(userId);
      try {
        await authAPI.approveUser(userId);
        setPendingUsers(prev => prev.filter(u => u.id !== userId));
      } catch (err) {
        console.error('Failed to approve user:', err);
      } finally {
        setProcessingUser(null);
      }
    };

    const handleRejectUser = async (userId: string) => {
      setProcessingUser(userId);
      try {
        await authAPI.rejectUser(userId);
        setPendingUsers(prev => prev.filter(u => u.id !== userId));
      } catch (err) {
        console.error('Failed to reject user:', err);
      } finally {
        setProcessingUser(null);
      }
    };

    // Inline editing handlers for Course Manager
    const startEditingCourseTitle = (course: Course) => {
      setEditingCourseId(course.id);
      setEditingCourseTitle(course.title);
    };

    const saveEditingCourseTitle = async () => {
      if (!editingCourseId || !editingCourseTitle.trim()) {
        cancelEditingCourseTitle();
        return;
      }
      try {
        const updatedCourse = await dataService.updateCourse(editingCourseId, { title: editingCourseTitle.trim() });
        setCourses(prev => prev.map(c => c.id === editingCourseId ? { ...c, title: editingCourseTitle.trim() } : c));
        showToast('success', 'Title Updated', 'Course title has been updated successfully.');
      } catch (err) {
        console.error('Failed to update course title:', err);
        showToast('error', 'Update Failed', 'Failed to update course title. Please try again.');
      }
      cancelEditingCourseTitle();
    };

    const cancelEditingCourseTitle = () => {
      setEditingCourseId(null);
      setEditingCourseTitle('');
    };

    const handleQuickUpdateCourse = async (courseId: string, updates: { title?: string; level?: 'Beginner' | 'Intermediate' | 'Advanced' }) => {
      try {
        await dataService.updateCourse(courseId, updates);
        setCourses(prev => prev.map(c => c.id === courseId ? { ...c, ...updates } : c));
        showToast('success', 'Course Updated', 'Course has been updated successfully.');
      } catch (err) {
        console.error('Failed to update course:', err);
        showToast('error', 'Update Failed', 'Failed to update course. Please try again.');
      }
    };

    const handleCreateCourse = () => {
      setEditingCourse({
        id: `new-${Date.now()}`, // Temporary ID to identify as new course
        title: '',
        description: '',
        level: 'Beginner',
        lessons: [],
        thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070',
        totalDuration: '60 min',
        progress: 0,
        status: 'NOT_STARTED' as any
      });
      setViewMode('EDITOR');
      setEditorTab('DETAILS');
    };

    const handleEditCourse = (course: Course) => {
      setEditingCourse({ ...course });
      setViewMode('EDITOR');
      setEditorTab('CURRICULUM');
    };

    const addLesson = () => {
      if (!editingCourse) return;
      const lesson: Lesson = {
        id: `l-${Date.now()}`,
        title: 'New Lesson',
        type: newLessonType,
        durationMin: 10,
        content: '',
        quiz: []
      };
      setEditingCourse({
        ...editingCourse,
        lessons: [...(editingCourse.lessons || []), lesson]
      });
      setActiveLessonId(lesson.id);
    };

    const updateLesson = (id: string, updates: Partial<Lesson>) => {
      if (!editingCourse || !editingCourse.lessons) return;
      const updatedLessons = editingCourse.lessons.map(l => l.id === id ? { ...l, ...updates } : l);
      setEditingCourse({ ...editingCourse, lessons: updatedLessons });
    };

    const deleteLesson = (id: string) => {
      if (!editingCourse || !editingCourse.lessons) return;
      if (!confirm('Are you sure you want to delete this lesson?')) return;
      const updatedLessons = editingCourse.lessons.filter(l => l.id !== id);
      setEditingCourse({ ...editingCourse, lessons: updatedLessons });
      // Track deletion for backend sync (only if it's an existing lesson, not a new one)
      if (!id.startsWith('l-')) {
        setDeletedLessonIds(prev => [...prev, id]);
      }
      if (activeLessonId === id) {
        setActiveLessonId(updatedLessons[0]?.id || null);
      }
    };

    // Move lesson up in order
    const moveLessonUp = (index: number) => {
      if (!editingCourse || !editingCourse.lessons || index === 0) return;
      const lessons = [...editingCourse.lessons];
      [lessons[index - 1], lessons[index]] = [lessons[index], lessons[index - 1]];
      setEditingCourse({ ...editingCourse, lessons });
    };

    // Move lesson down in order
    const moveLessonDown = (index: number) => {
      if (!editingCourse || !editingCourse.lessons || index === editingCourse.lessons.length - 1) return;
      const lessons = [...editingCourse.lessons];
      [lessons[index], lessons[index + 1]] = [lessons[index + 1], lessons[index]];
      setEditingCourse({ ...editingCourse, lessons });
    };

    const deleteCourse = async (courseId: string) => {
      if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) return;
      try {
        await dataService.deleteCourse(courseId);
        const freshCourses = await dataService.getCourses();
        setCourses(sortCourses(freshCourses));
        showToast('success', 'Course Deleted', 'The course has been successfully removed.');
      } catch (error) {
        console.error('Failed to delete course:', error);
        showToast('error', 'Delete Failed', 'Failed to delete course. Please try again.');
      }
    };

    // Save course to backend with all lessons
    const handleSaveCourse = async () => {
      if (!editingCourse) return;
      setIsSaving(true);
      try {
        let courseId = editingCourse.id;
        const isNewCourse = !courseId || courseId.startsWith('new-');

        // 1. Create or update the course first
        if (isNewCourse) {
          const savedCourse = await dataService.createCourse(editingCourse);
          courseId = savedCourse.id;
        } else {
          await dataService.updateCourse(courseId, editingCourse);
        }

        // 2. Delete removed lessons from backend
        let deletionWarning = false;
        for (const deletedId of deletedLessonIds) {
          try {
            await dataService.deleteLesson(deletedId);
          } catch (err) {
            console.error(`Failed to delete lesson ${deletedId}:`, err);
            deletionWarning = true;
          }
        }
        setDeletedLessonIds([]); // Clear after sync

        // 3. Save all lessons with order
        const lessons = editingCourse.lessons || [];
        for (let i = 0; i < lessons.length; i++) {
          const lesson = lessons[i];
          const isNewLesson = lesson.id.startsWith('l-');

          if (isNewLesson) {
            // Create new lesson with order
            await dataService.addLesson(courseId, {
              title: lesson.title,
              type: lesson.type,
              durationMin: lesson.durationMin,
              videoUrl: lesson.videoUrl,
              fileUrl: lesson.fileUrl,
              fileName: lesson.fileName,
              pageCount: lesson.pageCount,
              content: lesson.content,
              quiz: lesson.quiz,
              orderIndex: i
            });
          } else {
            // Update existing lesson with order
            await dataService.updateLesson(lesson.id, {
              title: lesson.title,
              type: lesson.type,
              durationMin: lesson.durationMin,
              videoUrl: lesson.videoUrl,
              fileUrl: lesson.fileUrl,
              fileName: lesson.fileName,
              pageCount: lesson.pageCount,
              content: lesson.content,
              orderIndex: i
            });
          }
        }

        // 4. Refresh courses list (sorted by level and order)
        const freshCourses = await dataService.getCourses();
        setCourses(sortCourses(freshCourses));
        setViewMode('DASHBOARD');
        setEditingCourse(null);
        setActiveLessonId(null);

        // Show success toast
        if (deletionWarning) {
          showToast('warning', 'Partial Save', 'Course saved but some lessons could not be deleted. Please review and retry.');
        } else {
          showToast('success', isNewCourse ? 'Course Created' : 'Course Updated', 'Your changes have been saved and published successfully.');
        }
      } catch (error) {
        console.error('Failed to save course:', error);
        showToast('error', 'Update Failed', 'Something went wrong. Please try again or contact support.');
      } finally {
        setIsSaving(false);
      }
    };

    // Calculate analytics for dashboard
    const totalLessons = courses.reduce((acc, c) => acc + c.lessons.length, 0);

    // --- Sub-View: Course Editor (The Hyper Glass Tool) ---
    if (viewMode === 'EDITOR' && editingCourse) {
      const activeLesson = editingCourse.lessons?.find(l => l.id === activeLessonId);

      return (
        <div className="md:ml-64 h-screen overflow-hidden relative z-10 flex flex-col">
          {/* Editor Header */}
          <div className="h-16 flex-shrink-0 bg-[linear-gradient(180deg,#121214_0%,#0a0a0b_100%)] border-b border-white/[0.05] flex items-center justify-between px-6 z-30">
            <div className="flex items-center gap-4">
              <IconButton icon={<ArrowLeft size={20} />} onClick={() => setViewMode('DASHBOARD')} />
              <h2 className="font-helvetica-bold text-lg text-white">Course Editor</h2>
              <div className="h-4 w-px bg-white/10"></div>
              <span className="text-zinc-400 text-sm">{editingCourse.title}</span>
            </div>
            <div className="flex gap-3">
              <SecondaryButton className="px-4 py-2 text-sm h-9 flex items-center" onClick={() => setViewMode('DASHBOARD')}>Cancel</SecondaryButton>
              <PrimaryButton
                className="px-4 py-2 text-sm h-9 flex items-center gap-2"
                onClick={handleSaveCourse}
                disabled={isSaving}
              >
                {isSaving ? (
                  <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Saving...</>
                ) : (
                  <><Save size={16} /> Publish Changes</>
                )}
              </PrimaryButton>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar: Structure */}
            <div className="w-80 bg-[linear-gradient(180deg,#131315_0%,#0a0a0b_100%)] border-r border-white/[0.05] flex flex-col">
              <div className="flex border-b border-white/5">
                <button
                  onClick={() => setEditorTab('DETAILS')}
                  className={`flex-1 py-4 text-sm font-medium transition-colors ${editorTab === 'DETAILS' ? 'text-[#D4AF37] border-b-2 border-yellow-400 bg-yellow-400/5' : 'text-zinc-400 hover:text-white'}`}
                >
                  Details
                </button>
                <button
                  onClick={() => setEditorTab('CURRICULUM')}
                  className={`flex-1 py-4 text-sm font-medium transition-colors ${editorTab === 'CURRICULUM' ? 'text-[#D4AF37] border-b-2 border-yellow-400 bg-yellow-400/5' : 'text-zinc-400 hover:text-white'}`}
                >
                  Curriculum
                </button>
              </div>

              {editorTab === 'DETAILS' ? (
                <div className="p-6 space-y-6 overflow-y-auto">
                  <div>
                    <label className="text-xs text-zinc-500 font-helvetica-bold uppercase mb-2 block">Course Thumbnail</label>
                    {/* Current thumbnail preview */}
                    {editingCourse.thumbnail && (
                      <div className="aspect-video rounded-xl bg-zinc-800 overflow-hidden mb-3 relative group border border-white/10">
                        <img src={editingCourse.thumbnail} className="w-full h-full object-cover" />
                        <button
                          onClick={() => setEditingCourse({ ...editingCourse, thumbnail: '' })}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                    {/* Upload option */}
                    <div className="mb-3">
                      <FileDropZone
                        label="Upload Thumbnail Image"
                        accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                        currentFile={undefined}
                        isUploading={uploadingId === 'thumbnail'}
                        uploadProgress={uploadingId === 'thumbnail' ? uploadProgress : 0}
                        onFileSelect={async (file) => {
                          try {
                            setUploadingId('thumbnail');
                            setUploadProgress(0);
                            const result = await dataService.uploadFile(file, (progress) => {
                              setUploadProgress(progress);
                            });
                            setEditingCourse({ ...editingCourse, thumbnail: result.file.fileUrl });
                            showToast('success', 'Thumbnail Uploaded', 'Image uploaded successfully.');
                          } catch (error) {
                            console.error('Failed to upload thumbnail:', error);
                            showToast('error', 'Upload Failed', 'Failed to upload thumbnail. Please try again.');
                          } finally {
                            setUploadingId(null);
                            setUploadProgress(0);
                          }
                        }}
                      />
                    </div>
                    {/* OR use URL */}
                    <div className="relative mb-3">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                      <div className="relative flex justify-center"><span className="px-2 bg-zinc-900 text-xs text-zinc-500">OR use URL</span></div>
                    </div>
                    <input
                      value={editingCourse.thumbnail || ''}
                      onChange={e => setEditingCourse({ ...editingCourse, thumbnail: e.target.value })}
                      placeholder="Enter image URL..."
                      className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-2 text-xs text-white focus:border-yellow-400 outline-none mb-3"
                    />
                    {/* Quick select presets */}
                    <div className="text-xs text-zinc-500 mb-2">Quick select:</div>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=400',
                        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=400',
                        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=400',
                        'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=400',
                      ].map((url, idx) => (
                        <button
                          key={idx}
                          onClick={() => setEditingCourse({ ...editingCourse, thumbnail: url.replace('w=400', 'w=2070') })}
                          className={`aspect-video rounded-lg overflow-hidden border-2 transition-all ${editingCourse.thumbnail?.includes(url.split('?')[0].split('/').pop() || '') ? 'border-yellow-400' : 'border-transparent hover:border-white/30'}`}
                        >
                          <img src={url} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 font-helvetica-bold uppercase mb-2 block">Title</label>
                    <input
                      value={editingCourse.title}
                      onChange={e => setEditingCourse({ ...editingCourse, title: e.target.value })}
                      className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3 text-white focus:border-yellow-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 font-helvetica-bold uppercase mb-2 block">Description</label>
                    <textarea
                      value={editingCourse.description}
                      onChange={e => setEditingCourse({ ...editingCourse, description: e.target.value })}
                      className="w-full h-32 bg-zinc-900/50 border border-white/10 rounded-xl p-3 text-white focus:border-yellow-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 font-helvetica-bold uppercase mb-2 block">Course Level</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Beginner', 'Intermediate', 'Advanced'] as const).map(level => (
                        <button
                          key={level}
                          onClick={() => setEditingCourse({ ...editingCourse, level })}
                          className={`py-3 px-2 rounded-xl text-sm font-medium transition-all border flex items-center justify-center text-center whitespace-nowrap min-h-[48px] ${editingCourse.level === level
                            ? 'bg-yellow-400 text-black border-yellow-400 shadow-lg shadow-yellow-400/20'
                            : 'bg-zinc-900/50 text-zinc-400 border-white/10 hover:border-yellow-400/50'
                            }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-2">
                      {editingCourse.level === 'Beginner' && 'Available to all learners from the start'}
                      {editingCourse.level === 'Intermediate' && 'Unlocked after completing all Beginner courses'}
                      {editingCourse.level === 'Advanced' && 'Unlocked after completing Beginner & Intermediate courses'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 font-helvetica-bold uppercase mb-2 block">Estimated Duration</label>
                    <input
                      value={editingCourse.totalDuration || ''}
                      onChange={e => setEditingCourse({ ...editingCourse, totalDuration: e.target.value })}
                      placeholder="e.g., 60 min or 1h 30min"
                      className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3 text-white focus:border-yellow-400 outline-none"
                    />
                  </div>

                  {/* Deadline and Mandatory Settings */}
                  <div className="pt-4 border-t border-white/10">
                    <h4 className="text-sm font-helvetica-bold text-white mb-3 flex items-center gap-2">
                      <Calendar size={16} className="text-[#D4AF37]" />
                      Deadline & Requirements
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-zinc-500 font-helvetica-bold uppercase mb-2 block">Completion Deadline</label>
                        <input
                          type="datetime-local"
                          value={editingCourse.deadline ? new Date(editingCourse.deadline).toISOString().slice(0, 16) : ''}
                          onChange={e => setEditingCourse({ ...editingCourse, deadline: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                          className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3 text-white focus:border-yellow-400 outline-none"
                        />
                        <p className="text-[10px] text-zinc-500 mt-1">Leave empty for no deadline</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setEditingCourse({ ...editingCourse, isMandatory: !editingCourse.isMandatory })}
                          className={`w-12 h-6 rounded-full transition-colors relative ${editingCourse.isMandatory ? 'bg-yellow-400' : 'bg-zinc-700'
                            }`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${editingCourse.isMandatory ? 'translate-x-6' : 'translate-x-0.5'
                            }`} />
                        </button>
                        <div>
                          <span className="text-sm text-white">Mandatory Training</span>
                          <p className="text-[10px] text-zinc-500">Mark as required for all learners</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  <div className="p-4 space-y-2 overflow-y-auto flex-1">
                    {editingCourse.lessons?.map((lesson, idx) => (
                      <div
                        key={lesson.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', idx.toString());
                          e.dataTransfer.effectAllowed = 'move';
                          (e.target as HTMLElement).classList.add('dragging');
                        }}
                        onDragEnd={(e) => {
                          (e.target as HTMLElement).classList.remove('dragging');
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          (e.currentTarget as HTMLElement).classList.add('drag-over');
                        }}
                        onDragLeave={(e) => {
                          (e.currentTarget as HTMLElement).classList.remove('drag-over');
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          (e.currentTarget as HTMLElement).classList.remove('drag-over');
                          const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                          const toIndex = idx;
                          if (fromIndex !== toIndex && editingCourse?.lessons) {
                            const lessons = [...editingCourse.lessons];
                            const [movedLesson] = lessons.splice(fromIndex, 1);
                            lessons.splice(toIndex, 0, movedLesson);
                            setEditingCourse({ ...editingCourse, lessons });
                          }
                        }}
                        onClick={() => setActiveLessonId(lesson.id)}
                        className={`group p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-2 ${activeLessonId === lesson.id
                          ? 'bg-yellow-400/10 border-[#D4AF37]/50 shadow-[0_0_15px_rgba(250,204,21,0.1)]'
                          : 'bg-white/5 border-transparent hover:border-white/10'
                          }`}
                      >
                        {/* Drag Handle */}
                        <div
                          className="drag-handle p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <GripVertical size={14} />
                        </div>
                        {/* Reorder buttons (kept as alternative) */}
                        <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); moveLessonUp(idx); }}
                            disabled={idx === 0}
                            className={`p-0.5 rounded hover:bg-white/10 ${idx === 0 ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-400 hover:text-white'}`}
                          >
                            <ChevronUp size={12} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); moveLessonDown(idx); }}
                            disabled={idx === (editingCourse.lessons?.length || 0) - 1}
                            className={`p-0.5 rounded hover:bg-white/10 ${idx === (editingCourse.lessons?.length || 0) - 1 ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-400 hover:text-white'}`}
                          >
                            <ChevronDown size={12} />
                          </button>
                        </div>
                        <div className="h-6 w-6 rounded flex items-center justify-center bg-zinc-800 text-zinc-400 text-xs font-mono">{idx + 1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate text-white" title={lesson.title}>{lesson.title}</div>
                          <div className="text-[10px] text-zinc-500 uppercase flex items-center gap-1">
                            {lesson.type === 'video' && <Video size={10} />}
                            {lesson.type === 'quiz' && <HelpCircle size={10} />}
                            {(lesson.type === 'pdf' || lesson.type === 'presentation') && <FileText size={10} />}
                            {lesson.type}
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteLesson(lesson.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 border-t border-white/10 bg-zinc-900/50">
                    <div className="flex gap-2 mb-2">
                      {(['video', 'pdf', 'presentation', 'quiz'] as ContentType[]).map(type => (
                        <button
                          key={type}
                          onClick={() => setNewLessonType(type)}
                          className={`flex-1 py-1 rounded text-[10px] uppercase font-helvetica-bold transition-all ${newLessonType === type ? 'bg-yellow-400 text-black' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}
                        >
                          {type === 'presentation' ? 'PPT' : type}
                        </button>
                      ))}
                    </div>
                    <PrimaryButton onClick={addLesson} className="w-full py-2 text-sm">Add Lesson</PrimaryButton>
                  </div>
                </div>
              )}
            </div>

            {/* Main Editing Area */}
            <div className="flex-1 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-8 overflow-y-auto">
              {editorTab === 'CURRICULUM' && activeLesson ? (
                <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
                  {/* Lesson Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                        activeLesson.type === 'video' ? 'bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30' :
                        activeLesson.type === 'quiz' ? 'bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30' :
                        'bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30'
                      }`}>
                        {activeLesson.type === 'video' && <Video size={22} className="text-red-400" />}
                        {activeLesson.type === 'quiz' && <HelpCircle size={22} className="text-purple-400" />}
                        {(activeLesson.type === 'pdf' || activeLesson.type === 'presentation') && <FileText size={22} className="text-blue-400" />}
                      </div>
                      <div>
                        <span className={`text-[10px] font-helvetica-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          activeLesson.type === 'video' ? 'bg-red-500/20 text-red-400' :
                          activeLesson.type === 'quiz' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {activeLesson.type === 'presentation' ? 'PPT' : activeLesson.type.toUpperCase()}
                        </span>
                        <p className="text-[10px] text-zinc-600 font-mono mt-1">{activeLesson.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </div>

                  {/* Lesson Title */}
                  <div className="relative group">
                    <input
                      className="text-3xl font-helvetica-bold bg-transparent border-none outline-none text-white placeholder-zinc-700 w-full pb-3 border-b-2 border-transparent focus:border-b-[#D4AF37]/50 transition-colors"
                      placeholder="Lesson Title"
                      value={activeLesson.title}
                      onChange={(e) => updateLesson(activeLesson.id, { title: e.target.value })}
                    />
                    <Pencil size={16} className="absolute right-0 top-1/2 -translate-y-1/2 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Content Type Specific Editors */}

                  {/* 1. Video Editor */}
                  {activeLesson.type === 'video' && (
                    <div className="space-y-6">
                      {/* Video Source Section */}
                      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
                          <div className="flex items-center gap-2">
                            <Video size={16} className="text-[#D4AF37]" />
                            <h3 className="text-sm font-helvetica-bold text-white">Video Source</h3>
                          </div>
                          <p className="text-xs text-zinc-500 mt-1">Choose how to add your video content</p>
                        </div>

                        <div className="p-5">
                          <div className="grid grid-cols-2 gap-4">
                            {/* Option 1: URL */}
                            <div className={`rounded-xl border-2 transition-all ${activeLesson.videoUrl && !activeLesson.fileUrl ? 'border-[#D4AF37]/50 bg-[#D4AF37]/5' : 'border-white/[0.08] hover:border-white/20'}`}>
                              <div className="p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                                    <PlayCircle size={16} className="text-zinc-400" />
                                  </div>
                                  <span className="text-xs font-helvetica-bold text-zinc-300 uppercase">URL</span>
                                </div>
                                <input
                                  className="w-full bg-zinc-900/80 border border-white/10 rounded-lg px-3 py-2.5 outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 text-sm text-white placeholder-zinc-600 transition-all"
                                  placeholder="youtube.com/watch?v=..."
                                  value={activeLesson.videoUrl || ''}
                                  onChange={(e) => updateLesson(activeLesson.id, { videoUrl: e.target.value, fileUrl: undefined, fileName: undefined })}
                                />
                                <p className="text-[10px] text-zinc-600 mt-2">YouTube, Vimeo, or direct link</p>
                              </div>
                            </div>

                            {/* Option 2: Upload */}
                            <div className={`rounded-xl border-2 transition-all ${activeLesson.fileUrl ? 'border-[#D4AF37]/50 bg-[#D4AF37]/5' : 'border-white/[0.08] hover:border-white/20'}`}>
                              <div className="p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                                    <MonitorPlay size={16} className="text-zinc-400" />
                                  </div>
                                  <span className="text-xs font-helvetica-bold text-zinc-300 uppercase">Upload</span>
                                </div>
                                <FileDropZone
                                  label="Upload Video"
                                  accept="video/mp4,video/webm,video/ogg,.mp4,.webm,.ogg"
                                  currentFile={activeLesson.fileName}
                                  isUploading={uploadingId === activeLesson.id}
                                  uploadProgress={uploadingId === activeLesson.id ? uploadProgress : 0}
                                  onFileSelect={async (file) => {
                                    const lessonId = activeLesson.id;
                                    try {
                                      setUploadingId(lessonId);
                                      setUploadProgress(0);
                                      const result = await dataService.uploadFile(file, (progress) => {
                                        setUploadProgress(progress);
                                      });
                                      updateLesson(lessonId, {
                                        fileUrl: result.file.fileUrl,
                                        fileName: result.file.originalName,
                                        videoUrl: undefined
                                      });
                                      showToast('success', 'Video Uploaded', 'Your video has been uploaded successfully.');
                                    } catch (error) {
                                      console.error('Failed to upload video:', error);
                                      showToast('error', 'Upload Failed', 'Failed to upload video. Please try again.');
                                    } finally {
                                      setUploadingId(null);
                                      setUploadProgress(0);
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Duration & Settings */}
                      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-[#D4AF37]" />
                            <h3 className="text-sm font-helvetica-bold text-white">Settings</h3>
                          </div>
                        </div>
                        <div className="p-5">
                          <div className="flex items-center gap-4">
                            <div className="flex-1 max-w-[200px]">
                              <label className="block text-xs text-zinc-500 mb-2 font-helvetica-bold uppercase">Duration</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  className="w-full bg-zinc-900/80 border border-white/10 rounded-lg px-3 py-2.5 pr-12 outline-none focus:border-[#D4AF37]/50 text-white"
                                  value={activeLesson.durationMin}
                                  onChange={(e) => updateLesson(activeLesson.id, { durationMin: parseInt(e.target.value) })}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">min</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Video Preview */}
                      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
                          <div className="flex items-center gap-2">
                            <Eye size={16} className="text-[#D4AF37]" />
                            <h3 className="text-sm font-helvetica-bold text-white">Preview</h3>
                          </div>
                        </div>
                        <div className="aspect-video bg-black flex items-center justify-center text-zinc-500 overflow-hidden">
                          {activeLesson.fileUrl && activeLesson.type === 'video' ? (
                            <video
                              key={activeLesson.fileUrl}
                              controls
                              playsInline
                              crossOrigin="anonymous"
                              className="w-full h-full"
                            >
                              <source src={activeLesson.fileUrl} type="video/mp4" />
                              <source src={activeLesson.fileUrl} type="video/webm" />
                              Your browser does not support the video tag.
                            </video>
                          ) : activeLesson.videoUrl ? (
                            isYouTubeUrl(activeLesson.videoUrl) ? (
                              <iframe
                                key={activeLesson.videoUrl}
                                src={`https://www.youtube.com/embed/${getYouTubeVideoId(activeLesson.videoUrl)}`}
                                className="w-full h-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            ) : (
                              <iframe
                                key={activeLesson.videoUrl}
                                src={activeLesson.videoUrl}
                                className="w-full h-full border-0"
                                allowFullScreen
                              />
                            )
                          ) : (
                            <div className="text-center py-16">
                              <div className="w-20 h-20 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto mb-4">
                                <PlayCircle size={32} className="text-zinc-600" />
                              </div>
                              <p className="text-zinc-500 text-sm">Add a video URL or upload a file</p>
                              <p className="text-zinc-600 text-xs mt-1">Preview will appear here</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. Document (PDF/PPT) Editor */}
                  {(activeLesson.type === 'pdf' || activeLesson.type === 'presentation') && (
                    <div className="space-y-6">
                      {/* Upload Section */}
                      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
                          <div className="flex items-center gap-2">
                            {activeLesson.type === 'presentation' ? (
                              <FileSpreadsheet size={16} className="text-[#D4AF37]" />
                            ) : (
                              <FileText size={16} className="text-[#D4AF37]" />
                            )}
                            <h3 className="text-sm font-helvetica-bold text-white">
                              {activeLesson.type === 'pdf' ? 'PDF Document' : 'PowerPoint Presentation'}
                            </h3>
                          </div>
                          <p className="text-xs text-zinc-500 mt-1">Upload your document file</p>
                        </div>
                        <div className="p-5">
                          <FileDropZone
                            label={`Upload ${activeLesson.type === 'pdf' ? 'PDF' : 'PPT'}`}
                            accept={activeLesson.type === 'pdf' ? '.pdf,application/pdf' : '.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation'}
                            currentFile={activeLesson.fileName}
                            isUploading={uploadingId === activeLesson.id}
                            uploadProgress={uploadingId === activeLesson.id ? uploadProgress : 0}
                            onFileSelect={async (file) => {
                              const lessonId = activeLesson.id;
                              try {
                                setUploadingId(lessonId);
                                setUploadProgress(0);
                                const result = await dataService.uploadFile(file, (progress) => {
                                  setUploadProgress(progress);
                                });
                                updateLesson(lessonId, {
                                  fileUrl: result.file.fileUrl,
                                  fileName: result.file.originalName
                                });
                                showToast('success', 'File Uploaded', `${activeLesson.type === 'pdf' ? 'PDF document' : 'Presentation'} uploaded successfully.`);
                              } catch (error) {
                                console.error('Failed to upload file:', error);
                                showToast('error', 'Upload Failed', 'Failed to upload file. Please try again.');
                              } finally {
                                setUploadingId(null);
                                setUploadProgress(0);
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* Settings Section */}
                      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-[#D4AF37]" />
                            <h3 className="text-sm font-helvetica-bold text-white">Settings</h3>
                          </div>
                        </div>
                        <div className="p-5">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs text-zinc-500 mb-2 font-helvetica-bold uppercase">
                                Total {activeLesson.type === 'pdf' ? 'Pages' : 'Slides'}
                              </label>
                              <input
                                type="number"
                                className="w-full bg-zinc-900/80 border border-white/10 rounded-lg px-3 py-2.5 outline-none focus:border-[#D4AF37]/50 text-white"
                                value={activeLesson.pageCount || 0}
                                onChange={(e) => updateLesson(activeLesson.id, { pageCount: parseInt(e.target.value) })}
                              />
                              <p className="text-[10px] text-zinc-600 mt-2">For estimated reading time</p>
                            </div>
                            <div>
                              <label className="block text-xs text-zinc-500 mb-2 font-helvetica-bold uppercase">Est. Time</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  className="w-full bg-zinc-900/80 border border-white/10 rounded-lg px-3 py-2.5 pr-12 outline-none text-white opacity-60"
                                  value={activeLesson.durationMin}
                                  readOnly
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">min</span>
                              </div>
                              <p className="text-[10px] text-[#D4AF37] mt-2">Auto: 2 min / page</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Document Preview */}
                      {activeLesson.fileUrl && (
                        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
                          <div className="px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
                            <div className="flex items-center gap-2">
                              <Eye size={16} className="text-[#D4AF37]" />
                              <h3 className="text-sm font-helvetica-bold text-white">Document Preview</h3>
                            </div>
                          </div>
                          <div className="p-5 space-y-4">
                            {/* Inline Preview for PDFs */}
                            {activeLesson.type === 'pdf' && (
                              <div className="rounded-xl overflow-hidden border border-white/10" style={{ height: '400px' }}>
                                {(() => {
                                  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '');
                                  const fullUrl = activeLesson.fileUrl?.startsWith('http')
                                    ? activeLesson.fileUrl
                                    : `${baseUrl}${activeLesson.fileUrl}`;
                                  return (
                                    <iframe
                                      src={`${fullUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
                                      className="w-full h-full border-0 bg-zinc-900"
                                      title={activeLesson.fileName || 'PDF Preview'}
                                    />
                                  );
                                })()}
                              </div>
                            )}

                            {/* File Info Card */}
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900/50 border border-white/[0.06]">
                              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                                {activeLesson.type === 'presentation' ? (
                                  <FileSpreadsheet size={28} className="text-blue-400" />
                                ) : (
                                  <FileText size={28} className="text-blue-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-helvetica-bold text-white truncate">{activeLesson.fileName}</p>
                                <p className="text-xs text-zinc-500 mt-1">
                                  {activeLesson.type === 'presentation' ? 'PowerPoint Presentation' : 'PDF Document'}
                                  {activeLesson.pageCount ? ` • ${activeLesson.pageCount} ${activeLesson.type === 'pdf' ? 'pages' : 'slides'}` : ''}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '');
                                  const fullUrl = activeLesson.fileUrl?.startsWith('http')
                                    ? activeLesson.fileUrl
                                    : `${baseUrl}${activeLesson.fileUrl}`;
                                  window.open(fullUrl, '_blank');
                                }}
                                className="px-4 py-2.5 rounded-xl bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37] text-sm font-helvetica-bold transition-all flex items-center gap-2"
                              >
                                <ExternalLink size={16} />
                                Open
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. Quiz Editor */}
                  {activeLesson.type === 'quiz' && (
                    <div className="space-y-6">
                      {/* Passing Score Setting */}
                      <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 backdrop-blur-sm overflow-hidden">
                        <div className="px-5 py-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center">
                              <Target size={20} className="text-[#D4AF37]" />
                            </div>
                            <div>
                              <label className="text-sm font-helvetica-bold text-white block">Passing Score</label>
                              <p className="text-xs text-zinc-500">Minimum % to pass this quiz</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 bg-zinc-900/50 rounded-xl px-3 py-2 border border-white/10">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={activeLesson.passingScore || 70}
                              onChange={(e) => updateLesson(activeLesson.id, { passingScore: parseInt(e.target.value) || 70 })}
                              className="w-16 bg-transparent text-white text-center text-lg font-helvetica-bold focus:outline-none"
                            />
                            <span className="text-[#D4AF37] font-helvetica-bold">%</span>
                          </div>
                        </div>
                      </div>

                      {/* Questions */}
                      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
                          <div className="flex items-center gap-2">
                            <HelpCircle size={16} className="text-[#D4AF37]" />
                            <h3 className="text-sm font-helvetica-bold text-white">Questions</h3>
                            <span className="ml-auto text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                              {activeLesson.quiz?.length || 0} / 5
                            </span>
                          </div>
                        </div>

                        <div className="p-5 space-y-4">
                          {activeLesson.quiz?.map((q, qIdx) => (
                            <div key={q.id} className="rounded-xl border border-white/[0.08] bg-zinc-900/30 overflow-hidden group">
                              {/* Question Header */}
                              <div className="px-4 py-3 bg-zinc-900/50 border-b border-white/[0.06] flex items-center justify-between">
                                <span className="text-xs font-helvetica-bold text-purple-400 uppercase tracking-wide">
                                  Question {qIdx + 1}
                                </span>
                                <button
                                  onClick={() => {
                                    if (!confirm('Delete this question?')) return;
                                    const newQuiz = activeLesson.quiz?.filter((_, idx) => idx !== qIdx) || [];
                                    updateLesson(activeLesson.id, { quiz: newQuiz });
                                  }}
                                  className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>

                              {/* Question Content */}
                              <div className="p-4 space-y-4">
                                <input
                                  className="w-full bg-zinc-900/50 border border-white/10 rounded-lg px-3 py-2.5 outline-none focus:border-[#D4AF37]/50 text-white placeholder-zinc-600"
                                  value={q.question}
                                  placeholder="Enter your question..."
                                  onChange={(e) => {
                                    const newQuiz = [...(activeLesson.quiz || [])];
                                    newQuiz[qIdx].question = e.target.value;
                                    updateLesson(activeLesson.id, { quiz: newQuiz });
                                  }}
                                />

                                <div className="space-y-2">
                                  {q.options.map((opt, oIdx) => (
                                    <div
                                      key={oIdx}
                                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                                        q.correctAnswer === oIdx
                                          ? 'border-green-500/40 bg-green-500/10'
                                          : 'border-white/[0.06] hover:border-white/20 bg-zinc-900/30'
                                      }`}
                                      onClick={() => {
                                        const newQuiz = [...(activeLesson.quiz || [])];
                                        newQuiz[qIdx].correctAnswer = oIdx;
                                        updateLesson(activeLesson.id, { quiz: newQuiz });
                                      }}
                                    >
                                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                        q.correctAnswer === oIdx
                                          ? 'border-green-500 bg-green-500'
                                          : 'border-zinc-600'
                                      }`}>
                                        {q.correctAnswer === oIdx && (
                                          <CheckCircle size={12} className="text-white" />
                                        )}
                                      </div>
                                      <input
                                        className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 outline-none"
                                        value={opt}
                                        placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                          const newQuiz = [...(activeLesson.quiz || [])];
                                          newQuiz[qIdx].options[oIdx] = e.target.value;
                                          updateLesson(activeLesson.id, { quiz: newQuiz });
                                        }}
                                      />
                                      {q.correctAnswer === oIdx && (
                                        <span className="text-[10px] text-green-400 font-helvetica-bold uppercase">Correct</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Add Question Button */}
                          {(activeLesson.quiz?.length || 0) < 5 ? (
                            <button
                              onClick={() => {
                                const newQuiz = [...(activeLesson.quiz || []), { id: `q-${Date.now()}`, question: '', options: ['Option A', 'Option B'], correctAnswer: 0 }];
                                updateLesson(activeLesson.id, { quiz: newQuiz });
                              }}
                              className="w-full py-4 border-2 border-dashed border-white/10 rounded-xl text-zinc-500 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5 transition-all flex items-center justify-center gap-2 group"
                            >
                              <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                              <span className="font-helvetica-bold text-sm">Add Question</span>
                            </button>
                          ) : (
                            <div className="text-center py-4 text-zinc-500 text-sm bg-zinc-900/30 rounded-xl border border-white/[0.06]">
                              Maximum 5 questions reached
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                  <Layout size={64} className="mb-6 opacity-20" />
                  <h3 className="text-xl font-medium text-zinc-400">Select a lesson to edit content</h3>
                  <p className="max-w-xs text-center mt-2 opacity-60">Choose from the curriculum on the left or create a new lesson.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // --- User Management Section (Liquid Glass Design) ---
    const UserManagementSection = () => {
      const filteredUsers = allUsers.filter(u => {
        const matchesSearch = userSearchQuery === '' ||
          u.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
          u.email?.toLowerCase().includes(userSearchQuery.toLowerCase());
        const matchesRole = userFilterRole === 'ALL' || u.role === userFilterRole;
        return matchesSearch && matchesRole;
      });

      return (
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h2 className="text-3xl font-helvetica-bold">User Management</h2>
              <p className="text-zinc-400 mt-1">Approve, manage, and monitor user accounts</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                <Users size={16} className="text-zinc-500" />
                <span className="text-white font-medium">{allUsers.length}</span>
                <span className="text-zinc-500">total users</span>
              </div>
            </div>
          </div>

          {/* Pending Approvals - Liquid Glass Card */}
          {pendingUsers.length > 0 && (
            <div className="relative group">
              {/* Outer glow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500/20 via-yellow-400/10 to-yellow-500/20 rounded-[28px] blur-xl opacity-60 group-hover:opacity-100 transition-all duration-700" />

              <div className="relative rounded-3xl overflow-hidden backdrop-blur-2xl bg-gradient-to-br from-yellow-900/20 via-black/40 to-black/60 border border-yellow-500/30 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] p-8">
                {/* Inner highlight */}
                <div className="absolute inset-0 bg-gradient-to-b from-yellow-400/5 via-transparent to-transparent pointer-events-none" />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400/30 to-yellow-500/10 border border-yellow-400/40 flex items-center justify-center shadow-[0_0_30px_rgba(250,204,21,0.2)]">
                        <Clock size={28} className="text-[#D4AF37] drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-helvetica-bold text-white">Pending Approvals</h3>
                        <p className="text-sm text-[#D4AF37]/80">{pendingUsers.length} user{pendingUsers.length > 1 ? 's' : ''} awaiting your review</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {pendingUsers.map((pendingUser, idx) => (
                      <div
                        key={pendingUser.id}
                        className="group/card relative overflow-hidden rounded-2xl bg-gradient-to-r from-white/[0.06] to-white/[0.02] border border-white/10 hover:border-[#D4AF37]/50 transition-all duration-500 p-5"
                        style={{ animationDelay: `${idx * 100}ms` }}
                      >
                        {/* Hover glow effect */}
                        <div className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500">
                          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/5 via-transparent to-transparent" />
                        </div>

                        <div className="relative z-10 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 border border-white/10 flex items-center justify-center font-helvetica-bold text-lg text-white shadow-lg">
                              {pendingUser.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-helvetica-bold text-white text-lg">{pendingUser.name}</div>
                              <div className="text-sm text-zinc-400">{pendingUser.email}</div>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-zinc-500">{pendingUser.ministry}</span>
                                <span className="w-1 h-1 rounded-full bg-zinc-600" />
                                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-zinc-400">{pendingUser.role}</span>
                                <span className="w-1 h-1 rounded-full bg-zinc-600" />
                                <span className="text-xs text-zinc-500">{new Date(pendingUser.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleApproveUser(pendingUser.id)}
                              disabled={processingUser === pendingUser.id}
                              className="group/btn relative px-6 py-3 rounded-xl bg-gradient-to-r from-green-500/20 to-green-600/10 border border-green-500/30 text-green-400 hover:border-green-400/50 hover:shadow-[0_0_20px_rgba(34,197,94,0.2)] transition-all duration-300 flex items-center gap-2 font-medium disabled:opacity-50"
                            >
                              {processingUser === pendingUser.id ? (
                                <Loader2 size={18} className="animate-spin" />
                              ) : (
                                <UserCheck size={18} />
                              )}
                              <span className="hidden sm:inline">Approve</span>
                            </button>

                            <button
                              onClick={() => handleRejectUser(pendingUser.id)}
                              disabled={processingUser === pendingUser.id}
                              className="group/btn relative px-6 py-3 rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/10 border border-red-500/30 text-red-400 hover:border-red-400/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] transition-all duration-300 flex items-center gap-2 font-medium disabled:opacity-50"
                            >
                              <UserX size={18} />
                              <span className="hidden sm:inline">Reject</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No Pending Users - Clean State */}
          {pendingUsers.length === 0 && !loadingPending && (
            <GlassCard className="text-center py-12">
              <div className="w-20 h-20 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={40} className="text-green-400" />
              </div>
              <h3 className="text-xl font-helvetica-bold text-white mb-2">All Caught Up!</h3>
              <p className="text-zinc-400">No pending user approvals at this time.</p>
            </GlassCard>
          )}

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-4 pl-12 text-white focus:ring-2 focus:ring-yellow-400/50 outline-none transition-all placeholder-zinc-600"
              />
              <Users size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            </div>
            <div className="flex gap-2">
              {['ALL', 'LEARNER', 'SUPERUSER', 'ADMIN'].map(role => (
                <button
                  key={role}
                  onClick={() => setUserFilterRole(role)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${userFilterRole === role
                    ? 'bg-yellow-400 text-black'
                    : 'bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10'
                    }`}
                >
                  {role === 'ALL' ? 'All Users' : role}
                </button>
              ))}
            </div>
          </div>

          {/* All Users List */}
          <GlassCard className="p-0 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <h3 className="text-lg font-helvetica-bold">All Users ({filteredUsers.length})</h3>
            </div>

            {loadingUsers ? (
              <div className="p-12 text-center">
                <Loader2 size={32} className="animate-spin text-[#D4AF37] mx-auto" />
                <p className="text-zinc-500 mt-4">Loading users...</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredUsers.map(u => (
                  <div key={u.id} className="p-4 hover:bg-white/[0.02] transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-helvetica-bold ${u.is_approved ? 'bg-yellow-400 text-black' : 'bg-zinc-700 text-zinc-400'
                        }`}>
                        {u.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="font-medium text-white flex items-center gap-2">
                          {u.name}
                          {!u.is_approved && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-400/20 text-[#D4AF37]">PENDING</span>
                          )}
                          {!u.is_active && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-400/20 text-red-400">INACTIVE</span>
                          )}
                        </div>
                        <div className="text-sm text-zinc-500">{u.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden md:block">
                        <div className="text-sm text-zinc-400">{u.ministry}</div>
                        <div className="text-xs text-zinc-600">{u.role}</div>
                      </div>
                      <Badge type={u.is_approved ? 'success' : 'warning'}>{u.is_approved ? 'Active' : 'Pending'}</Badge>
                    </div>
                  </div>
                ))}

                {filteredUsers.length === 0 && (
                  <div className="p-12 text-center text-zinc-500">
                    No users found matching your criteria.
                  </div>
                )}
              </div>
            )}
          </GlassCard>
        </div>
      );
    };

    // --- Main Admin Dashboard ---
    return (
      <div className={`md:ml-64 h-screen overflow-y-auto relative z-10 liquid-scroll transition-colors duration-700 bg-transparent`}>
        <div className={`p-6 md:p-10 max-w-7xl mx-auto space-y-8 pb-20 relative z-[60]`}>

          <PageTransition viewKey={adminSection}>
            {adminSection === 'USERS' && <UserManagementSection />}

            {adminSection === 'OVERVIEW' && (
              <div className="space-y-8">
                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-3xl font-helvetica-bold">Admin Command Center</h2>
                    <p className="text-zinc-400 mt-1">Overview of academy performance and content</p>
                  </div>
                  <PrimaryButton onClick={handleCreateCourse} className="text-sm shadow-lg shadow-yellow-400/20">
                    <Plus size={18} /> New Course
                  </PrimaryButton>
                </div>

                {/* KPI Cards - Glass Effect - Real Data */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <GlassCard className="relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Users size={64} /></div>
                    <div className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2">Total Learners</div>
                    <div className="text-4xl font-helvetica-bold text-white mb-1">{fullStats?.totalLearners?.toLocaleString() || '—'}</div>
                    <div className="text-[#D4AF37] text-xs flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div> {fullStats?.totalEnrollments || 0} enrollments</div>
                  </GlassCard>
                  <GlassCard className="relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><BookOpen size={64} /></div>
                    <div className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2">Content Library</div>
                    <div className="text-4xl font-helvetica-bold text-white mb-1">{fullStats?.totalLessons || totalLessons}</div>
                    <div className="text-zinc-400 text-xs">Across {fullStats?.totalCourses || courses.length} courses</div>
                  </GlassCard>
                  <GlassCard className="relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><CheckCircle size={64} /></div>
                    <div className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2">Completion Rate</div>
                    <div className="text-4xl font-helvetica-bold text-white mb-1">{fullStats?.completionRate ?? '—'}%</div>
                    <div className="text-[#D4AF37] text-xs">Avg. per enrollment</div>
                  </GlassCard>
                  <GlassCard className="relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Target size={64} /></div>
                    <div className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2">Quiz Pass Rate</div>
                    <div className="text-4xl font-helvetica-bold text-white mb-1">{fullStats?.quizPassRate ?? '—'}%</div>
                    <div className="text-zinc-400 text-xs">Avg score: {fullStats?.averageQuizScore ?? '—'}%</div>
                  </GlassCard>
                </div>

                {/* Second Row KPIs - Study Hours & Overdue */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GlassCard className="relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><MonitorPlay size={64} /></div>
                    <div className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2">Total Study Hours</div>
                    <div className="text-4xl font-helvetica-bold text-white mb-1">{fullStats?.totalStudyHours ? (fullStats.totalStudyHours >= 1000 ? `${(fullStats.totalStudyHours / 1000).toFixed(1)}k` : fullStats.totalStudyHours) : '—'}</div>
                    <div className="text-white text-xs">Total learning time logged</div>
                  </GlassCard>
                  <GlassCard className={`relative overflow-hidden group ${(fullStats?.overdueEnrollments || 0) > 0 ? 'border-red-500/30' : ''}`}>
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><AlertTriangle size={64} /></div>
                    <div className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2">Overdue Enrollments</div>
                    <div className={`text-4xl font-helvetica-bold mb-1 ${(fullStats?.overdueEnrollments || 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {fullStats?.overdueEnrollments ?? 0}
                    </div>
                    <div className={`text-xs ${(fullStats?.overdueEnrollments || 0) > 0 ? 'text-red-400/80' : 'text-green-400/80'}`}>
                      {(fullStats?.overdueEnrollments || 0) > 0 ? 'Learners past deadline' : 'All on track'}
                    </div>
                  </GlassCard>
                </div>

                {/* URGENT: Pending Users Alert - Hyper Visible Liquid Glass */}
                {pendingUsers.length > 0 && (
                  <div className="relative group cursor-pointer" onClick={() => setAdminSection('USERS')}>
                    {/* Animated outer glow */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-red-500/40 via-yellow-500/30 to-red-500/40 rounded-[28px] blur-xl opacity-80 animate-pulse" />
                    <div className="absolute -inset-0.5 bg-gradient-to-br from-red-400/20 via-transparent to-yellow-400/20 rounded-[26px] blur-md" />

                    <div className="relative rounded-3xl overflow-hidden backdrop-blur-2xl bg-gradient-to-br from-red-900/30 via-black/60 to-yellow-900/20 border-2 border-red-500/50 shadow-[0_8px_32px_rgba(239,68,68,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] p-6 hover:border-yellow-400/60 transition-all duration-500">
                      {/* Inner highlight */}
                      <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-transparent pointer-events-none" />

                      {/* Pulsing alert indicator */}
                      <div className="absolute top-4 right-4">
                        <span className="relative flex h-4 w-4">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                        </span>
                      </div>

                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/30 to-yellow-500/20 border border-red-400/50 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                            <UserCheck size={32} className="text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/30 text-red-400 font-helvetica-bold uppercase tracking-wider animate-pulse">Action Required</span>
                            </div>
                            <h3 className="text-2xl font-helvetica-bold text-white">{pendingUsers.length} Pending User{pendingUsers.length > 1 ? 's' : ''}</h3>
                            <p className="text-sm text-zinc-400 mt-1">Click here to approve or reject registration requests</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="hidden md:flex flex-col items-end text-right">
                            <span className="text-xs text-zinc-500">Oldest</span>
                            <span className="text-sm text-white font-medium">{pendingUsers.length > 0 ? new Date(pendingUsers[0].created_at).toLocaleDateString('fr-FR') : '-'}</span>
                          </div>
                          <div className="w-12 h-12 rounded-xl bg-yellow-400/20 border border-[#D4AF37]/50 flex items-center justify-center group-hover:bg-yellow-400/30 transition-all">
                            <ChevronRight size={24} className="text-[#D4AF37] group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Overdue Learners Alert */}
                {overdueLearners.length > 0 && (
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500/20 via-red-500/20 to-orange-500/20 rounded-[26px] blur-md opacity-60" />
                    <div className="relative rounded-2xl overflow-hidden backdrop-blur-xl bg-gradient-to-br from-orange-900/20 via-black/40 to-red-900/10 border border-orange-500/30 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/30 to-orange-500/20 border border-red-400/40 flex items-center justify-center">
                            <AlertTriangle size={24} className="text-red-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-helvetica-bold text-white">{overdueLearners.length} Overdue Enrollment{overdueLearners.length > 1 ? 's' : ''}</h3>
                            <p className="text-sm text-zinc-400">Learners past their training deadline</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 text-xs rounded-full bg-red-500/20 text-red-400 font-medium border border-red-500/30">
                          Requires Attention
                        </span>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {overdueLearners.slice(0, 5).map((learner, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/10 flex items-center justify-center text-xs font-helvetica-bold text-red-400">
                                {learner.daysOverdue}d
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">{learner.name}</p>
                                <p className="text-xs text-zinc-500">{learner.courseTitle}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-zinc-400">{learner.ministry}</p>
                              {learner.isMandatory && (
                                <span className="text-xs text-red-400">Mandatory</span>
                              )}
                            </div>
                          </div>
                        ))}
                        {overdueLearners.length > 5 && (
                          <p className="text-center text-sm text-zinc-500 pt-2">
                            + {overdueLearners.length - 5} more overdue
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Analytics Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <GlassCard className="lg:col-span-2 p-8">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-helvetica-bold">Ministry Engagement</h3>
                      <div className="flex gap-2">
                        <button className="px-3 py-1 text-xs rounded-full bg-white/10 text-white">Weekly</button>
                        <button className="px-3 py-1 text-xs rounded-full hover:bg-white/5 text-zinc-400">Monthly</button>
                      </div>
                    </div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={adminStats} barSize={40}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis stroke="#64748b" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip
                            cursor={{ fill: '#ffffff05' }}
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                            itemStyle={{ color: '#fff' }}
                          />
                          <Bar dataKey="value" radius={[8, 8, 8, 8]}>
                            {adminStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#FACC15', '#CA8A04', '#FEF08A', '#713F12'][index % 4]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-8">
                    <h3 className="text-xl font-helvetica-bold mb-6">Content Types</h3>
                    <div className="h-64 w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Video', value: 45, fill: '#FACC15' },
                              { name: 'Reading', value: 30, fill: '#FFFFFF' },
                              { name: 'Quizzes', value: 25, fill: '#A16207' },
                            ]}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            <Cell fill="#FACC15" />
                            <Cell fill="#FFFFFF" />
                            <Cell fill="#A16207" />
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                        <span className="text-3xl font-helvetica-bold text-white">100%</span>
                        <span className="text-xs text-zinc-400">Balanced</span>
                      </div>
                    </div>
                    <div className="flex justify-center gap-4 text-xs">
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400"></div> Video</div>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-white"></div> Docs</div>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-700"></div> Quiz</div>
                    </div>
                  </GlassCard>
                </div>

                {/* Manage Courses (Enhanced List) */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-helvetica-bold">Manage Courses</h3>
                    <span className="text-sm text-zinc-400">
                      {courses.length} course{courses.length !== 1 ? 's' : ''} total
                    </span>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {courses.map(course => {
                      const levelColor = course.level === 'Beginner' ? 'green' : course.level === 'Intermediate' ? 'yellow' : 'purple';
                      return (
                        <div key={course.id} className="group relative rounded-2xl transition-all duration-500 hover:scale-[1.01] hover:-translate-y-1">
                          {/* Ambient Glow */}
                          <div className={`absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl ${course.level === 'Beginner' ? 'bg-green-500/20' :
                            course.level === 'Intermediate' ? 'bg-yellow-500/20' :
                              'bg-purple-500/20'
                            }`}></div>

                          <div className="relative glass-panel rounded-2xl border border-white/10 group-hover:border-white/20 overflow-hidden backdrop-blur-xl bg-zinc-900/80 flex flex-col sm:flex-row h-full">
                            {/* Thumbnail */}
                            <div className="w-full sm:w-48 h-32 sm:h-auto relative overflow-hidden shrink-0">
                              <img
                                src={course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800'}
                                alt={course.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 via-transparent to-transparent"></div>
                              <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-helvetica-bold backdrop-blur-md ${course.level === 'Beginner' ? 'bg-green-500/30 text-green-300 border border-green-500/50' :
                                course.level === 'Intermediate' ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50' :
                                  'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                                }`}>{course.level}</div>
                            </div>

                            {/* Content */}
                            <div className="p-4 flex-1 flex flex-col justify-between min-w-0">
                              <div>
                                <h4 className="text-base font-helvetica-bold text-white mb-1 group-hover:text-[#D4AF37] transition-colors line-clamp-1">{course.title}</h4>
                                <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed mb-3">{course.description || 'No description provided for this module.'}</p>
                                <div className="flex gap-3 text-[10px]">
                                  <span className="flex items-center gap-1.5 text-zinc-400"><List size={12} className="text-zinc-600" /> {course.lessons.length} Modules</span>
                                  <span className="flex items-center gap-1.5 text-zinc-400"><Users size={12} className="text-zinc-600" /> {course.enrolledCount} Enrolled</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                                <PrimaryButton
                                  onClick={() => handleEditCourse(course)}
                                  className="flex-1 h-8 !py-0 !px-3 !text-[11px] !rounded-xl shadow-lg shadow-yellow-400/10"
                                >
                                  <Pencil size={12} /> Edit Module
                                </PrimaryButton>
                                <button
                                  onClick={() => deleteCourse(course.id)}
                                  className="h-8 w-8 flex items-center justify-center rounded-xl border border-red-500/20 text-red-500/60 hover:bg-red-500 hover:text-white hover:border-red-500 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all shrink-0"
                                  title="Delete Course"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {adminSection === 'COURSES' && (
              <div className="space-y-8">
                <div className={`flex justify-between items-end mb-8 transition-all duration-700 ${draggedCourseId ? 'opacity-20 blur-sm pointer-events-none' : 'opacity-100'}`}>
                  <div>
                    <h2 className="text-3xl font-helvetica-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">Course Manager</h2>
                    <p className="text-zinc-400 mt-2 flex items-center gap-4">
                      <span>{courses.length} course{courses.length !== 1 ? 's' : ''}</span>
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400"></span><span className="text-green-400">{courses.filter(c => c.level === 'Beginner').length}</span> Beginner</span>
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400"></span><span className="text-[#D4AF37]">{courses.filter(c => c.level === 'Intermediate').length}</span> Intermediate</span>
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-400"></span><span className="text-purple-400">{courses.filter(c => c.level === 'Advanced').length}</span> Advanced</span>
                    </p>
                  </div>
                  <PrimaryButton onClick={handleCreateCourse} className="text-sm shadow-lg shadow-yellow-400/20">
                    <Plus size={18} /> New Course
                  </PrimaryButton>
                </div>

                <div className="space-y-12">
                  {(['Beginner', 'Intermediate', 'Advanced'] as const).map(level => {
                    const levelCourses = courses.filter(c => c.level === level).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
                    if (levelCourses.length === 0) return null;

                    return (
                      <div key={level} className="space-y-6">
                        <div className="flex items-center gap-4">
                          <div className={`px-4 py-1.5 rounded-full text-sm font-helvetica-bold ${
                            level === 'Beginner' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            level === 'Intermediate' ? 'bg-yellow-500/20 text-[#D4AF37] border border-yellow-500/30' :
                            'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          }`}>{level}</div>
                          <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                          <span className="text-sm text-zinc-500 font-medium">{levelCourses.length} course{levelCourses.length > 1 ? 's' : ''} • Drag to reorder</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                          {levelCourses.map((course, index) => (
                            <div
                              key={course.id}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('courseId', course.id);
                                e.dataTransfer.setData('level', level);
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.currentTarget.style.outline = '2px solid #D4AF37';
                              }}
                              onDragLeave={(e) => {
                                e.currentTarget.style.outline = 'none';
                              }}
                              onDrop={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.currentTarget.style.outline = 'none';

                                // Blur any focused element to prevent focus-scroll
                                if (document.activeElement instanceof HTMLElement) {
                                  document.activeElement.blur();
                                }

                                const draggedId = e.dataTransfer.getData('courseId');
                                const draggedLevel = e.dataTransfer.getData('level');

                                if (!draggedId || draggedId === course.id || draggedLevel !== level) return;

                                // Get fresh data from courses state
                                const currentLevelCourses = courses.filter(c => c.level === level).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
                                const fromIndex = currentLevelCourses.findIndex(c => c.id === draggedId);
                                const toIndex = currentLevelCourses.findIndex(c => c.id === course.id);

                                if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

                                // Preserve scroll position
                                const scrollY = window.scrollY;
                                const scrollX = window.scrollX;

                                // Reorder
                                const reordered = [...currentLevelCourses];
                                const [moved] = reordered.splice(fromIndex, 1);
                                reordered.splice(toIndex, 0, moved);

                                // Update orderIndex
                                const updated = reordered.map((c, i) => ({ ...c, orderIndex: i }));
                                const otherCourses = courses.filter(c => c.level !== level);
                                setCourses(sortCourses([...otherCourses, ...updated]));

                                // Restore scroll position with multiple attempts
                                const restoreScroll = () => window.scrollTo(scrollX, scrollY);
                                restoreScroll();
                                requestAnimationFrame(restoreScroll);
                                setTimeout(restoreScroll, 0);
                                setTimeout(restoreScroll, 50);

                                // Sync to backend (don't await to keep UI responsive)
                                dataService.reorderCourses(level, updated.map(c => c.id)).catch(err => {
                                  console.error('Reorder failed:', err);
                                });
                              }}
                              className="group relative rounded-2xl cursor-grab active:cursor-grabbing"
                            >
                              <div className="relative rounded-2xl border border-white/10 hover:border-white/25 overflow-hidden bg-zinc-900/90">
                                <div className="relative aspect-video overflow-hidden">
                                  <img
                                    src={course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800'}
                                    alt={course.title}
                                    className="w-full h-full object-cover pointer-events-none"
                                    draggable={false}
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent pointer-events-none" />
                                  <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-sm font-helvetica-bold text-white">
                                    {index + 1}
                                  </div>
                                  <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-helvetica-bold ${
                                    level === 'Beginner' ? 'bg-green-500/30 text-green-300 border border-green-500/50' :
                                    level === 'Intermediate' ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50' :
                                    'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                                  }`}>{level}</div>
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="p-4 rounded-full bg-[#D4AF37] text-black">
                                      <GripVertical size={28} />
                                    </div>
                                  </div>
                                </div>
                                <div className="p-5">
                                  <h4 className="text-lg font-helvetica-bold text-white mb-2 line-clamp-1">{course.title}</h4>
                                  <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{course.description || 'No description'}</p>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleEditCourse(course)}
                                      draggable={false}
                                      className="flex-1 py-2.5 px-4 rounded-xl bg-[#D4AF37] text-black text-sm font-helvetica-bold hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2"
                                    >
                                      <Pencil size={14} /> Edit
                                    </button>
                                    <button
                                      onClick={() => deleteCourse(course.id)}
                                      draggable={false}
                                      className="p-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}


            {adminSection === 'ANALYTICS' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-helvetica-bold">Analytics Dashboard</h2>
                  <p className="text-zinc-400 mt-1">Detailed insights into platform engagement</p>
                </div>

                {/* Ministry Progress Tracking - Enhanced with per-course breakdown */}
                <GlassCard className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-helvetica-bold">Ministry Training Progress</h3>
                    {selectedMinistry && (
                      <button
                        onClick={() => setSelectedMinistry(null)}
                        className="text-sm text-[#D4AF37] hover:text-yellow-300 flex items-center gap-1"
                      >
                        <ArrowLeft size={14} /> Back to all ministries
                      </button>
                    )}
                  </div>

                  {!selectedMinistry ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {ministryStats.length > 0 ? ministryStats.map((ministry, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedMinistry(ministry.name)}
                          className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-[#D4AF37]/50 hover:bg-white/10 transition-all text-left group"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="text-sm font-medium text-white truncate group-hover:text-[#D4AF37] transition-colors">{ministry.name}</div>
                            <div className="flex gap-2">
                              {ministry.overdueCount > 0 && (
                                <Badge type="default" className="!bg-red-500/20 !text-red-400 !border-red-500/30">
                                  {ministry.overdueCount} overdue
                                </Badge>
                              )}
                              <Badge type={ministry.activeLearners > 0 ? 'success' : 'default'}>
                                {ministry.activeLearners} active
                              </Badge>
                            </div>
                          </div>
                          <div className="text-2xl font-helvetica-bold text-[#D4AF37] mb-1">{ministry.totalLearners}</div>
                          <div className="text-xs text-zinc-500 mb-3">learners enrolled</div>
                          <div className="flex justify-between text-xs text-zinc-400 mb-1">
                            <span>Courses Completed</span>
                            <span className="text-white">{ministry.coursesCompleted}</span>
                          </div>
                          <div className="flex justify-between text-xs text-zinc-400 mb-1">
                            <span>Avg Quiz Score</span>
                            <span className="text-white">{ministry.avgQuizScore || 0}%</span>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#D4AF37] rounded-full"
                              style={{ width: `${ministry.totalLearners > 0 ? Math.min(100, (ministry.coursesCompleted / ministry.totalLearners) * 100) : 0}%` }}
                            />
                          </div>
                          <div className="text-xs text-zinc-500 mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            Click to view course breakdown <ChevronRight size={12} />
                          </div>
                        </button>
                      )) : (
                        <div className="col-span-3 text-center text-zinc-500 py-8">No ministry data available yet</div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-lg font-medium text-white mb-4">
                        {selectedMinistry} - Per-Course Breakdown
                      </div>
                      {ministryCourseStats.length > 0 ? (
                        <div className="space-y-3">
                          {ministryCourseStats.map((stat, idx) => (
                            <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <div className="font-medium text-white">{stat.courseTitle}</div>
                                  <div className="text-xs text-zinc-500">{stat.enrolledCount} enrolled</div>
                                </div>
                                <div className="flex gap-2">
                                  {stat.overdueCount > 0 && (
                                    <Badge type="default" className="!bg-red-500/20 !text-red-400 !border-red-500/30">
                                      {stat.overdueCount} overdue
                                    </Badge>
                                  )}
                                  <Badge type="success">{stat.completionRate}% complete</Badge>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                  <div className="text-lg font-helvetica-bold text-green-400">{stat.completedCount}</div>
                                  <div className="text-xs text-zinc-500">Completed</div>
                                </div>
                                <div>
                                  <div className="text-lg font-helvetica-bold text-[#D4AF37]">{stat.enrolledCount - stat.completedCount}</div>
                                  <div className="text-xs text-zinc-500">In Progress</div>
                                </div>
                                <div>
                                  <div className="text-lg font-helvetica-bold text-white">{stat.avgScore}%</div>
                                  <div className="text-xs text-zinc-500">Avg Score</div>
                                </div>
                              </div>
                              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-3">
                                <div
                                  className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full"
                                  style={{ width: `${stat.completionRate}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-zinc-500 py-8">No course data available for this ministry</div>
                      )}
                    </div>
                  )}
                </GlassCard>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <GlassCard className="lg:col-span-2 p-8">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-helvetica-bold">Ministry Engagement</h3>
                    </div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ministryStats.length > 0 ? ministryStats.map(m => ({ name: m.name?.split(' ').pop() || m.name, value: m.totalLearners })) : adminStats} barSize={40}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis stroke="#64748b" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip
                            cursor={{ fill: '#ffffff05' }}
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                            itemStyle={{ color: '#fff' }}
                          />
                          <Bar dataKey="value" radius={[8, 8, 8, 8]}>
                            {(ministryStats.length > 0 ? ministryStats : adminStats).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#FACC15', '#CA8A04', '#FEF08A', '#713F12'][index % 4]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-8">
                    <h3 className="text-xl font-helvetica-bold mb-6">Content Types</h3>
                    <div className="h-64 w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={contentStats.length > 0 ? contentStats : [
                              { name: 'Video', value: 45 },
                              { name: 'Pdf', value: 30 },
                              { name: 'Quiz', value: 25 },
                            ]}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {(contentStats.length > 0 ? contentStats : [1, 2, 3]).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={['#FACC15', '#FFFFFF', '#A16207', '#FEF08A'][index % 4]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                        <span className="text-3xl font-helvetica-bold text-white">{fullStats?.totalLessons || '—'}</span>
                        <span className="text-xs text-zinc-400">Total Lessons</span>
                      </div>
                    </div>
                    <div className="flex justify-center gap-4 text-xs flex-wrap">
                      {contentStats.length > 0 ? contentStats.map((c, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#FACC15', '#FFFFFF', '#A16207', '#FEF08A'][idx % 4] }}></div>
                          {c.name} ({c.count || c.value})
                        </div>
                      )) : (
                        <>
                          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400"></div> Video</div>
                          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-white"></div> Docs</div>
                          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-700"></div> Quiz</div>
                        </>
                      )}
                    </div>
                  </GlassCard>
                </div>
              </div>
            )}
          </PageTransition>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="font-helvetica text-slate-50 min-h-screen flex items-center justify-center bg-[#0a0a0b]">
        <Loader2 className="animate-spin text-[#D4AF37]" size={48} />
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className={`font-helvetica text-slate-50 selection:bg-yellow-400/30 ${currentView === 'LANDING' || currentView === 'AUTH' ? 'min-h-screen' : 'h-screen overflow-hidden'} bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900`}>
        <LiquidBackground />

        {/* Sidebar for authenticated views except player */}
        {(currentView === 'DASHBOARD' || currentView === 'ADMIN' || currentView === 'AI_GUIDE') && <Sidebar />}

        {/* Main Content Router */}
        <main className={`${currentView === 'LANDING' || currentView === 'AUTH' ? 'min-h-screen' : 'h-screen overflow-hidden'} relative`}>
          {currentView === 'LANDING' && <LandingView />}
          {currentView === 'AUTH' && <AuthView />}
          {currentView === 'DASHBOARD' && <DashboardView />}
          {currentView === 'COURSE_PLAYER' && <PlayerView />}
          {currentView === 'ADMIN' && <AdminView />}
          {currentView === 'AI_GUIDE' && <AIGuideView />}
        </main>

        {/* Isle AI Chatbot Floating Button - Hidden on landing and auth pages */}
        {currentView !== 'LANDING' && currentView !== 'AUTH' && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1, type: 'spring', stiffness: 200 }}
            onClick={() => setIsChatbotOpen(true)}
            className="fixed bottom-6 right-6 z-40 group"
          >
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              {/* Button */}
              <div className="relative w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform cursor-pointer">
                <Sparkles className="text-white" size={24} />
              </div>
              {/* Tooltip */}
              <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-zinc-800 rounded-lg text-sm text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
                Isle AI Concierge
                <div className="absolute top-full right-4 w-2 h-2 bg-zinc-800 rotate-45 -mt-1" />
              </div>
            </div>
          </motion.button>
        )}

        {/* Chatbot Panel - Hidden on landing and auth pages */}
        {currentView !== 'LANDING' && currentView !== 'AUTH' && (
          <AnimatePresence>
            {isChatbotOpen && (
              <ChatbotPanel
                isOpen={isChatbotOpen}
                onClose={() => setIsChatbotOpen(false)}
              />
            )}
          </AnimatePresence>
        )}

        {/* Knowledge Admin Button (Admin only) */}
        {user?.role === 'ADMIN' && !isChatbotOpen && !isKnowledgeAdminOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.2, type: 'spring', stiffness: 200 }}
            onClick={() => setIsKnowledgeAdminOpen(true)}
            className="fixed bottom-6 right-24 z-40 group"
          >
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              {/* Button */}
              <div className="relative w-12 h-12 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform cursor-pointer">
                <Layers className="text-white" size={20} />
              </div>
              {/* Tooltip */}
              <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-zinc-800 rounded-lg text-sm text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
                Knowledge Admin
                <div className="absolute top-full right-4 w-2 h-2 bg-zinc-800 rotate-45 -mt-1" />
              </div>
            </div>
          </motion.button>
        )}

        {/* Knowledge Admin Panel */}
        <AnimatePresence>
          {isKnowledgeAdminOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
            >
              <KnowledgeAdmin onClose={() => setIsKnowledgeAdminOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastProvider>
  );
};

export default App;