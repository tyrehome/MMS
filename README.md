# 🔧 Tire Management System (TMS)

A full-stack, cloud-connected business management system for tire shops and automotive service centers. Built with **React**, **Material UI**, and **Supabase** (PostgreSQL backend).

---

## ✨ Key Features

### 🛒 Point of Sale (POS)
- Fast product catalog with tire, parts, and service tabs
- Real-time stock display with FIFO aging badges on every tire card
- Barcode scanner integration (keyboard wedge)
- Trade-in / exchange deduction
- Percentage or fixed-amount discounts
- Customer credit sales linked to customer accounts
- Cash change calculator
- Thermal receipt printing (80mm) + A4 invoice
- Quotation generator with 7-day expiry
- Billing draft save & restore (local storage)

### 📦 Inventory Hub
- Unified view of tires + spare parts
- **FIFO Batch Tracking** — every GRN creates a separate stock lot
- **Tire Age Badge** — color-coded oldest-batch indicator on every row
  - 🟢 Healthy (< 3 years)
  - 🟡 Expiring Soon (3–4 years)
  - 🟠 Critical (4–5 years)
  - 🔴 Expired (> 5 years)
- Low-stock alerts with configurable threshold
- One-click Purchase Order generation (printable + copyable)
- Add-all-low-stock to purchase order
- Stock filter: All / Low / Out of Stock

### 📋 Goods Received Note (GRN)
- Bulk GRN processing (multiple items per submission)
- **Smart DOT Code Parser** — enter `1224` → system shows *"March 2024 · 1.8 years old · 🟢 Healthy"*
- **Manual Manufacture Date field** — if DOT code is unavailable
- System auto-resolves: DOT takes priority, then manual date
- GRN automatically creates FIFO lot in `inventory_lots` table
- Auto-updates supplier ledger balance
- Parts GRN with category classification

### 🏭 FIFO Inventory Engine (Database)
- `inventory_lots` table: tracks every received batch separately
- `process_sale` RPC: deducts from **oldest lot first** — fully automatic FIFO
- `parse_dot_to_date()` function: converts DOT week codes to real dates
- `v_stock_aging` view: real-time aging status for all active lots
- FIFO ordering priority: `manufacture_date ASC → received_at ASC`

### 📊 Dashboard
- Live revenue vs. profit chart
- Today's revenue vs yesterday comparison
- Data health score (missing prices, DOT codes, etc.)
- **Stock Aging Alert Banner** — auto-appears when any batch is Critical or Expired
- Worker efficiency leaderboard
- Low-stock quick view
- Liquidity balance indicator (receivables vs payables)
- Today's appointment schedule

### 👥 Customer CRM
- Customer profiles with full vehicle history
- Service history per vehicle (auto-logged from every POS sale)
- Tire Hotel management (seasonal storage)
- Appointment scheduling

### 🔧 Workshop / Worker Tracking
- Worker task assignment from POS
- Task status tracking (Pending → Completed)
- One-click bill creation from workshop task
- Worker performance analytics

### 🏢 Vendors & GRN
- Supplier registration with opening balance
- Supplier ledger (full transaction history)
- Bulk GRN processing with automatic balance update
- Stock returns with ledger credit
- Printable vendor statements

### 💰 Finance Hub (Admin Only)
- Profit & Loss summary
- Stock valuation report
- Top-selling products velocity chart
- Sales history with drill-down item details
- Daily summary by payment type
- Customer Receivables management
- Vendor Payables management with payment logging
- Full Audit Trail log

### ⚙️ Settings
- Business profile (name, logo, address, currency)
- Master data management (tire brands, vehicle types, services)
- Staff invitation system
- Multi-language support (English / සිංහල)

---

## 🗄️ Database Schema Overview

| Table | Purpose |
|---|---|
| `tires` | Tire product catalog with current stock |
| `parts` | Spare parts catalog |
| `inventory_lots` | **FIFO batch tracking** — one row per GRN received |
| `grns` | Goods Received Note headers |
| `grn_items` | GRN line items with DOT code and manufacture date |
| `sales` | Sale transaction headers |
| `sale_items` | Sale line items (tires, parts, services) |
| `suppliers` | Supplier/vendor records with ledger |
| `supplier_payments` | Individual payments made to suppliers |
| `supplier_returns` | Stock returned to suppliers |
| `accounts` | Customer credit accounts |
| `invoices` | Customer invoices |
| `vehicles` | Vehicle service history |
| `customers` | Customer profiles |
| `hotel_tires` | Seasonal tire storage records |
| `workers` | Staff and mechanic records |
| `tasks` | Workshop task assignments |
| `appointments` | Customer appointments |
| `quotations` | Sales quotations |
| `audit_log` | System audit trail |
| `shop_talk` | Internal communication log |
| `master_data` | Brands, vehicle types, service names |
| `business_settings` | Business profile configuration |
| `profiles` | User authentication profiles |

### Key Views
| View | Purpose |
|---|---|
| `v_stock` | Unified tires + parts inventory |
| `v_inventory_health` | Data quality audit (missing prices, sizes) |
| `v_stock_aging` | **FIFO aging status** — powered by `inventory_lots` |

