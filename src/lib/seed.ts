import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "portal.db");
const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    company TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    due_date TEXT,
    urgency TEXT NOT NULL DEFAULT 'medium',
    notes TEXT,
    clickup_task_id TEXT,
    clickup_status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    mimetype TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
  );
`);

// Create a demo user
const hashedPassword = bcrypt.hashSync("demo123", 10);

const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get("demo@example.com");

if (!existingUser) {
  db.prepare(
    "INSERT INTO users (name, email, password, company) VALUES (?, ?, ?, ?)"
  ).run("Demo Client", "demo@example.com", hashedPassword, "Demo Company");
  console.log("Demo user created: demo@example.com / demo123");
} else {
  console.log("Demo user already exists.");
}

db.close();
console.log("Database seeded successfully!");
