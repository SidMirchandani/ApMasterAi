import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely converts various date formats to a Date object
 * Handles Firestore Timestamps, Date objects, strings, and numbers
 */
export function safeDateParse(dateValue: any): Date | null {
  if (!dateValue) return null;
  
  try {
    // Handle Firestore Timestamp objects
    if (typeof dateValue === 'object' && dateValue !== null && !Array.isArray(dateValue) && 'seconds' in dateValue) {
      return new Date(dateValue.seconds * 1000);
    }
    
    // Handle Date objects using safe runtime check
    if (dateValue && Object.prototype.toString.call(dateValue) === '[object Date]') {
      return dateValue;
    }
    
    // Handle strings and numbers
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    console.warn('Date parsing error:', error);
    return null;
  }
}

/**
 * Safely formats a date value to a string
 */
export function safeDateFormat(dateValue: any, options?: Intl.DateTimeFormatOptions): string {
  const date = safeDateParse(dateValue);
  if (!date) return 'Recently';
  
  try {
    return date.toLocaleDateString('en-US', options);
  } catch (error) {
    console.warn('Date formatting error:', error);
    return 'Recently';
  }
}
