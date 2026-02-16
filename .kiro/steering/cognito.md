# AWS Cognito Hosted UI Authentication

This document explains how the Exam Monitoring System uses AWS Cognito Hosted UI for authentication.

## Overview

The application uses AWS Cognito User Pools with the Hosted UI for authentication, implementing the OAuth 2.0 Authorization Code Grant flow. This provides a secure, managed authentication experience without requiring custom login UI implementation.

## Architecture

### Components

1. **AWS Cognito User Pool**: Manages user identities and authentication
2. **Cognito Hosted UI**: Provides pre-built login/signup pages
3. **Frontend (JavaScript)**: Handles OAuth flow and token management
4. **Backend (API Gateway + Lambda)**: Validates tokens and authorizes requests

## Authentication Flow

### 1. Login Initiation

When a user clicks the login button, the frontend redirects to Cognito's hosted login page:

```javascript
login() {
    const cognitoUrl = `https://${CONFIG.COGNITO.HOSTED_UI_DOMAIN}/login`;
    const params = new URLSearchParams({
        client_id: CONFIG.COGNITO.CLIENT_ID,
        response_type: 'code',
        scope: 'email openid phone',
        redirect_uri: CONFIG.COGNITO.REDIRECT_URI
    });
    
    window.location.href = `${cognitoUrl}?${params.toString()}`;
}
```

**Parameters:**
- `client_id`: Identifies the application to Cognito
- `response_type: 'code'`: Requests an authorization code (OAuth 2.0 Authorization Code Grant)
- `scope`: Requests access to email, OpenID, and phone attributes
- `redirect_uri`: Where Cognito redirects after successful authentication

### 2. User Authentication

The user is redirected to:
```
https://us-east-1tpp8o3hv8.auth.us-east-1.amazoncognito.com/login
```

At this hosted UI, users can:
- Sign in with existing credentials
- Sign up for a new account
- Reset forgotten passwords
- Use social identity providers (if configured)

### 3. Authorization Code Exchange

After successful authentication, Cognito redirects back to the application with an authorization code:

```
http://localhost:5500/frontend/index.html?code=AUTHORIZATION_CODE
```

The frontend then exchanges this code for tokens:

```javascript
async handleCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
        // Exchange code for tokens
        const tokenResponse = await fetch(
            `https://${CONFIG.COGNITO.HOSTED_UI_DOMAIN}/oauth2/token`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    client_id: CONFIG.COGNITO.CLIENT_ID,
                    client_secret: CONFIG.COGNITO.CLIENT_SECRET,
                    code: code,
                    redirect_uri: CONFIG.COGNITO.REDIRECT_URI
                })
            }
        );

        if (tokenResponse.ok) {
            const tokens = await tokenResponse.json();
            this.storeTokens(tokens);
            // ... fetch user info
        }
    }
}
```

### 4. Token Storage

The application receives three types of tokens:

```javascript
storeTokens(tokens) {
    this.accessToken = tokens.access_token;      // For API authorization
    this.idToken = tokens.id_token;              // Contains user claims
    this.refreshToken = tokens.refresh_token;    // For token refresh
    
    // Store in localStorage
    localStorage.setItem('accessToken', this.accessToken);
    localStorage.setItem('idToken', this.idToken);
    localStorage.setItem('refreshToken', this.refreshToken);
    
    // Parse and store token expiry
    const payload = JSON.parse(atob(this.idToken.split('.')[1]));
    localStorage.setItem('tokenExpiry', payload.exp.toString());
}
```

**Token Types:**
- **ID Token**: JWT containing user identity claims (sub, email, etc.)
- **Access Token**: Used for API authorization
- **Refresh Token**: Long-lived token for obtaining new access tokens

### 5. Fetching User Information

After obtaining tokens, the app fetches user details:

```javascript
const userResponse = await fetch(
    `https://${CONFIG.COGNITO.HOSTED_UI_DOMAIN}/oauth2/userInfo`,
    {
        headers: {
            'Authorization': `Bearer ${this.accessToken}`
        }
    }
);

