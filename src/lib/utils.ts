import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateRandomPastelColor(): string {
  // Use HSL for more control over pastel colors
  const hue = Math.floor(Math.random() * 360);
  // Keep saturation and lightness in a range that produces pleasant pastels
  const saturation = Math.floor(Math.random() * 20) + 70; // 70-90%
  const lightness = Math.floor(Math.random() * 10) + 85; // 85-95%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
