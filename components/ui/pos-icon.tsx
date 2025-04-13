'use client';

import React from 'react';

interface POSIconProps {
  size?: number;
  className?: string;
}

export function POSIcon({ size = 32, className = '' }: POSIconProps) {
  return (
    <div
      className={`relative inline-flex ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      {/* Shop Building Base (8-bit style) */}
      <div
        className="absolute"
        style={{
          top: '45%',
          left: '10%',
          width: '80%',
          height: '45%',
          backgroundColor: '#5f5ba6', // Building base color
          imageRendering: 'pixelated',
          boxShadow: '2px 2px 0 rgba(0,0,0,0.2)',
        }}
      />

      {/* Shop Roof (8-bit style) */}
      <div
        className="absolute"
        style={{
          top: '25%',
          left: '5%',
          width: '90%',
          height: '20%',
          backgroundColor: '#de3c4b', // Roof color
          imageRendering: 'pixelated',
          boxShadow: '2px 2px 0 rgba(0,0,0,0.2)',
        }}
      />

      {/* Shop Door (8-bit style) */}
      <div
        className="absolute"
        style={{
          top: '65%',
          left: '40%',
          width: '20%',
          height: '25%',
          backgroundColor: '#faae3d', // Door color
          imageRendering: 'pixelated',
        }}
      />

      {/* Shop Window (8-bit style) */}
      <div
        className="absolute"
        style={{
          top: '55%',
          left: '15%',
          width: '15%',
          height: '15%',
          backgroundColor: '#8bd8bd', // Window color
          imageRendering: 'pixelated',
        }}
      />

      {/* Shop Window 2 (8-bit style) */}
      <div
        className="absolute"
        style={{
          top: '55%',
          left: '70%',
          width: '15%',
          height: '15%',
          backgroundColor: '#8bd8bd', // Window color
          imageRendering: 'pixelated',
        }}
      />

      {/* Cash Register Top (8-bit style) */}
      <div
        className="absolute"
        style={{
          top: '10%',
          left: '35%',
          width: '30%',
          height: '15%',
          backgroundColor: '#111111', // Register color
          imageRendering: 'pixelated',
        }}
      />

      {/* Cash Register Display (8-bit style) */}
      <div
        className="absolute"
        style={{
          top: '12.5%',
          left: '40%',
          width: '20%',
          height: '7.5%',
          backgroundColor: '#00ff00', // Display color
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
}
