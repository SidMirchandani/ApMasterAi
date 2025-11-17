
export function safeDateParse(
  dateInput: string | number | Date | { seconds: number; _seconds?: number } | null | undefined
): Date | null {
  if (!dateInput) return null;

  try {
    if (dateInput instanceof Date) {
      return isNaN(dateInput.getTime()) ? null : dateInput;
    }

    if (typeof dateInput === "object") {
      const seconds = "_seconds" in dateInput ? dateInput._seconds : dateInput.seconds;
      if (typeof seconds === "number") {
        return new Date(seconds * 1000);
      }
    }

    if (typeof dateInput === "string" || typeof dateInput === "number") {
      const date = new Date(dateInput);
      return isNaN(date.getTime()) ? null : date;
    }

    return null;
  } catch (error) {
    console.error("Error parsing date:", error);
    return null;
  }
}

export function formatDate(
  dateInput: string | number | Date | { seconds: number; _seconds?: number } | null | undefined
): string {
  const parsedDate = safeDateParse(dateInput);
  if (!parsedDate) {
    return "Date unavailable";
  }

  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  };

  return parsedDate.toLocaleDateString("en-US", options);
}

export function formatDateTime(
  dateInput: string | number | Date | { seconds: number; _seconds?: number } | null | undefined
): string {
  const parsedDate = safeDateParse(dateInput);
  if (!parsedDate) {
    return "Date unavailable";
  }

  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  };

  return parsedDate.toLocaleDateString("en-US", options);
}
