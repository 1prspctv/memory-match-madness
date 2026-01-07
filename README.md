# Memory Match - Free Edition

A classic memory matching game with competitive leaderboards! Test your memory by matching pairs of cards as quickly as possible with the fewest mistakes.

## Features

- 🎮 Classic memory card matching gameplay
- ⏱️ Time-based scoring system
- 🏆 Daily and all-time leaderboards
- 💾 Guaranteed score persistence (never lose a score!)
- 📱 Responsive design (works on desktop and mobile)
- 🎯 No payments, no wallet needed - just pure gameplay!

## Tech Stack

- **Frontend**: Next.js 16, React 19
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Score Persistence**: localStorage + background sync

## How to Play

1. Enter your name on the start screen
2. Click "Start Game" to begin
3. Match all 8 pairs of cards as quickly as possible
4. Fewer mistakes = higher score!
5. Compete on the daily and all-time leaderboards

## Scoring System

Your final score is based on:
- **Matched Pairs**: 125,000 points per pair (max 1,000,000)
- **Wrong Matches Penalty**: -50,000 points per mistake
- **Time Penalty**: Slower completion = lower score

## Local Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (free tier works great!)

### Installation

```bash
# Clone the repository
git clone https://github.com/[your-username]/memory-match-free.git
cd memory-match-free

# Install dependencies
npm install

# Set up environment variables (see below)
cp .env.example .env.local

# Run development server
npm run dev
```

Visit `http://localhost:3000` to play the game locally.

### Environment Variables

Create a `.env.local` file with:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

See `SUPABASE_SETUP.md` for detailed Supabase configuration instructions.

## Deployment

See `DEPLOYMENT.md` for step-by-step deployment instructions to Vercel.

## Project Structure

```
memory-match-free/
├── app/
│   ├── page.tsx              # Main game component
│   ├── layout.tsx            # App layout
│   └── globals.css           # Global styles
├── components/
│   └── Providers.tsx         # React Query provider
├── hooks/
│   └── useScoreSync.ts       # Background score sync hook
├── lib/
│   ├── leaderboard.ts        # Leaderboard API functions
│   ├── score-queue.ts        # localStorage score queue
│   ├── score-sync.ts         # Background sync service
│   └── supabase.ts           # Supabase client
└── public/                   # Static assets
```

## Score Persistence System

This game uses a robust queue-based score persistence system:

1. **Immediate Save**: Scores save to localStorage instantly (never fails)
2. **Background Sync**: Automatic retry to Supabase every 60 seconds
3. **Visibility Sync**: Syncs when you return to the tab
4. **Zero Loss**: Guaranteed score persistence even offline

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Support

For issues or questions, please open an issue on GitHub.
