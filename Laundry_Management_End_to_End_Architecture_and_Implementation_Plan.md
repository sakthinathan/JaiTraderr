# Laundry Management & Billing Portal
## End-to-End Architecture and Production Implementation Plan

> **Status:** Architecture Baseline  
> **Target:** Responsive web application for Laptop, Tablet, and Mobile  
> **Architecture:** Next.js + Supabase + PostgreSQL + Supabase Edge Functions + WhatsApp Business Platform  
> **Scope:** Customer management, job cards, billing, payments, workflow tracking, shelf management, invoices, WhatsApp notifications, customer history, expenses, reports, security, auditability, and production operations.

---

# 1. Product Vision

Build a complete Laundry Management and Billing Portal that manages the customer journey from the moment clothes are received until the order is delivered and the invoice is sent to the customer's WhatsApp number.

The application must work well on:

- Desktop and laptop
- Tablet
- Mobile browsers
- Future PWA installation

The system should be modular so future features such as QR/barcode scanning, pickup and delivery, multi-branch support, inventory, and advanced analytics can be added without redesigning the core.

---

# 2. Core Business Lifecycle

```text
Customer arrives
      |
      v
Search by Mobile Number
      |
      +--> Existing customer -> Load profile/history
      |
      +--> New customer -> Register customer
                                |
                                v
                         Create Job Card
                                |
                                v
                    Add Service(s) and Items
                                |
                                v
                  Quantity + Unit + Rate + Amount
                                |
                                v
                     Record Advance if applicable
                                |
                                v
                       Close Job Card (LOCKED)
                                |
                                +--> Generate Job Card PDF
                                +--> Send WhatsApp confirmation
                                |
                                v
                             RECEIVED
                                |
                                v
                             WASHING
                                |
                                v
                             IRONING
                                |
                                v
                       READY FOR DELIVERY
                                |
                         Shelf location required
                                |
                                +--> WhatsApp ready notification
                                |
                                v
                        Collect balance payment
                                |
                                v
                           Generate Invoice
                                |
                                v
                             DELIVERED
                                |
                                +--> Send Invoice PDF on WhatsApp
```

---

# 3. Functional Scope

## 3.1 Customer Management

Capture:

- Customer ID/code
- Name
- Mobile number
- WhatsApp number
- Same-as-mobile option
- Place/address
- Email
- Active/inactive status
- Created and updated timestamps

### Lookup rule

The primary operational lookup is the mobile number.

```text
Enter mobile number
       |
       v
Customer found?
   /         \
 Yes          No
  |            |
Load profile  Register customer
  |            |
  +-----+------+
        |
        v
Create Job Card
```

Customer history must show:

- Total visits/job cards
- Current active orders
- Previous orders
- Total billed amount
- Total paid
- Outstanding balance
- Frequently used services
- Communication history

---

## 3.2 Service, Item and Pricing Management

Services initially include:

- Wash & Fold
- Wash & Iron
- Steam Iron
- Dry Cleaning
- Shoe Cleaning
- Other

Items can include:

- Shirt
- Pant
- T-Shirt
- Top
- Kurti
- Saree
- Blazer
- Dress
- Shoes
- Custom item

Billing units:

- Kg
- Pcs
- Pair
- Set

Rates are configured using:

```text
Service + Item + Unit = Rate
```

Example:

| Service | Item | Unit | Rate |
|---|---|---|---:|
| Wash & Fold | Clothes | Kg | 80 |
| Wash & Iron | Shirt | Pcs | 20 |
| Wash & Iron | Pant | Pcs | 25 |
| Steam Iron | Kurti | Pcs | 20 |

Rates must be versioned/effective-dated so historical job cards retain the rate used at the time of billing.

---

## 3.3 Job Card

A job card contains:

- Job card number
- Customer
- Branch
- Services
- Items
- Quantity
- Unit
- Rate snapshot
- Line amount
- Subtotal
- Discount
- Tax if applicable
- Grand total
- Advance
- Balance
- Expected delivery date
- Remarks
- Current workflow status
- Shelf location when ready
- Created by
- Closed by and closed time

### Multiple services

One job card can contain multiple services and multiple items under each service.

```text
Job Card
  |
  +-- Wash & Iron
  |      +-- Shirt
  |      +-- Pant
  |
  +-- Dry Cleaning
         +-- Blazer
```

---

## 3.4 Job Card Locking

Lifecycle:

