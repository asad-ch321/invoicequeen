export interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  client_id: string | null;
  invoice_number: string;
  status: 'draft' | 'unpaid' | 'paid' | 'overdue' | 'cancelled';
  issue_date: string;
  due_date: string | null;
  currency: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount: number;
  total: number;
  notes: string | null;
  payment_link: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  client?: Client;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  position: number;
}

export interface RecurringInvoice {
  id: string;
  user_id: string;
  client_id: string | null;
  template_name: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  next_run_date: string;
  currency: string;
  line_items: Array<{ description: string; quantity: number; unit_price: number }>;
  tax_rate: number;
  discount: number;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  client?: Client;
}

export interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

