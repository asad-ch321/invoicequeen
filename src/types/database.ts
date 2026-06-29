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
  last_sent_at: string | null;
  sent_count: number;
  last_reminder_at: string | null;
  reminder_count: number;
  late_fee_amount: number;
  public_token: string;
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
  tax_rate: number;
  position: number;
}

export interface CreditNote {
  id: string;
  user_id: string;
  invoice_id: string | null;
  client_id: string | null;
  credit_number: string;
  currency: string;
  amount: number;
  reason: string | null;
  status: 'issued' | 'refunded' | 'void';
  issue_date: string;
  created_at: string;
  updated_at: string;
  client?: Client;
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

export interface EstimateLineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface Estimate {
  id: string;
  user_id: string;
  client_id: string | null;
  estimate_number: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'converted';
  issue_date: string;
  valid_until: string | null;
  currency: string;
  line_items: EstimateLineItem[];
  tax_rate: number;
  discount: number;
  total: number;
  notes: string | null;
  signature_name: string | null;
  signed_at: string | null;
  converted_invoice_id: string | null;
  public_token: string;
  created_at: string;
  updated_at: string;
  client?: Client;
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  sku: string | null;
  unit_price: number;
  currency: string;
  track_inventory: boolean;
  stock_qty: number;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  expense_date: string;
  category: string | null;
  vendor: string | null;
  amount: number;
  currency: string;
  notes: string | null;
  created_at: string;
}

export interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  late_fee_enabled: boolean;
  late_fee_percent: number;
  late_fee_grace_days: number;
  reminder_enabled: boolean;
  paypal_me: string | null;
  stripe_payment_link: string | null;
  payment_instructions: string | null;
  profile_name: string | null;
  is_default: boolean;
  white_label: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  owner_id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  created_at: string;
}

