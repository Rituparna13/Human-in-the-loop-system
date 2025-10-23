"use client"
import useSWR, { mutate } from "swr"
import type React from "react"

import type { HelpRequestExpanded } from "@/lib/types"
import { getJSON, postJSON } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"

interface ListResp {
  data: HelpRequestExpanded[]
}
interface ResolveResp {
  data: HelpRequestExpanded
}

export default function PendingList() {
  const { data, isLoading, error } = useSWR<ListResp>("/api/help-requests?status=PENDING", getJSON)
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading pending…</p>
  if (error) return <p className="text-sm text-destructive">Failed to load pending.</p>
  const list = data?.data ?? []

  return (
    <div className="grid grid-cols-1 gap-4">
      {list.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-balance">No pending requests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">You’re all caught up.</p>
          </CardContent>
        </Card>
      ) : (
        list.map((item) => <PendingItem key={item.id} item={item} />)
      )}
    </div>
  )
}

function PendingItem({ item }: { item: HelpRequestExpanded }) {
  const [value, setValue] = useState("")

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim()) return
    await postJSON<ResolveResp>(`/api/help-requests/${item.id}/resolve`, { answer: value })
    setValue("")
    // Refresh pending and history views
    await Promise.all([
      mutate("/api/help-requests?status=PENDING"),
      mutate("/api/help-requests?status=RESOLVED"),
      mutate("/api/knowledge-base"),
    ])
  }

  const minsLeft = Math.max(0, Math.ceil((new Date(item.timeout_at).getTime() - Date.now()) / 60000))

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-pretty">{item.customer.name ?? item.customer.phone}</CardTitle>
          <span
            className="rounded-full border px-2 py-1 text-xs"
            aria-label={`Status ${item.status}, ${minsLeft} minutes remaining`}
          >
            Pending · {minsLeft}m
          </span>
        </div>
        <p className="text-sm">
          {"“"}
          {item.question}
          {"”"}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label htmlFor={`answer-${item.id}`} className="text-sm font-medium">
            Your answer
          </label>
          <Textarea
            id={`answer-${item.id}`}
            className="min-h-24"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Type a short, clear answer the agent can follow up with…"
            aria-label="Supervisor answer"
          />
          <div className="flex items-center justify-end gap-2">
            <Button type="submit" className="bg-primary text-primary-foreground hover:opacity-90">
              Send & Resolve
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
