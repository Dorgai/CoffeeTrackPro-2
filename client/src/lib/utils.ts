import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using clsx and processes them with tailwind-merge.
 * This is useful for conditionally applying Tailwind CSS classes.
 * 
 * @param inputs Class names to combine
 * @returns Combined class name string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date object or date string into a localized date string.
 * 
 * @param date The date to format (Date object or date string)
 * @returns Formatted date string
 */
export function formatDate(date: Date | string | null | undefined) {
  if (!date) return '-';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return '-';
  }

  return dateObj.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}