# Attendance Log Tracking App

A production-ready attendance tracking application built with **Next.js 16**, **Supabase**, and **Tailwind CSS**.

## Features

- 👥 **People Management** - Add, edit, and delete team members
- 📋 **Attendance Taking** - Mark attendance (present/absent) for any date with optional notes
- ⏰ **Punch In/Out** - Members can punch in and out with timestamps
- 🤖 **Auto-Absent** - Automatically marks members as absent if they don't punch in by 1 PM
- 📅 **Leave Management** - Request and manage leaves (sick, casual, annual, etc.)
- 📊 **Dashboard** - View daily attendance statistics at a glance
- 📜 **Attendance Logs** - Filter and search through attendance history
- 📥 **CSV Export** - Export filtered attendance data
- 🔐 **Authentication** - Secure email/password login with Supabase Auth
- 🛡️ **Row Level Security** - Data protected at the database level

---

## SETUP

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Fill in:
   - **Organization**: Select or create one
   - **Name**: `attendance-tracker` (or your preferred name)
   - **Database Password**: Generate a strong password and save it
   - **Region**: Choose the closest to your users
4. Click **"Create new project"** and wait for it to be ready (~2 minutes)

### Step 2: Get Your API Keys

1. In your Supabase project, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (safe for client-side use)

### Step 3: Create Database Tables

1. In Supabase, go to **SQL Editor**
2. Click **"New query"**
3. Copy and paste the entire contents of `supabase-schema.sql` from this project
4. Click **"Run"** to execute the SQL

This creates:
- `people` table with RLS policies
- `attendance_logs` table with RLS policies
- Necessary indexes for performance

### Step 4: Configure Authentication

1. Go to **Authentication** → **Providers**
2. Ensure **Email** provider is enabled (it is by default)
3. Optionally disable "Confirm email" for easier testing:
   - Go to **Authentication** → **Settings**
   - Under "Email Auth", toggle off **"Enable email confirmations"**

### Step 5: Set Up Environment Variables

#### Local Development

1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

#### Vercel Deployment

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. In the project settings, add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service role key (for admin operations)
   - `CRON_SECRET` = (optional) a secret for securing the cron endpoint
4. Deploy!

### Step 6: Auto-Absent Cron Job (Optional)

The app includes an automatic absent marking feature that runs daily at 1 PM. If a member hasn't punched in by 1 PM, they will be automatically marked as absent.

**For Vercel (Recommended):**
The `vercel.json` file is already configured with the cron schedule. It will run automatically after deployment.

**For other hosting platforms:**
Set up an external cron service to call the endpoint:
```
GET /api/cron/auto-absent
```

**Securing the endpoint:**
Set the `CRON_SECRET` environment variable and include it in the request:
```
Authorization: Bearer YOUR_CRON_SECRET
```

---

## FILE TREE

```
smartiplace-logs/
├── app/
│   ├── globals.css              # Global styles with Tailwind
│   ├── layout.tsx               # Root layout
│   ├── login/
│   │   └── page.tsx             # Login/signup page
│   └── (protected)/
│       ├── layout.tsx           # Protected layout with navbar
│       ├── page.tsx             # Dashboard
│       ├── people/
│       │   ├── page.tsx         # People list + add form
│       │   └── [id]/
│       │       └── page.tsx     # Edit person page
│       ├── attendance/
│       │   └── page.tsx         # Take attendance page
│       └── logs/
│           └── page.tsx         # Attendance logs with filters
├── components/
│   ├── Button.tsx               # Reusable button component
│   ├── Card.tsx                 # Card layout components
│   ├── ConfirmDialog.tsx        # Confirmation modal
│   ├── Input.tsx                # Form input component
│   ├── LoadingSpinner.tsx       # Loading indicators
│   ├── Navbar.tsx               # Navigation bar
│   ├── Pagination.tsx           # Pagination component
│   ├── Select.tsx               # Select dropdown component
│   └── Toast.tsx                # Toast notifications
├── lib/
│   ├── types.ts                 # TypeScript type definitions
│   ├── actions/
│   │   ├── auth.ts              # Auth server actions
│   │   ├── attendance.ts        # Attendance server actions
│   │   └── people.ts            # People server actions
│   └── supabase/
│       ├── client.ts            # Browser Supabase client
│       ├── server.ts            # Server Supabase client
│       └── middleware.ts        # Auth middleware helper
├── middleware.ts                # Next.js middleware for auth
├── supabase-schema.sql          # Database schema + RLS policies
├── .env.local.example           # Environment variables template
├── package.json
├── tsconfig.json
└── README.md
```

