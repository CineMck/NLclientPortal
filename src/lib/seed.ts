import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "portal.db");
const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    company TEXT,
    company_id INTEGER,
    role TEXT NOT NULL DEFAULT 'client',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id)
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

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    user_id INTEGER,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    clickup_comment_id TEXT,
    source TEXT NOT NULL DEFAULT 'portal',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
  );

  CREATE TABLE IF NOT EXISTS notification_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    email_on_status_change INTEGER DEFAULT 1,
    email_on_comment INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

const adminPassword = bcrypt.hashSync("admin123", 10);
const demoPassword = bcrypt.hashSync("demo123", 10);

// Create a demo company
const existingCompany = db.prepare("SELECT id FROM companies WHERE name = ?").get("Demo Company");
let companyId: number;
if (!existingCompany) {
  const result = db.prepare("INSERT INTO companies (name) VALUES (?)").run("Demo Company");
  companyId = Number(result.lastInsertRowid);
  console.log("Demo company created: Demo Company");
} else {
  companyId = (existingCompany as { id: number }).id;
  console.log("Demo company already exists.");
}

// Create admin user
const existingAdmin = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@neuluma.com");
if (!existingAdmin) {
  db.prepare(
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)"
  ).run("Admin", "admin@neuluma.com", adminPassword, "admin");
  console.log("Admin user created: admin@neuluma.com / admin123");
} else {
  console.log("Admin user already exists.");
}

// Create demo client user
const existingDemo = db.prepare("SELECT id FROM users WHERE email = ?").get("demo@example.com");
if (!existingDemo) {
  db.prepare(
    "INSERT INTO users (name, email, password, company, company_id, role) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("Demo Client", "demo@example.com", demoPassword, "Demo Company", companyId, "client");
  console.log("Demo user created: demo@example.com / demo123");
} else {
  console.log("Demo user already exists.");
}

db.close();
console.log("Database seeded successfully!");
