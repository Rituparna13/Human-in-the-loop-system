"use client"
import { useState } from "react"
import PendingList from "./pending-list"
import HistoryList from "./history-list"
import KBList from "./kb-list"
import LiveKitCard from "./livekit-card"

export default function AdminDashboard() {
  const [tab, setTab] = useState<"pending" | "history" | "kb" | "voice">("pending")

  return (
    <main className="mx-auto max-w-3xl p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold text-balance">Supervisor Console</h1>
        <p className="text-sm text-muted-foreground">
          Triage customer questions, resolve escalations, and review learned answers.
        </p>
      </header>

      <nav aria-label="Primary" className="flex items-center gap-2 mb-4">
        <TabButton active={tab === "pending"} onClick={() => setTab("pending")} label="Pending" />
        <TabButton active={tab === "history"} onClick={() => setTab("history")} label="History" />
        <TabButton active={tab === "kb"} onClick={() => setTab("kb")} label="Learned" />
        <TabButton active={tab === "voice"} onClick={() => setTab("voice")} label="Voice Calls" />
      </nav>

      <section>
        {tab === "pending" && <PendingList />}
        {tab === "history" && <HistoryList />}
        {tab === "kb" && <KBList />}
        {tab === "voice" && <LiveKitCard />}
      </section>
    </main>
  )
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-md px-3 py-1.5 text-sm",
        active
          ? "bg-primary text-primary-foreground"
          : "border border-border text-foreground hover:bg-accent hover:text-accent-foreground",
      ].join(" ")}
      aria-pressed={active}
      aria-label={`Show ${label}`}
    >
      {label}
    </button>
  )
}
