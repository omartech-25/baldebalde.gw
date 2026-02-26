import Database from 'better-sqlite3';
import { join } from 'path';

const db = new Database('guifarma.db');
db.pragma('journal_mode = WAL');

export function initDb() {
  // Products
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      min_stock INTEGER DEFAULT 0,
      unit TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Suppliers
  db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      country TEXT,
      contact TEXT,
      type TEXT, -- Manufacturer | Distributor | Importador
      currency TEXT DEFAULT 'XOF',
      exchange_rate REAL DEFAULT 1.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Purchases
  db.exec(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER,
      fiscal_number TEXT UNIQUE,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      total_amount REAL,
      currency TEXT,
      exchange_rate REAL DEFAULT 1.0,
      incoterm TEXT, -- CIF | FOB | EXW
      status TEXT DEFAULT 'Pending',
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    )
  `);

  // Batches
  db.exec(`
    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      purchase_id INTEGER,
      batch_number TEXT NOT NULL,
      expiry_date DATE NOT NULL,
      quantity INTEGER DEFAULT 0,
      cost_price REAL,
      selling_price REAL,
      zone TEXT, -- Normal | Frio | Controlados
      sanitary_reg_expiry DATE,
      sanitary_status TEXT DEFAULT 'Ativo', -- Ativo | Suspenso | Recolhido | Proibido
      recall_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (purchase_id) REFERENCES purchases(id)
    )
  `);

  // Customers
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      tax_id TEXT,
      credit_limit REAL DEFAULT 0,
      classification TEXT DEFAULT 'C', -- A | B | C
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Sales
  db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      user_id INTEGER,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      fiscal_number TEXT UNIQUE,
      total_amount REAL,
      vat_amount REAL,
      status TEXT DEFAULT 'Completed',
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `);

  // Sale Items
  db.exec(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER,
      batch_id INTEGER,
      quantity INTEGER,
      unit_price REAL,
      FOREIGN KEY (sale_id) REFERENCES sales(id),
      FOREIGN KEY (batch_id) REFERENCES batches(id)
    )
  `);

  // Stock Movements
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER,
      type TEXT, -- Purchase | Sale | Adjustment | Recall | Loss | Donation
      quantity INTEGER,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      reason TEXT,
      user_id INTEGER,
      FOREIGN KEY (batch_id) REFERENCES batches(id)
    )
  `);

  // Audit Logs (Immutable)
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT,
      table_name TEXT,
      record_id INTEGER,
      old_value TEXT,
      new_value TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT
    )
  `);

  // OHADA Accounts
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL, -- OHADA Code
      name TEXT NOT NULL,
      balance REAL DEFAULT 0
    )
  `);

  // Initialize basic OHADA accounts if empty
  const accountCount = db.prepare('SELECT COUNT(*) as count FROM accounts').get() as { count: number };
  if (accountCount.count === 0) {
    const initialAccounts = [
      { code: '31', name: 'Stocks de Marchandises' },
      { code: '401', name: 'Fournisseurs' },
      { code: '411', name: 'Clients' },
      { code: '521', name: 'Banques' },
      { code: '571', name: 'Caisse' },
      { code: '443', name: 'Etat, TVA Facturée' },
      { code: '701', name: 'Ventes de Marchandises' },
    ];
    const insert = db.prepare('INSERT INTO accounts (code, name) VALUES (?, ?)');
    initialAccounts.forEach(acc => insert.run(acc.code, acc.name));
  }
}

export default db;
