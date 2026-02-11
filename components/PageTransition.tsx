import React from 'react';

interface PageTransitionProps {
    children: React.ReactNode;
    className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children, className = '' }) => {
    return (
        <div className={`w-full min-h-full ${className}`}>
            {children}
        </div>
    );
};
