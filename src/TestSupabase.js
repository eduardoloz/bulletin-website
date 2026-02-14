import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function TestSupabase() {
  const [connectionStatus, setConnectionStatus] = useState('Testing connection...');
  const [supabaseConfig, setSupabaseConfig] = useState(null);

  useEffect(() => {
    async function testConnection() {
      try {
        // Test 1: Check if client is initialized
        const url = process.env.REACT_APP_SUPABASE_URL;
        const key = process.env.REACT_APP_SUPABASE_ANON_KEY;

        console.log('Supabase URL:', url);
        console.log('Supabase Key exists:', !!key);

        setSupabaseConfig({
          url: url || 'NOT SET',
          keyExists: !!key
        });

        // Test 2: Try to get session (this will work even if not logged in)
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          setConnectionStatus(`Connection error: ${error.message}`);
          console.error('Supabase error:', error);
        } else {
          setConnectionStatus('✅ Connected to Supabase successfully!');
          console.log('Supabase session data:', data);
        }
      } catch (err) {
        setConnectionStatus(`Failed: ${err.message}`);
        console.error('Test error:', err);
      }
    }

    testConnection();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>Supabase Connection Test</h2>

      <div style={{ marginTop: '20px', padding: '15px', background: '#f0f0f0', borderRadius: '5px' }}>
        <h3>Configuration:</h3>
        <p><strong>URL:</strong> {supabaseConfig?.url}</p>
        <p><strong>API Key:</strong> {supabaseConfig?.keyExists ? '✅ Set' : '❌ Not set'}</p>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', background: '#e3f2fd', borderRadius: '5px' }}>
        <h3>Connection Status:</h3>
        <p style={{ fontSize: '18px' }}>{connectionStatus}</p>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', background: '#fff3cd', borderRadius: '5px' }}>
        <h3>Next Steps:</h3>
        <p>✓ If connected successfully, Supabase client is working!</p>
        <p>✓ Check browser console for detailed logs</p>
        <p>✓ Ready to implement authentication</p>
      </div>
    </div>
  );
}
