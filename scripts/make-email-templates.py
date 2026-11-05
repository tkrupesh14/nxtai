# Builds the Supabase auth email templates in supabase/templates: python3 scripts/make-email-templates.py
import sys, os
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "supabase", "templates")

FONT = "'Geist','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
MONO = "'Geist Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace"

def link(type_, ):
    # /auth/confirm verifies the token on any device (no same-browser PKCE cookie needed).
    return "{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=%s&next={{ .RedirectTo }}" % type_

def button(href, label):
    return f'''<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
  <tr>
    <td class="btn" bgcolor="#2563eb" style="border-radius:10px;background:#2563eb;box-shadow:0 1px 2px rgba(37,99,235,.25),0 6px 16px -6px rgba(37,99,235,.55);">
      <a href="{href}" target="_blank" style="display:inline-block;padding:14px 26px;font-family:{FONT};font-size:15px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;border-radius:10px;">{label}&nbsp;&rarr;</a>
    </td>
  </tr>
</table>'''

def fallback(href):
    return f'''<p class="muted" style="margin:20px 0 0;font-family:{FONT};font-size:13px;line-height:1.6;color:#71717a;">
  Button not working? Copy this link into your browser:<br>
  <a href="{href}" target="_blank" class="muted" style="font-size:12px;color:#8b8b95;text-decoration:underline;word-break:break-all;">{href}</a>
</p>'''

def p(text, extra=""):
    return f'<p class="body" style="margin:14px 0 0;font-family:{FONT};font-size:15px;line-height:1.65;color:#3f3f46;{extra}">{text}</p>'

def note(text):
    return f'''<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
  <tr><td class="note" style="padding:14px 16px;border-radius:10px;background:#f4f6fb;border:1px solid #e4e8f2;font-family:{FONT};font-size:13px;line-height:1.6;color:#52525b;">{text}</td></tr>
</table>'''

def steps(items):
    rows = ""
    for i, (title, body) in enumerate(items, 1):
        rows += f'''<tr>
    <td valign="top" width="36" style="padding:0 0 16px;">
      <div class="step" style="width:26px;height:26px;border-radius:999px;background:#eff4ff;color:#2563eb;font-family:{FONT};font-size:13px;font-weight:600;line-height:26px;text-align:center;">{i}</div>
    </td>
    <td valign="top" style="padding:2px 0 16px;font-family:{FONT};font-size:14px;line-height:1.55;color:#52525b;">
      <strong class="strong" style="color:#18181b;font-weight:600;">{title}</strong><br>{body}
    </td>
  </tr>'''
    return f'''<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px;border-top:1px solid #ececf0;" class="rule">
  <tr><td colspan="2" style="padding:24px 0 14px;font-family:{FONT};font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#a1a1aa;">What happens next</td></tr>
  {rows}
</table>'''

def code_box():
    return f'''<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 6px;">
  <tr><td class="code" style="padding:16px 28px;border-radius:12px;background:#f4f6fb;border:1px solid #dfe5f3;font-family:{MONO};font-size:30px;font-weight:600;letter-spacing:.32em;color:#18181b;">{{{{ .Token }}}}</td></tr>
</table>'''