```text
DRAFT -> CLOSED/LOCKED
```

After closing:

- Normal users cannot edit billing data.
- Rate, quantity, items, discounts and core financial details are protected.
- Changes require an edit request.
- Admin approval is required before reopening.
- All changes are audited.

Flow:

```text
Closed Job Card
      |
Edit request with reason
      |
      v
Admin approval/rejection
      |
Approved?
  /       \
 No        Yes
 |          |
Locked   Temporarily unlocked
             |
             v
        Changes made
             |
             v
         Close again
```

---

## 3.5 Order Workflow

Initial workflow:

```text
RECEIVED
   |
   v
WASHING
   |
   v
IRONING
   |
   v
READY_FOR_DELIVERY
   |
   v
DELIVERED
```

Every transition stores:

- Previous status
- New status
- User
- Date/time
- Optional remarks

The workflow should be configurable in the future, but Phase 1 uses controlled allowed transitions.

---

## 3.6 Shelf Management

When an order moves to `READY_FOR_DELIVERY`, shelf location is mandatory.

Examples:

- A-12
- B-05
- RACK-03-SHELF-02

Future structure:

```text
Branch
  -> Rack
      -> Shelf
          -> Position
```

Staff can search an order by mobile number or job card number and immediately see its shelf location.

---

## 3.7 Payments and Advance Management

Payment types:

- Advance
- Partial payment
- Final payment
- Refund

Payment methods:

- Cash
- UPI
- Card
- Bank transfer
- Other

The balance is calculated from payment records:

```text
Outstanding = Final Job Card Amount - Sum(valid payments) + Refund adjustments
```

Payment records should be append-oriented. Avoid editing historical payments directly; use reversals/refunds when needed.

---

## 3.8 Invoice Management

Invoices contain:

- Invoice number
- Business information
- Customer information
- Job card reference
- Item/service lines
- Quantity
- Unit
- Rate
- Discount
- Tax if applicable
- Total
- Payments
- Outstanding/paid status
- Generated timestamp

Invoice PDF is stored securely and can be:

- Viewed
- Reprinted
- Downloaded
- Resent to WhatsApp

---

## 3.9 WhatsApp Communication

Automated events:

1. Job card closed
2. Order ready for delivery
3. Invoice generated/delivery completed

Recommended implementation:

```text
Business Event
      |
      v
Notification Record
      |
      v
Server-side Worker / Edge Function
      |
      +--> Generate document if needed
      |
      +--> Upload document
      |
      +--> Call WhatsApp Business Platform
      |
      v
Customer
      |
      v
Webhook status update
      |
      v
Notification status stored
```

Notification statuses:

- PENDING
- PROCESSING
- SENT
- DELIVERED
- READ
- FAILED

The notification layer must support retries and idempotency.

---

## 3.10 Dashboard

Admin dashboard should show:

### Today

- Job cards created
- Orders received
- Orders washing
- Orders ironing
- Ready for delivery
- Delivered
- Revenue/billed value
- Cash collected
- Pending balance
- Advances collected
- Expenses
- Estimated operating result

Important financial definitions must remain separate:

```text
Billed Revenue != Cash Collected != Outstanding Balance != Profit
```

---

## 3.11 Expense Management

Expense fields:

- Expense ID
- Branch
- Category
- Description
- Amount
- Expense date
- Payment method
- Receipt/document
- Created by
- Approval status if required

Categories:

- Rent
- Electricity
- Water
- Salary
- Detergent
- Packaging
- Transport
- Maintenance
- Other

Reports:

- Daily
- Weekly
- Monthly
- Category-wise
- Branch-wise in the future

---

## 3.12 Reports

Reports include:

### Job Card
- Date-wise
- Status-wise
- Service-wise
- Pending
- Ready for delivery
- Delivered
- Delayed

### Financial
- Billed amount
- Payments received
- Advance collections
- Outstanding
- Refunds
- Payment-method summary

### Customer
- New customers
- Returning customers
- Top customers
- Outstanding customers

### Expense
- Date-wise
- Category-wise
- Monthly

Reports require:

- Today
- Yesterday
- This week
- This month
- Custom range
- Export capability

---

# 4. Recommended Technology Stack

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- TanStack Query/Table where needed

## Backend and Data Platform

- Supabase PostgreSQL
- Supabase Auth
- Row Level Security (RLS)
- Supabase Storage
- Supabase Realtime
- Supabase Edge Functions

