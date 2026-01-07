import { minikitConfig } from "../../../minikit.config";

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({
    miniapp: minikitConfig.miniapp,
    baseBuilder: minikitConfig.baseBuilder,
    accountAssociation: minikitConfig.accountAssociation,
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
