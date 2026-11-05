# Auth email templates

Paste into Supabase → Authentication → Emails → Templates (each one's subject and HTML body).
Links go to `/auth/confirm` (token hash), so they work in any browser or device, including the Gmail app.
Edit `scripts/make-email-templates.py` and run it to change them; don't edit the HTML by hand.

| Supabase template | File | Subject |
|---|---|---|
| Confirm signup | `confirmation.html` | Confirm your email to start learning on Krpex |
| Reset password | `recovery.html` | Reset your Krpex password |
| Magic link | `magic_link.html` | Your Krpex sign-in link |
| Change email address | `email_change.html` | Confirm your new email address for Krpex |
| Invite user | `invite.html` | You're invited to Krpex |
| Reauthentication | `reauthentication.html` | Your Krpex verification code |