## Server-Side Application Logic

- Next.js Server Actions / Route Handlers
- Supabase Edge Functions for external integrations and webhook processing
- PostgreSQL functions/RPC for transactional business operations where appropriate

## Background/Asynchronous Processing

Start with a durable notification/outbox table and scheduled/server-side workers or Edge Function processing.

Do not make the billing UI wait for:

- PDF generation
- WhatsApp sending
- Delivery receipt processing

If workload grows, add a dedicated queue/worker layer.

## Documents

- Server-side PDF generation
- Supabase Storage
- Signed URLs for controlled access

## External Integrations

- Official WhatsApp Business Platform / Cloud API
- Payment gateway in a later phase if online payments are required
- Email provider if email delivery is added

## Deployment

- Next.js application: Vercel or container hosting
- Supabase: managed project
- DNS/CDN/WAF: Cloudflare or equivalent
- CI/CD: GitHub Actions

---

# 5. High-Level Architecture

```text
                    USERS
        +-----------+-----------+
        |           |           |
     Desktop      Tablet       Mobile
        |           |           |
        +-----------+-----------+
                    |
                    v
          NEXT.JS RESPONSIVE APP
                    |
        +-----------+-----------+
        |                       |
        v                       v
  Server Actions/API       Supabase Client
        |                       |
        +-----------+-----------+
                    |
                    v
              SUPABASE
     +--------------+--------------+
     |              |              |
 PostgreSQL       Auth/RLS       Storage
     |
     +-----------------------------+
     | Business tables             |
     | Reporting views             |
     | Audit history               |
     +-----------------------------+
                    |
                    v
             EDGE FUNCTIONS
                    |
       +------------+-------------+
       |            |             |
       v            v             v
 WhatsApp API   Webhooks      Document Jobs
```

---

# 6. Application Architecture

Use a modular feature structure.

```text
laundry-management/
|
+-- apps/
|   +-- web/
|
+-- packages/
|   +-- ui/
|   +-- types/
|   +-- config/
|
+-- supabase/
    +-- migrations/
    +-- seed/
    +-- functions/
        +-- whatsapp-send/
        +-- whatsapp-webhook/
        +-- generate-document/
        +-- scheduled-notifications/
```

Frontend feature organization:

```text
features/
  auth/
  dashboard/
  customers/
  services/
  items/
  rates/
  job-cards/
  workflow/
  payments/
  invoices/
  notifications/
  expenses/
  reports/
  admin/
  audit/
```

---

# 7. Database Architecture

## Identity and Organization

```text
profiles
roles
user_roles
branches
business_settings
```

Even if the first release has one branch, keep `branch_id` in operational tables for future multi-branch support.

## Customer

```text
customers
```

Key indexes:

- unique/validated mobile identity strategy
- normalized mobile lookup index
- name search index where required

## Master Data

```text
services
items
units
service_item_rates
shelf_locations
expense_categories
```

## Operational Data

```text
job_cards
job_card_services
job_card_items
job_card_status_history
job_card_edit_requests
payments
payment_adjustments
invoices
documents
notifications
expenses
audit_logs
```

## Relationship Model

```text
Customer
   |
   +----< Job Card
              |
              +----< Job Card Service
              |         |
              |         +----< Job Card Item
              |
              +----< Payment
              |
              +----< Status History
              |
              +----< Notification
              |
              +---- Invoice
```

---

# 8. Important Data Rules

## Rate snapshot

Never depend only on the current master rate for historical billing.

When an item is added to a job card, save:

- service name snapshot
- item name snapshot
- unit snapshot
- rate snapshot

This ensures old job cards remain accurate even when prices change later.

## Amount calculation

The server/database should validate:

```text
line_amount = quantity * rate
job_subtotal = sum(line_amount)
final_total = subtotal - discount + tax/charges
balance = final_total - valid payments + applicable adjustments
```

Do not trust calculations submitted only by the browser.

## Job card immutability

After closure:

- direct update policies must reject protected changes
- approved edit flow is required
- audit records are created

---

# 9. Security Architecture

## Authentication

Supabase Auth handles user identity.

## Authorization

Use:

- roles
- permissions
- branch scope
- RLS
- server-side validation

Suggested roles:

### Admin
Full access.

### Billing Staff
Customer registration, job cards, allowed payments, printing/resending documents.

### Processing Staff
Operational order updates only.

### Delivery Staff
Delivery completion and authorized payment collection.

