# POS System

Full-stack cafe POS system built for hackathon use with role-based access, kitchen workflow, customer display, and reporting.

## Stack
- Frontend: React + Tailwind CSS + DaisyUI (Vite)
- Backend: Node.js + Express
- Database: PostgreSQL

## Roles
- Admin: configuration, inventory, customers, reservations, operations overview, dashboard
- User (POS operator): table selection, cart, payment, customer details screen
- Chef: kitchen display with stage updates (To Cook -> Preparing -> Completed)
- Customer: self-order screen (token-based flow)

## Core Flow
1. Login by role
2. Open POS session
3. Select table
4. Add/remove menu items and adjust quantity
5. Complete payment (Cash / Digital / UPI)
6. Paid orders move into chef workflow
7. Review analytics in dashboard

## Key Features
- Role-guarded routes
- Product images in POS cards with safe fallback
- Customer Details page with current bill + order history
- Admin operations cards with drill-down details
- Dashboard filters and trend analytics
- Persistent login autofill option ("Remember login")
- Test-data support:
  - 250 auth users (`load_user_001` ... `load_user_250`)
  - bulk sample orders for load testing

## Local Run

### Backend
```bash
cd backend
npm install
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend expects backend API at:
- `http://localhost:5001/api`

## Security / Git Hygiene
- Root `.gitignore` excludes:
  - `.env` / `.env.*`
  - `node_modules`
  - `dist` / `build`
  - logs
- Do not commit secrets, credentials files, or local runtime data.
