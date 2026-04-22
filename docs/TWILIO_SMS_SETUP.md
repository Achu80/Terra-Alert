# 📱 Twilio SMS Alerts Setup Guide

This guide explains how to enable SMS alerts for high-risk landslide predictions using Twilio.

## 📋 Overview

Terra Alert can send automated SMS alerts when high-risk landslide conditions are detected. This feature is **optional** and requires a Twilio account.

### When SMS Alerts are Sent
- **High Risk**: Risk score ≥ 60
- **Critical Risk**: Risk score ≥ 80
- **7-Day Forecast**: Alerts for predicted high-risk days

## 🚀 Quick Setup

### Step 1: Install Twilio

```bash
cd backend
pip install twilio
```

Or uncomment the line in `backend/requirements.txt`:
```txt
# twilio>=8.0.0  # Remove the # to enable
```

Then run:
```bash
pip install -r requirements.txt
```

### Step 2: Create Twilio Account

1. Go to [Twilio Console](https://www.twilio.com/console)
2. Sign up for a free trial account (or paid account)
3. Verify your email and phone number

### Step 3: Get Twilio Credentials

From the [Twilio Console](https://console.twilio.com/):

1. **Account SID**: Found on the dashboard
2. **Auth Token**: Click "Show" to reveal it
3. **Phone Number**: 
   - Go to Phone Numbers → Manage → Buy a number
   - Choose a number with SMS capability
   - Complete the purchase (trial accounts get $15 credit)

### Step 4: Configure Environment Variables

Add these to your `backend/.env` file:

```env
# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
ALERT_PHONE_NUMBER=+1234567890
```

**Replace with your actual values:**
- `TWILIO_ACCOUNT_SID`: Your Account SID from Twilio Console
- `TWILIO_AUTH_TOKEN`: Your Auth Token from Twilio Console
- `TWILIO_PHONE_NUMBER`: Your Twilio phone number (format: +1234567890)
- `ALERT_PHONE_NUMBER`: The phone number to receive alerts (format: +1234567890)

### Step 5: Restart Backend

```bash
cd backend
python app.py
```

You should see:
```
✓ SMS alerts enabled
```

If you see warnings, check your configuration.

## 📝 SMS Alert Format

When a high-risk condition is detected, you'll receive an SMS like:

```
🚨 GEOSAFE LANDSLIDE ALERT
Risk Level: HIGH
Risk Score: 75.3%
Location: 31.1048, 77.1734
Date: 2024-04-23
Take precautionary measures immediately.
```

## 🔧 Testing SMS Alerts

### Test via API

```bash
curl -X POST http://localhost:5000/api/forecast/predict \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 31.1048,
    "lon": 77.1734
  }'
```

If any day in the 7-day forecast has a risk score ≥ 60, an SMS will be sent.

### Test Manually

Create a test script `backend/test_sms.py`:

```python
from services.alert_service import AlertService

alert_service = AlertService()

# Test SMS
result = alert_service.send_landslide_alert(
    lat=31.1048,
    lon=77.1734,
    risk_score=75.5,
    risk_level="HIGH",
    date="2024-04-23"
)

if result:
    print("✓ SMS sent successfully!")
else:
    print("✗ SMS failed to send")
```

Run it:
```bash
cd backend
python test_sms.py
```

## 💰 Pricing

### Twilio Trial Account
- **Free credit**: $15.00
- **SMS cost**: ~$0.0075 per message
- **Limitations**: 
  - Can only send to verified phone numbers
  - Messages include "Sent from your Twilio trial account"

### Twilio Paid Account
- **SMS cost**: $0.0075 - $0.01 per message (varies by country)
- **Monthly cost**: ~$1.15 for phone number rental
- **No limitations**: Send to any phone number

### Cost Estimation
- **Low usage** (10 alerts/day): ~$2.25/month
- **Medium usage** (50 alerts/day): ~$12.50/month
- **High usage** (100 alerts/day): ~$23.50/month

## 🔍 Troubleshooting

### SMS Not Sending

**Check 1: Twilio is installed**
```bash
pip show twilio
```

**Check 2: Credentials are correct**
```bash
cd backend
python -c "from services.alert_service import AlertService; print(AlertService().enabled)"
```
Should print `True`

**Check 3: Phone number format**
- Must include country code: `+1234567890`
- No spaces or dashes: ❌ `+1 (234) 567-890` ✅ `+1234567890`

**Check 4: Trial account limitations**
- Verify the recipient phone number in Twilio Console
- Go to Phone Numbers → Verified Caller IDs

**Check 5: Check logs**
Look for error messages in the backend console:
```
✗ SMS failed: [error message]
```

### Common Errors

#### Error: "Unable to create record"
- **Cause**: Invalid phone number format
- **Fix**: Ensure numbers start with `+` and country code

#### Error: "Authenticate"
- **Cause**: Invalid Account SID or Auth Token
- **Fix**: Double-check credentials in `.env` file

#### Error: "Permission denied"
- **Cause**: Trial account trying to send to unverified number
- **Fix**: Verify the recipient number in Twilio Console

#### Error: "Insufficient funds"
- **Cause**: Trial credit exhausted or no payment method
- **Fix**: Add payment method or upgrade account

## 🔒 Security Best Practices

1. **Never commit credentials**
   - Keep `.env` in `.gitignore`
   - Use environment variables only

2. **Rotate tokens regularly**
   - Generate new Auth Token every 90 days
   - Update `.env` file

3. **Limit alert recipients**
   - Only send to authorized personnel
   - Use a distribution list if needed

4. **Monitor usage**
   - Check Twilio Console for usage stats
   - Set up billing alerts

## 🚫 Disabling SMS Alerts

To disable SMS alerts:

1. **Uninstall Twilio** (optional):
   ```bash
   pip uninstall twilio
   ```

2. **Or remove credentials** from `.env`:
   ```env
   # TWILIO_ACCOUNT_SID=
   # TWILIO_AUTH_TOKEN=
   # TWILIO_PHONE_NUMBER=
   # ALERT_PHONE_NUMBER=
   ```

3. **Restart backend**

The app will continue to work normally, just without SMS alerts. You'll see:
```
⚠ SMS alerts disabled: Twilio not installed
```
or
```
⚠ SMS alerts disabled: Twilio credentials not configured
```

## 📚 Additional Resources

- [Twilio SMS Documentation](https://www.twilio.com/docs/sms)
- [Twilio Python SDK](https://www.twilio.com/docs/libraries/python)
- [Twilio Pricing](https://www.twilio.com/sms/pricing)
- [Twilio Console](https://console.twilio.com/)

## 🆘 Support

If you encounter issues:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Review Twilio logs in the Console
3. Check backend logs for error messages
4. Verify all environment variables are set correctly

---

**Note**: SMS alerts are completely optional. Terra Alert works perfectly without Twilio - alerts will simply be logged to the console instead of sent via SMS.