---

## HOW TO RUN

### Prerequisites

- Node.js 18+ installed
- npm or yarn
- Supabase project set up (see Setup above)

### Development

```bash
# Install dependencies
npm install

# Create and configure .env.local (see Step 5 above)
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Deploy to Vercel

```bash
# Install Vercel CLI (optional)
npm i -g vercel

# Deploy
vercel
```

Or simply push to GitHub and import in Vercel dashboard.

---

## TEST PLAN

### Manual Test Checklist

#### Authentication
- [ ] Sign up with a new email and password
- [ ] Sign in with existing credentials
- [ ] Invalid credentials show error message
- [ ] Logout works and redirects to login
- [ ] Unauthenticated users are redirected to login
- [ ] Logged-in users are redirected from login to dashboard

#### People Management
- [ ] View empty state when no people exist
- [ ] Add a new person with all fields
- [ ] Add a person with only required field (name)
- [ ] Edit an existing person
- [ ] Delete a person (confirm dialog works)
- [ ] Delete cascades to attendance logs

#### Attendance Taking
- [ ] Date picker defaults to today
- [ ] Change date and see different records
- [ ] Mark individual as present
- [ ] Mark individual as absent
- [ ] Add notes to attendance record
- [ ] "Mark All Present" button works
- [ ] "Mark All Absent" button works
- [ ] Save button saves all records
- [ ] Previously saved records load correctly
- [ ] Update existing record for same date

#### Attendance Logs
- [ ] View all attendance logs
- [ ] Filter by date range (from/to)
- [ ] Filter by person
- [ ] Filter by status (present/absent)
- [ ] Combine multiple filters
- [ ] Clear filters button works
- [ ] Pagination works (add 50+ records to test)
- [ ] Export CSV downloads file
- [ ] CSV contains filtered data only

#### Dashboard
- [ ] Shows correct total people count
- [ ] Shows correct present count for today
- [ ] Shows correct absent count for today
- [ ] Shows correct pending count for today
- [ ] Quick action links work
- [ ] Progress bar reflects attendance rate

### Edge Cases

- [ ] Empty states display correctly
- [ ] Very long names/notes display properly (truncation)
- [ ] Date handling across timezones
- [ ] Duplicate attendance for same person+date prevented (upsert)
- [ ] Mobile responsive layout works
- [ ] Loading states show during data fetch
- [ ] Error messages display on failures
- [ ] Network errors handled gracefully

### Security Tests

- [ ] Cannot access data without login
- [ ] API calls fail without valid session
- [ ] RLS prevents unauthorized data access (test in Supabase dashboard)

---

## Database Schema

### people

| Column      | Type        | Description                    |
|-------------|-------------|--------------------------------|
| id          | UUID        | Primary key                    |
| full_name   | TEXT        | Person's full name (required)  |
| role        | TEXT        | Job role/title (optional)      |
| phone       | TEXT        | Phone number (optional)        |
| created_at  | TIMESTAMPTZ | Record creation timestamp      |
| created_by  | UUID        | User who created this record   |

### attendance_logs

| Column          | Type        | Description                        |
|-----------------|-------------|------------------------------------|
| id              | UUID        | Primary key                        |
| person_id       | UUID        | Foreign key to people              |
| attendance_date | DATE        | Date of attendance                 |
| status          | TEXT        | 'present' or 'absent'              |
| notes           | TEXT        | Optional notes                     |
| recorded_by     | UUID        | User who recorded this             |
| created_at      | TIMESTAMPTZ | Record creation timestamp          |

**Constraint**: UNIQUE(person_id, attendance_date) prevents duplicate entries.

---

## Row Level Security (RLS)

Both tables have RLS enabled with these policies:

| Table           | Action  | Policy                                      |
|-----------------|---------|---------------------------------------------|
| people          | SELECT  | All authenticated users can read            |
| people          | INSERT  | User's ID must match created_by             |
| people          | UPDATE  | Only creator can update                     |
| people          | DELETE  | Only creator can delete                     |
| attendance_logs | SELECT  | All authenticated users can read            |
| attendance_logs | INSERT  | User's ID must match recorded_by            |
| attendance_logs | UPDATE  | Only recorder can update                    |
| attendance_logs | DELETE  | Only recorder can delete                    |

**Note**: For team collaboration where everyone can edit/delete any record, see the optional policies in `supabase-schema.sql`.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS 4
- **Deployment**: Vercel

---

## License

MIT 
Trigger
