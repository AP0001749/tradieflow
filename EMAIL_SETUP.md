# Invoice Email Dispatch System

## Overview
The email dispatch system allows you to send professional invoice emails to clients directly from the invoice detail page using [Resend](https://resend.com/).

## Setup

### 1. Get a Resend API Key
1. Sign up for a free account at [https://resend.com](https://resend.com)
2. Navigate to [API Keys](https://resend.com/api-keys)
3. Create a new API key
4. Copy the key

### 2. Add API Key to Environment Variables
Add the following to your `.env.local` file:

```bash
RESEND_API_KEY=re_your_api_key_here
```

### 3. Restart Development Server
After adding the API key, restart your dev server:

```bash
npm run dev
```

## Usage

1. Navigate to any invoice detail page: `/dashboard/invoices/{id}`
2. Click the **"Send Email"** button in the toolbar
3. The system will:
   - Fetch the invoice, client, and business details
   - Render a professional HTML email template
   - Send the email to the client's email address
   - Display a success/error message

## Email Template Features

The invoice email includes:
- **Business name** as the sender
- **Client name** personalization
- **Invoice number** and amount
- **Due date** formatted for locale
- **"View Invoice" button** linking to the invoice page
- Professional styling with responsive design
- "Powered by TradieFlow" footer

## Requirements

### Client Email
- Clients must have an email address set in their profile
- If no email is found, the system will display an error

### Business Profile
- The system uses your business name from the profiles table
- Falls back to "TradieFlow" if not set

## Testing

For testing, Resend provides a special email address:
- **From**: `onboarding@resend.dev`
- This allows you to test without verifying a custom domain

## Production Setup

For production use:
1. Verify your domain with Resend
2. Update the `fromEmail` in the server action to use your verified domain
3. Consider adding email templates for other notifications (quotes, receipts, etc.)

## Files Structure

```
src/
├── emails/
│   └── invoice-email.tsx          # React Email template
├── lib/
│   └── resend.ts                  # Resend client initialization
└── app/dashboard/invoices/
    ├── actions.ts                 # sendInvoiceEmail server action
    └── [id]/
        ├── page.tsx               # Invoice detail page
        └── send-email-button.tsx  # Client component for sending
```

## Troubleshooting

### "API key not configured"
- Make sure `RESEND_API_KEY` is set in `.env.local`
- Restart your development server after adding the key

### "Client email not found"
- Ensure the client has an email address in their profile
- Edit the client to add an email address

### Email not received
- Check your spam folder
- Verify the client's email address is correct
- Check Resend dashboard for delivery logs
- For testing, use `onboarding@resend.dev` as the from address

## Next Steps

Consider adding:
- Email status tracking in the database
- Bulk email sending for multiple invoices
- Email templates for quotes and receipts
- Email scheduling (send reminders before due date)
- PDF attachments of invoices
