import os
import smtplib
from email.message import EmailMessage

SMTP_HOST = os.environ.get('SMTP_HOST', 'localhost')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USER = os.environ.get('SMTP_USER')
SMTP_PASS = os.environ.get('SMTP_PASS')
SMTP_FROM = os.environ.get('SMTP_FROM', SMTP_USER)


def send_email(to, subject, body):
    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = SMTP_FROM
    msg['To'] = to
    msg.set_content(body)

    try:
        print(f"SMTP_HOST={SMTP_HOST}, SMTP_PORT={SMTP_PORT}, SMTP_USER={SMTP_USER}, SMTP_FROM={SMTP_FROM}")
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            if SMTP_USER and SMTP_PASS:
                server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
    except Exception as e:
        print(f"Error sending email: {e}")
        raise 