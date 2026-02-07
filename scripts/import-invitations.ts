import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { parse } from 'csv-parse/sync';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!; // Use service key for admin operations

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing environment variables VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface MemberRecord {
  full_name: string;
  email: string;
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

interface ImportResult {
  email: string;
  success: boolean;
  token?: string;
  invitationLink?: string;
  error?: string;
}

async function importInvitations(csvFilePath: string) {
  console.log(`\n📋 Run Alcester - Member Invitation Import`);
  console.log(`========================================\n`);

  // Check if file exists
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ Error: File not found: ${csvFilePath}`);
    process.exit(1);
  }

  // Read CSV file
  let members: MemberRecord[] = [];
  try {
    const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
    members = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    console.log(`✓ Found ${members.length} members to import\n`);
  } catch (error) {
    console.error(`❌ Error reading CSV file:`, error);
    process.exit(1);
  }

  if (members.length === 0) {
    console.error('❌ Error: CSV file is empty or has no valid records');
    process.exit(1);
  }

  // Validate CSV columns
  const requiredColumns = ['full_name', 'email'];
  const firstRecord = members[0];
  const missingColumns = requiredColumns.filter((col) => !(col in firstRecord));

  if (missingColumns.length > 0) {
    console.error(`❌ Error: Missing required columns: ${missingColumns.join(', ')}`);
    console.error(`\nExpected columns: full_name, email, phone (optional), emergency_contact_name (optional), emergency_contact_phone (optional)`);
    process.exit(1);
  }

  // Get app URL from environment or use default
  const appUrl = process.env.VITE_APP_URL || 'https://app.runalcester.co.uk';

  // Generate tokens and insert
  const results: ImportResult[] = [];
  let successCount = 0;
  let failCount = 0;

  console.log(`Starting import...\n`);

  for (const member of members) {
    const token = crypto.randomBytes(32).toString('hex');

    try {
      const { data, error } = await supabase
        .from('pending_invitations')
        .insert({
          email: member.email.toLowerCase().trim(),
          full_name: member.full_name.trim(),
          phone: member.phone?.trim() || null,
          emergency_contact_name: member.emergency_contact_name?.trim() || null,
          emergency_contact_phone: member.emergency_contact_phone?.trim() || null,
          token,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error(`✗ Failed: ${member.email} - ${error.message}`);
        results.push({ email: member.email, success: false, error: error.message });
        failCount++;
      } else {
        const invitationLink = `${appUrl}/register?token=${token}`;
        console.log(`✓ Imported: ${member.email}`);
        results.push({
          email: member.email,
          success: true,
          token,
          invitationLink,
        });
        successCount++;
      }
    } catch (error: any) {
      console.error(`✗ Failed: ${member.email} - ${error.message}`);
      results.push({ email: member.email, success: false, error: error.message });
      failCount++;
    }
  }

  // Write results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = `import-results-${timestamp}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

  // Print summary
  console.log(`\n========================================`);
  console.log(`📊 Import Summary`);
  console.log(`========================================`);
  console.log(`✓ Successful: ${successCount}`);
  console.log(`✗ Failed: ${failCount}`);
  console.log(`📁 Results saved to: ${outputPath}\n`);

  // Print sample invitation links
  const successfulResults = results.filter((r) => r.success);
  if (successfulResults.length > 0) {
    console.log(`\n📧 Sample Invitation Links (first 3):`);
    console.log(`========================================`);
    successfulResults.slice(0, 3).forEach((result) => {
      console.log(`\n${result.email}:`);
      console.log(`${result.invitationLink}`);
    });
    console.log(`\n(See ${outputPath} for all invitation links)\n`);
  }

  // Exit with appropriate code
  process.exit(failCount > 0 ? 1 : 0);
}

// Run script
const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: npm run import-invitations <path-to-csv>');
  console.error('\nExample: npm run import-invitations ./members.csv');
  console.error('\nCSV Format:');
  console.error('full_name,email,phone,emergency_contact_name,emergency_contact_phone');
  console.error('John Smith,john@example.com,07123456789,Jane Smith,07987654321');
  process.exit(1);
}

importInvitations(csvPath).catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