### Key RPC Functions
| Function | Purpose |
|---|---|
| `process_sale(payload)` | Atomic sale processing with **FIFO lot deduction** |
| `process_bulk_grn(...)` | GRN processing with **automatic lot creation** |
| `process_stock_return(...)` | Supplier return with ledger credit |
| `parse_dot_to_date(dot)` | Converts DOT week code (e.g. `1224`) to a real date |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd TireManagementSystem
npm install
```

### 2. Configure Environment
Create a `.env` file in the project root:
```env
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
DIRECT_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
```
*Note: `DIRECT_URL` is required for the automation scripts.*

### 3. Set Up the Database
You can set up the database using the built-in automation scripts:

```bash
# 1. Initialize schema (tables, views, functions)
npm run init

# 2. Configure infrastructure (storage buckets, RLS, realtime)
npm run setup

# 3. (Optional) Inject sample data for testing
npm run seed
```

### 4. Run the App
```bash
npm start
```
App will open at `http://localhost:3000`

### 5. First Login
- Register via your Supabase Auth dashboard or use the invitation system in Settings
- First user should be set to `role = 'admin'` in the `profiles` table

---

## 🏗️ Project Structure

```
TireManagementSystem/
├── public/
├── src/
│   ├── components/
│   │   ├── App.js                 # Root component, data fetching, routing
│   │   ├── Dashboard.js           # Business intelligence dashboard
│   │   ├── TireList.js            # Inventory Hub (GRN, Stock, Returns)
│   │   ├── SaleForm.js            # Point of Sale
│   │   ├── Reports.js             # Finance & Ledger Hub
│   │   ├── SupplierManagement.js  # Vendor management
│   │   ├── CustomerProfile.js     # Customer CRM
│   │   ├── WorkerTracking.js      # Workshop management
│   │   ├── PartsInventory.js      # Parts sub-component
│   │   ├── TireHotel.js           # Tire hotel sub-component
│   │   ├── CurrentAccount.js      # Customer receivables
│   │   ├── AuthContext.js         # Authentication context
│   │   ├── LanguageContext.js     # i18n context
│   │   ├── Login.js               # Auth screen
│   │   └── Settings.js            # System settings
│   ├── supabaseClient.js          # Supabase client initialization
│   ├── translations.js            # EN / Sinhala translations
│   └── index.js
├── scripts/
│   ├── run-schema.mjs         # Database schema initialization
│   ├── setup-supabase.mjs     # Storage and Realtime configuration
│   ├── seed-db.mjs            # Sample data injection
│   └── cleanup-db.mjs         # Database reset tool
├── schema.sql                 # Complete database schema
├── cleanup.sql                # Full system reset logic
├── .env                       # Environment variables (not committed)
└── package.json
```

---

## 🧹 Database Cleanup & Reset

The system includes a dedicated tool for performing a "Fresh Install" reset. This is useful for moving from testing to production or clearing out all sample data.

```bash
npm run cleanup
```

**This command will:**
- Wipe all transactional data (Sales, GRNs, Tasks, Audit Logs).
- Clear all Master Data (Tires, Parts, Suppliers, Customers).
- Reset the system to a clean, empty state.

---

## 🔒 Security

- **Row Level Security (RLS)** enabled on all tables
- All authenticated users can read/write (configurable per-role)
- Admin-only routes enforced in both frontend and backend
- All stock mutations happen via **SECURITY DEFINER** RPC functions (safe from client manipulation)
- Full audit trail logged on all inventory and financial changes

---

## 📱 FIFO Stock Flow — How It Works

```
Receive Stock (GRN)
    │
    ▼
inventory_lots row created
  ┌─────────────────────────────────┐
  │ tire_id: Michelin 195/65R15    │
  │ initial_qty: 10                 │
  │ current_qty: 10                 │
  │ dot_code: 1221                  │
  │ manufacture_date: 2021-03-08   │ ← BATCH A (older)
  │ received_at: 2021-04-01        │
  └─────────────────────────────────┘

Receive More Stock (New GRN)
    │
    ▼
  ┌─────────────────────────────────┐
  │ tire_id: Michelin 195/65R15    │
  │ current_qty: 5                  │
  │ dot_code: 1524                  │
  │ manufacture_date: 2024-04-08   │ ← BATCH B (newer)
  └─────────────────────────────────┘

Process Sale (3 units)
    │
    ▼
process_sale() RPC
  → Finds lots for this tire, ordered by manufacture_date ASC
  → Deducts 3 from BATCH A (oldest)
  → BATCH A current_qty: 10 → 7
  → BATCH B untouched: 5

Sell 10 more units:
  → BATCH A depleted: 7 → 0
  → BATCH B deducted: 5 → 2
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Material UI v5 |
| Charts | Recharts |
| Backend | Supabase (PostgreSQL + PostgREST) |
| Auth | Supabase Auth |
| Real-time | Supabase Realtime |
| Hosting | Netlify (configured via `netlify.toml`) |
| Fonts | Outfit, Inter (Google Fonts) |

---

## 📄 License

Proprietary — All rights reserved.

---

*Built for tire shop operations. Powered by Supabase + React.*
