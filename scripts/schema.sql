-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  cognito_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_cognito_id ON users(cognito_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Channels table
CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_channels_code ON channels(code);
CREATE INDEX IF NOT EXISTS idx_channels_owner_id ON channels(owner_id);

-- Anonymous users table
CREATE TABLE IF NOT EXISTS anonymous_users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon_url TEXT NOT NULL,
  icon_background_color TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(channel_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_anon_users_channel_session ON anonymous_users(channel_id, session_id);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  anon_user_id TEXT NOT NULL REFERENCES anonymous_users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_approved_at ON messages(approved_at DESC);
