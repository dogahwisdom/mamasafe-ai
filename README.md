# 🏥 MamaSafe AI - Maternal Healthcare Platform

AI-driven maternal healthcare platform with WhatsApp integration, AI triage, patient management, and clinic workflows.

## 🚀 Features

- **AI-Powered Triage** - Symptom analysis with risk assessment
- **WhatsApp Integration** - Automated reminders and symptom check-ins
- **Patient Management** - Enrollment, tracking, medication adherence
- **Clinic Dashboard** - KPIs, task management, referral tracking
- **Pharmacy Integration** - Refill requests and inventory management
- **Role-Based Access** - Patient, Clinic, and Pharmacy portals
- **Supabase Backend** - Secure, scalable database
- **Google Sign-In** - OAuth authentication

## 🛠️ Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Backend:** Supabase (PostgreSQL)
- **AI:** Custom triage engine
- **Deployment:** Netlify ready

## 📋 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (free tier works)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/mamasafe-ai.git
cd mamasafe-ai

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run development server
npm run dev
```

### Environment Variables

Create `.env.local` with:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
TRIAGE_ENGINE_API_KEY=your_triage_engine_key
```

## 🗄️ Database Setup

1. Create a Supabase project
2. Run `supabase/schema.sql` in SQL Editor
3. Run `supabase/fix-rls-policies.sql` for permissions
4. Run `supabase/seed-admin.sql` for demo users

See `SUPABASE_SETUP.md` for detailed instructions.

## 🚀 Deployment

### Netlify

1. Connect your GitHub repo to Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add environment variables in Netlify dashboard

See `NETLIFY_DEPLOYMENT.md` for details.

## 📚 Documentation

- `SUPABASE_SETUP.md` - Database setup guide
- `NETLIFY_DEPLOYMENT.md` - Deployment instructions
- `META_WHATSAPP_SETUP.md` - WhatsApp API setup
- `GOOGLE_SIGNIN_SETUP.md` - Google OAuth setup
- `CREDENTIALS.md` - Default login credentials

## 🔐 Default Credentials

- **Admin:** `admin` / `1234`
- **Patient:** `patient@demo.mamasafe.ai` / `1234`
- **Pharmacy:** `pharmacy@demo.mamasafe.ai` / `1234`

## 📝 License

Private - All rights reserved

## 🤝 Contributing

This is a private project. For access, contact the repository owner.

---

**Built with ❤️ for maternal healthcare in Kenya**