if (userResponse.ok) {
    this.userInfo = await userResponse.json();
    localStorage.setItem('userInfo', JSON.stringify(this.userInfo));
}
```

## Token Management

### Token Validation

The application validates tokens before making API requests:

```javascript
isTokenValid() {
    const token = this.idToken || this.accessToken;
    if (!token) return false;
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        return payload.exp > currentTime;
    } catch (e) {
        return false;
    }
}
```

### Token Refresh

When tokens expire, the application automatically refreshes them:

```javascript
async refreshAccessToken() {
    if (!this.refreshToken) return false;

    try {
        const response = await fetch(
            `https://${CONFIG.COGNITO.HOSTED_UI_DOMAIN}/oauth2/token`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    client_id: CONFIG.COGNITO.CLIENT_ID,
                    client_secret: CONFIG.COGNITO.CLIENT_SECRET,
                    refresh_token: this.refreshToken
                })
            }
        );

        if (response.ok) {
            const tokens = await response.json();
            this.storeTokens(tokens);
            return true;
        }
    } catch (error) {
        console.error('Token refresh error:', error);
    }

    return false;
}
```

### Authorization Headers

Before each API request, the app ensures valid tokens:

```javascript
async getAuthHeaders() {
    // Check if token needs refresh
    if (!this.isTokenValid() && this.refreshToken) {
        const refreshed = await this.refreshAccessToken();
        if (!refreshed) {
            this.logout();
            return null;
        }
    }

    // Use ID token for Cognito User Pool authorization
    const token = this.idToken || this.accessToken;
    
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}
```

## Backend Authorization

### API Gateway Cognito Authorizer

The backend uses API Gateway's built-in Cognito authorizer to validate tokens:

```yaml
functions:
  createQuiz:
    handler: src/handlers/quizzes.create
    events:
      - http:
          path: /quizzes
          method: post
          cors: true
          authorizer:
            name: cognitoAuthorizer
            type: COGNITO_USER_POOLS
            arn: arn:aws:cognito-idp:us-east-1:716121312547:userpool/us-east-1_TPP8O3hv8
```

**How it works:**
1. API Gateway receives request with `Authorization: Bearer <token>` header
2. Gateway validates the JWT signature against Cognito's public keys
3. If valid, Gateway extracts user claims and passes them to Lambda
4. Lambda receives user information in `event.requestContext.authorizer.claims`

### Accessing User Information in Lambda

Lambda functions can access authenticated user data:

```javascript
exports.create = async (event) => {
    // Get user ID from validated token
    const userId = event.requestContext.authorizer.claims.sub;
    
    // User email is also available
    const userEmail = event.requestContext.authorizer.claims.email;
    
    // Use userId to scope data to the authenticated user
    const quiz = {
        pk: `USER#${userId}`,
        sk: `QUIZ#${quizId}`,
        createdBy: userId,
        // ... other fields
    };
    
    await dynamodb.put({ TableName: TABLE_NAME, Item: quiz }).promise();
};
```

**Available Claims:**
- `sub`: Unique user identifier (UUID)
- `email`: User's email address
- `email_verified`: Boolean indicating email verification status
- `phone_number`: User's phone number (if provided)
- `cognito:username`: Username in Cognito

## Logout Flow

### Frontend Logout

```javascript
logout() {
    // Clear all stored tokens and user info
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('idToken');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('tokenExpiry');
    
    // Clear instance variables
    this.accessToken = null;
    this.refreshToken = null;
    this.idToken = null;
    this.userInfo = {};
    
    // Redirect to Cognito logout endpoint
    const logoutUrl = `https://${CONFIG.COGNITO.HOSTED_UI_DOMAIN}/logout`;
    const params = new URLSearchParams({
        client_id: CONFIG.COGNITO.CLIENT_ID,
        logout_uri: 'http://localhost:5500/frontend'
    });
    
    window.location.href = `${logoutUrl}?${params.toString()}`;
}
```

**Logout Process:**
1. Clear all local tokens and user data
2. Redirect to Cognito's logout endpoint
3. Cognito invalidates the session
4. User is redirected back to the application's logout URI

## Configuration

### Frontend Configuration

Located in `frontend/js/config.js`:

```javascript
const CONFIG = {
    API_BASE_URL: 'https://itai6504ka.execute-api.us-east-1.amazonaws.com/dev',
    
    COGNITO: {
        USER_POOL_ID: 'us-east-1_TPP8O3hv8',
        CLIENT_ID: '7bogt18iuc9oihg3puvbcmksr1',
        CLIENT_SECRET: '4bbhgcgkhj6h4h7op15p4hia53l1pso3ci6ahfj573nr7dvth2v',
        HOSTED_UI_DOMAIN: 'us-east-1tpp8o3hv8.auth.us-east-1.amazoncognito.com',
        REDIRECT_URI: 'http://localhost:5500/frontend/index.html'
    }
};
```

### Backend Configuration

Located in `backend/.env` and `backend/serverless.yml`:

```bash
# .env
COGNITO_USER_POOL_ID=us-east-1_TPP8O3hv8
COGNITO_CLIENT_ID=7bogt18iuc9oihg3puvbcmksr1
```

```yaml
# serverless.yml
provider:
  environment:
    COGNITO_USER_POOL_ID: us-east-1_TPP8O3hv8
    COGNITO_CLIENT_ID: 7bogt18iuc9oihg3puvbcmksr1
