/**
 * Branded transactional email templates. Each returns { subject, html, text }.
 * Inline styles only — most email clients ignore <style> blocks.
 */

const BRAND = {
    name:    'SkillSwap',
    primary: '#2563eb',
    text:    '#1e293b',
    muted:   '#64748b',
    bg:      '#f8fafc'
};

const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const layout = ({ preheader, heading, bodyHtml, button, footnote }) => `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:Arial,Helvetica,sans-serif;color:${BRAND.text};">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#2563eb,#7c3aed);background-color:${BRAND.primary};padding:20px 28px;">
          <span style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:0.3px;">${BRAND.name}</span>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:${BRAND.text};">${escapeHtml(heading)}</h1>
          ${bodyHtml}
          ${button ? `
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="border-radius:8px;background:${BRAND.primary};">
            <a href="${escapeHtml(button.url)}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;">${escapeHtml(button.label)}</a>
          </td></tr></table>
          <p style="margin:0 0 8px;font-size:13px;color:${BRAND.muted};">If the button doesn't work, copy this link into your browser:</p>
          <p style="margin:0;font-size:13px;word-break:break-all;"><a href="${escapeHtml(button.url)}" style="color:${BRAND.primary};">${escapeHtml(button.url)}</a></p>` : ''}
          ${footnote ? `<p style="margin:24px 0 0;font-size:13px;color:${BRAND.muted};">${escapeHtml(footnote)}</p>` : ''}
        </td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid #f1f5f9;font-size:12px;color:${BRAND.muted};">
          ${BRAND.name} — learn and teach skills with your community.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const paragraph = (text) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">${escapeHtml(text)}</p>`;

const verifyEmail = ({ name, url }) => ({
    subject: 'Verify your SkillSwap email',
    html: layout({
        preheader: 'Confirm your email to start using SkillSwap.',
        heading:   `Welcome, ${name}!`,
        bodyHtml:  paragraph('Thanks for joining SkillSwap. Please confirm your email address to activate your account.'),
        button:    { label: 'Verify email', url },
        footnote:  'This link expires in 24 hours. If you did not create an account, you can ignore this email.'
    }),
    text: `Welcome to SkillSwap, ${name}!\n\nConfirm your email address to activate your account:\n${url}\n\nThis link expires in 24 hours. If you did not create an account, ignore this email.`
});

const passwordReset = ({ name, url }) => ({
    subject: 'Reset your SkillSwap password',
    html: layout({
        preheader: 'Use this link to choose a new password.',
        heading:   'Reset your password',
        bodyHtml:  paragraph(`Hi ${name}, we received a request to reset your SkillSwap password.`),
        button:    { label: 'Choose a new password', url },
        footnote:  'This link expires in 15 minutes and can be used once. If you did not request a reset, ignore this email — your password stays the same.'
    }),
    text: `Hi ${name},\n\nReset your SkillSwap password here:\n${url}\n\nThis link expires in 15 minutes and can be used once. If you did not request this, ignore this email.`
});

const passwordChanged = ({ name, loginUrl }) => ({
    subject: 'Your SkillSwap password was changed',
    html: layout({
        preheader: 'Your password was just changed.',
        heading:   'Password changed',
        bodyHtml:  paragraph(`Hi ${name}, your SkillSwap password was just changed and you were signed out on all devices.`)
            + paragraph('If this was you, no action is needed. If not, reset your password immediately and contact support.'),
        button:    { label: 'Log in', url: loginUrl }
    }),
    text: `Hi ${name},\n\nYour SkillSwap password was just changed and you were signed out on all devices.\nIf this wasn't you, reset your password immediately and contact support.\n\nLog in: ${loginUrl}`
});

const supportReceived = ({ name, subject, url }) => ({
    subject: `We received your request: ${subject}`,
    html: layout({
        preheader: 'Our team will get back to you soon.',
        heading:   'We received your request',
        bodyHtml:  paragraph(`Hi ${name}, thanks for contacting SkillSwap support about "${subject}".`)
            + paragraph('Our team usually replies within 2 business days. We will email you when there is an update.'),
        button:    url ? { label: 'View your request', url } : null
    }),
    text: `Hi ${name},\n\nThanks for contacting SkillSwap support about "${subject}". Our team usually replies within 2 business days and will email you when there is an update.${url ? `\n\nView your request: ${url}` : ''}`
});

const supportReply = ({ name, subject, excerpt, url, resolved }) => ({
    subject: resolved ? `Resolved: ${subject}` : `New reply: ${subject}`,
    html: layout({
        preheader: resolved ? 'Your support request was resolved.' : 'The support team replied to your request.',
        heading:   resolved ? 'Your request was resolved' : 'The support team replied',
        bodyHtml:  paragraph(`Hi ${name},`)
            + (excerpt ? `<blockquote style="margin:0 0 12px;padding:12px 16px;background:#f8fafc;border-left:3px solid #2563eb;border-radius:4px;font-size:14px;line-height:1.6;color:#334155;">${escapeHtml(excerpt)}</blockquote>` : '')
            + paragraph(resolved
                ? 'If this did not solve your problem, reply to the request and we will reopen it.'
                : 'You can read the full conversation and reply below.'),
        button:    url ? { label: 'Open your request', url } : null,
        footnote:  url ? null : 'Reply to this email address is not monitored — use the contact form on our website to follow up.'
    }),
    text: `Hi ${name},\n\n${resolved ? 'Your support request was resolved.' : 'The support team replied to your request.'}${excerpt ? `\n\n"${excerpt}"` : ''}\n\n${url ? `Open your request: ${url}` : 'Use the contact form on our website to follow up.'}`
});

module.exports = { verifyEmail, passwordReset, passwordChanged, supportReceived, supportReply };
