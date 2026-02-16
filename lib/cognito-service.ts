import { getCognitoConfig } from './cognito-config';
import https from 'https';

export interface TokenResponse {
  access_token: string;
  id_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface UserInfo {
  sub: string;
  email: string;
  name: string;
}

// Fallback function using native https module
function httpsPost(url: string, body: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 30000, // 30 second timeout
    };

    console.log('Making HTTPS request to:', url);
    console.log('Hostname:', options.hostname);

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Failed to parse response: ' + data));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('HTTPS request error:', error);
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out after 30 seconds'));
    });

    req.write(body);
    req.end();
  });
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const config = getCognitoConfig();
  const clientSecret = process.env.COGNITO_SECRET_CLIENT;

  console.log('=== Token Exchange Debug ===');
  console.log('Domain:', config.domain);
  console.log('Client ID:', config.clientId);
  console.log('Redirect URI:', config.redirectUri);
  console.log('Client Secret exists:', !!clientSecret);
  console.log('Code length:', code.length);

  if (!clientSecret) {
    throw new Error('COGNITO_SECRET_CLIENT environment variable is required');
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: config.redirectUri,
  });

  const tokenUrl = `${config.domain}/oauth2/token`;
  console.log('Token URL:', tokenUrl);
  
  try {
    // Use native https module instead of fetch to avoid timeout issues
    const response = await httpsPost(tokenUrl, params.toString());
    console.log('Token exchange successful');
    return response;
  } catch (error) {
    console.error('Token exchange failed:', error);
    throw new Error(`Failed to exchange code for tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function decodeIdToken(idToken: string): UserInfo {
  // JWT tokens have 3 parts separated by dots: header.payload.signature
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid ID token format');
  }

  // Decode the payload (second part)
  const payload = parts[1];
  const decodedPayload = Buffer.from(payload, 'base64').toString('utf-8');
  const claims = JSON.parse(decodedPayload);

  return {
    sub: claims.sub,
    email: claims.email,
    name: claims.name || claims.email,
  };
}