## RLS principles

The browser should only have access to records allowed for the logged-in user and branch.

Service role credentials must never be exposed to the browser.

Critical operations must validate permissions server-side.

## Audit log

Track sensitive events:

- Job card creation
- Closure
- Edit request
- Approval/rejection
- Payment
- Refund
- Invoice generation
- Status changes
- Expense creation/modification
- Rate changes
- User/role changes

---

# 10. Responsive UX Architecture

## Desktop

- Sidebar navigation
- Data tables
- Dashboard charts
- Multi-column job card editor

## Tablet

- Collapsible navigation
- Compact forms
- Horizontal table handling
- Touch-friendly controls

## Mobile

Prioritize:

- Customer search
- Create job card
- Status updates
- Shelf lookup
- Payment collection
- Quick delivery

Use cards and progressive disclosure instead of forcing wide desktop tables onto a small screen.

---

# 11. Phase-by-Phase Implementation Plan

# Phase 0 - Discovery and Foundation

## Goals

Freeze business rules before major coding.

## Deliverables

- Final workflow
- Status transition rules
- User role matrix
- Service/item/rate catalogue
- Invoice numbering rules
- Job card numbering rules
- WhatsApp message requirements
- Business settings
- Wireframes
- Data model/ERD
- Acceptance criteria

## Decisions to finalize

- Tax/GST requirements
- Discount permissions
- Rate override permissions
- Advance/refund rules
- Invoice generation timing
- Expected delivery date rules
- WhatsApp provider account setup
- Branch model

---

# Phase 1 - Project Foundation

## Build

- Next.js project
- TypeScript configuration
- Tailwind
- shadcn/ui
- Supabase project setup
- Local environment configuration
- Authentication
- Profile/role model
- RLS baseline
- Database migrations
- Seed data
- Error handling
- Logging foundation
- Responsive app shell

## Exit criteria

- Users can sign in
- Role-based navigation works
- Database migrations run from a clean environment
- RLS tests cover key tables

---

# Phase 2 - Master Data and Customer Management

## Build

### Customer

- Create customer
- Mobile lookup
- Existing customer detection
- WhatsApp number support
- Customer profile
- Customer history foundation

### Masters

- Services
- Items
- Units
- Service-item rates
- Expense categories
- Shelf locations

### Admin controls

- Enable/disable service
- Rate changes
- Effective dates

## Exit criteria

- A customer can be found by mobile number
- Duplicate strategy is enforced
- Service/item/rate lookup works
- Historical rate changes do not modify completed job cards

---

# Phase 3 - Job Card and Billing

## Build

- Draft job card
- Multiple services
- Multiple items
- Quantity
- Kg/Pcs/Pair/Set
- Rate auto-fill
- Optional authorized rate override
- Discounts
- Remarks
- Expected delivery date
- Subtotal and final amount
- Advance payment
- Server-side validation

## Close Job Card

Closing performs one controlled transaction:

```text
Validate
  -> calculate totals
  -> snapshot prices
  -> save payment
  -> set locked state
  -> write audit record
  -> create notification outbox event
```

## Exit criteria

- Closed job cards cannot be edited by ordinary users
- Financial totals are calculated server-side
- Failed transactions do not create partial records

---

# Phase 4 - Workflow and Shelf Operations

## Build

- Received
- Washing
- Ironing
- Ready for Delivery
- Delivered
- Allowed transition validation
- Status history
- Staff/user attribution
- Shelf location requirement at ready status
- Search by customer/job card/shelf

## Exit criteria

- Invalid status jumps are rejected
- Every transition has history
- Ready orders cannot be saved without a shelf location

---

# Phase 5 - Payments and Delivery

## Build

- Advance payments
- Partial payments
- Final payments
- Multiple payment methods
- Outstanding calculation
- Refund/reversal controls
- Delivery screen
- Balance collection
- Payment receipt history

## Exit criteria

- Payment history reconciles to job card balance
- Unauthorized users cannot alter payment records
- Delivery action validates required business rules

---

# Phase 6 - Documents and WhatsApp

## Build

### Job Card documents

- PDF template
- Storage
- Reprint
- Resend

### Invoice

- Invoice numbering
- PDF
- Storage
- Reprint

### WhatsApp

- Business account setup
- Template configuration
- Secure token storage
- Send on job card closure
- Send when ready
- Send invoice at delivery
- Webhook processing
- Delivery/read/failure status
- Retry policy
- Manual resend

