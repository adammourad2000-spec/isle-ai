import React, { useRef, useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Upload, FileText, X, Download, Lock, Check, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';

// ============================================
// TOAST NOTIFICATION SYSTEM
// ============================================
type ToastType = 'success' | 'error' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const styles = {
    success: {
      background: 'rgba(48, 209, 88, 0.12)',
      border: 'rgba(48, 209, 88, 0.25)',
      glow: '0 0 32px rgba(48, 209, 88, 0.15)',
      iconColor: '#30D158',
      icon: <CheckCircle size={20} />,
    },
    error: {
      background: 'rgba(255, 69, 58, 0.12)',
      border: 'rgba(255, 69, 58, 0.25)',
      glow: '0 0 32px rgba(255, 69, 58, 0.15)',
      iconColor: '#FF453A',
      icon: <AlertCircle size={20} />,
    },
    warning: {
      background: 'rgba(255, 159, 10, 0.12)',
      border: 'rgba(255, 159, 10, 0.25)',
      glow: '0 0 32px rgba(255, 159, 10, 0.15)',
      iconColor: '#FF9F0A',
      icon: <AlertTriangle size={20} />,
    }
  };

  const style = styles[toast.type];

  return (
    <div
      className="relative overflow-hidden flex items-start gap-3 min-w-[340px] max-w-[440px] p-4 rounded-2xl animate-ios-spring"
      style={{
        background: style.background,
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        border: `1px solid ${style.border}`,
        boxShadow: `
          inset 0 0 0 0.5px rgba(255, 255, 255, 0.1),
          inset 0 1px 0 0 rgba(255, 255, 255, 0.08),
          ${style.glow},
          0 24px 48px -12px rgba(0, 0, 0, 0.4)
        `,
      }}
    >
      {/* iOS-style top highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

      <div className="flex-shrink-0 mt-0.5 relative z-10" style={{ color: style.iconColor }}>
        {style.icon}
      </div>
      <div className="flex-1 min-w-0 relative z-10">
        <p className="font-sf-semibold text-sm" style={{ color: style.iconColor }}>{toast.title}</p>
        <p className="text-sm text-white/70 mt-0.5 leading-relaxed">{toast.message}</p>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 p-1.5 rounded-xl relative z-10 active:scale-95"
        style={{
          color: 'rgba(255, 255, 255, 0.5)',
          background: 'rgba(255, 255, 255, 0.06)',
          transition: 'all 0.2s cubic-bezier(0.28, 0.11, 0.32, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container - Fixed position at top right */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const GlassCard: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void; disabled?: boolean; variant?: 'default' | 'elevated' | 'thin' }> = ({ children, className = '', onClick, disabled, variant = 'default' }) => {
  const variants = {
    default: 'glass-panel',
    elevated: 'glass-elevated',
    thin: 'glass-thin'
  };

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`
        ${variants[variant]} relative rounded-[28px] p-6 overflow-hidden
        transition-all duration-300
        ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}
        ${onClick && !disabled ? 'cursor-pointer card-lift' : ''}
        ${className}
      `}
      style={{
        transitionTimingFunction: 'cubic-bezier(0.28, 0.11, 0.32, 1)'
      }}
    >
      {/* iOS-style top highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      {/* Vibrancy inner glow */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/[0.04] via-white/[0.01] to-transparent pointer-events-none" />

      {/* Subtle edge highlights */}
      <div className="absolute left-0 top-4 bottom-4 w-px bg-gradient-to-b from-transparent via-white/[0.08] to-transparent pointer-events-none" />
      <div className="absolute right-0 top-4 bottom-4 w-px bg-gradient-to-b from-transparent via-white/[0.05] to-transparent pointer-events-none" />

      <div className="relative z-10">{children}</div>
    </div>
  );
};

// Primary Button - iOS Blue Gradient with liquid glass feel
export const PrimaryButton: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string; disabled?: boolean; size?: 'sm' | 'md' | 'lg' }> = ({ children, onClick, className = '', disabled, size = 'md' }) => {
  const sizes = {
    sm: 'px-5 py-2 text-sm rounded-xl',
    md: 'px-7 py-3 text-base rounded-2xl',
    lg: 'px-9 py-4 text-lg rounded-2xl'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative group overflow-hidden font-sf-semibold text-white
        ${sizes[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.97]'}
        ${className}
      `}
      style={{
        background: disabled
          ? 'linear-gradient(180deg, rgba(100, 210, 255, 0.3) 0%, rgba(10, 132, 255, 0.3) 100%)'
          : 'linear-gradient(180deg, #64D2FF 0%, #0A84FF 100%)',
        boxShadow: disabled
          ? 'none'
          : `
              inset 0 0 0 0.5px rgba(255, 255, 255, 0.2),
              inset 0 1px 0 0 rgba(255, 255, 255, 0.15),
              0 4px 16px -2px rgba(100, 210, 255, 0.4),
              0 8px 24px -4px rgba(0, 0, 0, 0.25)
            `,
        transition: 'all 0.25s cubic-bezier(0.28, 0.11, 0.32, 1)'
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)';
          e.currentTarget.style.boxShadow = `
            inset 0 0 0 0.5px rgba(255, 255, 255, 0.25),
            inset 0 1px 0 0 rgba(255, 255, 255, 0.2),
            0 8px 24px -2px rgba(100, 210, 255, 0.5),
            0 16px 32px -4px rgba(0, 0, 0, 0.3)
          `;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow = `
            inset 0 0 0 0.5px rgba(255, 255, 255, 0.2),
            inset 0 1px 0 0 rgba(255, 255, 255, 0.15),
            0 4px 16px -2px rgba(100, 210, 255, 0.4),
            0 8px 24px -4px rgba(0, 0, 0, 0.25)
          `;
        }
      }}
    >
      {/* Shimmer sweep on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" style={{ transitionTimingFunction: 'cubic-bezier(0.28, 0.11, 0.32, 1)' }} />
      <span className="relative z-10 flex items-center gap-2 justify-center">{children}</span>
    </button>
  );
};

// Secondary Button - iOS Glass style
export const SecondaryButton: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string; size?: 'sm' | 'md' | 'lg' }> = ({ children, onClick, className = '', size = 'md' }) => {
  const sizes = {
    sm: 'px-5 py-2 text-sm rounded-xl',
    md: 'px-7 py-3 text-base rounded-2xl',
    lg: 'px-9 py-4 text-lg rounded-2xl'
  };

  return (
    <button
      onClick={onClick}
      className={`
        relative group overflow-hidden font-sf-medium
        ${sizes[size]}
        active:scale-[0.97]
        ${className}
      `}
      style={{
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        color: 'rgba(255, 255, 255, 0.9)',
        boxShadow: `
          inset 0 0 0 0.5px rgba(255, 255, 255, 0.1),
          inset 0 1px 0 0 rgba(255, 255, 255, 0.08)
        `,
        transition: 'all 0.25s cubic-bezier(0.28, 0.11, 0.32, 1)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
        e.currentTarget.style.transform = '';
      }}
    >
      <span className="relative z-10 flex items-center gap-2 justify-center">{children}</span>
    </button>
  );
};

// Icon Button - iOS Glass style
export const IconButton: React.FC<{ icon: React.ReactNode; onClick?: () => void; className?: string; title?: string; variant?: 'default' | 'filled' }> = ({ icon, onClick, className = '', title, variant = 'default' }) => (
  <button
    onClick={onClick}
    title={title}
    className={`
      relative group p-3 rounded-2xl
      flex items-center justify-center
      active:scale-95
      ${className}
    `}
    style={{
      background: variant === 'filled'
        ? 'linear-gradient(180deg, rgba(100, 210, 255, 0.2) 0%, rgba(10, 132, 255, 0.15) 100%)'
        : 'rgba(255, 255, 255, 0.06)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      color: 'rgba(255, 255, 255, 0.7)',
      boxShadow: 'inset 0 0 0 0.5px rgba(255, 255, 255, 0.08)',
      transition: 'all 0.25s cubic-bezier(0.28, 0.11, 0.32, 1)'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = variant === 'filled'
        ? 'linear-gradient(180deg, rgba(100, 210, 255, 0.3) 0%, rgba(10, 132, 255, 0.25) 100%)'
        : 'rgba(255, 255, 255, 0.1)';
      e.currentTarget.style.borderColor = 'rgba(100, 210, 255, 0.25)';
      e.currentTarget.style.color = 'rgba(255, 255, 255, 1)';
      e.currentTarget.style.boxShadow = 'inset 0 0 0 0.5px rgba(100, 210, 255, 0.2), 0 0 20px rgba(100, 210, 255, 0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = variant === 'filled'
        ? 'linear-gradient(180deg, rgba(100, 210, 255, 0.2) 0%, rgba(10, 132, 255, 0.15) 100%)'
        : 'rgba(255, 255, 255, 0.06)';
      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
      e.currentTarget.style.boxShadow = 'inset 0 0 0 0.5px rgba(255, 255, 255, 0.08)';
    }}
  >
    <span className="relative z-10">{icon}</span>
  </button>
);

// Progress Bar - iOS style with glow
export const ProgressBar: React.FC<{ progress: number; className?: string; variant?: 'default' | 'cyan' | 'mint' }> = ({ progress, className = '', variant = 'default' }) => {
  const gradients = {
    default: 'linear-gradient(90deg, #64D2FF 0%, #0A84FF 100%)',
    cyan: 'linear-gradient(90deg, #64D2FF 0%, #66D4CF 100%)',
    mint: 'linear-gradient(90deg, #66D4CF 0%, #30D158 100%)'
  };

  const glows = {
    default: 'rgba(100, 210, 255, 0.4)',
    cyan: 'rgba(100, 210, 255, 0.4)',
    mint: 'rgba(102, 212, 207, 0.4)'
  };

  return (
    <div
      className={`relative h-1 w-full rounded-full overflow-hidden ${className}`}
      style={{
        background: 'rgba(255, 255, 255, 0.08)',
        boxShadow: 'inset 0 0.5px 1px rgba(0, 0, 0, 0.2)'
      }}
    >
      <div
        className="h-full rounded-full relative"
        style={{
          width: `${progress}%`,
          background: gradients[variant],
          boxShadow: `0 0 12px ${glows[variant]}`,
          transition: 'width 0.5s cubic-bezier(0.28, 0.11, 0.32, 1)'
        }}
      >
        {/* Subtle shine */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-full" />
      </div>
    </div>
  );
};

// Badge - iOS Pill style
export const Badge: React.FC<{ children: React.ReactNode; type?: 'default' | 'success' | 'warning' | 'purple' | 'locked' | 'cyan' | 'mint' }> = ({ children, type = 'default' }) => {
  const styles = {
    default: {
      background: 'rgba(255, 255, 255, 0.08)',
      border: 'rgba(255, 255, 255, 0.1)',
      color: 'rgba(255, 255, 255, 0.6)'
    },
    success: {
      background: 'rgba(48, 209, 88, 0.12)',
      border: 'rgba(48, 209, 88, 0.25)',
      color: '#30D158'
    },
    warning: {
      background: 'rgba(255, 159, 10, 0.12)',
      border: 'rgba(255, 159, 10, 0.25)',
      color: '#FF9F0A'
    },
    purple: {
      background: 'rgba(191, 90, 242, 0.12)',
      border: 'rgba(191, 90, 242, 0.25)',
      color: '#BF5AF2'
    },
    cyan: {
      background: 'rgba(100, 210, 255, 0.12)',
      border: 'rgba(100, 210, 255, 0.25)',
      color: '#64D2FF'
    },
    mint: {
      background: 'rgba(102, 212, 207, 0.12)',
      border: 'rgba(102, 212, 207, 0.25)',
      color: '#66D4CF'
    },
    locked: {
      background: 'rgba(0, 0, 0, 0.3)',
      border: 'rgba(255, 255, 255, 0.05)',
      color: 'rgba(255, 255, 255, 0.35)'
    }
  };

  const style = styles[type];

  return (
    <span
      className="relative px-3 py-1.5 rounded-full text-[11px] font-sf-medium uppercase tracking-wide flex items-center gap-1.5"
      style={{
        background: style.background,
        border: `1px solid ${style.border}`,
        color: style.color,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}
    >
      <span className="relative z-10 flex items-center gap-1.5">
        {children}
      </span>
    </span>
  );
};

// Liquid Video Frame Component - iOS visionOS-inspired content container
export const LiquidVideoFrame: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`relative group ${className}`}>
    {/* Ambient glow - iOS style subtle radiance */}
    <div
      className="absolute -inset-2 rounded-[32px] opacity-0 group-hover:opacity-100 pointer-events-none"
      style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(100, 210, 255, 0.15) 0%, transparent 60%)',
        filter: 'blur(20px)',
        transition: 'opacity 0.5s cubic-bezier(0.28, 0.11, 0.32, 1)'
      }}
    />

    {/* Main container - visionOS glass */}
    <div
      className="relative rounded-[28px] overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: `
          inset 0 0 0 0.5px rgba(255, 255, 255, 0.12),
          inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
          0 24px 48px -12px rgba(0, 0, 0, 0.5),
          0 12px 24px -8px rgba(0, 0, 0, 0.3)
        `,
        transition: 'all 0.4s cubic-bezier(0.28, 0.11, 0.32, 1)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(100, 210, 255, 0.2)';
        e.currentTarget.style.boxShadow = `
          inset 0 0 0 0.5px rgba(100, 210, 255, 0.15),
          inset 0 1px 0 0 rgba(255, 255, 255, 0.12),
          0 32px 64px -16px rgba(0, 0, 0, 0.5),
          0 0 48px -8px rgba(100, 210, 255, 0.1)
        `;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        e.currentTarget.style.boxShadow = `
          inset 0 0 0 0.5px rgba(255, 255, 255, 0.12),
          inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
          0 24px 48px -12px rgba(0, 0, 0, 0.5),
          0 12px 24px -8px rgba(0, 0, 0, 0.3)
        `;
      }}
    >
      {/* Top highlight - iOS specular */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

      {/* Vibrancy glow */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent pointer-events-none" />

      {/* Animated shimmer on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
        style={{ transition: 'opacity 0.4s cubic-bezier(0.28, 0.11, 0.32, 1)' }}
      >
        <div
          className="absolute inset-0 -translate-x-full group-hover:translate-x-full"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(100, 210, 255, 0.06) 50%, transparent 100%)',
            transition: 'transform 0.8s cubic-bezier(0.28, 0.11, 0.32, 1)'
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>

      {/* Bottom vignette */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/30 via-black/10 to-transparent pointer-events-none" />
    </div>
  </div>
);

export const FileDropZone: React.FC<{
  label: string;
  accept: string;
  onFileSelect: (file: File) => void;
  currentFile?: string;
  isUploading?: boolean;
  uploadProgress?: number;
}> = ({ label, accept, onFileSelect, currentFile, isUploading = false, uploadProgress = 0 }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) {
      setIsDragging(true);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isUploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const acceptedTypes = accept.split(',').map(t => t.trim().toLowerCase());
      const fileType = file.type.toLowerCase();
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

      const isAccepted = acceptedTypes.some(acceptType => {
        if (acceptType.startsWith('.')) {
          return fileExtension === acceptType;
        }
        if (acceptType.includes('*')) {
          const [mainType] = acceptType.split('/');
          return fileType.startsWith(mainType + '/');
        }
        return fileType === acceptType;
      });

      if (isAccepted) {
        onFileSelect(file);
      } else {
        console.warn('File type not accepted:', fileType, fileExtension);
      }
    }
  };

  return (
    <div
      onClick={() => !isUploading && inputRef.current?.click()}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`
        group relative h-44 w-full border-2 border-dashed rounded-3xl
        bg-gradient-to-br from-zinc-900/50 to-black/50 backdrop-blur-sm
        transition-all duration-300 flex flex-col items-center justify-center p-6 overflow-hidden
        ${isUploading
          ? 'border-yellow-400/50 cursor-wait'
          : isDragging
            ? 'border-yellow-400 bg-yellow-400/10 scale-[1.02] shadow-[0_0_40px_rgba(250,204,21,0.15)]'
            : 'border-white/10 hover:bg-zinc-800/30 hover:border-yellow-400/40 cursor-pointer hover:shadow-[0_0_30px_rgba(250,204,21,0.08)]'
        }`}
    >
      <input
        type="file"
        ref={inputRef}
        className="hidden"
        accept={accept}
        onChange={handleChange}
        disabled={isUploading}
      />

      {/* Animated background pattern */}
      <div className={`absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(250,204,21,0.15)_50%,transparent_75%)] bg-[length:24px_24px] transition-opacity duration-300 ${isDragging ? 'opacity-30' : 'opacity-0 group-hover:opacity-10'}`} />

      {/* Corner accents */}
      <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-yellow-400/30 rounded-tl-lg opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-yellow-400/30 rounded-tr-lg opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-yellow-400/30 rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-yellow-400/30 rounded-br-lg opacity-0 group-hover:opacity-100 transition-opacity" />

      {isDragging ? (
        <div className="flex flex-col items-center relative z-10 animate-pulse">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-yellow-400/40 to-yellow-500/20 flex items-center justify-center text-yellow-400 mb-3 shadow-[0_0_40px_rgba(250,204,21,0.4)]">
            <Upload size={32} className="drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
          </div>
          <p className="text-lg font-bold text-yellow-400">Drop file here</p>
          <p className="text-sm text-yellow-400/70 mt-1">Release to upload</p>
        </div>
      ) : isUploading ? (
        <div className="flex flex-col items-center relative z-10 w-full px-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-yellow-400/30 to-yellow-500/10 flex items-center justify-center text-yellow-400 mb-3 shadow-[0_0_30px_rgba(250,204,21,0.3)]">
            <Upload size={28} className="animate-bounce drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
          </div>
          <p className="text-sm font-semibold text-yellow-400 mb-3">Uploading... {uploadProgress}%</p>
          <div className="w-full max-w-xs h-2.5 bg-zinc-800 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)] transition-all duration-300 relative"
              style={{ width: `${uploadProgress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
            </div>
          </div>
        </div>
      ) : currentFile ? (
        <div className="flex flex-col items-center animate-fade-in relative z-10">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-yellow-400/30 to-yellow-500/10 flex items-center justify-center text-yellow-400 mb-3 shadow-[0_0_25px_rgba(250,204,21,0.2)]">
            <Check size={28} className="drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
          </div>
          <p className="text-sm font-semibold text-yellow-400 text-center break-all max-w-full px-4" title={currentFile}>{currentFile}</p>
          <p className="text-xs text-zinc-500 mt-2">Click or drag to replace</p>
        </div>
      ) : (
        <div className="flex flex-col items-center relative z-10">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-yellow-400/15 to-yellow-500/5 flex items-center justify-center text-yellow-400 mb-3 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(250,204,21,0.25)] transition-all duration-300 border border-yellow-400/20">
            <Upload size={28} className="group-hover:drop-shadow-[0_0_8px_rgba(250,204,21,0.5)] transition-all" />
          </div>
          <p className="text-sm font-semibold text-zinc-300">{label}</p>
          <p className="text-xs text-zinc-500 mt-1.5">Drag & drop or click to upload</p>
        </div>
      )}
    </div>
  );
};
