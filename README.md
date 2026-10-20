# 🧺 JaiTraderr — Laundry Management Portal

A full-stack, production-ready **Laundry Business Management System** built for laundry shops and dry-cleaning businesses. JaiTraderr handles the complete operational lifecycle — from customer registration and job card billing to workflow tracking, payment collection, expense management, and business intelligence reporting.

---

## ✨ Features at a Glance

### 🪪 Authentication & Access Control
- Supabase-based secure login with role-based access control (RBAC)
- Four user roles: **Admin**, **Billing Staff**, **Processing Staff**, **Delivery Staff**
- Each role sees only the modules relevant to their duties
- Admin-only unlock modal with PIN verification for locked job card edits

### 📋 Job Cards & Billing
- Multi-step job card creation wizard (Customer → Services & Items → Review & Close)
- Attach multiple **Services** (e.g. Dry Cleaning, Washing, Ironing) and **Items** (e.g. Shirt, Kurta, Saree) per card
- Automatic line-item amount calculation from the master rate catalog
- Track weight (kg), piece count, and bag count per job card
- Advance payment collection at booking time; balance tracked automatically
- Set expected delivery dates and shelf/rack location
- Admin-controlled card locking and edit-request workflow (with OTP verification)
- Print-ready job card summary

### 🔄 Workflow / Operations Pipeline
- Kanban-style **pipeline board** across 5 stages:
  `RECEIVED → WASHING → IRONING → READY FOR DELIVERY → DELIVERED`
- One-click stage transitions with confirmation dialogs
- Filter by service type (Washing, Dry Cleaning, etc.)
- Real-time audit log showing full stage history per order
- Role-restricted actions (e.g., Processing Staff can only advance their own stages)

### 💳 Payments & Collections
- View bills by: **Pending**, **Collected**, **All**, or **Transactions Ledger**
- Collect advance or balance payments per job card
- Support for multiple payment methods: **Cash**, **UPI**, **Card**, **Bank Transfer**
- Full payment history per order
- WhatsApp receipt sharing (direct wa.me deep-link to customer)
- Printable **Tax Invoice & Receipt** modal with itemized billing

### 💰 Daily Cash Register & Expenses
- **Daily Cash Register** — complete till management:
  - Morning: Set opening cash float
  - Track inflow: cash billing collected
  - Track outflow: petty cash expenses logged
  - End of day: settlement slip with expected vs. actual cash comparison
- **Operational Expenses**: Log day-to-day vouchers by category (Electricity, Supplies, Salaries, etc.)
- Month-level analytics: total expenditures, top cost category, average cost per voucher
- Full history of daily closings with who closed and when

### 📊 Reports & Business Intelligence
- Date-range or preset filter (Today, Yesterday, This Week, This Month, Custom)
- **Sales & Revenue Report**: Gross billed, collected, pending, expenses, net operating profit, AOV
- **Washing Volume Report**: Pieces processed, weight (kg), bundles/bags, pipeline count
- **Customer Analytics**: Active client base, Lifetime Value (LTV), visit frequency, avg billing, VIP customers
- Export data as **CSV**
- Printable report slip

### 🏷️ Pricing & Rates Catalog (Admin)
- Master rate matrix: **Service × Item × Unit → Rate**
- Admin can create new Services and Items on the fly
- Billing unit support: per piece (pcs), per kg, per bundle (bdl), etc.
- Rate versioning — updating a rate deactivates the old one and activates the new entry
- Staff users see the catalog in read-only mode

### 👤 Customer Database
- Register customers with: Name, Mobile, WhatsApp number, Email, Address
- Instant mobile/name search with live results
- Customer profile panel: visit history, job card count, lifetime spend, average billing

### 👤 Profile & Settings
- Staff can view and update their own name and contact details
- Admin can change any user's role directly from the profile modal
- Role badge display with real-time preview

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Server Actions) |
| **Language** | TypeScript 5 |
| **UI Components** | shadcn/ui + Radix UI |
| **Styling** | Tailwind CSS v4 + tw-animate-css |
| **Icons** | Lucide React |
| **Forms** | React Hook Form + Zod validation |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (email/password, session cookies) |
| **Server Actions** | Next.js Server Actions (direct Supabase client calls) |

---

## 📁 Project Structure

