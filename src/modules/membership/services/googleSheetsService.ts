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
   * Uses text/plain to avoid CORS preflight. CSP in vercel.json must allow
   * script.google.com and script.googleusercontent.com in connect-src.
   */
  static async submitApplication(data: GoogleSheetsSubmissionData): Promise<GoogleSheetsResponse> {
    if (!APPS_SCRIPT_URL) {
      throw new Error('Google Sheets URL not configured. Please set VITE_GOOGLE_SHEETS_URL in .env');
    }

    if (!SECRET_TOKEN) {
      throw new Error('Google Sheets token not configured. Please set VITE_GOOGLE_SHEETS_TOKEN in .env');
    }

    try {
      const response = await fetch(APPS_SCRIPT_URL.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          ...data,
          token: SECRET_TOKEN,
        }),
        redirect: 'follow',
      });

      const text = await response.text();
      console.log('GAS response status:', response.status, 'type:', response.type);
      console.log('GAS response body (first 500 chars):', text.substring(0, 500));

      // Try to parse the JSON response from GAS
      let result: GoogleSheetsResponse;
      try {
        result = JSON.parse(text);
      } catch {
        // Response wasn't JSON — GAS returned HTML or something unexpected
        throw new Error(
          'Google Sheets did not confirm receipt. ' +
          'Response status: ' + response.status + '. ' +
          'Body preview: ' + text.substring(0, 200)
        );
      }

      // GAS returned valid JSON — check if it was successful
      if (!result.success) {
        throw new Error('Google Sheets error: ' + (result.message || 'Unknown error'));
      }

      return result;
    } catch (error) {
      console.error('GAS submission error:', error);

      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }

      throw error;
    }
  }
}
