import { listKB } from "@/lib/db"

export async function GET() {
  const data = listKB()
  return new Response(JSON.stringify({ data }), { headers: { "content-type": "application/json" } })
}
