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
      return dateValue as unknown as Date;
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

/**
 * Universal date formatter for JSX rendering
 * Ensures no raw Date objects or Firestore timestamps leak into JSX
 * Always returns a string that is safe to render
 */
export function formatDate(value: string | number | Date | { seconds: number } | null | undefined): string {
  if (!value) return "TBD";
  
  try {
    // Handle strings and numbers directly
    if (typeof value === "string" || typeof value === "number") {
      return value.toString();
    }
    
    // Handle Firestore Timestamps
    if (typeof value === "object" && value !== null && !Array.isArray(value) && "seconds" in value) {
      const date = new Date((value as any).seconds * 1000);
      if (isNaN(date.getTime())) return "TBD";
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    }
    
    // Handle Date objects using safe runtime check
    if (Object.prototype.toString.call(value) === "[object Date]") {
      const date = value as Date;
      if (isNaN(date.getTime())) return "TBD";
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    }
    
    return "TBD";
  } catch (error) {
    console.warn('Date formatting error:', error);
    return "TBD";
  }
}

/**
 * Detailed date formatter for JSX rendering with time
 * Always returns a string that is safe to render
 */
export function formatDateTime(value: string | number | Date | { seconds: number } | null | undefined): string {
  if (!value) return "Recently";
  
  try {
    // Handle strings and numbers directly
    if (typeof value === "string" || typeof value === "number") {
      const date = new Date(value);
      if (isNaN(date.getTime())) return "Recently";
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    }
    
    // Handle Firestore Timestamps
    if (typeof value === "object" && value !== null && !Array.isArray(value) && "seconds" in value) {
      const date = new Date((value as any).seconds * 1000);
      if (isNaN(date.getTime())) return "Recently";
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    }
    
    // Handle Date objects using safe runtime check
    if (Object.prototype.toString.call(value) === "[object Date]") {
      const date = value as Date;
      if (isNaN(date.getTime())) return "Recently";
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    }
    
    return "Recently";
  } catch (error) {
    console.warn('Date formatting error:', error);
    return "Recently";
  }
}
