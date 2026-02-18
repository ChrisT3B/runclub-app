/**
 * Google Sheets Service for EA Applications
 * Submits application forms to Google Apps Script backend
 */

const APPS_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SHEETS_URL;
const SECRET_TOKEN = import.meta.env.VITE_GOOGLE_SHEETS_TOKEN;

export interface GoogleSheetsSubmissionData {
  full_name: string;
  email: string;
  phone: string;
  title: string;
  date_of_birth: string;
  sex_at_birth: string;
  address_postcode: string;
  nationality: string;
  membership_type: 'first_claim' | 'second_claim';
  ea_urn_at_application?: string;
  has_previous_club: boolean;
  previous_club_name?: string;
  has_health_conditions: boolean;
  health_conditions_details?: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_number: string;
  additional_info?: string;
  payment_sent_confirmed: boolean;
  all_declarations_accepted: boolean;
  payment_reference: string;
}

interface GoogleSheetsResponse {
  success: boolean;
  message: string;
  rowNumber?: number;
  timestamp?: string;
}

export class GoogleSheetsService {
  /**
   * Submit application to Google Sheets
   */
  static async submitApplication(data: GoogleSheetsSubmissionData): Promise<GoogleSheetsResponse> {
    if (!APPS_SCRIPT_URL) {
      throw new Error('Google Sheets URL not configured. Please set VITE_GOOGLE_SHEETS_URL in .env');
    }

    if (!SECRET_TOKEN) {
      throw new Error('Google Sheets token not configured. Please set VITE_GOOGLE_SHEETS_TOKEN in .env');
    }

    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          token: SECRET_TOKEN,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: GoogleSheetsResponse = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to submit application');
      }

      return result;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }

      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error('Request timed out. Please try again.');
      }

      throw error;
    }
  }
}
