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
