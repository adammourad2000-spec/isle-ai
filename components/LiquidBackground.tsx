import React, { useEffect, useRef } from 'react';
import { createNoise3D } from 'simplex-noise';

interface Point {
  x: number;
  y: number;
  originX: number;
  originY: number;
  noiseOffsetX: number;
  noiseOffsetY: number;
}

export const LiquidBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const pointsRef = useRef<Point[]>([]);
  const noise3D = useRef(createNoise3D()).current;
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);

    const config = {
      gridSpacing: 50,
      noiseScale: 0.0008,
      timeSpeed: 0.00015,
      distortionStrength: 30,
      connectionDistance: 100,
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
      initPoints();
    };

    const initPoints = () => {
      const points: Point[] = [];
      const cols = Math.ceil(width / config.gridSpacing) + 2;
      const rows = Math.ceil(height / config.gridSpacing) + 2;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = (i - 1) * config.gridSpacing;
          const y = (j - 1) * config.gridSpacing;
          points.push({
            x,
            y,
            originX: x,
            originY: y,
            noiseOffsetX: Math.random() * 1000,
            noiseOffsetY: Math.random() * 1000,
          });
        }
      }
      pointsRef.current = points;
    };

    const animate = () => {
      timeRef.current += config.timeSpeed;
      const time = timeRef.current;

      // Deep space black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // iOS-style additive blending for glow effect
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 0.3;

      const points = pointsRef.current;

      // Update Points with fluid motion
      points.forEach(p => {
        const noiseX = noise3D(p.originX * config.noiseScale, p.originY * config.noiseScale, time);
        const noiseY = noise3D(p.originX * config.noiseScale, p.originY * config.noiseScale + 100, time);

        p.x = p.originX + noiseX * config.distortionStrength;
        p.y = p.originY + noiseY * config.distortionStrength;
      });

      // Draw Grid Connections with iOS color palette
      const cols = Math.ceil(width / config.gridSpacing) + 2;
      const rows = Math.ceil(height / config.gridSpacing) + 2;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const idx = i * rows + j;
          const p = points[idx];
          if (!p) continue;

          // Calculate position-based color shift (iridescent effect)
          const positionFactor = (p.x / width + p.y / height) / 2;
          const timeFactor = Math.sin(time * 2 + positionFactor * Math.PI * 2) * 0.5 + 0.5;

          // iOS color spectrum: cyan -> blue -> purple -> pink
          let r, g, b;
          if (timeFactor < 0.33) {
            // Cyan to Blue
            const t = timeFactor / 0.33;
            r = Math.round(100 - t * 90);
            g = Math.round(210 - t * 78);
            b = Math.round(255);
          } else if (timeFactor < 0.66) {
            // Blue to Purple
            const t = (timeFactor - 0.33) / 0.33;
            r = Math.round(10 + t * 181);
            g = Math.round(132 - t * 40);
            b = Math.round(255 - t * 13);
          } else {
            // Purple to Cyan (loop back)
            const t = (timeFactor - 0.66) / 0.34;
            r = Math.round(191 - t * 91);
            g = Math.round(92 + t * 118);
            b = Math.round(242 + t * 13);
          }

          // Right connection
          if (i < cols - 1) {
            const rightIdx = (i + 1) * rows + j;
            const neighbor = points[rightIdx];
            drawLine(ctx, p, neighbor, r, g, b, config);
          }

          // Bottom connection
          if (j < rows - 1) {
            const bottomIdx = i * rows + (j + 1);
            const neighbor = points[bottomIdx];
            drawLine(ctx, p, neighbor, r, g, b, config);
          }
        }
      }

      ctx.globalCompositeOperation = 'source-over';
      animationRef.current = requestAnimationFrame(animate);
    };

    const drawLine = (
      ctx: CanvasRenderingContext2D,
      p1: Point,
      p2: Point,
      r: number,
      g: number,
      b: number,
      cfg: { connectionDistance: number }
    ) => {
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const maxDist = cfg.connectionDistance * 1.2;

      if (dist > maxDist) return;

      let alpha = 1 - (dist / maxDist);
      alpha = Math.pow(alpha, 2.5);

      if (alpha < 0.02) return;

      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.25})`;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    };

    resize();
    window.addEventListener('resize', resize);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black">
      {/* Animated Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* iOS-style ambient gradient orbs */}
      <div
        className="absolute w-[800px] h-[800px] rounded-full opacity-20"
        style={{
          top: '-20%',
          right: '-10%',
          background: 'radial-gradient(circle, rgba(100, 210, 255, 0.4) 0%, rgba(10, 132, 255, 0.2) 40%, transparent 70%)',
          filter: 'blur(80px)',
          animation: 'float 20s ease-in-out infinite',
        }}
      />
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-15"
        style={{
          bottom: '-15%',
          left: '-5%',
          background: 'radial-gradient(circle, rgba(191, 90, 242, 0.4) 0%, rgba(94, 92, 230, 0.2) 40%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'float 25s ease-in-out infinite reverse',
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-10"
        style={{
          top: '40%',
          left: '30%',
          background: 'radial-gradient(circle, rgba(102, 212, 207, 0.3) 0%, rgba(48, 209, 88, 0.15) 40%, transparent 70%)',
          filter: 'blur(70px)',
          animation: 'float 30s ease-in-out infinite',
          animationDelay: '-10s',
        }}
      />

      {/* Cinematic Vignette - softer */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,transparent_0%,rgba(0,0,0,0.5)_70%,rgba(0,0,0,0.85)_100%)]" />

      {/* Subtle noise texture for depth */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Top fade for content breathing room */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
    </div>
  );
};
