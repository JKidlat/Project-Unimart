/**
 * ==============================================================================
 * AMBIENT CANVAS HERO BACKGROUND (ThreeHero.tsx)
 * ==============================================================================
 * This component renders a lightweight, 60fps HTML5 Canvas ambient background
 * behind the Hero section on the homepage.
 *
 * Why this approach is used:
 * - Replaces heavy 3D rendering engines (like Three.js which is ~600KB) with a
 *   native HTML5 2D Canvas script (~3KB).
 * - Zero external dependencies, loads instantaneously on slow student mobile networks.
 * - Animates gentle floating metallic orbs using brand palette (#A14B58, #C86371, #6F323D).
 * - Uses `requestAnimationFrame` for silky-smooth hardware-accelerated rendering.
 * - Automatically resizes when the browser window changes dimension.
 * ==============================================================================
 */

import React, { useEffect, useRef } from 'react';

export const ThreeHero: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    // Glowing orb configurations matching brand colors (#A14B58, #C86371, #6F323D)
    const orbs = [
      { x: width * 0.7, y: height * 0.35, radius: 240, vx: 0.3, vy: -0.2, color: 'rgba(161, 75, 88, 0.45)' },
      { x: width * 0.85, y: height * 0.55, radius: 180, vx: -0.2, vy: 0.25, color: 'rgba(200, 99, 113, 0.35)' },
      { x: width * 0.6, y: height * 0.65, radius: 200, vx: 0.25, vy: -0.15, color: 'rgba(111, 50, 61, 0.3)' },
      { x: width * 0.78, y: height * 0.4, radius: 120, vx: -0.15, vy: -0.2, color: 'rgba(243, 215, 219, 0.5)' },
    ];

    let t = 0;

    // Animation frame render loop
    const render = () => {
      t += 0.015;
      ctx.clearRect(0, 0, width, height);

      // Render each floating glow orb
      orbs.forEach((orb, i) => {
        orb.x += orb.vx + Math.sin(t + i) * 0.4;
        orb.y += orb.vy + Math.cos(t + i * 1.5) * 0.4;

        // Soft bounce boundaries within the right half of the hero
        if (orb.x < width * 0.4 || orb.x > width * 0.95) orb.vx *= -1;
        if (orb.y < height * 0.1 || orb.y > height * 0.9) orb.vy *= -1;

        const gradient = ctx.createRadialGradient(
          orb.x, orb.y, 0,
          orb.x, orb.y, orb.radius
        );
        gradient.addColorStop(0, orb.color);
        gradient.addColorStop(0.6, orb.color.replace(/[\d\.]+\)$/, '0.15)'));
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Subtle metallic centerpiece radial ring highlight
      const centerX = width * 0.75 + Math.sin(t * 0.5) * 20;
      const centerY = height * 0.45 + Math.cos(t * 0.5) * 20;
      const ringGrad = ctx.createRadialGradient(centerX, centerY, 60, centerX, centerY, 160);
      ringGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      ringGrad.addColorStop(0.5, 'rgba(161, 75, 88, 0.2)');
      ringGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = ringGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 160, 0, Math.PI * 2);
      ctx.fill();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Resize handler to update canvas dimensions dynamically
    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    // Cleanup resources when component unmounts
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 -z-10 pointer-events-none opacity-60 mix-blend-multiply"
      style={{ width: '100%', height: '100%' }}
    />
  );
};
