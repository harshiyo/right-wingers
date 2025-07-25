import React, { useEffect, useState } from 'react';

interface Snowflake {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

interface Light {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  twinkleSpeed: number;
}

export const ChristmasEffect: React.FC = () => {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);
  const [lights, setLights] = useState<Light[]>([]);

  useEffect(() => {
    // Create initial snowflakes
    const createSnowflakes = () => {
      const flakes: Snowflake[] = [];
      for (let i = 0; i < 60; i++) {
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

    // Create twinkling lights
    const createLights = () => {
      const lightArray: Light[] = [];
      const colors = ['#ff0000', '#00ff00', '#ffff00', '#ff69b4', '#00ffff', '#ffa500'];
      
      for (let i = 0; i < 25; i++) {
        lightArray.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 8 + 4,
          twinkleSpeed: Math.random() * 2 + 1,
        });
      }
      setLights(lightArray);
    };

    createSnowflakes();
    createLights();

    // Animation loop for snowflakes
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

    // Animation loop for lights
    const animateLights = () => {
      setLights(prevLights => 
        prevLights.map(light => ({
          ...light,
          opacity: Math.sin(Date.now() * 0.001 * light.twinkleSpeed) * 0.5 + 0.5,
        }))
      );
    };

    const snowIntervalId = setInterval(animateSnow, 50);
    const lightIntervalId = setInterval(animateLights, 100);

    return () => {
      clearInterval(snowIntervalId);
      clearInterval(lightIntervalId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
      {/* Twinkling Christmas Lights */}
      {lights.map(light => (
        <div
          key={`light-${light.id}`}
          className="absolute rounded-full"
          style={{
            left: `${light.x}%`,
            top: `${light.y}%`,
            width: `${light.size}px`,
            height: `${light.size}px`,
            backgroundColor: light.color,
            opacity: light.opacity,
            boxShadow: `0 0 ${light.size * 2}px ${light.color}`,
            animation: `twinkle ${light.twinkleSpeed}s infinite`,
          }}
        />
      ))}

      {/* Falling Snowflakes */}
      {snowflakes.map(flake => (
        <div
          key={`snow-${flake.id}`}
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

      {/* Christmas Tree Silhouettes */}
      <div className="absolute bottom-0 left-0 w-32 h-48 opacity-20">
        <svg viewBox="0 0 100 150" className="w-full h-full">
          <path
            d="M50 10 L30 40 L20 60 L40 60 L30 80 L20 100 L40 100 L30 120 L20 140 L80 140 L70 120 L80 100 L60 100 L70 80 L80 60 L60 60 L70 40 Z"
            fill="#228B22"
          />
          <rect x="45" y="140" width="10" height="10" fill="#8B4513" />
        </svg>
      </div>

      <div className="absolute bottom-0 right-0 w-24 h-36 opacity-15">
        <svg viewBox="0 0 100 150" className="w-full h-full">
          <path
            d="M50 10 L35 35 L25 55 L40 55 L30 75 L25 95 L40 95 L30 115 L25 135 L75 135 L65 115 L75 95 L60 95 L65 75 L75 55 L60 55 L65 35 Z"
            fill="#228B22"
          />
          <rect x="45" y="135" width="10" height="15" fill="#8B4513" />
        </svg>
      </div>

      {/* Garland Effect */}
      <div className="absolute top-0 left-0 w-full h-2">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={`garland-${i}`}
            className="absolute w-3 h-3 rounded-full"
            style={{
              left: `${i * 5}%`,
              backgroundColor: i % 2 === 0 ? '#ff0000' : '#00ff00',
              boxShadow: `0 0 6px ${i % 2 === 0 ? '#ff0000' : '#00ff00'}`,
              animation: `twinkle ${Math.random() * 2 + 1}s infinite`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}; 