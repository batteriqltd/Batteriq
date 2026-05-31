# 🔧 Vercel Environment Variables — Batteriq

## How to update environment variables in Vercel

1. Go to: https://vercel.com/batteriqltd543/batteriq/settings/environment-variables
2. For each variable below — if it exists, click Edit. If it doesn't exist, click Add New.
3. After saving all variables, go to **Deployments** → click the 3-dot menu on the latest → click **Redeploy**

---

## 🟡 SANDBOX (current — for testing M-Pesa)

| Variable Name | Value |
|---|---|
| `MPESA_CONSUMER_KEY` | `scMvYTPoU6xGh94Svw7Aq0FTnCmRHGgW1UgjkCsQD5iwlMQM` |
| `MPESA_CONSUMER_SECRET` | `lFgVZfe7vvNmzi5AIrLkO23DkjvJYFBG58m0UFYcP68zw1AlcOR8YMEpXtGj4G0Y` |
| `MPESA_BUSINESS_SHORTCODE` | `174379` |
| `MPESA_PASSKEY` | `bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919` |
| `MPESA_ENVIRONMENT` | `sandbox` |
| `MPESA_CALLBACK_URL` | `https://batteriq.com/api/mpesa/callback` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlYWdqamRiYnVrZGtrdHZpeXJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTE3NTUyOSwiZXhwIjoyMDk0NzUxNTI5fQ.qWz3gqOLyDV1Zvz_d1ZjFSiUx2z6SOQ0a11Wqcuqjfg` |

---

## 🟢 PRODUCTION (switch to these after Safaricom Go-Live approval)

| Variable Name | Value |
|---|---|
| `MPESA_CONSUMER_KEY` | `ZSHGN57vFtU8miOj7p5UmqGRj75nSLC1WCh8UqJqaOl8g5em` |
| `MPESA_CONSUMER_SECRET` | `QYdsmMS2toBbNnkprskM9NwXAGvq0okktgVrE6bpEqDyt3yJVreAZIHYAGatPYEK` |
| `MPESA_BUSINESS_SHORTCODE` | `5286334` |
| `MPESA_PASSKEY` | `f937f5801de1b42555ff74537987b919883fbad581c187472feabba71b5d0813` |
| `MPESA_ENVIRONMENT` | `production` |
| `MPESA_CALLBACK_URL` | `https://batteriq.com/api/mpesa/callback` |

---

## ⚠️ Important Notes

- Sandbox payments use a **test phone number**: `254708374149` (Safaricom test number)
- Sandbox will NOT send a real STK push to your phone — it simulates it
- After Go-Live is approved by Safaricom, switch to the PRODUCTION values above and redeploy
