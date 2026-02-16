# Docker Deployment Guide

This document provides instructions for building and running the Anonymous Messaging Platform using Docker.

## Prerequisites

- Docker installed (version 20.10 or higher)
- Docker Compose (optional, for local development with PostgreSQL)

## Building the Docker Image

Build the production Docker image:

```bash
docker build -t anonymous-messaging-platform:latest .
```

The build process uses a multi-stage approach:
1. **deps stage**: Installs production dependencies
2. **builder stage**: Builds the Next.js application
3. **runner stage**: Creates minimal production image

## Running the Container

### Basic Run

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:password@host:5432/dbname" \
  -e COGNITO_USER_POOL_ID="your-pool-id" \
  -e COGNITO_CLIENT_ID="your-client-id" \
  -e COGNITO_DOMAIN="your-cognito-domain" \
  -e COGNITO_REDIRECT_URI="http://localhost:3000/api/auth/cognito-callback" \
  -e SESSION_SECRET="your-secret-key" \
  anonymous-messaging-platform:latest
```

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `COGNITO_USER_POOL_ID` | AWS Cognito User Pool ID | `us-east-1_xxxxxxxxx` |
| `COGNITO_CLIENT_ID` | AWS Cognito App Client ID | `xxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `COGNITO_DOMAIN` | AWS Cognito Domain | `your-app.auth.us-east-1.amazoncognito.com` |
| `COGNITO_REDIRECT_URI` | OAuth callback URL | `https://yourdomain.com/api/auth/cognito-callback` |
| `SESSION_SECRET` | Secret key for session encryption | `random-secure-string` |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `production` |
| `CORS_ORIGIN` | CORS allowed origins | `*` |

## Using Environment File

Create a `.env.production` file:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_DOMAIN=your-app.auth.us-east-1.amazoncognito.com
COGNITO_REDIRECT_URI=http://localhost:3000/api/auth/cognito-callback
SESSION_SECRET=your-secret-key
```

Run with environment file:

```bash
docker run -p 3000:3000 --env-file .env.production anonymous-messaging-platform:latest
```

## Health Check

The container includes a health check that verifies:
- Application is responding
- Database connection is working

Check container health:

```bash
docker ps
```

Look for the `STATUS` column showing `healthy` or `unhealthy`.

Manual health check:

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Docker Compose (Local Development)

For local development with PostgreSQL, create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/anonymous_messaging
      COGNITO_USER_POOL_ID: ${COGNITO_USER_POOL_ID}
      COGNITO_CLIENT_ID: ${COGNITO_CLIENT_ID}
      COGNITO_DOMAIN: ${COGNITO_DOMAIN}
      COGNITO_REDIRECT_URI: http://localhost:3000/api/auth/cognito-callback
      SESSION_SECRET: dev-secret-change-in-production
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: anonymous_messaging
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

Run with Docker Compose:

```bash
docker-compose up -d
```

## Database Migrations

Run database migrations after starting the container:

```bash
docker exec -it <container-id> npm run db:migrate
```

Or include in your deployment script:

```bash
docker run --rm \
  -e DATABASE_URL="postgresql://user:password@host:5432/dbname" \
  anonymous-messaging-platform:latest \
  npm run db:migrate
```

## Production Deployment

### AWS ECS Example

1. Push image to ECR:
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker tag anonymous-messaging-platform:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/anonymous-messaging-platform:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/anonymous-messaging-platform:latest
```

2. Create ECS task definition with environment variables
3. Configure ALB for port 3000
4. Set up RDS PostgreSQL instance
5. Configure Cognito redirect URI to match ALB domain

### Security Considerations

- Never commit `.env` files with real credentials
- Use secrets management (AWS Secrets Manager, etc.)
- Run container as non-root user (already configured)
- Keep base images updated
- Use specific image tags in production (not `latest`)

## Troubleshooting

### Container won't start

Check logs:
```bash
docker logs <container-id>
```

### Database connection fails

Verify:
- Database is accessible from container
- Connection string is correct
- Database exists and migrations are run

### Health check failing

Check health endpoint manually:
```bash
docker exec -it <container-id> wget -O- http://localhost:3000/api/health
```

## Image Size Optimization

The multi-stage build produces a minimal image:
- Uses Alpine Linux (small base)
- Only includes production dependencies
- Excludes dev tools and test files

Check image size:
```bash
docker images anonymous-messaging-platform
```

Expected size: ~200-300 MB
