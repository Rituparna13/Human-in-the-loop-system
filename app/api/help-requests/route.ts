import type { NextRequest } from "next/server"
import { listHelpRequests } from "@/lib/db"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") as "PENDING" | "RESOLVED" | "UNRESOLVED" | null
  const data = listHelpRequests(status ?? undefined)
  return new Response(JSON.stringify({ data }), { headers: { "content-type": "application/json" } })
}
