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
   * Submit application to Google Sheets via Google Apps Script.
   * Uses no-cors mode because GAS redirects break standard CORS flow.
   * The request is sent and processed; we just can't read the response body.
   */
  static async submitApplication(data: GoogleSheetsSubmissionData): Promise<GoogleSheetsResponse> {
    if (!APPS_SCRIPT_URL) {
      throw new Error('Google Sheets URL not configured. Please set VITE_GOOGLE_SHEETS_URL in .env');
    }

    if (!SECRET_TOKEN) {
      throw new Error('Google Sheets token not configured. Please set VITE_GOOGLE_SHEETS_TOKEN in .env');
    }

    try {
      const url = APPS_SCRIPT_URL.trim();
      console.log('GAS submit - URL starts with:', url.substring(0, 60));
      console.log('GAS submit - URL length:', url.length);

      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          token: SECRET_TOKEN,
        }),
        mode: 'no-cors',
      });

      console.log('GAS submit - response type:', response.type, 'status:', response.status);
      return { success: true, message: 'Application submitted successfully' };
    } catch (error) {
      console.error('GAS submission error:', error);

      // Surface the real error to the UI for diagnosis
      const rawMessage = error instanceof Error ? error.message : String(error);
      const errorType = error instanceof TypeError ? 'TypeError' : error?.constructor?.name || 'Unknown';
      throw new Error(
        `Submission failed [${errorType}]: ${rawMessage}. ` +
        `URL prefix: ${APPS_SCRIPT_URL.substring(0, 40)}...`
      );
    }
  }
}
