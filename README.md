# DevLearn API

Subscription-based developer learning platform — Node.js / Express / PostgreSQL.

---

## Quick Start (Local)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — fill in DB credentials and a strong JWT_SECRET

# 3. Create the database
psql -U postgres -c "CREATE DATABASE devlearn;"

# 4. Run schema + migration
psql -U postgres -d devlearn -f db/schema.sql
psql -U postgres -d devlearn -f db/schema_migration.sql

# 5. Start dev server
npm run dev
```

---

## Quick Start (Docker)

```bash
# Starts both the API and PostgreSQL automatically
docker-compose up --build

# API will be available at http://localhost:3000
```

---

## Project Structure

```
subscription-api/
├── controllers/
│   ├── authController.js          # register, login
│   ├── contentController.js       # free & premium content + access logging
│   ├── subscriptionController.js  # upgrade (30-day expiry), status
│   └── adminController.js         # logs, stats, CSV report
├── routes/
│   ├── authRoutes.js
│   ├── contentRoutes.js
│   ├── subscriptionRoutes.js
│   └── adminRoutes.js
├── middleware/
│   ├── authMiddleware.js          # JWT verification
│   └── premiumMiddleware.js       # premium role + expiry guard
├── db/
│   ├── db.js                      # pg Pool
│   ├── schema.sql                 # DDL + seed data
│   └── schema_migration.sql       # Adds expiry + enriched log columns
├── Dockerfile
├── docker-compose.yml
├── server.js
├── .env.example
└── DevLearn.postman_collection.json
```

---

## API Reference

### Auth

| Method | Endpoint        | Auth | Description         |
|--------|----------------|------|---------------------|
| POST   | /auth/register | ✗    | Register a new user |
| POST   | /auth/login    | ✗    | Login, receive JWT  |

**Body:**
```json
{ "email": "user@example.com", "password": "SecurePass1!" }
```

---

### Content

| Method | Endpoint          | Auth | Role    | Description          |
|--------|------------------|------|---------|----------------------|
| GET    | /content/free    | ✗    | Any     | All free articles    |
| GET    | /content/premium | ✓    | premium | All premium articles |

---

### Subscription

| Method | Endpoint              | Auth | Description                          |
|--------|-----------------------|------|--------------------------------------|
| POST   | /subscription/upgrade | ✓    | Simulate payment → premium (30 days) |
| GET    | /subscription/status  | ✓    | Current subscription + days remaining|

---

### Admin

| Method | Endpoint                    | Auth | Description                   |
|--------|----------------------------|------|-------------------------------|
| GET    | /admin/logs                | ✓    | Paginated premium access logs |
| GET    | /admin/stats               | ✓    | Platform usage statistics     |
| GET    | /admin/reports/monthly-csv | ✓    | Download monthly CSV report   |

**CSV query param:** `?month=2026-03` (defaults to current month)

---

## Complete User Flow

```
1. POST /auth/register              → token (role: free)
2. GET  /content/free               →  free articles, no token needed
3. GET  /content/premium + token    →  403 free user blocked
4. POST /subscription/upgrade       → role = premium, expires in 30 days
5. POST /auth/login                 → fresh token (role: premium)
6. GET  /content/premium + token    →  premium articles + access logged
7. GET  /admin/logs                 → see log with method, IP, status code
8. GET  /admin/reports/monthly-csv  → download CSV report
9. GET  /subscription/status        → shows days_remaining until expiry
   (after 30 days — auto-downgraded back to free)
```

---

## Access Log Fields

Every premium content access captures:

| Field       | Description              |
|-------------|--------------------------|
| user_id     | ID of the accessing user |
| endpoint    | Route accessed           |
| method      | HTTP method (GET etc.)   |
| status_code | Response status code     |
| ip_address  | Client IP address        |
| access_time | Timestamp of access      |

---
## API Testing — Postman Screenshots

### 1. Register User
![Register](https://github.com/user-attachments/assets/31adae67-2340-4a4c-aef0-d4d98f8d8c56)

### 2. Login
![Login](https://github.com/user-attachments/assets/a1429a1b-04f5-49a6-b85d-fe88d1c6d52c)

### 3. Free Content (no token)
![Free Content](https://github.com/user-attachments/assets/d61d8695-bf29-44d4-be53-313c1ad8b461)

### 4. Premium Content — No Token (401)
![No Token](https://github.com/user-attachments/assets/e292021a-4cf0-4973-9263-ab8e36354818)

### 5. Premium Content — Free User (403)
![Free User](https://github.com/user-attachments/assets/62852951-b460-48aa-8744-fa843bc21945)

### 6. Subscription Upgrade
![Upgrade](https://github.com/user-attachments/assets/966f2ea6-7c6b-4f1c-9339-a160fe5a16ab)

### 7. Premium Content — Premium User (200)
![Premium Content](https://github.com/user-attachments/assets/07cc216b-50ef-4b83-8890-cf797a43fefb)

### 8. Subscription Status
![Status](https://github.com/user-attachments/assets/63b672fb-4595-4ae1-8dda-61cdc4ca2d4b)

### 9. Admin Logs
![Logs](https://github.com/user-attachments/assets/b699b0ed-bcd2-49bb-b0d1-676b4f518206)

### 10. Monthly CSV Report
![CSV](https://github.com/user-attachments/assets/e26884e1-66e8-4763-9169-333b7fb0c600)
)
## Security Notes

- Passwords hashed with **bcrypt** (12 salt rounds)
- JWT signed with HS256 — rotate `JWT_SECRET` in production
- Generic auth error messages prevent user enumeration
- DB transactions used for subscription upgrades
- Subscription expiry enforced at middleware level on every request
- Body size limited to 10kb
