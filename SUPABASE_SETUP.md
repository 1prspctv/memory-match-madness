# Supabase Setup Guide

This guide will walk you through setting up Supabase for the Memory Match game's leaderboard system.

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Fill in the details:
   - **Name**: `memory-match-free` (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest region to your users
5. Click "Create new project"
6. Wait 2-3 minutes for your project to be created

## Step 2: Create the Database Schema

1. In your Supabase project, go to the **SQL Editor** (left sidebar)
2. Click "New Query"
3. Copy and paste the following SQL:

```sql
-- Create the leaderboards table
CREATE TABLE leaderboards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_leaderboards_game_score
ON leaderboards(game_id, score DESC);

-- Create RPC function for top scores with rankings
CREATE OR REPLACE FUNCTION get_top_scores(
  game_name TEXT,
  limit_count INT
)
RETURNS TABLE (
  rank BIGINT,
  player_name TEXT,
  score INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY l.score DESC, l.created_at ASC) as rank,
    l.player_name,
    l.score,
    l.created_at
  FROM leaderboards l
  WHERE l.game_id = game_name
  ORDER BY l.score DESC, l.created_at ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
```

4. Click "Run" to execute the query
5. You should see a success message: "Success. No rows returned"

## Step 3: Enable Row Level Security (RLS)

For production, you should enable RLS policies:

1. In the SQL Editor, run:

```sql
-- Enable RLS
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read scores
CREATE POLICY "Anyone can view leaderboards"
ON leaderboards FOR SELECT
USING (true);

-- Allow anyone to insert scores
CREATE POLICY "Anyone can submit scores"
ON leaderboards FOR INSERT
WITH CHECK (true);
```

## Step 4: Get Your API Credentials

1. Go to **Project Settings** (gear icon in sidebar)
2. Click on **API** in the left menu
3. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

## Step 5: Configure Environment Variables

### For Local Development

Create a `.env.local` file in your project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### For Vercel Deployment

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add the following variables:
   - **NEXT_PUBLIC_SUPABASE_URL**: `your-project-url`
   - **NEXT_PUBLIC_SUPABASE_ANON_KEY**: `your-anon-key`
4. Make sure to add them for all environments (Production, Preview, Development)

## Step 6: Test Your Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Play a game and submit a score

3. Verify the score appears in Supabase:
   - Go to Supabase **Table Editor**
   - Click on `leaderboards` table
   - You should see your score entry

## Database Schema Explanation

### Leaderboards Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Unique identifier for each score entry |
| `game_id` | TEXT | Game type (`memory-free-daily` or `memory-free-alltime`) |
| `player_name` | TEXT | Player's display name |
| `score` | INTEGER | Player's score |
| `metadata` | JSONB | Additional data (time, wrong matches, etc.) |
| `created_at` | TIMESTAMPTZ | When the score was submitted |

### Game IDs

The app uses two game IDs:
- `memory-free-daily` - Daily leaderboard (resets every day)
- `memory-free-alltime` - All-time leaderboard (permanent)

## Troubleshooting

### "supabaseUrl is required" Error

- Make sure your `.env.local` file exists and has the correct variables
- Restart your development server after adding environment variables
- Check that variable names match exactly (case-sensitive)

### Scores Not Appearing

1. Check browser console for errors
2. Verify your Supabase URL and key are correct
3. Make sure RLS policies are set up correctly
4. Check Supabase logs: **Project Settings → API → Logs**

### Daily Leaderboard Not Resetting

The app doesn't automatically reset the daily leaderboard. You can:

**Option A: Manual Reset (SQL)**
```sql
DELETE FROM leaderboards
WHERE game_id = 'memory-free-daily'
AND created_at < CURRENT_DATE;
```

**Option B: Automated Reset (Supabase Edge Function)**
Create a scheduled Edge Function to run at midnight UTC.

## Security Notes

- The `anon` key is safe to expose in client-side code
- RLS policies protect your data even with public keys
- For production, consider adding rate limiting
- Monitor your Supabase usage to stay within free tier limits

## Free Tier Limits

Supabase free tier includes:
- 500MB database storage
- 1GB file storage
- 2GB bandwidth
- 50,000 monthly active users

This is more than enough for most games!

## Need Help?

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- Open an issue in this repository