```
JaiTraderr/
├── src/
│   ├── app/
│   │   ├── actions/              # Next.js Server Actions (data layer)
│   │   │   ├── catalog.ts        # Services, Items, Units, Rates CRUD
│   │   │   ├── customers.ts      # Customer registration & lookup
│   │   │   ├── expenses.ts       # Cash register & expense vouchers
│   │   │   ├── job-cards.ts      # Job card creation, editing, locking
│   │   │   ├── payments.ts       # Payment recording & history
│   │   │   ├── reports.ts        # Aggregated analytics queries
│   │   │   └── workflow.ts       # Stage transitions & audit log
│   │   ├── dashboard/
│   │   │   ├── page.tsx          # Main dashboard (KPIs, order table)
│   │   │   ├── customers/        # Customer database page
│   │   │   ├── expenses/         # Daily cash register & expenses page
│   │   │   ├── job-cards/        # Job card billing wizard page
│   │   │   ├── payments/         # Payments & collections page
│   │   │   ├── rates/            # Pricing catalog page
│   │   │   ├── reports/          # BI reports page
│   │   │   └── workflow/         # Operations pipeline page
│   │   ├── login/                # Login page
│   │   ├── globals.css           # Global styles & Tailwind theme
│   │   └── layout.tsx            # Root layout with fonts
│   ├── components/
│   │   ├── admin-unlock-modal.tsx        # PIN-based admin unlock dialog
│   │   ├── customers-client.tsx          # Customer page client component
│   │   ├── dashboard-layout-client.tsx   # Sidebar & top nav shell
│   │   ├── expenses-client.tsx           # Cash register & expenses UI
│   │   ├── job-cards-client.tsx          # Job card wizard UI
│   │   ├── payments-client.tsx           # Payments UI
│   │   ├── profile-settings-modal.tsx    # Profile & role settings modal
│   │   ├── rates-client.tsx              # Pricing catalog UI
│   │   ├── reports-client.tsx            # Reports & analytics UI
│   │   ├── workflow-client.tsx           # Kanban pipeline UI
│   │   └── ui/                           # shadcn/ui base components
│   ├── lib/
│   │   ├── supabase/             # Supabase client helpers (server, client, auth)
│   │   └── whatsapp.ts           # WhatsApp URL builder utility
│   └── utils/
│       └── sms.ts                # OTP hash & supervisor notification utilities
├── supabase/
│   ├── combined_live_schema.sql  # Full PostgreSQL schema
│   ├── seed.sql                  # Seed data (units, categories, demo data)
│   └── migrations/               # Incremental migration files
├── .env.local.example            # Environment variable template
├── next.config.ts                # Next.js configuration
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- A **Supabase** project (https://supabase.com)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/JaiTraderr.git
cd JaiTraderr
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# WhatsApp Business API (Optional)
WHATSAPP_API_TOKEN=your-whatsapp-api-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-webhook-verify-token
```

### 4. Set Up the Database

Run the full schema in your Supabase SQL editor:

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `supabase/combined_live_schema.sql`
4. Click **Run**

Optionally seed with sample data by running `supabase/seed.sql` the same way.

### 5. Create Your First Admin User

1. Go to **Authentication → Users** in your Supabase dashboard
2. Invite or create a new user
3. In the **users** table (Database → Table Editor), set that user's `role` column to `admin`

### 6. Run the Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

---

## 🔐 User Roles & Permissions

| Role | Dashboard | Job Cards | Workflow | Payments | Expenses | Reports | Rates |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Admin** | ✅ | ✅ Full | ✅ | ✅ | ✅ | ✅ | ✅ Edit |
| **Billing Staff** | ✅ | ✅ Create/View | ❌ | ✅ | ❌ | ✅ | 👁 View |
| **Processing Staff** | ✅ | 👁 View | ✅ Update | ❌ | ❌ | ❌ | ❌ |
| **Delivery Staff** | ✅ | 👁 View | 👁 View | ✅ Lookup | ❌ | ❌ | ❌ |

---

## 📦 Build for Production

```bash
npm run build
npm run start
```

---

## 🌐 Deployment

The project is configured for deployment to:

- **Netlify** — `netlify.toml` is included at the root
- **Vercel** — Deploy directly from GitHub with zero config
- **GoDaddy / VPS** — Build the project (`npm run build`) and run it with Node.js or PM2
- **Any Node.js host** — Run `npm run build` and serve with `npm start`

> **Note**: Ensure all environment variables are configured in your hosting platform's dashboard before deploying.

---

## 🗄️ Database Schema Highlights

Key tables in the Supabase PostgreSQL database:

| Table | Purpose |
|---|---|
| `users` | Staff accounts with roles |
| `customers` | Customer records |
| `job_cards` | Order/billing records |
| `job_card_services` | Service entries per job card |
| `job_card_items` | Line items per service |
| `payments` | Payment transactions |
| `services` | Service master (Washing, Dry Cleaning, etc.) |
| `items` | Item master (Shirt, Saree, etc.) |
| `units` | Billing units (pcs, kg, bdl) |
| `service_item_rates` | Rate matrix (Service × Item × Unit → Rate) |
| `expenses` | Daily petty cash expense vouchers |
| `expense_categories` | Expense classification labels |
| `daily_closings` | End-of-day cash settlement records |
| `workflow_audit_log` | Full stage-transition history per order |

---

## 📱 WhatsApp Integration

JaiTraderr supports WhatsApp receipt sharing via deep-link URLs. When a payment is collected, staff can tap **Share via WhatsApp** to open a pre-filled WhatsApp message to the customer with their receipt summary — no API key required for basic sharing.

For full WhatsApp Business API integration (automated messages on status change), configure the `WHATSAPP_*` environment variables.

---

## 🧩 Architecture Notes

- **Server Actions** are used instead of REST API routes for all data mutations — keeping the codebase secure and simple.
- **Supabase RLS (Row Level Security)** is recommended for production; all service-role key operations are handled server-side only and never exposed to the browser.
- The UI uses a **light-cream premium theme** via a custom Tailwind v4 `@theme` override in `globals.css`.
- All modals and dialogs use **Radix UI portals** and are fully keyboard-accessible.
- The Admin Unlock modal uses **PIN hashing** (SHA-256) to avoid storing plain-text PINs.

---

## 📄 License

This project is **private and proprietary**. All rights reserved © JaiTraderr.

---

*Built with ❤️ for laundry businesses that deserve modern tools.*
