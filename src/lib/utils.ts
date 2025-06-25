import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// A predefined palette of distinct and pleasant pastel colors.
const pastelColors = [
  'hsl(38, 100%, 80%)', // Light Orange
  'hsl(60, 100%, 80%)', // Light Yellow
  'hsl(90, 100%, 85%)', // Light Green
  'hsl(160, 100%, 80%)', // Light Mint
  'hsl(195, 100%, 80%)', // Light Blue
  'hsl(260, 100%, 85%)', // Light Indigo
  'hsl(300, 100%, 85%)', // Light Purple
  'hsl(340, 100%, 85%)', // Light Pink
  'hsl(0, 90%, 85%)',   // Light Salmon
  'hsl(210, 90%, 85%)'  // Light Steel Blue
];


export function generateRandomPastelColor(): string {
  // Select a random color from the predefined palette to ensure visual distinction.
  const randomIndex = Math.floor(Math.random() * pastelColors.length);
  return pastelColors[randomIndex];
}
