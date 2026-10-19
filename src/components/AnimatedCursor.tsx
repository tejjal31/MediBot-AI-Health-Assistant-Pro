import { useEffect, useRef, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

// Custom animated cursor: glowing cyan heart with a pulsing heartbeat line,
// a subtle particle trail, magnetic scale-up on interactive elements, and
// ripple animations on click. Hidden on touch devices.
export default function AnimatedCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [hovering, setHovering] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const trailId = useRef(0);
  const rippleId = useRef(0);
  const lastParticle = useRef(0);

  useEffect(() => {
    // disable on touch / small screens
    if (window.matchMedia('(hover: none)').matches) {
      setHidden(true);
      return;
    }

    const move = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });

      const target = e.target as HTMLElement | null;
      const interactive = !!target?.closest(
        'a, button, input, textarea, [role="button"], [data-cursor-hover]'
      );
      setHovering(interactive);

      // throttle particle emission
      const now = performance.now();
      if (now - lastParticle.current > 45) {
        lastParticle.current = now;
        const id = trailId.current++;
        setParticles((prev) => [
          ...prev.slice(-14),
          { id, x: e.clientX, y: e.clientY },
        ]);
        setTimeout(() => {
          setParticles((prev) => prev.filter((p) => p.id !== id));
        }, 650);
      }
    };

    const click = (e: MouseEvent) => {
      const id = rippleId.current++;
      setRipples((prev) => [...prev, { id, x: e.clientX, y: e.clientY }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 700);
    };

    const leave = () => setPos({ x: -100, y: -100 });

    window.addEventListener('mousemove', move);
    window.addEventListener('click', click);
    document.addEventListener('mouseleave', leave);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('click', click);
      document.removeEventListener('mouseleave', leave);
    };
  }, []);

  if (hidden) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] medibot-cursor-layer">
      {/* particle trail */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="medibot-particle"
          style={{ left: p.x, top: p.y }}
        />
      ))}

      {/* click ripples */}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="medibot-ripple"
          style={{ left: r.x, top: r.y }}
        />
      ))}

      {/* glowing heart cursor */}
      <div
        className="medibot-cursor"
        style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
        data-hovering={hovering}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="medibot-heart">
          <path
            d="M12 21s-7.5-4.6-10-9.2C.6 8.5 2 5 5.4 5c2 0 3.3 1.1 4.1 2.3C10.3 6.1 11.6 5 13.6 5 17 5 18.4 8.5 17 11.8 14.5 16.4 12 21 12 21z"
            fill="currentColor"
          />
        </svg>
        <svg width="56" height="20" viewBox="0 0 56 20" className="medibot-heartbeat" fill="none">
          <path
            d="M1 10 H14 L18 3 L23 17 L28 6 L31 14 L35 10 H55"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
