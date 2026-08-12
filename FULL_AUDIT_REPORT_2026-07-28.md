# NARRIV FULL AUDIT REPORT — 2026-07-28
**Live check untuk launch besok**

---

## RINGKASAN EKSEKUTIF

| Area | Status |
|---|---|
| Backend API (narriv-api.vercel.app) | ⚠️ PARTIAL — health OK, login BROKEN |
| Frontend (Vercel) | ⚠️ CONFIG ERROR — API URL salah |
| Supabase Database | 🔴 CRITICAL — RLS MATI, login broken |
| Database Data | 🟡 WARNING — banyak kosong, 1014 test accounts |
| Auth Flow | 🔴 BROKEN — semua user email belum verified |
| Security | 🔴 CRITICAL — semua data bisa dibaca tanpa auth |

---

## 🔴 CRITICAL ISSUES — FIX SEBELUM LAUNCH

### 1. AUTH BROKEN — Semua Login Gagal

**Root Cause:** Login endpoint `POST /auth/login` query table `users` (lowercase), tapi database Supabase pakai `User` (PascalCase). Semua login throws error `Internal server error`.

```
Backend code:   .from("users")
Database table: "User" (PascalCase)
Result:         500 Internal Server Error pada semua login attempt
```

**Fix:** Ubah semua `.from("users")` → `.from("User")` di `backend/src/modules/auth/auth.controller.js`

**Files yang perlu diperbaiki:**
- [auth.controller.js](backend/src/modules/auth/auth.controller.js) — login, register, change-password, dll.

**Estimated impact:** 100% auth flow mati — user tidak bisa login.

---

### 2. RLS (Row Level Security) MATI DI SEMUA TABLE

**Severity: CRITICAL SECURITY**

Dengan anon key, semua data bisa dibaca tanpa authentication:

```
✅ Signal (1000 rows) — bisa dibaca publik
✅ User table (1014 accounts + password hashes) — bisa dibaca publik
✅ refresh_tokens (29 token hashes) — bisa dibaca publik
✅ workspaces, sources, audit_logs — semua bisa dibaca publik
```

**Ini berarti:**
- Siapa saja yang punya anon key bisa baca semua data
- Password hash user bisa diexpose
- Session token bisa dicuri

**Fix:** Enable RLS + buat policies di Supabase dashboard. Migrations `002_rls_policies.sql` dll sudah ada tapi belum di-apply dengan benar.

---

### 3. EMAIL VERIFICATION BLOCKS ALL LOGINS

**Root Cause:** Code login强制 check `email_verified` = true:

```javascript
if (!user.email_verified) {
    return res.status(403).json({
        error: "Email is not verified.",
        code: "EMAIL_NOT_VERIFIED"
    });
}
```

**Tapi:** 1014 user accounts di database, **99.3% (1007 accounts) punya `emailVerified: null`** — email belum pernah diverifikasi.

**Result:** Tidak ada user bisa login karena email verification tidak pernah diproses.

**Fix options:**
- A) Kirim ulang semua verification emails
- B) Bulk update `emailVerified` untuk accounts yang sudah paid/verified
- C) Temporary bypass untuk production launch (dengan risk)

---

### 4. 1014 AUTO-GENERATED TEST ACCOUNTS

**Severity: HIGH**

Database punya 1014 user accounts dengan pola:
- 1001 accounts pakai email domain `unknown` — tanda bot/test generator
- Semua dibuat timestamp sama (2026-07-02)
- 99.3% unverified

**Ini kemungkinan dari:**
- Registration flow yang jalan otomatis tanpa verification
- Load test / bot attacks
- Malfunctioning onboarding process

**Fix:** Hapus accounts yang tidak perlu, investigate penyebabnya.

---

## 🔴 BACKEND API ISSUES

### 5. Login Returns "Internal Server Error"

```bash
$ curl -X POST https://narriv-api.vercel.app/auth/login \
  -d '{"email":"test@gmail.com","password":"wrong"}'

{"error":"Internal server error"}  # Harus nya 401 Invalid credentials
```

**Confirmed:** Semua login attempt gagal dengan 500 error. Bukan invalid credentials — tapi code crash sebelum sampai ke auth check.

---

### 6. Frontend API URL Configuration Error

**File:** `frontend/.env.production`
```
NEXT_PUBLIC_API_URL=https://narriv-api.vercel.app  ✅ Benar
```

**Tapi `frontend/.env.local`** (yang override):
```
NEXT_PUBLIC_API_URL=http://localhost:3000  ❌ Salah untuk production
```

