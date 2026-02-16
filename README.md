# Anonymous Messaging Platform

A real-time anonymous feedback platform built with Next.js, Socket.io, SQLite, and Amazon Cognito.

## Setup

### Prerequisites

- Node.js 18+ and npm
- Amazon Cognito User Pool

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your Cognito credentials. The database path is optional (defaults to `data/database.sqlite`).

3. Run database migrations:
```bash
npm run db:migrate
```

This will create the SQLite database file and set up all tables.

### Development

Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

See `.env.example` for all required environment variables:

- **Database**: `DB_PATH` (optional, defaults to `data/database.sqlite`)
- **Cognito**: `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_DOMAIN`, `COGNITO_REDIRECT_URI`
- **Application**: `NEXT_PUBLIC_APP_URL`, `SESSION_SECRET`

## Project Structure

```
├── app/                    # Next.js app directory
├── lib/                    # Shared utilities
│   └── db.ts              # Database connection layer
├── scripts/               # Database scripts
│   ├── schema.sql         # SQLite schema
│   └── migrate.js         # Migration runner
├── types/                 # TypeScript type definitions
│   └── database.ts        # Database model types
├── config/                # Configuration files
└── data/                  # SQLite database (created on first run)
```

## Database

The application uses SQLite with the following tables:

- `users` - Channel owners (authenticated via Cognito)
- `channels` - Message channels with unique codes
- `anonymous_users` - Anonymous user identities per session
- `messages` - Messages with approval workflow

Run migrations with: `npm run db:migrate`

### Why SQLite?

SQLite provides a simple, serverless database solution perfect for this application:
- Zero configuration required
- No separate database server to manage
- Single file contains entire database
- Fast for read-heavy workloads
- Easy backup and restore

For more details, see [docs/sqlite-migration.md](docs/sqlite-migration.md).

## License

MIT
