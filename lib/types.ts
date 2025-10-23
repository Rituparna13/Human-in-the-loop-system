export type Status = "PENDING" | "RESOLVED" | "UNRESOLVED"

export interface Customer {
  id: string
  phone: string
  name?: string
  created_at: string
}

export interface KBEntry {
  id: string
  question_pattern: string
  answer: string
  source: "supervisor" | "seed"
  usage_count: number
  created_at: string
  updated_at: string
}

export interface HelpRequest {
  id: string
  customer_id: string
  question: string
  status: Status
  assigned_to?: string | null
  timeout_at: string
  resolution_message?: string | null
  kb_entry_id?: string | null
  created_at: string
  updated_at: string
}

export interface HelpRequestExpanded extends HelpRequest {
  customer: Customer
}
