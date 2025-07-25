import React, { useEffect, useState } from 'react';

interface Snowflake {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

export const SnowEffect: React.FC = () => {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);

  useEffect(() => {
    // Create initial snowflakes
    const createSnowflakes = () => {
      const flakes: Snowflake[] = [];
      for (let i = 0; i < 50; i++) {
        flakes.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 4 + 2,
          speed: Math.random() * 2 + 1,
          opacity: Math.random() * 0.7 + 0.3,
        });
      }
      setSnowflakes(flakes);
    };

    createSnowflakes();

    // Animation loop
    const animateSnow = () => {
      setSnowflakes(prevFlakes => 
        prevFlakes.map(flake => ({
          ...flake,
          y: flake.y + flake.speed,
          x: flake.x + (Math.sin(flake.y * 0.01) * 0.5), // Gentle swaying
        })).map(flake => {
          // Reset snowflake when it goes off screen
          if (flake.y > 100) {
            return {
              ...flake,
              y: -5,
              x: Math.random() * 100,
            };
          }
          return flake;
        })
      );
    };

    const intervalId = setInterval(animateSnow, 50);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
      {snowflakes.map(flake => (
        <div
          key={flake.id}
          className="absolute rounded-full bg-white shadow-sm"
          style={{
            left: `${flake.x}%`,
            top: `${flake.y}%`,
            width: `${flake.size}px`,
            height: `${flake.size}px`,
            opacity: flake.opacity,
            transform: `rotate(${flake.y * 2}deg)`,
            transition: 'none',
          }}
        />
      ))}
    </div>
  );
}; 