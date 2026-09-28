import { addMonths, differenceInCalendarDays } from 'date-fns';

/** Entries older than this are flagged as expiring soon. */
export const EXPIRY_WARNING_MONTHS = 5;

/** Entries older than this drop off the leaderboard (matches getLeaderboard cutoff). */
export const LEAGUE_WINDOW_MONTHS = 6;

export interface EntryExpiryInfo {
  isExpiringSoon: boolean;
  dropOffDate:    Date;
  daysLeft:       number;
}

/**
 * Returns the YYYY-MM-DD string for today minus the given number of months.
 * Calculated the same way as the cutoff in ParkrunLeagueService.getLeaderboard().
 */
function monthsAgoISO(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().split('T')[0];
}

/** Parses a YYYY-MM-DD string as a local date (avoids UTC off-by-one). */
function parseEventDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getEntryExpiry(eventDate: string): EntryExpiryInfo {
  const warningCutoff = monthsAgoISO(EXPIRY_WARNING_MONTHS);
  const dropOffDate   = addMonths(parseEventDate(eventDate), LEAGUE_WINDOW_MONTHS);
  const daysLeft      = Math.max(0, differenceInCalendarDays(dropOffDate, new Date()));

  return {
    isExpiringSoon: eventDate < warningCutoff,
    dropOffDate,
    daysLeft,
  };
}
