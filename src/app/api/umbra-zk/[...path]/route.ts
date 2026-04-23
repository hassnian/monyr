import type { NextRequest } from "next/server";

const UMBRA_ZK_CDN_BASE_URL = "https://d3j9fjdkre529f.cloudfront.net";

export async function GET(
  request: NextRequest,
  context: RouteContext<'/api/umbra-zk/[...path]'>
) {
  const { path } = await context.params;
  const targetPath = path.join("/");
  const targetUrl = new URL(`${UMBRA_ZK_CDN_BASE_URL}/${targetPath}`);

  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  const response = await fetch(targetUrl, {
    cache: "no-store",
  });

  if (!response.ok) {
    return new Response(`Failed to fetch Umbra ZK asset: ${targetPath}`, {
      status: response.status,
    });
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("content-type") ?? "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
