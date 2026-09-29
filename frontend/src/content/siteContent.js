/**
 * Public site content — edit text here without touching components.
 * Used by the About, Contact, Privacy and Terms pages and the Footer.
 *
 * NOTE: the Privacy Policy and Terms of Service below are plain-language
 * drafts. Have them reviewed by a qualified legal professional before any
 * commercial launch.
 */

export const site = {
    name:        'SkillSwap',
    tagline:     'AI-powered peer-to-peer skill exchange',
    supportEmail: 'support@skillswap.com',
    location:    'University of Peshawar, Pakistan',
    responseTime: 'We usually reply within 2 business days.',
}

export const about = {
    metaDescription: 'SkillSwap connects people who want to learn with people who can teach — skill for skill, with AI matching, live video sessions, ratings and badges.',
    hero: {
        title:    'Learn anything by teaching what you know',
        subtitle: 'SkillSwap is a community where people trade skills instead of money. Teach React, learn guitar. Teach Urdu, learn UI design.',
    },
    problem: {
        title: 'The problem we solve',
        paragraphs: [
            'Good teachers and courses are expensive, and much of what people want to learn is already known by someone nearby — a classmate, a colleague, a neighbour. What is missing is a simple, trusted way to find each other.',
            'SkillSwap makes that exchange easy: it finds people whose skills complement yours, lets you agree on a session, meet over live video, and build a reputation through honest ratings.',
        ],
    },
    howItWorks: {
        title: 'How it works',
        steps: [
            { title: 'Add your skills',       text: 'List what you can teach and what you want to learn.' },
            { title: 'AI matching',           text: 'SkillSwap ranks the members whose skills best complement yours.' },
            { title: 'Send a request',        text: 'Connect with a match and agree on what to exchange.' },
            { title: 'Hold a session',        text: 'Schedule a time and meet in the built-in video room — with chat, notes, screen sharing and optional recording.' },
            { title: 'Rate & earn badges',    text: 'Rate each other after the session. Reputation and badges help the community find great partners.' },
        ],
    },
    team: {
        title: 'The team',
        intro: 'SkillSwap was built as a Final Year Project at the University of Peshawar.',
        members: [
            { name: 'Ali Zeb',     role: 'Full-stack developer' },
            { name: 'M. Ihtesham', role: 'Full-stack developer' },
        ],
    },
}

export const contact = {
    metaDescription: 'Contact the SkillSwap team — account help, report and deactivation appeals, or general questions.',
    intro: 'Can’t log in, want to appeal a deactivation, or have a question? Send us a message and we will reply by email.',
    memberHint: 'Signed in? Use Help & Support in your account menu to follow your requests in the app.',
}

const LAST_UPDATED = '2026-09-30'

