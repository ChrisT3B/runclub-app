// src/utils/SimpleAuthDebug.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export const SimpleAuthDebug: React.FC = () => {
  const [info, setInfo] = useState<any>({});
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    // Capture URL info
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const type = urlParams.get('type');
    
    setInfo({
      currentUrl: window.location.href,
      token: token || 'NOT FOUND',
      type: type || 'NOT FOUND',
      supabaseUrl: 'Check your .env file'
    });

    // Auto-test if we have parameters
    if (token && type) {
      testVerification(token, type);
    }
  }, []);

  const testVerification = async (token: string, type: string) => {
    const results: string[] = [];
    
    results.push(`🔍 Testing with token: ${token.substring(0, 10)}...`);
    results.push(`🔍 Testing with type: ${type}`);
    
    try {
      // Test 1: token_hash with email type
      results.push('\n📧 Test 1: token_hash + email type');
      const result1 = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email'
      });
      
      if (result1.error) {
        results.push(`❌ Failed: ${result1.error.message}`);
      } else {
        results.push(`✅ Success! User: ${result1.data.user?.email || 'No email'}`);
        setTestResults(results);
        return; // Success, stop here
      }

      // Test 2: token_hash with signup type
      results.push('\n📝 Test 2: token_hash + signup type');
      const result2 = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'signup' as any
      });
      
      if (result2.error) {
        results.push(`❌ Failed: ${result2.error.message}`);
      } else {
        results.push(`✅ Success! User: ${result2.data.user?.email || 'No email'}`);
        setTestResults(results);
        return; // Success, stop here
      }

      // Test 3: plain token with email type (requires email parameter)
      results.push('\n🔑 Test 3: token + email type (skipped - requires email)');
      results.push('⏭️ Skipping - would need user email address');

      results.push('\n❌ All verification methods failed');
      
    } catch (error) {
      results.push(`\n💥 Unexpected error: ${error}`);
    }
    
    setTestResults(results);
  };

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '800px', 
      margin: '20px auto',
      fontFamily: 'monospace',
      background: '#f5f5f5',
      border: '1px solid #ddd',
      borderRadius: '8px'
    }}>
      <h2>🔍 Email Verification Debug</h2>
      
      <div style={{ marginBottom: '20px', background: 'white', padding: '15px', borderRadius: '4px' }}>
        <h3>URL Information:</h3>
        <div><strong>Current URL:</strong> {info.currentUrl}</div>
        <div><strong>Token:</strong> {info.token}</div>
        <div><strong>Type:</strong> {info.type}</div>
        <div><strong>Supabase URL:</strong> {info.supabaseUrl}</div>
      </div>

      {testResults.length > 0 && (
        <div style={{ background: 'white', padding: '15px', borderRadius: '4px' }}>
          <h3>Test Results:</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
            {testResults.join('\n')}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={() => window.location.href = '/'}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Go to Home
        </button>
        
        {info.token !== 'NOT FOUND' && info.type !== 'NOT FOUND' && (
          <button 
            onClick={() => testVerification(info.token, info.type)}
            style={{ 
              padding: '10px 20px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Re-test Verification
          </button>
        )}
      </div>
    </div>
  );
};