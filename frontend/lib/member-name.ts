import type { WorkspaceMemberRecord } from "@/lib/api-service";

/** Display name for a member. */
export function memberName(member: WorkspaceMemberRecord) {
  return member.user?.name || member.user?.email || member.userId;
}

/** assigned_to / assignee_id hold a user id; show that member's name (older rows may hold free text). */
export function assigneeName(assignedTo: string | null | undefined, members: WorkspaceMemberRecord[] | null | undefined) {
  if (!assignedTo) return null;
  const member = (members ?? []).find((m) => m.userId === assignedTo);
  return member ? memberName(member) : assignedTo;
}