**Status:** Local dev OK, tapi kalau Vercel build pakai `.env.production` seharusnya fine.

---

### 7. signal_analyses TABLE EMPTY — AI Analysis Not Running

```
Signal count:     1,000 rows ✅
SignalAnalysis:   0 rows    ❌
```

**Ini berarti:**
- Signals udah di-capture (1000 signals dari sources)
- Tapi AI analysis worker belum pernah jalan atau gagal semua
- Dashboard akan tampil signals tanpa sentiment/summary dari AI

**Kemungkinan penyebab:**
- Workers tidak jalan (REDIS_URL salah / ENABLE_WORKERS=false)
- OpenAI API key belum di-set
- signal_analyses schema mismatch (code insert individual columns, schema pakai JSONB column)

---

### 8. SCHEMA MISMATCH: signal_analyses

**Migration 001 defines:**
```sql
CREATE TABLE signal_analyses (
    id UUID PRIMARY KEY,
    signal_id UUID,
    analysis JSONB NOT NULL,  -- JSONB column
    confidence NUMERIC(3,2),
    model TEXT
);
```

**Backend code inserts:**
```javascript
.insert({
    sentiment: "positive",           // ❌ column doesn't exist
    narrative_type: "crisis",       // ❌ column doesn't exist
    stakeholder: "media",           // ❌ column doesn't exist
    recommended_action: "...",        // ❌ column doesn't exist
})
```

**Result:** Insert akan FAIL karena column tidak ada.

---

## 🟡 DATA STATUS

### Tables with Data
| Table | Count | Notes |
|---|---|---|
| User | 1,014 | ⚠️ 99% unverified, 1001 test accounts |
| Workspace | 1 | ✅ Active |
| Signal | 1,000 | ✅ Data from sources |
| Source | 60 | ✅ Active sources |
| IngestionJob | 12 | ✅ Ingestion jobs ran |
| refresh_tokens | 29 | ✅ Active sessions |
| AuditLog | 56 | ✅ Login events recorded |

### Empty Tables (Expected for New Deploy)
| Table | Count | Notes |
|---|---|---|
| Alert | 0 | ⚠️ No alerts generated |
| NarrativeCluster | 0 | ⚠️ No clustering yet |
| AIVisibilityResult | 0 | ⚠️ AI visibility not configured |
| Report | 0 | ⚠️ No reports created |
| Case | 0 | ⚠️ No cases created |
| Integration | 0 | ⚠️ No integrations |
| WorkspaceSettings | 0 | ⚠️ No settings set |
| WorkspaceNotificationSettings | 0 | ⚠️ No notifications |
| signal_analyses | 0 | 🔴 **CRITICAL** AI analysis not working |

---

## 🟡 SECURITY ISSUES

### 9. Password Hashes Exposed via Anon Key

```
Table: User (1,014 rows)
Field: password — bcrypt hashes readable with anon key

Table: user_profiles (4 rows)
Field: password — bcrypt hashes readable with anon key
```

**Anyone with the anon key can:**
1. Read all user password hashes
2. Attempt to crack bcrypt hashes offline
3. Use cracked passwords on other services (credential stuffing)

---

### 10. Refresh Token Hashes Exposed

```
Table: refresh_tokens (29 rows)
Fields: token_hash — readable with anon key
```

**Anyone with anon key can:**
1. See who has active sessions
2. Potentially correlate user activity

---

### 11. JWT Key Mismatch on Some Tables

Beberapa table query menghasilkan error `PGRST301 — JWT cryptographic operation failed`, terutama saat pakai service role key. Ini menandakan ada masalah dengan JWT signing keys di Supabase.

**Workaround:** Anon key berfungsi untuk beberapa table, tapi service role gagal di table lain.

---

## 🟡 CONFIGURATION ISSUES

### 12. Backend .env Missing Real Credentials

File `backend/.env` tidak punya credential asli:
```bash
JWT_SECRET=REPLACE_WITH_YOUR_...
OPENAI_API_KEY=REPLACE_WITH_YOUR_...
APIFY_TOKEN=REPLACE_WITH_YOUR_...
REDIS_URL=redis://localhost:6379  # ❌ Local Redis won't work on Vercel
```

**Yang di-set:**
- `SUPABASE_URL=https://kbwhixaiudhhqduvlqal.supabase.co` ✅
- `CORS_ORIGINS=http://localhost:3001` ✅ (dev only)