## Recommended reliability pattern

Use an outbox:

```text
Business transaction
       |
       +--> commit operational data
       |
       +--> commit notification event
                     |
                     v
                  worker
                     |
                     v
                WhatsApp API
```

This avoids losing notifications if the API is temporarily unavailable.

## Exit criteria

- Duplicate sends are prevented by idempotency keys
- Failures are visible and retryable
- PDFs are securely accessible
- WhatsApp webhook signatures are verified

---

# Phase 7 - Dashboard, Customer History and Reports

## Dashboard

- Operational counts
- Revenue
- Collections
- Outstanding
- Expenses
- Status distribution

## Customer history

- Previous job cards
- Current orders
- Payment history
- Outstanding
- Communication history

## Reports

- Date range
- Status
- Service
- Payment
- Customer
- Expense
- Export

Use PostgreSQL views/materialized summaries or optimized RPCs for expensive reporting queries.

## Exit criteria

- Dashboard loads within acceptable targets
- Report totals reconcile with transactional data
- Role/branch filtering is enforced

---

# Phase 8 - Expense Management

## Build

- Expense categories
- Create expense
- Optional receipt upload
- Date/category reports
- Permission controls
- Audit logging

## Exit criteria

- Expense totals appear correctly in dashboards
- Users cannot view/edit unauthorized branch data

---

# Phase 9 - Quality, Security and Production Hardening

## Testing

### Unit tests

- Billing calculations
- Status transitions
- Permission logic
- Balance calculations

### Integration tests

- Database/RPC logic
- Job card closure transaction
- Payment flow
- WhatsApp outbox

### End-to-end tests

Critical scenarios:

1. New customer -> job card -> close -> WhatsApp
2. Existing customer -> new job card
3. Multiple services/items
4. Advance -> balance -> delivery
5. Ready status -> shelf -> WhatsApp
6. Delivery -> invoice -> WhatsApp
7. Closed job card edit request -> admin approval -> reclose
8. Payment failure/retry scenarios

## Security review

- RLS policy review
- No secrets in client
- Webhook verification
- Rate limit public endpoints
- Input validation
- Authorization tests
- Storage access controls
- Dependency scanning

## Data protection

- Backups
- Recovery process
- Retention rules
- Restricted access to customer data
- Audit retention

---

# Phase 10 - Production Deployment

## Environments

```text
Local
  |
Development
  |
Staging
  |
Production
```

Use separate environment configuration and, ideally, separate Supabase projects for staging and production.

## CI/CD

GitHub Actions pipeline:

```text
Pull Request
     |
     +--> Lint
     +--> Type check
     +--> Unit tests
     +--> Build
     +--> Migration validation
     |
Merge to main
     |
     +--> Deploy staging/production according to release policy
```

Database migrations must be version controlled.

Never manually change production schema without recording a migration.

## Production checklist

- Production domain
- HTTPS
- Environment secrets
- Supabase production project
- Backups enabled
- Monitoring
- Error tracking
- WhatsApp production credentials
- Webhook verification
- Storage policies
- RLS review
- Admin bootstrap process
- Smoke tests
- Rollback plan

---

# 12. Monitoring and Operations

Monitor:

- Application errors
- API latency
- Database errors
- Failed WhatsApp messages
- Failed document generation
- Notification queue backlog
- Authentication failures
- Payment reconciliation issues

Create an admin operational view for:

- Failed notifications
- Pending retries
- Orders stuck in a status
- Ready orders waiting for pickup
- Outstanding balances

---

# 13. Suggested Release Sequence

## MVP / Release 1

1. Authentication and roles
2. Customer management
3. Services/items/rates
4. Job cards
5. Billing
6. Advance payments
7. Job card locking
8. Status workflow
9. Shelf location
10. Basic dashboard
11. Basic reports

## Release 2

12. Job card PDF
13. Invoice PDF
14. WhatsApp integration
15. Webhook status tracking
16. Customer history
17. Payment history
18. Expense management
19. Advanced reports

## Release 3

20. QR/barcode
21. Bag tracking
22. Pickup/delivery
23. Automated reminders
24. Multi-branch activation
25. Inventory
26. Staff productivity analytics
27. Customer feedback

---

# 14. Recommended Critical Workflows

## Create and Close Job Card

