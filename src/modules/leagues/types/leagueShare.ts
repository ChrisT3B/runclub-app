export interface LeagueShareEntry {
  rank:   number;
  name:   string;
  detail: string;    // e.g. "78.48%" for parkrun, "142 pts" for race, "+6.21%" for improvement
  date?:  string;    // optional, parkrun only — formatted event date e.g. "5 Jun 2026"
  time?:  string;    // optional, parkrun only — finish time e.g. "22:14"
}

export interface LeagueShareData {
  leagueName:  string;
  entries:     LeagueShareEntry[];
  updatedDate: string;  // formatted e.g. "14 June 2026"
}

/**
 * A named share variant. Most leagues have a single variant; the race league
 * has two (Male / Female), surfaced as a toggle in the share modal.
 */
export interface LeagueShareVariant {
  label: string;            // e.g. "Male", "Female" — empty/unused when there is only one
  data:  LeagueShareData;
}