**Yang TIDAK di-set (harus ada untuk production):**
- `JWT_SECRET` — baru placeholder
- `OPENAI_API_KEY` — baru placeholder
- `REDIS_URL` — localhost tidak akan jalan di Vercel
- `RESEND_API_KEY` — untuk email
- `APIFY_API_TOKEN` — untuk data ingestion

---

### 13. Prisma Documentation vs Actual Code

`all-context.md` dan `narriv_backend_blueprint.md` bilang "Prisma ORM" tapi code actual pakai `@supabase/supabase-js` raw SQL. Documentation sudah stale.

---

## ✅ YANG SUDAH BAGUS

1. **Backend API Server running** di `narriv-api.vercel.app`
2. **Health check OK** — `GET /health` returns 200
3. **Auth middleware working** — protected routes return proper 401
4. **Rate limiting active** — login protection berjalan
5. **60 active sources** — data ingestion pipeline berfungsi
6. **1000 signals** sudah di-capture dari sources
7. **14 migrations** sudah applied dengan benar
8. **Docker Compose production** config lengkap
9. **Frontend codebase** semua pages implemented
10. **i18n EN/ID** bilingual coverage lengkap
11. **Demo mode** berfungsi dengan mock data

---

## ACTION PLAN — FIX SEBELUM LAUNCH

### MUST FIX (Blokir Launch)

| # | Issue | Fix | Estimated Time |
|---|---|---|---|
| 1 | Login broken (users vs User) | Rename `.from("users")` → `.from("User")` di auth.controller.js | 5 min |
| 2 | All users unverified (email) | Bulk update emailVerified atau bypass temporary | 10 min |
| 3 | RLS disabled | Enable RLS di Supabase dashboard | 15 min |
| 4 | signal_analyses insert fails | Fix schema mismatch — insert JSONB bukan individual columns | 20 min |
| 5 | Workers not running | Set ENABLE_WORKERS=true, configure REDIS_URL untuk Vercel | 30 min |

### SHOULD FIX (Hari Pertama Setelah Launch)

| # | Issue | Fix |
|---|---|---|
| 6 | 1014 test accounts | Delete spam accounts, investigate source |
| 7 | Backend missing env vars | Set JWT_SECRET, OPENAI_API_KEY, dll di Vercel env |
| 8 | REDIS_URL localhost | Gunakan Upstash Redis atau managed Redis untuk Vercel |
| 9 | Demo user `demo@narriv.test` | Set password + emailVerified=true |

### NICE TO HAVE (Minggu Depan)

| # | Issue |
|---|---|
| 10 | Update stale documentation (Prisma → Supabase-js) |
| 11 | Audit log workspace_id null — backfill |
| 12 | Narrative clusters empty — run clustering worker |
| 13 | Alerts empty — alert detection worker belum jalan |

---

## QUICK FIX SCRIPT

```bash
# 1. Fix table name di auth.controller.js
sed -i 's/\.from("users")/\.from("User")/g' backend/src/modules/auth/auth.controller.js

# 2. Bulk verify all existing users (emergency)
# Di Supabase SQL Editor:
UPDATE "User" SET "emailVerified" = NOW() WHERE "emailVerified" IS NULL;

# 3. Enable RLS di Supabase Dashboard
# Buka Supabase Dashboard → Table Editor → each table → enable RLS + add policies

# 4. Fix signal_analyses — wrap as JSONB
# Di backend code, change individual column insert to:
.insert({
    signal_id: ...,
    analysis: JSON.stringify({
        sentiment: result.sentiment,
        narrative_type: result.narrative_type,
        stakeholder: result.stakeholder,
        recommended_action: result.recommended_action
    }),
    confidence: result.confidence_score,
    model: "gpt-4o-mini"
})
```

---

## KESIMPULAN

**Status:** Project MATURE secara codebase, tapi ada 3-5 critical bugs yang blokir launch besok:

1. **Login broken** (table name mismatch) — 5 min fix
2. **All users unverified** — 10 min fix  
3. **RLS disabled** — 15 min fix
4. **AI analysis not persisting** (schema mismatch) — 20 min fix
5. **Workers not running** (Redis config) — 30 min fix

Kalau 5 issue di atas di-fix, app akan functional untuk demo/pilot launch. Remaining issues bisa diaddress minggu depan.

**Recommendation:** 
- Priority 1: Fix #1, #2, #3 HARI INI sebelum jam 6 sore
- Priority 2: Fix #4, #5 sebelum demo
- Priority 3: Monitor dan fix sisanya post-launch

