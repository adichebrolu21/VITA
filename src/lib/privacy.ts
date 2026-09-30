import { prisma } from "@/lib/prisma";
export type Field = "level" | "stats" | "achievements" | "quests" | "momentum" | "activity";

export async function areFriends(a: string, b: string) {
  return !!(await prisma.friendship.findFirst({ where: { status: "ACCEPTED",
    OR: [{ requesterId: a, addresseeId: b }, { requesterId: b, addresseeId: a }] }, select: { id: true } }));
}
export async function canSee(viewerId: string, ownerId: string, field: Field) {
  if (viewerId === ownerId) return true;
  const p = await prisma.userPrivacySettings.findUnique({ where: { userId: ownerId } });
  const vis = p?.[field] ?? "FRIENDS";
  if (vis === "PUBLIC") return true;
  if (vis === "PRIVATE") return false;
  return areFriends(viewerId, ownerId);
}
