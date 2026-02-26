export interface Product {
  id: number;
  name: string;
  category: string;
  min_stock: number;
  unit: string;
}

export interface Supplier {
  id: number;
  name: string;
  country: string;
  contact: string;
  type: string;
  currency: string;
  exchange_rate: number;
}

export interface Batch {
  id: number;
  product_id: number;
  product_name?: string;
  purchase_id: number;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  cost_price: number;
  selling_price: number;
  zone: string;
  sanitary_reg_expiry: string;
  sanitary_status: 'Ativo' | 'Suspenso' | 'Recolhido' | 'Proibido';
  recall_reason?: string;
  unit?: string;
}

export interface Customer {
  id: number;
  name: string;
  tax_id: string;
  credit_limit: number;
  classification: 'A' | 'B' | 'C';
}

export interface Sale {
  id: number;
  customer_id: number;
  customer_name?: string;
  date: string;
  fiscal_number: string;
  total_amount: number;
  vat_amount: number;
  status: string;
}

export interface Account {
  id: number;
  code: string;
  name: string;
  balance: number;
}

export interface AuditLog {
  id: number;
  action: string;
  table_name: string;
  record_id: number;
  old_value: string;
  new_value: string;
  timestamp: string;
}
