import { useEffect, useState } from 'react';

export const COLORS = [
  { name: 'Neural Lime', value: '#D9FF00' },
  { name: 'Cyber Pink', value: '#FF00FF' },
  { name: 'Electric Blue', value: '#00E0FF' },
  { name: 'Vapor Orange', value: '#FF8A00' },
  { name: 'Ghost White', value: '#FFFFFF' },
  { name: 'Crimson Red', value: '#FF3D00' },
  { name: 'Toxic Purple', value: '#9D00FF' },
];

function hexToRgb(hex: string): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `${r} ${g} ${b}`;
}

export function useTheme() {
  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem('accent-color') || '#D9FF00';
  });

  const updateTheme = (color: string) => {
    const root = document.documentElement;
    const rgb = hexToRgb(color);
    root.style.setProperty('--color-primary', rgb);
    
    // Simple hover: could be same or calculated. 
    // For now, same color works as Tailwind handles hover states via colors.
    root.style.setProperty('--color-primary-hover', rgb);
    
    setAccentColor(color);
    localStorage.setItem('accent-color', color);
  };

  useEffect(() => {
    updateTheme(accentColor);
  }, []);

  return { accentColor, setAccentColor: updateTheme, availableColors: COLORS };
}