```

## Security Features

### 1. OAuth 2.0 Authorization Code Grant
- Most secure OAuth flow for web applications
- Authorization code is exchanged server-side (or in this case, client-side with client secret)
- Tokens are never exposed in URL

### 2. JWT Token Validation
- API Gateway validates JWT signatures using Cognito's public keys
- Ensures tokens haven't been tampered with
- Verifies token expiration automatically

### 3. Token Expiration
- ID tokens and access tokens expire (typically 1 hour)
- Refresh tokens are long-lived (typically 30 days)
- Automatic token refresh prevents session interruption

### 4. HTTPS Only
- All communication with Cognito uses HTTPS
- Tokens are transmitted securely

### 5. User Isolation
- Each user's data is scoped by their unique `sub` (user ID)
- Lambda functions use `userId` from validated token claims
- Prevents unauthorized access to other users' data

## Benefits of Cognito Hosted UI

1. **No Custom Authentication UI**: Pre-built, secure login pages
2. **Managed Security**: AWS handles password policies, MFA, account recovery
3. **Compliance**: Meets security standards (SOC, PCI DSS, HIPAA eligible)
4. **Scalability**: Handles millions of users automatically
5. **Social Identity Providers**: Easy integration with Google, Facebook, etc.
6. **Customization**: Hosted UI can be customized with CSS and logos
7. **Multi-Factor Authentication**: Built-in MFA support
8. **Account Recovery**: Forgot password flows handled automatically

## API Endpoints Protected by Cognito

### Protected Endpoints (Require Authentication)
- `POST /quizzes` - Create quiz
- `GET /quizzes` - List user's quizzes
- `GET /quizzes/{id}` - Get quiz details
- `PUT /quizzes/{id}/archive` - Archive quiz
- `PUT /quizzes/{id}/unarchive` - Unarchive quiz
- `DELETE /quizzes/{id}` - Delete quiz
- `GET /logs/{sessionId}` - Get session logs

### Public Endpoints (No Authentication)
- `POST /sessions/start` - Start student session
- `POST /sessions/end` - End student session
- `POST /logs` - Upload logs from desktop app

## Troubleshooting

### Common Issues

1. **Token Expired Error**
   - Solution: Token refresh should happen automatically
   - Check if refresh token is valid
   - User may need to re-authenticate

2. **Invalid Redirect URI**
   - Ensure redirect URI in code matches Cognito app client configuration
   - Check for trailing slashes and exact URL match

3. **CORS Errors**
   - Verify API Gateway has CORS enabled
   - Check that Cognito app client allows the origin

4. **401 Unauthorized**
   - Token may be expired or invalid
   - Check that ID token (not access token) is being sent
   - Verify Cognito authorizer ARN in serverless.yml

## Future Enhancements

1. **Social Identity Providers**: Add Google/Facebook login
2. **Multi-Factor Authentication**: Enable MFA for enhanced security
3. **Custom Domain**: Use custom domain for hosted UI (e.g., login.example.com)
4. **Advanced Security**: Implement advanced security features like risk-based authentication
5. **User Groups**: Use Cognito groups for role-based access control (professors vs admins)