def layout(title, preheader, eyebrow, heading, content, reason):
    return f'''<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{title}</title>
<style>
  body {{ margin:0; padding:0; }}
  a {{ color:#2563eb; }}
  @media (max-width:600px) {{
    .card-pad {{ padding:32px 24px !important; }}
    .h1 {{ font-size:24px !important; }}
  }}
  @media (prefers-color-scheme: dark) {{
    .bg {{ background:#09090b !important; }}
    .card {{ background:#141417 !important; border-color:#27272a !important; }}
    .h1, .strong, .brand, .code {{ color:#fafafa !important; }}
    .body {{ color:#d4d4d8 !important; }}
    .muted, .foot {{ color:#a1a1aa !important; }}
    .note, .code {{ background:#1c1c21 !important; border-color:#2e2e35 !important; color:#d4d4d8 !important; }}
    .step {{ background:#172554 !important; color:#93c5fd !important; }}
    .eyebrow {{ color:#60a5fa !important; }}
    .rule {{ border-color:#27272a !important; }}
  }}
</style>
</head>
<body class="bg" style="margin:0;padding:0;background:#f5f6f8;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">{preheader}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg" style="background:#f5f6f8;">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <!-- Logo -->
        <tr>
          <td style="padding:0 4px 22px;">
            <a href="{{{{ .SiteURL }}}}" target="_blank" style="text-decoration:none;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                <td width="26" height="26" bgcolor="#2563eb" style="width:26px;height:26px;border-radius:7px;background:#2563eb;background-image:linear-gradient(135deg,#3b82f6,#1d4ed8);font-size:0;line-height:0;">&nbsp;</td>
                <td class="brand" style="padding-left:10px;font-family:{FONT};font-size:19px;font-weight:600;letter-spacing:-.02em;color:#18181b;">Krpex</td>
              </tr></table>
            </a>
          </td>
        </tr>
        <!-- Card -->
        <tr>
          <td class="card" style="background:#ffffff;border:1px solid #e7e7ec;border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(16,24,40,.04),0 12px 32px -12px rgba(16,24,40,.12);">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td height="4" style="height:4px;font-size:0;line-height:0;background:#2563eb;background-image:linear-gradient(90deg,#2563eb,#6366f1 55%,#60a5fa);">&nbsp;</td></tr>
              <tr>
                <td class="card-pad" style="padding:40px 40px 36px;">
                  <p class="eyebrow" style="margin:0;font-family:{FONT};font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#2563eb;">{eyebrow}</p>
                  <h1 class="h1" style="margin:10px 0 0;font-family:{FONT};font-size:27px;font-weight:600;letter-spacing:-.025em;line-height:1.25;color:#18181b;">{heading}</h1>
                  {content}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td class="foot" style="padding:26px 8px 0;font-family:{FONT};font-size:12px;line-height:1.7;color:#8b8b95;text-align:center;">
            {reason}<br>
            <a href="{{{{ .SiteURL }}}}" target="_blank" style="color:#8b8b95;text-decoration:underline;">krpex.in</a> &middot; Your personal AI professor &middot;
            <a href="mailto:info@krpex.in" style="color:#8b8b95;text-decoration:underline;">info@krpex.in</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
'''

IGNORE = "If you didn&rsquo;t ask for this, you can ignore this email: nothing changes until the link is used."

