import React, { useEffect, useState } from 'react';

interface Bat {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  direction: number;
  flapSpeed: number;
}

interface Ghost {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  sway: number;
}

export const HalloweenEffect: React.FC = () => {
  const [bats, setBats] = useState<Bat[]>([]);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);

  useEffect(() => {
    // Create initial bats
    const createBats = () => {
      const batArray: Bat[] = [];
      for (let i = 0; i < 8; i++) {
        batArray.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 20 + 15,
          speed: Math.random() * 2 + 1,
          direction: Math.random() > 0.5 ? 1 : -1,
          flapSpeed: Math.random() * 0.1 + 0.05,
        });
      }
      setBats(batArray);
    };

    // Create initial ghosts
    const createGhosts = () => {
      const ghostArray: Ghost[] = [];
      for (let i = 0; i < 5; i++) {
        ghostArray.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 30 + 20,
          speed: Math.random() * 0.5 + 0.3,
          opacity: Math.random() * 0.4 + 0.2,
          sway: Math.random() * 0.02 + 0.01,
        });
      }
      setGhosts(ghostArray);
    };

    createBats();
    createGhosts();

    // Animation loop for bats
    const animateBats = () => {
      setBats(prevBats => 
        prevBats.map(bat => ({
          ...bat,
          x: bat.x + (bat.speed * bat.direction),
          y: bat.y + Math.sin(Date.now() * bat.flapSpeed) * 0.5,
        })).map(bat => {
          // Reset bat when it goes off screen
          if (bat.x > 110 || bat.x < -10) {
            return {
              ...bat,
              x: bat.direction > 0 ? -10 : 110,
              y: Math.random() * 100,
              direction: bat.direction * -1,
            };
          }
          return bat;
        })
      );
    };

    // Animation loop for ghosts
    const animateGhosts = () => {
      setGhosts(prevGhosts => 
        prevGhosts.map(ghost => ({
          ...ghost,
          y: ghost.y + ghost.speed,
          x: ghost.x + Math.sin(ghost.y * ghost.sway) * 0.3,
        })).map(ghost => {
          // Reset ghost when it goes off screen
          if (ghost.y > 110) {
            return {
              ...ghost,
              y: -10,
              x: Math.random() * 100,
            };
          }
          return ghost;
        })
      );
    };

    const batIntervalId = setInterval(animateBats, 50);
    const ghostIntervalId = setInterval(animateGhosts, 100);

    return () => {
      clearInterval(batIntervalId);
      clearInterval(ghostIntervalId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
      {/* Bats */}
      {bats.map(bat => (
        <div
          key={`bat-${bat.id}`}
          className="absolute"
          style={{
            left: `${bat.x}%`,
            top: `${bat.y}%`,
            transform: `scale(${bat.size / 20}) rotate(${bat.direction > 0 ? 0 : 180}deg)`,
          }}
        >
          <svg
            width="40"
            height="20"
            viewBox="0 0 40 20"
            className="text-gray-800"
            style={{
              filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.3))',
            }}
          >
            <path
              d="M20 2 L15 8 L10 6 L5 8 L10 10 L15 12 L20 18 L25 12 L30 10 L35 8 L30 6 L25 8 Z"
              fill="currentColor"
              opacity="0.8"
            />
          </svg>
        </div>
      ))}

      {/* Ghosts */}
      {ghosts.map(ghost => (
        <div
          key={`ghost-${ghost.id}`}
          className="absolute"
          style={{
            left: `${ghost.x}%`,
            top: `${ghost.y}%`,
            transform: `scale(${ghost.size / 30})`,
            opacity: ghost.opacity,
          }}
        >
          <svg
            width="60"
            height="80"
            viewBox="0 0 60 80"
            className="text-white"
            style={{
              filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.3))',
            }}
          >
            <path
              d="M30 10 C40 10 50 20 50 40 C50 60 40 70 30 70 C20 70 10 60 10 40 C10 20 20 10 30 10 Z M25 25 C25 25 20 30 20 35 C20 40 25 45 30 45 C35 45 40 40 40 35 C40 30 35 25 30 25 C27.5 25 25 25 25 25 Z"
              fill="currentColor"
            />
            <circle cx="25" cy="35" r="2" fill="#000" opacity="0.6" />
            <circle cx="35" cy="35" r="2" fill="#000" opacity="0.6" />
            <path
              d="M28 45 Q30 48 32 45"
              stroke="#000"
              strokeWidth="1"
              fill="none"
              opacity="0.6"
            />
          </svg>
        </div>
      ))}

      {/* Spooky background particles */}
      <div className="absolute inset-0">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={`particle-${i}`}
            className="absolute w-1 h-1 bg-orange-400 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `twinkle ${Math.random() * 3 + 2}s infinite`,
              opacity: Math.random() * 0.5 + 0.2,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}; 