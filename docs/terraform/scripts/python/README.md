# scripts/python/

Python scripts for operational tasks that need real logic.

## Setup

```bash
cd scripts/python
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Scripts

| Script | Usage | Purpose |
|--------|-------|---------|
| `health_check.py` | `python health_check.py --env prod` | Verify full stack is healthy |
| `cost_report.py` | `python cost_report.py` | Show credits remaining + burn rate |
| `db_snapshot.py` | `python db_snapshot.py --env prod --reason pre-deploy` | Manual RDS snapshot |
| `migrate_account.py` | `python migrate_account.py --env prod --source-profile a --target-profile b` | Move to new AWS account |
| `rotate_secret.py` | `python rotate_secret.py --env prod --secret jwt_secret` | Update a secret + reload app |
