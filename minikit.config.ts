const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
  "http://localhost:3000";

/**
 * MiniApp configuration object. Must follow the mini app manifest specification.
 *
 * @see {@link https://docs.base.org/mini-apps/features/manifest}
 */
export const minikitConfig = {
  accountAssociation: {
    header: "eyJmaWQiOjIwNzUzODIsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHg4ZTQ4NTkwNkUxQjNCMDQyOTdkRmRiZjlGQWVlNTE3NUEzOTIyNWFFIn0",
    payload: "eyJkb21haW4iOiJtZW1vcnktbWF0Y2gtbWFkbmVzcy52ZXJjZWwuYXBwIn0",
    signature: "/PUH3t3Jq1GB0z/GJY8/TwsBMT42Vls0CiHqpJsTDSYm1e/Op4c07stbqZIMlXZKEwnrGohmya61Cam/iKs5iBs=",
  },
  baseBuilder: {
    ownerAddress: "0x17EceB5F8F44949913a7568284c3FF2d74766FCC",
  },
  miniapp: {
    version: "1",
    name: "Memory Match Madness",
    subtitle: "Win USDC by matching pairs!",
    description: "Test your memory and win real USDC prizes! Match pairs to score points. Beat the daily or all-time high score to win from the prize pool. Powered by Base blockchain.",
    screenshotUrls: [`${ROOT_URL}/screenshot.png`],
    iconUrl: `${ROOT_URL}/icon.png`,
    splashImageUrl: `${ROOT_URL}/splash.png`,
    splashBackgroundColor: "#0052FF",
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "games",
    tags: ["game", "prizes", "memory"],
    heroImageUrl: `${ROOT_URL}/hero.png`,
    tagline: "Match pairs, win USDC prizes!",
    ogTitle: "Memory Match Madness",
    ogDescription: "Test your memory and win real USDC prizes on Base!",
    ogImageUrl: `${ROOT_URL}/hero.png`,
  },
} as const;