templates = {
  "confirmation": dict(
    subject="Confirm your email to start learning on Krpex",
    title="Confirm your email",
    preheader="One tap and your AI professor is ready to build your first course.",
    eyebrow="Welcome to Krpex",
    heading="Confirm your email and let&rsquo;s start learning",
    content=p("You&rsquo;re one tap away from your first lesson. Confirm <strong class=\"strong\" style=\"color:#18181b;\">{{ .Email }}</strong> to finish creating your Krpex account.")
      + button(link("email"), "Confirm my email")
      + fallback(link("email"))
      + steps([
          ("Tell us what you want to learn", "A few quick questions about your goal, level and the time you have."),
          ("Your AI professor builds the course", "A syllabus made for you, module by module."),
          ("Learn class-style", "Lessons, quizzes and answers to your questions whenever you&rsquo;re stuck."),
        ]),
    reason="You got this email because someone signed up for Krpex with this address. If it wasn&rsquo;t you, ignore it and no account will be created.",
  ),
  "recovery": dict(
    subject="Reset your Krpex password",
    title="Reset your password",
    preheader="Use this link to choose a new password for your Krpex account.",
    eyebrow="Password reset",
    heading="Choose a new password",
    content=p("We got a request to reset the password for <strong class=\"strong\" style=\"color:#18181b;\">{{ .Email }}</strong>. Tap the button to choose a new one.")
      + button(link("recovery"), "Reset my password")
      + fallback(link("recovery"))
      + note("&#128274;&nbsp; This link works once and expires in 1 hour. Your courses and progress stay exactly as they are. Krpex will never ask for your password by email or phone."),
    reason=IGNORE,
  ),
  "magic_link": dict(
    subject="Your Krpex sign-in link",
    title="Sign in to Krpex",
    preheader="Tap to sign in to Krpex. The link works once.",
    eyebrow="Sign in",
    heading="Your sign-in link is here",
    content=p("Tap the button to sign in to Krpex as <strong class=\"strong\" style=\"color:#18181b;\">{{ .Email }}</strong> and pick up where you left off.")
      + button(link("email"), "Sign in to Krpex")
      + fallback(link("email"))
      + note("This link works once and expires in 1 hour."),
    reason=IGNORE,
  ),
  "email_change": dict(
    subject="Confirm your new email address for Krpex",
    title="Confirm your new email",
    preheader="Confirm the change to your Krpex sign-in email.",
    eyebrow="Account",
    heading="Confirm your new email address",
    content=p("You asked to change your Krpex sign-in email from <strong class=\"strong\" style=\"color:#18181b;\">{{ .Email }}</strong> to <strong class=\"strong\" style=\"color:#18181b;\">{{ .NewEmail }}</strong>.")
      + button(link("email_change"), "Confirm the change")
      + fallback(link("email_change"))
      + note("Until you confirm, you keep signing in with your current address. Didn&rsquo;t ask for this? Ignore this email and <a href=\"mailto:info@krpex.in\" style=\"color:#2563eb;\">tell us</a>."),
    reason="You got this email because a change of sign-in email was requested for your Krpex account.",
  ),
  "invite": dict(
    subject="You're invited to Krpex",
    title="You're invited to Krpex",
    preheader="Accept your invite and get a personal AI professor.",
    eyebrow="You&rsquo;re invited",
    heading="Join Krpex, your personal AI professor",
    content=p("You&rsquo;ve been invited to create a Krpex account with <strong class=\"strong\" style=\"color:#18181b;\">{{ .Email }}</strong>. Krpex builds a course for whatever you want to learn, with class-style lessons, quizzes and answers to your questions.")
      + button(link("invite"), "Accept the invite")
      + fallback(link("invite")),
    reason="You got this email because someone invited this address to Krpex. Not expecting it? You can ignore it.",
  ),
  "reauthentication": dict(
    subject="Your Krpex verification code",
    title="Your verification code",
    preheader="Your Krpex verification code is inside. It expires soon.",
    eyebrow="Verification",
    heading="Confirm it&rsquo;s you",
    content=p("Enter this code in Krpex to continue:")
      + code_box()
      + p("The code expires soon and works once. Never share it with anyone, including people who say they&rsquo;re from Krpex.", "font-size:13px;color:#71717a;"),
    reason="You got this email because a sensitive change was requested on your Krpex account. If it wasn&rsquo;t you, change your password.",
  ),
}

readme = ["# Auth email templates", "",
  "Paste into Supabase → Authentication → Emails → Templates (each one's subject and HTML body).",
  "Links go to `/auth/confirm` (token hash), so they work in any browser or device, including the Gmail app.",
  "Edit `scripts/make-email-templates.py` and run it to change them; don't edit the HTML by hand.", "",
  "| Supabase template | File | Subject |", "|---|---|---|"]
names = {"confirmation":"Confirm signup","invite":"Invite user","magic_link":"Magic link","email_change":"Change email address","recovery":"Reset password","reauthentication":"Reauthentication"}
for key, t in templates.items():
    html = layout(t["title"], t["preheader"], t["eyebrow"], t["heading"], t["content"], t["reason"])
    open(os.path.join(OUT, f"{key}.html"), "w").write(html)
    readme.append(f"| {names[key]} | `{key}.html` | {t['subject']} |")
open(os.path.join(OUT, "README.md"), "w").write("\n".join(readme) + "\n")
print("ok")
