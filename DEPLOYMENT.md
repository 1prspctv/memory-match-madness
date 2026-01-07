# Deployment Guide - Vercel

This guide will walk you through deploying Memory Match - Free Edition to Vercel.

## Prerequisites

Before deploying, make sure you have:

- ✅ GitHub account
- ✅ Vercel account (sign up at [vercel.com](https://vercel.com))
- ✅ Supabase project set up (see `SUPABASE_SETUP.md`)
- ✅ Code pushed to GitHub repository

## Step 1: Push Code to GitHub

1. Initialize git (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Memory Match Free"
   ```

2. Create a new repository on GitHub:
   - Go to [github.com/new](https://github.com/new)
   - Name: `memory-match-free`
   - Set to Public or Private
   - Don't initialize with README (we already have one)
   - Click "Create repository"

3. Push your code:
   ```bash
   git remote add origin https://github.com/[your-username]/memory-match-free.git
   git branch -M main
   git push -u origin main
   ```

## Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New..." → "Project"
3. Import your GitHub repository:
   - If this is your first time, click "Import Git Repository"
   - Authorize Vercel to access your GitHub account
   - Select the `memory-match-free` repository

## Step 3: Configure Build Settings

Vercel should auto-detect Next.js. Verify the settings:

- **Framework Preset**: Next.js
- **Root Directory**: `./` (leave as is)
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm install` (auto-detected)

## Step 4: Add Environment Variables

**IMPORTANT**: Add your Supabase credentials before deploying!

1. In the "Environment Variables" section, add:

   | Name | Value | Environment |
   |------|-------|-------------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Production, Preview, Development |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | Production, Preview, Development |

2. Get these values from:
   - Supabase → Project Settings → API
   - See `SUPABASE_SETUP.md` for details

## Step 5: Deploy

1. Click "Deploy"
2. Wait 2-3 minutes for the build to complete
3. Once deployed, you'll see:
   - ✅ Deployment successful
   - 🎉 Your live URL (e.g., `memory-match-free.vercel.app`)

## Step 6: Test Your Deployment

1. Click "Visit" to open your deployed app
2. Test the game:
   - Enter a name
   - Play a game
   - Check that the score appears on the leaderboard
3. If scores don't appear, check:
   - Environment variables are set correctly
   - Supabase RLS policies allow inserts
   - Browser console for errors

## Step 7: Custom Domain (Optional)

### Using Vercel Domain

Your app is automatically available at:
```
https://memory-match-free.vercel.app
```

### Using Custom Domain

1. Go to Project Settings → Domains
2. Click "Add"
3. Enter your domain name
4. Follow Vercel's instructions to:
   - Add DNS records
   - Verify domain ownership
5. Vercel automatically provisions SSL certificate

## Continuous Deployment

Vercel automatically deploys when you push to GitHub:

- **Push to `main`** → Deploys to production
- **Push to other branches** → Creates preview deployment
- **Pull requests** → Automatic preview deployments

## Environment Variables Management

### Adding New Variables

1. Go to Project Settings → Environment Variables
2. Click "Add"
3. Select environments (Production, Preview, Development)
4. Redeploy for changes to take effect

### Updating Variables

1. Go to Project Settings → Environment Variables
2. Click "⋮" next to variable → "Edit"
3. Update value
4. Trigger a redeploy

## Monitoring & Debugging

### View Deployment Logs

1. Go to Deployments tab
2. Click on a deployment
3. View real-time logs

### Check Function Logs

1. Go to Monitoring → Functions
2. View execution logs for API routes
3. Filter by time, status, or function name

### Analytics

Vercel provides free analytics:
- Page views
- Performance metrics
- User locations

Enable in Project Settings → Analytics

## Performance Optimization

### Recommended Settings

1. **Enable Edge Caching**:
   - Already enabled by default for static assets

2. **Image Optimization**:
   - Next.js Image component is used (automatic)

3. **Code Splitting**:
   - Next.js does this automatically

### Monitoring Performance

1. Go to Monitoring → Speed Insights
2. Track:
   - Time to First Byte (TTFB)
   - First Contentful Paint (FCP)
   - Largest Contentful Paint (LCP)

## Troubleshooting

### Build Fails

**Error: "Module not found"**
- Check package.json includes all dependencies
- Run `npm install` locally to verify

**Error: "Environment variables missing"**
- Add required env vars in Vercel dashboard
- Make sure names match exactly

### Runtime Errors

**"supabaseUrl is required"**
- Environment variables not set in Vercel
- Go to Settings → Environment Variables
- Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Redeploy

**Scores not saving**
- Check Supabase RLS policies
- Verify environment variables are correct
- Check browser console for errors

### Slow Performance

- Check Supabase region matches your users
- Enable Vercel Analytics to identify bottlenecks
- Consider upgrading Vercel plan for better performance

## Free Tier Limits

Vercel free tier includes:
- 100GB bandwidth/month
- 100 hours serverless function execution
- Unlimited deployments
- Automatic SSL
- Global CDN

Perfect for most games!

## Updating Your Deployment

To deploy updates:

```bash
# Make your changes
git add .
git commit -m "Your commit message"
git push

# Vercel automatically deploys!
```

## Rolling Back

If something breaks:

1. Go to Deployments
2. Find a working deployment
3. Click "⋮" → "Promote to Production"
4. Confirm

## Security Best Practices

1. ✅ Never commit `.env.local` to Git
2. ✅ Use environment variables for all secrets
3. ✅ Enable Supabase RLS policies
4. ✅ Keep dependencies updated
5. ✅ Monitor Vercel logs for suspicious activity

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Discord](https://vercel.com/discord)
- [Next.js Documentation](https://nextjs.org/docs)

## Next Steps

After deployment:
- Share your game link!
- Monitor player scores
- Consider adding features:
  - Different difficulty levels
  - More card themes
  - Social sharing
  - Achievement system
