import express from 'express';
import { createServer as createViteServer } from 'vite';
import db, { initDb } from './db.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Database
  initDb();

  // --- API ROUTES ---

  // Products
  app.get('/api/products', (req, res) => {
    const products = db.prepare('SELECT * FROM products').all();
    res.json(products);
  });

  app.post('/api/products', (req, res) => {
    const { name, category, min_stock, unit } = req.body;
    const result = db.prepare('INSERT INTO products (name, category, min_stock, unit) VALUES (?, ?, ?, ?)').run(name, category, min_stock, unit);
    res.json({ id: result.lastInsertRowid });
  });

  // Suppliers
  app.get('/api/suppliers', (req, res) => {
    const suppliers = db.prepare('SELECT * FROM suppliers').all();
    res.json(suppliers);
  });

  app.post('/api/suppliers', (req, res) => {
    const { name, country, contact, type, currency, exchange_rate } = req.body;
    const result = db.prepare('INSERT INTO suppliers (name, country, contact, type, currency, exchange_rate) VALUES (?, ?, ?, ?, ?, ?)').run(name, country, contact, type, currency, exchange_rate || 1.0);
    res.json({ id: result.lastInsertRowid });
  });

  // Purchases
  app.get('/api/purchases', (req, res) => {
    const purchases = db.prepare(`
      SELECT p.*, s.name as supplier_name 
      FROM purchases p 
      JOIN suppliers s ON p.supplier_id = s.id
      ORDER BY p.date DESC
    `).all();
    res.json(purchases);
  });

  app.post('/api/purchases', (req, res) => {
    const { supplier_id, total_amount, currency, exchange_rate, incoterm, items } = req.body;
    
    // Generate Purchase Fiscal Number
    const lastPurchase = db.prepare('SELECT fiscal_number FROM purchases ORDER BY id DESC LIMIT 1').get() as any;
    let nextNum = 1;
    if (lastPurchase && lastPurchase.fiscal_number) {
      const parts = lastPurchase.fiscal_number.split('-');
      if (parts.length > 1) {
        nextNum = parseInt(parts[1]) + 1;
      }
    }
    const fiscal_number = `COM-${nextNum.toString().padStart(6, '0')}`;

    const transaction = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO purchases (supplier_id, fiscal_number, total_amount, currency, exchange_rate, incoterm, status) 
        VALUES (?, ?, ?, ?, ?, ?, 'Completed')
      `).run(supplier_id, fiscal_number, total_amount, currency, exchange_rate, incoterm);
      const purchaseId = result.lastInsertRowid;

      for (const item of items) {
        // Create Batch
        db.prepare(`
          INSERT INTO batches (product_id, purchase_id, batch_number, expiry_date, quantity, cost_price, selling_price, zone, sanitary_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Ativo')
        `).run(item.product_id, purchaseId, item.batch_number, item.expiry_date, item.quantity, item.cost_price, item.selling_price, item.zone);
        
        const batchId = db.prepare('SELECT last_insert_rowid() as id').get() as any;

        // Create Stock Movement
        db.prepare('INSERT INTO stock_movements (batch_id, type, quantity, reason) VALUES (?, ?, ?, ?)')
          .run(batchId.id, 'Purchase', item.quantity, `Compra #${purchaseId}`);
      }

      // OHADA Accounting: Debit Stock (31), Credit Supplier (401)
      db.prepare('UPDATE accounts SET balance = balance + ? WHERE code = "31"').run(total_amount * exchange_rate);
      db.prepare('UPDATE accounts SET balance = balance + ? WHERE code = "401"').run(total_amount * exchange_rate);

      return purchaseId;
    });

    try {
      const purchaseId = transaction();
      res.json({ id: purchaseId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Batches & Inventory
  app.get('/api/batches', (req, res) => {
    const batches = db.prepare(`
      SELECT 
        b.*, 
        p.name as product_name, 
        p.unit, 
        s.name as supplier_name, 
        pur.date as purchase_date,
        pur.fiscal_number as purchase_ref
      FROM batches b 
      JOIN products p ON b.product_id = p.id
      LEFT JOIN purchases pur ON b.purchase_id = pur.id
      LEFT JOIN suppliers s ON pur.supplier_id = s.id
      WHERE b.quantity > 0
      ORDER BY b.expiry_date ASC
    `).all();
    res.json(batches);
  });

  // Recall Report
  app.get('/api/recall/:batchId', (req, res) => {
    const { batchId } = req.params;
    const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId);
    const sales = db.prepare(`
      SELECT s.*, c.name as customer_name, si.quantity
      FROM sales s
      JOIN sale_items si ON s.id = si.sale_id
      JOIN customers c ON s.customer_id = c.id
      WHERE si.batch_id = ?
    `).all(batchId);
    res.json({ batch, sales });
  });

  app.post('/api/recall/:batchId', (req, res) => {
    const { batchId } = req.params;
    const { reason, status } = req.body; // status: 'Recolhido' | 'Proibido'
    db.prepare('UPDATE batches SET sanitary_status = ?, recall_reason = ? WHERE id = ?').run(status, reason, batchId);
    
    // Log audit
    db.prepare('INSERT INTO audit_logs (action, table_name, record_id, new_value) VALUES (?, ?, ?, ?)')
      .run('RECALL_INITIATED', 'batches', batchId, JSON.stringify({ status, reason }));

    res.json({ success: true });
  });

  // Customers
  app.get('/api/customers', (req, res) => {
    const customers = db.prepare('SELECT * FROM customers').all();
    res.json(customers);
  });

  app.post('/api/customers', (req, res) => {
    const { name, tax_id, credit_limit, classification } = req.body;
    const result = db.prepare('INSERT INTO customers (name, tax_id, credit_limit, classification) VALUES (?, ?, ?, ?)').run(name, tax_id, credit_limit, classification);
    res.json({ id: result.lastInsertRowid });
  });

  // Sales & Invoicing
  app.get('/api/sales', (req, res) => {
    const sales = db.prepare(`
      SELECT s.*, c.name as customer_name 
      FROM sales s 
      JOIN customers c ON s.customer_id = c.id
      ORDER BY s.date DESC
    `).all();
    res.json(sales);
  });

  app.post('/api/sales', (req, res) => {
    const { customer_id, items, total_amount, vat_amount } = req.body;
    
    // 1. Check Credit Limit
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id) as any;
    const currentDebt = db.prepare('SELECT SUM(total_amount) as debt FROM sales WHERE customer_id = ? AND status = "Completed"').get(customer_id) as any;
    
    if (customer.credit_limit > 0 && (currentDebt.debt || 0) + total_amount > customer.credit_limit) {
      return res.status(400).json({ error: 'Limite de crédito excedido' });
    }

    // 2. Generate Fiscal Number (Sequential)
    const lastSale = db.prepare('SELECT fiscal_number FROM sales ORDER BY id DESC LIMIT 1').get() as any;
    let nextNum = 1;
    if (lastSale && lastSale.fiscal_number) {
      nextNum = parseInt(lastSale.fiscal_number.split('-')[1]) + 1;
    }
    const fiscal_number = `FAT-${nextNum.toString().padStart(6, '0')}`;

    const transaction = db.transaction(() => {
      // Create Sale
      const saleResult = db.prepare(`
        INSERT INTO sales (customer_id, fiscal_number, total_amount, vat_amount) 
        VALUES (?, ?, ?, ?)
      `).run(customer_id, fiscal_number, total_amount, vat_amount);
      const saleId = saleResult.lastInsertRowid;

      for (const item of items) {
        // Update Batch Quantity
        db.prepare('UPDATE batches SET quantity = quantity - ? WHERE id = ?').run(item.quantity, item.batch_id);
        
        // Create Sale Item
        db.prepare('INSERT INTO sale_items (sale_id, batch_id, quantity, unit_price) VALUES (?, ?, ?, ?)')
          .run(saleId, item.batch_id, item.quantity, item.unit_price);
        
        // Create Stock Movement
        db.prepare('INSERT INTO stock_movements (batch_id, type, quantity, reason) VALUES (?, ?, ?, ?)')
          .run(item.batch_id, 'Sale', -item.quantity, `Venda ${fiscal_number}`);
      }

      // OHADA Accounting (Simplified)
      // Debit Client (411), Credit Sales (701), Credit VAT (443)
      db.prepare('UPDATE accounts SET balance = balance + ? WHERE code = "411"').run(total_amount);
      db.prepare('UPDATE accounts SET balance = balance + ? WHERE code = "701"').run(total_amount - vat_amount);
      db.prepare('UPDATE accounts SET balance = balance + ? WHERE code = "443"').run(vat_amount);

      return saleId;
    });

    try {
      const saleId = transaction();
      res.json({ id: saleId, fiscal_number });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Dashboard Stats
  app.get('/api/stats', (req, res) => {
    const totalSales = db.prepare('SELECT SUM(total_amount) as total FROM sales').get() as any;
    const stockValue = db.prepare('SELECT SUM(quantity * cost_price) as value FROM batches').get() as any;
    const criticalExpiry = db.prepare('SELECT COUNT(*) as count FROM batches WHERE expiry_date <= date("now", "+60 days")').get() as any;
    const lowStock = db.prepare(`
      SELECT COUNT(*) as count 
      FROM products p 
      JOIN (SELECT product_id, SUM(quantity) as total FROM batches GROUP BY product_id) b ON p.id = b.product_id
      WHERE b.total <= p.min_stock
    `).get() as any;

    res.json({
      totalSales: totalSales.total || 0,
      stockValue: stockValue.value || 0,
      criticalExpiry: criticalExpiry.count || 0,
      lowStock: lowStock.count || 0
    });
  });

  // Audit Logs
  app.get('/api/audit', (req, res) => {
    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100').all();
    res.json(logs);
  });

  // OHADA Accounts
  app.get('/api/accounts', (req, res) => {
    const accounts = db.prepare('SELECT * FROM accounts').all();
    res.json(accounts);
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
