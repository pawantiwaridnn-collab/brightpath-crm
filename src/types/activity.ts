export type Activity = {
  id: string
  leadId: string
  actorId: string
  actorName: string | null
  activityType: string
  description: string
  createdAt: string
}

export type ActivityWrite = {
  leadId: string
  activityType: string
  description: string
}
