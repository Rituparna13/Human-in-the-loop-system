import type { NextRequest } from "next/server"
import { resolveHelpRequest } from "@/lib/db"

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await _req.json()
    const answer = String(body?.answer ?? "").trim()
    if (!answer) {
      return new Response(JSON.stringify({ error: "Answer is required" }), { status: 400 })
    }
    const result = resolveHelpRequest(params.id, answer)
    if (!result) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
    }
    return new Response(JSON.stringify({ data: result }), { headers: { "content-type": "application/json" } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), { status: 500 })
  }
}
