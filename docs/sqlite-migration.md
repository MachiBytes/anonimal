# PostgreSQL to SQLite Migration Guide

This document describes the migration from PostgreSQL to SQLite for the Anonymous Messaging Platform.

## Overview

The application has been migrated from PostgreSQL to SQLite to simplify deployment and reduce infrastructure dependencies. SQLite is a serverless, file-based database that requires no separate database server.

## Changes Made

### 1. Dependencies

**Removed:**
- `pg` - PostgreSQL client
- `@types/pg` - TypeScript types for pg

**Added:**
- `better-sqlite3` - Fast SQLite3 client for Node.js
- `@types/better-sqlite3` - TypeScript types

### 2. Database Configuration

**Before (PostgreSQL):**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=anonymous_messaging
DB_USER=postgres
DB_PASSWORD=your_password_here
```

**After (SQLite):**
```env
DB_PATH=data/database.sqlite
```

The database is now stored as a single file. If `DB_PATH` is not specified, it defaults to `data/database.sqlite` in the project root.

### 3. Schema Changes

SQLite uses different data types and syntax compared to PostgreSQL:

| PostgreSQL | SQLite | Notes |
|------------|--------|-------|
| `UUID` | `TEXT` | UUIDs stored as text strings |
| `VARCHAR(n)` | `TEXT` | SQLite uses dynamic typing |
| `TIMESTAMP` | `TEXT` | ISO 8601 datetime strings |
| `gen_random_uuid()` | `lower(hex(randomblob(16)))` | UUID generation |
| `NOW()` | `datetime('now')` | Current timestamp |

### 4. Database Connection

**lib/db.ts** has been completely rewritten:

- No connection pooling needed (SQLite is embedded)
- Single database connection reused across requests
- Automatic directory creation for database file
- Foreign keys enabled by default
- WAL (Write-Ahead Logging) mode for better concurrency

### 5. Query Compatibility Layer

The `query()` function maintains PostgreSQL-like interface:

```typescript
// Automatically converts PostgreSQL syntax to SQLite
query('SELECT * FROM users WHERE id = $1', [userId])
```

**Automatic conversions:**
- `$1, $2, $3` → `?, ?, ?` (parameter placeholders)
- `NOW()` → `datetime('now')`
- `RETURNING *` → Emulated by fetching inserted/updated rows

### 6. RETURNING Clause Emulation

SQLite doesn't support `RETURNING` clause natively. The db layer emulates it:

**For INSERT:**
```typescript
// Original PostgreSQL query
INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *

// Automatically handled:
// 1. Execute INSERT without RETURNING
// 2. Fetch the inserted row using last_insert_rowid()
// 3. Return the row in the same format
```

**For UPDATE:**
```typescript
// Original PostgreSQL query
UPDATE users SET name = $1 WHERE id = $2 RETURNING *

// Automatically handled:
// 1. Execute UPDATE without RETURNING
// 2. Fetch updated rows using the same WHERE clause
// 3. Return the rows in the same format
```

## Installation

1. **Remove old dependencies:**
```bash
npm uninstall pg @types/pg
```

2. **Install new dependencies:**
```bash
npm install better-sqlite3 @types/better-sqlite3
```

3. **Update environment variables:**
```bash
# Remove PostgreSQL config from .env
# Add SQLite config
DB_PATH=data/database.sqlite
```

4. **Run migration:**
```bash
npm run db:migrate
```

This will:
- Create the `data/` directory if it doesn't exist
- Create the SQLite database file
- Execute the schema to create all tables and indexes

## Benefits of SQLite

1. **Simplified Deployment:**
   - No separate database server to manage
   - No connection strings or credentials
   - Single file contains entire database

2. **Zero Configuration:**
   - No installation required
   - No server setup or maintenance
   - Works out of the box

3. **Performance:**
   - Faster for read-heavy workloads
   - No network latency
   - Efficient for small to medium datasets

4. **Portability:**
   - Database is a single file
   - Easy to backup (just copy the file)
   - Easy to version control (for development)

5. **Development Experience:**
   - Instant setup for new developers
   - No Docker or external services needed
   - Perfect for local development

## Limitations

1. **Concurrency:**
   - SQLite handles concurrent reads well
   - Write operations are serialized
   - WAL mode improves concurrent access

2. **Scalability:**
   - Best for applications with < 100K requests/day
   - Not suitable for high-write workloads
   - Consider PostgreSQL for large-scale production

3. **Network Access:**
   - Database must be on same machine as application
   - Cannot be accessed remotely like PostgreSQL
   - Not suitable for distributed systems

## File Structure

```
project-root/
├── data/
│   ├── database.sqlite          # Main database file
│   ├── database.sqlite-shm      # Shared memory file (WAL mode)
│   └── database.sqlite-wal      # Write-ahead log (WAL mode)
├── scripts/
│   ├── schema.sql               # SQLite schema
│   └── migrate.js               # Migration script
└── lib/
    └── db.ts                    # Database connection layer
```

## Backup and Restore

### Backup
```bash
# Simple file copy
cp data/database.sqlite data/database.backup.sqlite

# Or use SQLite's backup command
sqlite3 data/database.sqlite ".backup data/database.backup.sqlite"
```

### Restore
```bash
# Simple file copy
cp data/database.backup.sqlite data/database.sqlite
```

## Development vs Production

### Development
- Use file-based SQLite (current setup)
- Fast iteration and testing
- No external dependencies

### Production (Small Scale)
- SQLite works well for small to medium applications
- Ensure regular backups
- Monitor database file size

### Production (Large Scale)
- Consider migrating back to PostgreSQL
- Use managed database services (AWS RDS, etc.)
- Implement proper scaling strategies

## Troubleshooting

### Database Locked Error
```
Error: SQLITE_BUSY: database is locked
```

**Solution:**
- WAL mode is enabled by default to reduce locking
- Ensure no other processes are accessing the database
- Check for long-running transactions

### Foreign Key Constraint Failed
```
Error: FOREIGN KEY constraint failed
```

**Solution:**
- Foreign keys are enabled by default
- Ensure referenced records exist before inserting
- Check cascade delete settings

### File Permission Issues
```
Error: SQLITE_CANTOPEN: unable to open database file
```

**Solution:**
- Ensure `data/` directory exists and is writable
- Check file permissions on database file
- Verify DB_PATH is correct

## Testing

All existing tests should work without modification since the query interface remains the same. The compatibility layer handles the differences between PostgreSQL and SQLite.

## Rollback to PostgreSQL

If you need to switch back to PostgreSQL:

1. Reinstall PostgreSQL dependencies
2. Restore the original `lib/db.ts` from git history
3. Update environment variables
4. Run migrations against PostgreSQL

The application code doesn't need changes since the query interface is compatible.
