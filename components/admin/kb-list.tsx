"use client"
import useSWR from "swr"
import { getJSON } from "@/lib/api"
import type { KBEntry } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface KbResp {
  data: KBEntry[]
}

export default function KBList() {
  const { data, isLoading, error } = useSWR<KbResp>("/api/knowledge-base", getJSON)
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading knowledge base…</p>
  if (error) return <p className="text-sm text-destructive">Failed to load knowledge base.</p>
  const list = data?.data ?? []

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-balance">Learned Answers</CardTitle>
          <span className="text-xs text-muted-foreground">{list.length} entries</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries yet.</p>
        ) : (
          list.map((kb) => (
            <div key={kb.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{kb.question_pattern}</div>
                <span className="text-xs text-muted-foreground">source: {kb.source}</span>
              </div>
              <p className="mt-1 text-sm">{kb.answer}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                uses: {kb.usage_count} · updated: {new Date(kb.updated_at).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
