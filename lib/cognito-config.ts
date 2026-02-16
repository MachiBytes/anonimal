export interface CognitoConfig {
  userPoolId: string;
  clientId: string;
  domain: string;
  redirectUri: string;
}

export function getCognitoConfig(): CognitoConfig {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_CLIENT_ID;
  const domain = process.env.COGNITO_DOMAIN;
  const redirectUri = process.env.COGNITO_REDIRECT_URI;

  if (!userPoolId || !clientId || !domain || !redirectUri) {
    throw new Error('Missing required Cognito environment variables');
  }

  // Validate domain format
  if (!domain.startsWith('https://')) {
    throw new Error('COGNITO_DOMAIN must start with https:// (e.g., https://your-domain.auth.region.amazoncognito.com)');
  }

  return {
    userPoolId,
    clientId,
    domain,
    redirectUri,
  };
}

export function getAuthorizationUrl(): string {
  const config = getCognitoConfig();
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    scope: 'email openid phone',
    redirect_uri: config.redirectUri,
  });

  return `${config.domain}/login?${params.toString()}`;
}
