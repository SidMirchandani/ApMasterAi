import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely converts various date formats to a Date object
 * Handles Firestore Timestamps, Date objects, strings, and numbers
 */
export function safeDateParse(value: any): Date | null {
  if (!value) return null;
  
  try {
    // Handle Firestore Timestamp objects
    if (typeof value === 'object' && value !== null && !Array.isArray(value) && 'seconds' in value) {
      return new Date(value.seconds * 1000);
    }
    
    // Handle Date objects using safe runtime check
    if (value && Object.prototype.toString.call(value) === '[object Date]') {
      return value as unknown as Date;
    }
    
    // Handle strings and numbers
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    console.warn('Date parsing error:', error);
    return null;
  }
}

/**
 * Universal date formatter for JSX rendering (date only)
 * Ensures no raw Date objects or Firestore timestamps leak into JSX
 * Always returns a string that is safe to render
 */
export function formatDate(value: any, fmt = "MMM d, yyyy"): string {
  const date = safeDateParse(value);
  return date ? format(date, fmt) : "TBD";
}

/**
 * Universal date-time formatter for JSX rendering (includes time)
 * Ensures no raw Date objects or Firestore timestamps leak into JSX
 * Always returns a string that is safe to render
 */
export function formatDateTime(value: any, fmt = "MMM d, yyyy 'at' h:mm a"): string {
  const date = safeDateParse(value);
  return date ? format(date, fmt) : "Recently";
}


