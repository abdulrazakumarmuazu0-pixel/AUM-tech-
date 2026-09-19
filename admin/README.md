# AUM Tech — Admin (Company Operations)

## Access
1. Open `login.html` and sign in with your Firebase account
2. **First user automatically becomes superadmin** (one-time setup)
3. Change roles later from Team tab (client / staff / admin / superadmin)

## Modules
- Overview: live stats + latest leads
- Leads: Kanban drag & drop (New → Contacted → Qualified → Converted)
- Clients: auto-populated from portal registrations
- Projects: change status/progress (syncs to client portal in real-time!)
- Tasks: simple board (To Do / Doing / Done)
- Team: manage user roles
- Finance: payments from clients + manual expenses + monthly revenue chart
- Reports: export CSV (leads, clients, projects, payments)

⚠ Uses the same `firebase/config.js` as the website & portal.

## Developer Workspace (dev-workspace.html)
- Repositories: track GitHub repos per project
- Environments: Dev / Staging / Prod URLs per project
- Deployments: record releases, rollback support
- API Keys: masked vault (last 4 chars shown), copy button
- Logs: add/filter/search entries (info/warn/error)
- Monitoring: client-side uptime checks with uptime %

## Super Admin (super.html — superadmin only)
- Analytics: platform-wide counts & revenue
- Users: create accounts (no logout), change roles, suspend/activate, delete
- Roles & Permissions: full permission matrix per role per module
- Settings: company info + security policies
- Audit Logs: every sensitive action, newest first
- Configuration: feature flags (maintenance mode, registrations, payments...) — instant, no redeploy

## Message Inbox (Operations → 📥)
- Real-time threads from client portal (grouped by project)
- Unread badges per thread + total in sidebar
- Click thread → view history + reply (auto marks read)
- ✓✓ read receipts
