# Easy Meet - Deployment Instructions

This document provides detailed instructions for deploying the Easy Meet application to a production environment.

## Quick Start Guide (Simple Deployment)

For a quick deployment, follow these simplified steps:

1. **Supabase Setup**:
   - Create a project in [Supabase](https://app.supabase.io/)
   - Run the SQL in `supabase/migrations/20240322_initial_schema.sql` in the SQL Editor
   - Get your project URL and API key

2. **Deploy Supabase Edge Functions**:
   ```bash
   npm install -g supabase
   supabase login
   cd supabase/functions
   supabase functions deploy cleanup-expired-events --project-ref your-project-ref
   ```

3. **Set Up Automatic Cleanup**:
   - Run the following SQL in the SQL Editor:
   ```sql
   select cron.schedule(
     'cleanup-expired-events-daily',
     '0 0 * * *',
     $$
     select
       net.http_post(
         url:='https://your-project-ref.functions.supabase.co/cleanup-expired-events',
         headers:='{"Content-Type": "application/json", "Authorization": "Bearer your-service-role-key"}'::jsonb
       ) as request_id;
     $$
   );
   ```

4. **Deploy to Vercel**:
   - Login to [Vercel](https://vercel.com/) with your GitHub account
   - Click "New Project" and import your GitHub repository
   - Add Supabase configuration as environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
   - Select "Vite" as the Framework Preset and click "Deploy"

For more detailed instructions, refer to the sections below.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
3. [Vercel Deployment](#vercel-deployment)
4. [Custom Domain Configuration](#custom-domain-configuration)
5. [Expired Events Automatic Cleanup Setup](#expired-events-automatic-cleanup-setup)
6. [Maintenance and Monitoring](#maintenance-and-monitoring)

## Prerequisites

Before starting the deployment, ensure you have:

- A GitHub account (for Vercel integration and Supabase connection)
- A custom domain (optional)

## Supabase Setup

### 1. Create a Supabase Project

1. Go to [Supabase](https://app.supabase.io/) and sign in with your GitHub account.
2. Click the "New project" button.
3. Select or create an organization.
4. Enter a name for your project (e.g., "easymeet").
5. Set a database password (use a secure password).
6. Choose a region (select one close to your target users).
7. Click "Create new project" and wait for it to be created.

### 2. Set Up Database Schema

1. When the project is created, select "SQL Editor" from the left menu.
2. Click the "New Query" button to open a new SQL editor.
3. Copy the contents of the project's `supabase/migrations/20240322_initial_schema.sql` file and paste it into the SQL editor.
4. Click the "Run" button to execute the SQL.

This will create the necessary tables, indexes, and triggers.

### 3. Get API Credentials

1. Select "Project Settings" from the left menu.
2. Click the "API" tab.
3. Take note of the following information:
   - Project URL (e.g., `https://abcdefghijklm.supabase.co`)
   - API Keys (both the `anon` key and the `service_role` key)

These credentials are needed for connecting the frontend and backend.

### 4. Deploy Edge Functions

Supabase Edge Functions are used to automatically delete expired events.

#### Install and Configure Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Log in to Supabase
supabase login

# You will be prompted to enter an access token
# You can generate a token in the Supabase dashboard under "Account" > "Access Tokens"
```

#### Deploy Edge Functions

```bash
# Navigate to the Edge Functions directory
cd supabase/functions

# Deploy the function
supabase functions deploy cleanup-expired-events --project-ref your-project-ref
```

Replace `your-project-ref` with your Supabase project reference ID, which can be found in the "General" tab of your project settings.

### 5. Set Up Scheduled Cleanup

Supabase provides a scheduled task execution feature using PostgreSQL's `pg_cron` extension.

1. Create a new query in the SQL Editor.
2. Execute the following SQL to set up regular cleanup:

```sql
-- Create a cron job
select cron.schedule(
  'cleanup-expired-events-daily',  -- Unique job name
  '0 0 * * *',                    -- Cron expression: run at midnight every day
  $$
  select
    net.http_post(
      url:='https://your-project-ref.functions.supabase.co/cleanup-expired-events',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer your-service-role-key"}'::jsonb
    ) as request_id;
  $$
);
```

Replace `your-project-ref` with your project reference ID and `your-service-role-key` with your service role API key.

## Vercel Deployment

### 1. Create a Vercel Account

1. Go to [Vercel](https://vercel.com/) and sign up or log in using your GitHub account.

### 2. Prepare GitHub Repository

1. Upload your project to a GitHub repository.
2. Ensure the repository is accessible to Vercel if it's private.

### 3. Import Project to Vercel

1. On the Vercel dashboard, click the "New Project" button.
2. Select the option to import a GitHub repository.
3. Choose your project repository.

### 4. Configure Environment Variables

There are two methods to set up the required environment variables:

#### Method 1: Supabase Vercel Integration (Recommended)

This method automatically connects Supabase with Vercel and sets up the required environment variables.

1. In the Vercel dashboard, select your project.
2. Go to the "Integrations" tab.
3. Click "Browse Marketplace".
4. Search for and select "Supabase".
5. Click "Add Integration".
6. Select the project you want to link with your Supabase project.
7. Click "Link".

This will automatically set up the following environment variables:
- `SUPABASE_URL` (used as `VITE_SUPABASE_URL`)
- `SUPABASE_ANON_KEY` (used as `VITE_SUPABASE_ANON_KEY`)
- Other Supabase-related variables

#### Method 2: Manual Configuration

If you don't want to use the integration, manually set up the following environment variables:

| Variable Name | Value | Description |
|--------|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase Project URL | URL of your Supabase project (e.g., `https://abcdefghijklm.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | Supabase anonymous (public) API key |

> **Important**: These environment variables must be set for the application to function properly. Add them in the "Settings" → "Environment Variables" section of the Vercel dashboard.

> **Note**: If you change the environment variables after deploying to production, you'll need to redeploy the project.

### 5. Build Configuration

1. Framework Preset: `Vite`
2. Build Command: Already configured in vercel.json (no changes needed)
3. Output Directory: Already configured in vercel.json (no changes needed)
4. Install Command: `npm install`

### 6. Start Deployment

Click the "Deploy" button to start the deployment process. This may take a few minutes.

Once complete, Vercel will display a deployment summary page. Click the "Visit" button to check your deployed application.

## Custom Domain Configuration

### 1. Add a Custom Domain to Vercel

1. From the Vercel dashboard, select your project.
2. Go to the "Settings" tab and select the "Domains" section.
3. Enter your desired domain (e.g., `easymeet.example.com`) and click "Add".
4. Follow Vercel's DNS configuration instructions to set up your domain.

### 2. Configure Custom Domain for Supabase (Optional)

Custom domains aren't available on Supabase's free plan, but you can configure them on paid plans:

1. In the Supabase dashboard, select your project.
2. Go to "Settings" > "General".
3. Click "Enable Custom Domain" in the "Custom Domains" section.
4. Enter your domain name and follow the DNS configuration instructions.

## Expired Events Automatic Cleanup Setup

Supabase Edge Functions include functionality to automatically delete expired events. To make this run regularly, set up a scheduled task using Supabase's pg_cron extension:

### Configure Scheduled Cleanup

This setup is already covered in the "Supabase Setup" section under "5. Set Up Scheduled Cleanup".

1. Create a new query in the SQL Editor.
2. Execute the following SQL to set up regular cleanup:

```sql
-- Create a cron job
select cron.schedule(
  'cleanup-expired-events-daily',  -- Unique job name
  '0 0 * * *',                    -- Cron expression: run at midnight every day
  $$
  select
    net.http_post(
      url:='https://your-project-ref.functions.supabase.co/cleanup-expired-events',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer your-service-role-key"}'::jsonb
    ) as request_id;
  $$
);
```

This will run the expired events cleanup process automatically at midnight every day.

## Maintenance and Monitoring

### 1. Check Supabase Dashboard Regularly

Regularly check the following in the Supabase dashboard:

- Database usage ("Database" > "Usage")
- Edge Functions logs ("Edge Functions" > "Logs")
- Periodic review of security policies ("Authentication" > "Policies")

### 2. Monitor Vercel

Check the following in the Vercel dashboard:

- Deployment history and status
- Performance metrics in the Analytics tab
- Error logs

### 3. Regular Backups (Recommended)

It's recommended to regularly back up your Supabase data. Automatic backups are included in paid plans, but you can also set up additional backups:

1. Go to "Database" > "Backups" in the Supabase dashboard.
2. Click "Create a backup" to create a manual backup.
3. To automate backups programmatically, use the Supabase CLI:

```bash
# Create a backup
supabase db dump -f backup.sql --db-url postgres://postgres:your-password@your-project-ref.supabase.co:5432/postgres
```

---

These are the deployment instructions for the Easy Meet application. If you encounter any issues, refer to the documentation for each service or contact support.