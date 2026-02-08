// src/components/CsrfTestButton.tsx
// Admin tool for testing CSRF protection

import React, { useState } from 'react';
import { testCsrfProtection } from '../services/csrfTestService';

const CsrfTestButton: React.FC = () => {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    setResult('Testing CSRF protection...');

    try {
      const response = await testCsrfProtection();

      if (response.success) {
        setResult(`Pass: ${response.message}`);
        console.log('CSRF Test Result:', response.details);
      } else {
        setResult(`Fail: ${response.message}`);
        console.error('CSRF Test Failed:', response.details);
      }
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const passed = result.startsWith('Pass');

  return (
    <div style={{
      padding: '20px',
      margin: '0 0 24px 0',
      border: '2px solid #e2e8f0',
      borderRadius: '8px',
      backgroundColor: '#f7fafc'
    }}>
      <h3 style={{ marginBottom: '10px', color: '#2d3748' }}>
        CSRF Protection Test
      </h3>
      <p style={{ marginBottom: '15px', color: '#4a5568', fontSize: '14px' }}>
        Tests CSRF token validation without modifying any data. Admin only.
      </p>

      <button
        onClick={handleTest}
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: loading ? '#cbd5e0' : '#4299e1',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '600'
        }}
      >
        {loading ? 'Testing...' : 'Test CSRF Protection'}
      </button>

      {result && (
        <div style={{
          marginTop: '15px',
          padding: '12px',
          backgroundColor: passed ? '#c6f6d5' : '#fed7d7',
          borderRadius: '6px',
          color: passed ? '#22543d' : '#742a2a',
          fontSize: '14px'
        }}>
          {result}
        </div>
      )}
    </div>
  );
};

export default CsrfTestButton;
