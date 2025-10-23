import { SignJWT } from "jose"

export async function POST(req: Request) {
  try {
    const { identity, room } = await req.json()

    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET

    if (!apiKey || !apiSecret) {
      console.error("[livekit] Missing credentials")
      return Response.json({ error: "LiveKit credentials not configured" }, { status: 503 })
    }

    const secret = new TextEncoder().encode(apiSecret)
    const now = Math.floor(Date.now() / 1000)
    const exp = now + 3600

    const payload = {
      iss: apiKey,
      sub: identity,
      iat: now,
      exp: exp,
      nbf: now,
      video: {
        roomJoin: true,
        room: room,
        canPublish: true,
        canPublishData: true,
        canSubscribe: true,
      },
    }

    const jwt = await new SignJWT(payload).setProtectedHeader({ alg: "HS256", typ: "JWT" }).sign(secret)

    console.log("[livekit] Token generated successfully for identity:", identity, "room:", room)
    return Response.json({ token: jwt })
  } catch (error) {
    console.error("[livekit] Token generation error:", error)
    return Response.json(
      { error: "Failed to generate token", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
