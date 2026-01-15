"use server";

import { z } from "zod/v4";
import { db } from "@/lib/db";
import { availabilityDefaults, availabilityExceptions } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// デフォルト設定のスキーマ
const saveDefaultsSchema = z.object({
  defaults: z.array(
    z.object({
      dayOfWeek: z.number().min(0).max(6),
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{2}:\d{2}$/),
      isEnabled: z.number().min(0).max(1),
    })
  ),
});

export async function saveAvailabilityDefaults(
  defaults: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isEnabled: number;
  }[]
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();

  if (
    !session?.user ||
    session.user.userType !== "admin" ||
    (session.user.role !== "admin" && session.user.role !== "super_admin")
  ) {
    return { success: false, error: "権限がありません" };
  }

  const parsed = saveDefaultsSchema.safeParse({ defaults });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "入力内容に誤りがあります",
    };
  }

  // 既存のデフォルト設定を全削除して新しいものを挿入
  await db.delete(availabilityDefaults);

  if (parsed.data.defaults.length > 0) {
    await db.insert(availabilityDefaults).values(
      parsed.data.defaults.map((d) => ({
        dayOfWeek: d.dayOfWeek,
        startTime: d.startTime,
        endTime: d.endTime,
        isEnabled: d.isEnabled,
      }))
    );
  }

  revalidatePath("/admin/availability");

  return { success: true };
}

export async function getAvailabilityDefaults() {
  const defaults = await db
    .select()
    .from(availabilityDefaults)
    .orderBy(availabilityDefaults.dayOfWeek);

  return defaults;
}

// 例外設定のスキーマ
const createExceptionSchema = z.object({
  date: z.string().min(1, "日付を選択してください"),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  reason: z.string().nullable(),
});

export async function createAvailabilityException(
  formData: FormData
): Promise<{ success: boolean; error?: string; exceptionId?: number }> {
  const session = await auth();

  if (
    !session?.user ||
    session.user.userType !== "admin" ||
    (session.user.role !== "admin" && session.user.role !== "super_admin")
  ) {
    return { success: false, error: "権限がありません" };
  }

  const rawData = {
    date: formData.get("date"),
    startTime: formData.get("startTime") || null,
    endTime: formData.get("endTime") || null,
    reason: formData.get("reason") || null,
  };

  const parsed = createExceptionSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "入力内容に誤りがあります",
    };
  }

  // 同じ日付・時間帯の例外が既にあるか確認
  const existingException = await db.query.availabilityExceptions.findFirst({
    where: and(
      eq(availabilityExceptions.date, parsed.data.date),
      parsed.data.startTime
        ? eq(availabilityExceptions.startTime, parsed.data.startTime)
        : undefined
    ),
  });

  if (existingException) {
    return {
      success: false,
      error: "この日時には既に例外設定が存在します",
    };
  }

  const [newException] = await db
    .insert(availabilityExceptions)
    .values({
      date: parsed.data.date,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      reason: parsed.data.reason,
      type: "unavailable",
    })
    .returning();

  revalidatePath("/admin/availability");

  return { success: true, exceptionId: newException.id };
}

export async function deleteAvailabilityException(
  exceptionId: number
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();

  if (
    !session?.user ||
    session.user.userType !== "admin" ||
    (session.user.role !== "admin" && session.user.role !== "super_admin")
  ) {
    return { success: false, error: "権限がありません" };
  }

  const existingException = await db.query.availabilityExceptions.findFirst({
    where: eq(availabilityExceptions.id, exceptionId),
  });

  if (!existingException) {
    return { success: false, error: "例外設定が見つかりません" };
  }

  await db
    .delete(availabilityExceptions)
    .where(eq(availabilityExceptions.id, exceptionId));

  revalidatePath("/admin/availability");

  return { success: true };
}

export async function getAvailabilityExceptions() {
  const exceptions = await db
    .select()
    .from(availabilityExceptions)
    .orderBy(availabilityExceptions.date);

  return exceptions;
}
