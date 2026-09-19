# ⚡ AUM TECHNOLOGY COMPANY — Full Platform

All-in-one platform: Public Website + Client Portal + Company Operations + Developer Workspace + Super Admin.

## Structure
| Folder | What |
|---|---|
| `public-website/` | Marketing site (7 pages) |
| `client-portal/` | Client login, dashboard, request project |
| `admin/` | Operations (CRM/ERP), Dev Workspace, Super Admin |
| `functions/` | Cloud Functions (notifications, monitors) |
| `firestore.rules` | Production security rules — DEPLOY THESE! |
| `firestore.indexes.json` | Required composite indexes |
| `LAUNCH_CHECKLIST.md` | **Start here for deployment** ⭐ |

## Quick Start
1. Open `LAUNCH_CHECKLIST.md` and follow steps 1–3
2. Website works immediately (static); portal/admin need Firebase config
3. First staff login → auto superadmin

## Admin Access
- `admin/login.html` → Operations (CRM, Finance, Reports)
- `admin/dev-workspace.html` → Dev tools
- `admin/super.html` → Superadmin governance


## 🔐 Security Checklist (IMPORTANT)
- [ ] **Restrict the Firebase API key**: Google Cloud Console → APIs & Services → Credentials → your key → HTTP referrers: add your domain(s) + localhost. (Client config is safe to commit; referrer restriction stops abuse from other sites.)
- [ ] Firestore rules deployed (see LAUNCH_CHECKLIST.md)
- [ ] Paystack **secret** key — NEVER in client code (use Cloud Functions for server-side calls)
- [ ] GitHub repo public? That's fine for code — but NEVER commit service-account JSONs or `.env` files
