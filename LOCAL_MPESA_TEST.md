# Local M-Pesa STK Push Test

Test real M-Pesa payments locally before deploying to production.

## Prerequisites
1. Node.js installed (https://nodejs.org)
2. ngrok installed (https://ngrok.com)
   - Sign up free → download Windows ZIP → extract ngrok.exe to C:\Windows\System32
   - Run once: `ngrok config add-authtoken YOUR_TOKEN_FROM_DASHBOARD`

## Run the test

```powershell
# 1. Clone and install
git clone https://github.com/batteriqltd/Batteriq.git
cd Batteriq
npm install

# 2. Run setup script (creates .env.local + starts ngrok)
.\scripts\mpesa-ngrok-test.ps1 -Phone 0791083304

# 3. Restart dev server (Ctrl+C first if running)
npm run dev

# 4. Trigger STK push - open in browser:
# http://localhost:3000/api/mpesa/diagnose?phone=0791083304

# 5. Watch ngrok dashboard for callback:
# http://localhost:4040
```

## What to look for

- `tokenStatus: SUCCESS` — credentials are correct
- `stkStatus: SUCCESS` — STK push sent, check your phone
- Phone receives M-Pesa PIN prompt
- Terminal logs `[Callback] Payment successful` after entering PIN
- ngrok dashboard shows Safaricom POST to `/api/mpesa/callback`

## If phone does not receive prompt
The issue is Safaricom has not activated shortcode 5286334 for STK Push.
Contact: apisupport@safaricom.co.ke with subject "STK Push Activation — Shortcode 5286334"
