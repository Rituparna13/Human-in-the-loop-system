"use client"
import useSWR from "swr"
import type { HelpRequestExpanded } from "@/lib/types"
import { getJSON } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ListResp {
  data: HelpRequestExpanded[]
}

export default function HistoryList() {
  const { data: resolved } = useSWR<ListResp>("/api/help-requests?status=RESOLVED", getJSON)
  const { data: unresolved } = useSWR<ListResp>("/api/help-requests?status=UNRESOLVED", getJSON)

  return (
    <div className="grid grid-cols-1 gap-4">
      <Section title="Resolved" items={resolved?.data ?? []} badgeClass="bg-primary text-primary-foreground" />
      <Section
        title="Unresolved"
        items={unresolved?.data ?? []}
        badgeClass="border border-(--color-accent) text-(--color-accent-foreground)"
      />
    </div>
  )
}

function Section({
  title,
  items,
  badgeClass,
}: {
  title: string
  items: HelpRequestExpanded[]
  badgeClass: string
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-balance">{title}</CardTitle>
          <span className="text-xs text-muted-foreground">{items.length} items</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing here yet.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{item.customer.name ?? item.customer.phone}</div>
                <span className={`rounded-full px-2 py-0.5 text-xs ${badgeClass}`} aria-hidden>
                  {item.status}
                </span>
              </div>
              <p className="mt-1 text-sm">
                {"Q: "}
                {item.question}
              </p>
              {item.resolution_message && (
                <p className="mt-1 text-sm">
                  {"A: "}
                  {item.resolution_message}
                </p>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