export const privacy = {
    title: 'Privacy Policy',
    lastUpdated: LAST_UPDATED,
    metaDescription: 'How SkillSwap collects, uses and protects your data — accounts, emails, live video, recordings, uploads and data deletion.',
    intro: 'This policy explains, in plain language, what information SkillSwap collects, why, and the choices you have. It is a draft and will be reviewed before any commercial launch.',
    sections: [
        {
            heading: 'Your account',
            body: [
                'To create an account we collect your name, email address and a password. Passwords are stored only as a secure one-way hash; we never see or store the password itself.',
                'Your profile information (photo, headline, about text, location, skills and availability) is visible to other signed-in members so they can find suitable partners. Your email address is never shown to other members.',
            ],
        },
        {
            heading: 'Email verification and security emails',
            body: [
                'We send you an email to verify your address when you sign up, and emails for password resets, password changes and replies to your support requests. Verification and reset links are single-use and expire (24 hours and 15 minutes respectively).',
                'Emails are delivered through our email provider (Brevo). We do not send marketing emails.',
            ],
        },
        {
            heading: 'Live video sessions',
            body: [
                'Session video and audio are sent directly between the participants’ browsers (peer-to-peer, using WebRTC). When a direct connection is not possible, traffic may pass through a relay (TURN) server, but it is encrypted in transit and is not stored on our servers.',
            ],
        },
        {
            heading: 'Session recordings',
            body: [
                'A participant can choose to record a session. The recording is created in their own browser and saved only on their device — it is not uploaded to SkillSwap. The other participant is shown a notice while recording is active.',
                'If you record a session, you are responsible for how you store and share that file and for respecting the other participant’s privacy.',
            ],
        },
        {
            heading: 'Messages, files and uploads',
            body: [
                'Chat messages and session notes are stored so you can read them later. Profile photos and files you share in chat are stored with our media provider (Cloudinary) and are accessible to the people you share them with.',
            ],
        },
        {
            heading: 'Ratings, reports and moderation',
            body: [
                'Ratings you give and receive are shown on profiles. If you report another member, the report is visible only to our admin team; the reported member is not told who reported them.',
                'Admins may deactivate accounts that break our rules. Admin actions are recorded in an internal audit log.',
            ],
        },
        {
            heading: 'AI matching',
            body: [
                'To rank potential matches we send the skills listed on the relevant profiles (not your email or messages) to our AI provider (Groq). If the AI service is unavailable, matching runs locally instead.',
            ],
        },
        {
            heading: 'Your choices and data deletion',
            body: [
                'You can edit your profile at any time. To request a copy of your data or deletion of your account and personal data, contact us through Help & Support or the Contact page. We will confirm your identity before acting on the request.',
            ],
        },
        {
            heading: 'Contact',
            body: ['Questions about this policy? Use the Contact page or email support@skillswap.com.'],
        },
    ],
}

export const terms = {
    title: 'Terms of Service',
    lastUpdated: LAST_UPDATED,
    metaDescription: 'The rules for using SkillSwap: accounts, respectful behaviour, sessions and recordings, uploads, reports and account deactivation.',
    intro: 'By creating an account or using SkillSwap you agree to these terms. They are a plain-language draft and will be reviewed before any commercial launch.',
    sections: [
        {
            heading: 'Your account',
            body: [
                'You must provide your real name and a valid email address, verify your email, and keep your password secure. You are responsible for activity on your account. One person per account.',
            ],
        },
        {
            heading: 'Using SkillSwap respectfully',
            body: [
                'Treat other members with respect. Harassment, spam, fake profiles, scams, and inappropriate or illegal content are not allowed — in profiles, messages, sessions or files.',
                'Only teach skills you actually have, and turn up to the sessions you agree to.',
            ],
        },
        {
            heading: 'Sessions and recordings',
            body: [
                'Sessions are arranged between members; SkillSwap provides the tools but is not a party to the exchange. Video is peer-to-peer and not stored by us.',
                'Recordings are saved on the recording member’s device. The other participant is notified when recording starts. Do not share a recording without the other participant’s consent.',
            ],
        },
        {
            heading: 'Uploads',
            body: [
                'You keep ownership of what you upload but give SkillSwap permission to store and display it as needed to run the service. Only upload content you have the right to share.',
            ],
        },
        {
            heading: 'Reports and account deactivation',
            body: [
                'Members can report behaviour that breaks these terms. Our admin team reviews reports and may warn members or deactivate accounts. A deactivated member can appeal through the Contact page.',
            ],
        },
        {
            heading: 'Deleting your account',
            body: [
                'You can ask us to delete your account and personal data at any time through Help & Support or the Contact page.',
            ],
        },
        {
            heading: 'No warranty',
            body: [
                'SkillSwap is provided "as is". We work to keep it available and secure but cannot guarantee uninterrupted service, and we are not responsible for the content of sessions arranged between members.',
            ],
        },
        {
            heading: 'Changes',
            body: [
                'We may update these terms. The date at the top shows when they last changed; continuing to use SkillSwap after a change means you accept the updated terms.',
            ],
        },
    ],
}
