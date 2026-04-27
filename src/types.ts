export type User = {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  roles: string[];
  permissions: string[];
};

export type Category = {
  id: number;
  name: string;
  description?: string | null;
  image?: string | null;
};

export type Product = {
  id: number;
  barcode: string;
  sku: string;
  title: string;
  description: string;
  sell_price: number;
  buy_price: number;
  stock: number;
  image: string;
  category?: {
    id: number;
    name: string;
  };
};

export type PaginatedProductResponse = {
  data: Product[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type Customer = {
  id: number;
  name: string;
  no_telp: string;
  address: string;
  province_name?: string | null;
  regency_name?: string | null;
  district_name?: string | null;
  village_name?: string | null;
};

export type PaymentGateway = {
  value: string;
  label: string;
  description: string;
};

export type BankAccount = {
  id: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  logo_url?: string | null;
};

export type CartItem = {
  id: number;
  qty: number;
  price: number;
  line_total: number;
  product: Product;
};

export type CartPayload = {
  items: CartItem[];
  items_count: number;
  subtotal: number;
};

export type HeldCart = {
  hold_id: string;
  label: string;
  held_at: string;
  items_count: number;
  total: number;
  items: CartItem[];
};

export type BootstrapPayload = {
  user: Pick<User, 'id' | 'name' | 'email'>;
  categories: Category[];
  customers: Customer[];
  payment_gateways: PaymentGateway[];
  default_gateway: string;
  bank_accounts: BankAccount[];
  cart: CartPayload;
  held_carts: HeldCart[];
  dashboard_highlights: {
    products: number;
    customers: number;
    transactions: number;
  };
};

export type LoginResponse = {
  token: string;
  user: User;
};

export type TransactionSummary = {
  id: number;
  invoice: string;
  customer_name?: string | null;
  cashier_name?: string | null;
  grand_total: number;
  payment_method: string;
  payment_status: string;
  total_items: number;
  total_profit: number;
  created_at: string;
};

export type TransactionDetail = {
  id: number;
  invoice: string;
  grand_total: number;
  discount: number;
  shipping_cost: number;
  cash: number;
  change: number;
  payment_method: string;
  payment_status: string;
  payment_reference?: string | null;
  payment_url?: string | null;
  created_at: string;
  customer?: Customer | null;
  cashier?: {
    id: number;
    name: string;
  } | null;
  bank_account?: BankAccount | null;
  receivable?: {
    id: number;
    due_date?: string | null;
    status: string;
  } | null;
  details: CartItem[];
};

export type TransactionDocumentVariant = 'invoice' | 'receipt-80' | 'receipt-58' | 'shipping';

export type TransactionDocumentPayload = {
  variant: TransactionDocumentVariant;
  title: string;
  filename: string;
  html: string;
};
