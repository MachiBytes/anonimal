const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

function getDbPath() {
  return process.env.DB_PATH || path.join(process.cwd(), 'data', 'database.sqlite');
}

async function migrate() {
  let db;
  
  try {
    console.log('Starting database migration...');
    
    const dbPath = getDbPath();
    const dir = path.dirname(dbPath);
    
    // Ensure the data directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
    
    // Connect to SQLite database
    db = new Database(dbPath);
    console.log(`Connected to database at: ${dbPath}`);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema (SQLite can handle multiple statements)
    db.exec(schema);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    if (db) {
      db.close();
    }
  }
}

migrate();
