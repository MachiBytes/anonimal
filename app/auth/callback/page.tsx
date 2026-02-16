'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError(`Authentication error: ${errorParam}`);
        return;
      }

      if (!code) {
        setError('No authorization code received');
        return;
      }

      try {
        setStatus('Exchanging authorization code for tokens...');
        
        // Redirect to API route which will handle token exchange and set session cookie
        window.location.href = `/api/auth/cognito-callback?code=${encodeURIComponent(code)}`;
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      padding: '20px'
    }}>
      {error ? (
        <div>
          <h1 style={{ color: 'red' }}>Authentication Error</h1>
          <p>{error}</p>
          <button 
            onClick={() => router.push('/')}
            style={{ marginTop: '20px', padding: '10px 20px' }}
          >
            Return to Home
          </button>
        </div>
      ) : (
        <div>
          <h1>Authenticating...</h1>
          <p>{status}</p>
          <div style={{ marginTop: '20px' }}>Loading...</div>
        </div>
      )}
    </div>
  );
}