```text
Search customer
      |
      v
Load or create customer
      |
      v
Create draft
      |
      v
Add services/items
      |
      v
Calculate on server
      |
      v
Record advance if any
      |
      v
Review
      |
      v
Close and lock
      |
      +--> Audit
      +--> Notification event
      +--> Job Card PDF
      +--> WhatsApp
```

## Ready for Delivery

```text
Processing staff updates order
      |
      v
Validate allowed transition
      |
      v
READY_FOR_DELIVERY selected
      |
      v
Shelf location required
      |
      v
Save status history
      |
      v
Create notification event
      |
      v
WhatsApp ready message
```

## Delivery

```text
Search mobile/job card
      |
      v
Show shelf location
      |
      v
Retrieve order
      |
      v
Collect outstanding balance
      |
      v
Validate payment
      |
      v
Generate invoice
      |
      v
Mark delivered
      |
      v
Audit + notification event
      |
      v
Send invoice PDF via WhatsApp
```

---

# 15. Key Architecture Decisions

## Use Supabase

Supabase is the primary backend platform for:

- PostgreSQL
- Auth
- RLS
- Storage
- Realtime
- Edge Functions

## Keep critical logic server-side

The frontend must not be the source of truth for:

- Final billing amounts
- Closing a job card
- Payments
- Refunds
- Invoice creation
- Admin approvals
- WhatsApp credentials

## Preserve historical snapshots

Completed job cards and invoices must retain historical:

- Item name
- Service name
- Unit
- Rate
- Amount

## Use append/history records

For financial and operational traceability, prefer history records rather than silently overwriting important events.

## Use asynchronous integration

External services must not block the core billing transaction.

---

# 16. Future Architecture Extensions

The architecture is prepared for:

- Multi-branch
- QR/barcode scanning
- Bag tracking
- Pickup and home delivery
- Delivery OTP
- Online payments
- Inventory
- Customer loyalty
- Coupons
- Automated reminders
- Native mobile application
- Advanced analytics

Potential future event model:

```text
JOB_CARD_CLOSED
ORDER_STATUS_CHANGED
ORDER_READY
PAYMENT_RECEIVED
ORDER_DELIVERED
INVOICE_GENERATED
```

This can later support additional consumers without tightly coupling every module.

---

# 17. Final Recommended Architecture

```text
CLIENT
-----------------------------------
Next.js + React + TypeScript
Tailwind CSS + shadcn/ui
Responsive / Mobile-first

                |
                v

APPLICATION LAYER
-----------------------------------
Next.js Server Actions / Route Handlers
Feature modules
Zod validation
Role and permission checks

                |
                v

SUPABASE PLATFORM
-----------------------------------
PostgreSQL
Auth
RLS
Storage
Realtime
Edge Functions

                |
        +-------+--------+
        |                |
        v                v

ASYNC/INTEGRATION      DOCUMENTS
-----------------------------------
Notification Outbox     Job Card PDFs
Workers/Edge Functions  Invoice PDFs
Retry + Idempotency     Secure Storage

        |
        v

EXTERNAL SERVICES
-----------------------------------
WhatsApp Business Platform
Future Payment Gateway
Future Email/SMS

        |
        v

OPERATIONS
-----------------------------------
GitHub Actions CI/CD
Staging + Production
Monitoring
Backups
Audit Logs
Security Reviews
```

---

# 18. Definition of Production Ready

The application should not be considered production ready until:

- All critical workflows are tested
- RLS is reviewed for every sensitive table
- Secrets are server-side only
- Database migrations are version controlled
- Backups and recovery are verified
- Closed job cards are immutable without approval
- Payment totals reconcile correctly
- Notification failures can be retried
- WhatsApp webhook security is implemented
- PDF/document access is protected
- Audit logging exists for critical actions
- Staging environment is tested
- Monitoring and error alerts are configured
- Rollback/recovery procedures are documented

---

# 19. Recommended Starting Point

The best implementation order is:

1. Phase 0: finalize requirements and business rules.
2. Phase 1: project, authentication, roles, Supabase and security baseline.
3. Phase 2: customer + service/item/rate masters.
4. Phase 3: job card and billing.
5. Phase 4: status workflow and shelf management.
6. Phase 5: payments and delivery.
7. Phase 6: PDF and WhatsApp integration.
8. Phase 7: dashboard, customer history and reports.
9. Phase 8: expenses.
10. Phase 9-10: testing, hardening and production deployment.

This approach creates a usable core system early while ensuring financial controls, auditability, security, and integrations are production-grade before launch.
