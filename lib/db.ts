import type { HelpRequest, Customer, KBEntry, HelpRequestExpanded } from "./types"

const customers: Customer[] = [
  { id: "cust_101", phone: "+1-555-0001", name: "Ava", created_at: new Date().toISOString() },
  { id: "cust_102", phone: "+1-555-0002", name: "Ben", created_at: new Date().toISOString() },
  { id: "cust_103", phone: "+1-555-0003", name: "Cara", created_at: new Date().toISOString() },
]

const knowledgeBase: KBEntry[] = [
  {
    id: "kb_1",
    question_pattern: "hours weekend",
    answer: "We are open 9am–5pm on Saturdays and closed on Sundays.",
    source: "seed",
    usage_count: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "kb_2",
    question_pattern: "hello hi hey",
    answer: "Hello! How can I help you today? You can ask about our hours, services, or anything else.",
    source: "seed",
    usage_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "kb_3",
    question_pattern: "help",
    answer: "I'm here to help! You can ask me about our business hours, services, or any other questions you have.",
    source: "seed",
    usage_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "kb_4",
    question_pattern: "callback tomorrow call back",
    answer: "Yes, I can arrange a callback for you tomorrow. What time works best for you?",
    source: "supervisor",
    usage_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

let helpRequests: HelpRequest[] = [
  {
    id: "req_200",
    customer_id: "cust_101",
    question: "What are your hours on Saturday?",
    status: "RESOLVED",
    assigned_to: null,
    timeout_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    resolution_message: "We are open 9am–5pm on Saturdays.",
    kb_entry_id: "kb_1",
    created_at: new Date(Date.now() - 60 * 60_000).toISOString(),
    updated_at: new Date(Date.now() - 58 * 60_000).toISOString(),
  },
  {
    id: "req_201",
    customer_id: "cust_102",
    question: "Do you offer balayage for curly hair?",
    status: "PENDING",
    assigned_to: null,
    timeout_at: new Date(Date.now() + 15 * 60_000).toISOString(),
    resolution_message: null,
    kb_entry_id: null,
    created_at: new Date(Date.now() - 10 * 60_000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 60_000).toISOString(),
  },
  {
    id: "req_202",
    customer_id: "cust_103",
    question: "Can I get a callback tomorrow afternoon?",
    status: "PENDING",
    assigned_to: null,
    timeout_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    resolution_message: null,
    kb_entry_id: null,
    created_at: new Date(Date.now() - 2 * 60_000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60_000).toISOString(),
  },
]

// Utility: expand with customer
function expand(req: HelpRequest): HelpRequestExpanded {
  const customer = customers.find((c) => c.id === req.customer_id)!
  return { ...req, customer }
}

// Utility: naive timeout sweep to mark expired as UNRESOLVED
function sweepTimeouts() {
  const now = Date.now()
  let changed = false
  helpRequests = helpRequests.map((r) => {
    if (r.status === "PENDING" && new Date(r.timeout_at).getTime() < now) {
      changed = true
      return {
        ...r,
        status: "UNRESOLVED",
        updated_at: new Date().toISOString(),
        resolution_message:
          r.resolution_message ??
          "Sorry for the delay. We are still checking. Would you like to share your email for follow-up or request a callback?",
      }
    }
    return r
  })
  return changed
}

// Public API-like helpers
export function listHelpRequests(status?: "PENDING" | "RESOLVED" | "UNRESOLVED"): HelpRequestExpanded[] {
  sweepTimeouts()
  const list = status ? helpRequests.filter((h) => h.status === status) : helpRequests
  return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(expand)
}

export function resolveHelpRequest(id: string, answer: string): HelpRequestExpanded | null {
  const idx = helpRequests.findIndex((h) => h.id === id)
  if (idx === -1) return null
  const req = helpRequests[idx]
  const now = new Date().toISOString()

  // Upsert KB entry (simple normalization)
  const pattern = normalizePattern(req.question)
  let kb = knowledgeBase.find((k) => k.question_pattern === pattern)
  if (!kb) {
    kb = {
      id: `kb_${Math.random().toString(36).slice(2, 8)}`,
      question_pattern: pattern,
      answer,
      source: "supervisor",
      usage_count: 0,
      created_at: now,
      updated_at: now,
    }
    knowledgeBase.push(kb)
  } else {
    kb.answer = answer
    kb.updated_at = now
  }

  helpRequests[idx] = {
    ...req,
    status: "RESOLVED",
    resolution_message: answer,
    kb_entry_id: kb.id,
    updated_at: now,
  }
  return expand(helpRequests[idx])
}

export function listKB(): KBEntry[] {
  return knowledgeBase.slice().sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
}

export function searchKB(question: string): KBEntry | null {
  const pattern = normalizePattern(question)

  // Exact match first
  const match = knowledgeBase.find((k) => k.question_pattern === pattern)
  if (match) {
    return match
  }

  const questionWords = pattern.split(" ")
  let bestMatch: KBEntry | null = null
  let bestMatchCount = 0

  for (const kb of knowledgeBase) {
    const kbWords = kb.question_pattern.split(" ")
    const matchCount = kbWords.filter((w) => questionWords.includes(w)).length
    const matchPercentage = matchCount / kbWords.length

    // Use this KB entry if it has better match percentage or same percentage but more matching words
    if (matchPercentage > bestMatchCount / (bestMatch?.question_pattern.split(" ").length || 1)) {
      bestMatchCount = matchCount
      bestMatch = kb
    }
  }

  if (bestMatch && bestMatchCount > 0) {
    return bestMatch
  }

  return null
}

function normalizePattern(q: string) {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .join(" ")
}
