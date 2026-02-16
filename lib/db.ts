import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;

function getDbPath(): string {
  // Use DB_PATH from env if provided, otherwise default to data/database.sqlite
  return process.env.DB_PATH || path.join(process.cwd(), 'data', 'database.sqlite');
}

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = getDbPath();
    
    // Ensure the data directory exists
    const fs = require('fs');
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    db = new Database(dbPath);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Set WAL mode for better concurrency
    db.pragma('journal_mode = WAL');
    
    console.log(`SQLite database connected at: ${dbPath}`);
  }
  
  return db;
}

// Helper function to generate UUID-like strings (compatible with SQLite)
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Query function that mimics pg's interface for easier migration
export function query(text: string, params?: unknown[]) {
  const database = getDb();
  
  // Convert PostgreSQL-style $1, $2 placeholders to SQLite ? placeholders
  let sqliteQuery = text.replace(/\$(\d+)/g, '?');
  
  // Replace PostgreSQL NOW() with SQLite datetime('now')
  sqliteQuery = sqliteQuery.replace(/NOW\(\)/gi, "datetime('now')");
  
  try {
    // Handle RETURNING clause (SQLite doesn't support it natively)
    const returningMatch = sqliteQuery.match(/RETURNING\s+(.+?)(?:;|$)/is);
    
    if (returningMatch) {
      // Remove RETURNING clause from the query
      const queryWithoutReturning = sqliteQuery.replace(/RETURNING\s+.+?(?:;|$)/is, '').trim();
      
      // Determine if it's an INSERT or UPDATE
      const isInsert = queryWithoutReturning.trim().toUpperCase().startsWith('INSERT');
      const isUpdate = queryWithoutReturning.trim().toUpperCase().startsWith('UPDATE');
      
      if (isInsert || isUpdate) {
        const stmt = database.prepare(queryWithoutReturning);
        const info = params ? stmt.run(...params) : stmt.run();
        
        if (info.changes > 0) {
          // Extract table name
          let tableName = '';
          if (isInsert) {
            const tableMatch = queryWithoutReturning.match(/INSERT\s+INTO\s+(\w+)/i);
            tableName = tableMatch ? tableMatch[1] : '';
          } else if (isUpdate) {
            const tableMatch = queryWithoutReturning.match(/UPDATE\s+(\w+)/i);
            tableName = tableMatch ? tableMatch[1] : '';
          }
          
          if (tableName) {
            // For INSERT, use last inserted rowid
            if (isInsert && info.lastInsertRowid) {
              const selectStmt = database.prepare(`SELECT * FROM ${tableName} WHERE rowid = ?`);
              const row = selectStmt.get(info.lastInsertRowid);
              return Promise.resolve({ rows: row ? [row] : [], rowCount: info.changes });
            }
            
            // For UPDATE, try to extract WHERE clause to fetch updated rows
            if (isUpdate) {
              const whereMatch = queryWithoutReturning.match(/WHERE\s+(.+?)(?:;|$)/is);
              if (whereMatch) {
                // Reconstruct SELECT with same WHERE clause
                const whereClause = whereMatch[1].trim();
                const selectQuery = `SELECT * FROM ${tableName} WHERE ${whereClause}`;
                const selectStmt = database.prepare(selectQuery);
                const rows = params ? selectStmt.all(...params.slice(-whereClause.split('?').length + 1)) : selectStmt.all();
                return Promise.resolve({ rows, rowCount: info.changes });
              }
            }
          }
        }
        
        return Promise.resolve({ rows: [], rowCount: info.changes });
      }
    }
    
    // Determine if it's a SELECT query
    const isSelect = sqliteQuery.trim().toUpperCase().startsWith('SELECT') ||
                     sqliteQuery.trim().toUpperCase().startsWith('WITH');
    
    if (isSelect) {
      const stmt = database.prepare(sqliteQuery);
      const rows = params ? stmt.all(...params) : stmt.all();
      return Promise.resolve({ rows, rowCount: rows.length });
    } else {
      const stmt = database.prepare(sqliteQuery);
      const info = params ? stmt.run(...params) : stmt.run();
      return Promise.resolve({ rows: [], rowCount: info.changes });
    }
  } catch (error) {
    return Promise.reject(error);
  }
}

export async function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

// Export the pool name for backward compatibility
export const closePool = closeDb;
