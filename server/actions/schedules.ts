"use server";

import { z } from "zod/v4";
import { db } from "@/lib/db";
import { schedules, students } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const createScheduleSchema = z.object({
  studentId: z.coerce.number().min(1, "生徒を選択してください"),
  dayOfWeek: z.coerce.number().min(0).max(6, "曜日を選択してください"),
  startTime: z.string().min(1, "開始時間を入力してください"),
  endTime: z.string().min(1, "終了時間を入力してください"),
});

export async function createSchedule(
  formData: FormData
): Promise<{ success: boolean; error?: string; scheduleId?: number }> {
  const session = await auth();

  if (
    !session?.user ||
    session.user.userType !== "admin" ||
    (session.user.role !== "admin" && session.user.role !== "super_admin")
  ) {
    return { success: false, error: "権限がありません" };
  }

  const rawData = {
    studentId: formData.get("studentId"),
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  };

  const parsed = createScheduleSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "入力内容に誤りがあります",
    };
  }

  // 生徒の存在確認
  const student = await db.query.students.findFirst({
    where: eq(students.id, parsed.data.studentId),
  });

  if (!student) {
    return { success: false, error: "生徒が見つかりません" };
  }

  // 同じ生徒の同じ曜日・時間帯のスケジュールが既にあるか確認
  const existingSchedule = await db.query.schedules.findFirst({
    where: and(
      eq(schedules.studentId, parsed.data.studentId),
      eq(schedules.dayOfWeek, parsed.data.dayOfWeek),
      eq(schedules.startTime, parsed.data.startTime)
    ),
  });

  if (existingSchedule) {
    return {
      success: false,
      error: "この生徒には同じ曜日・時間帯のスケジュールが既に存在します",
    };
  }

  // スケジュールを作成
  const [newSchedule] = await db
    .insert(schedules)
    .values({
      studentId: parsed.data.studentId,
      dayOfWeek: parsed.data.dayOfWeek,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      isActive: 1,
    })
    .returning();

  revalidatePath("/admin/schedules");
  revalidatePath(`/admin/students/${student.id}`);

  return { success: true, scheduleId: newSchedule.id };
}

const updateScheduleSchema = z.object({
  dayOfWeek: z.coerce.number().min(0).max(6).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  isActive: z.coerce.number().min(0).max(1).optional(),
});

export async function updateSchedule(
  scheduleId: number,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();

  if (
    !session?.user ||
    session.user.userType !== "admin" ||
    (session.user.role !== "admin" && session.user.role !== "super_admin")
  ) {
    return { success: false, error: "権限がありません" };
  }

  const rawData = {
    dayOfWeek: formData.get("dayOfWeek") || undefined,
    startTime: formData.get("startTime") || undefined,
    endTime: formData.get("endTime") || undefined,
    isActive: formData.has("isActive")
      ? formData.get("isActive") === "true" ? 1 : 0
      : undefined,
  };

  const parsed = updateScheduleSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "入力内容に誤りがあります",
    };
  }

  const existingSchedule = await db.query.schedules.findFirst({
    where: eq(schedules.id, scheduleId),
  });

  if (!existingSchedule) {
    return { success: false, error: "スケジュールが見つかりません" };
  }

  const updateData: Partial<typeof schedules.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (parsed.data.dayOfWeek !== undefined) {
    updateData.dayOfWeek = parsed.data.dayOfWeek;
  }
  if (parsed.data.startTime) {
    updateData.startTime = parsed.data.startTime;
  }
  if (parsed.data.endTime) {
    updateData.endTime = parsed.data.endTime;
  }
  if (parsed.data.isActive !== undefined) {
    updateData.isActive = parsed.data.isActive;
  }

  await db.update(schedules).set(updateData).where(eq(schedules.id, scheduleId));

  revalidatePath("/admin/schedules");
  revalidatePath(`/admin/schedules/${scheduleId}`);
  revalidatePath(`/admin/students/${existingSchedule.studentId}`);

  return { success: true };
}

export async function deleteSchedule(
  scheduleId: number
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();

  if (
    !session?.user ||
    session.user.userType !== "admin" ||
    (session.user.role !== "admin" && session.user.role !== "super_admin")
  ) {
    return { success: false, error: "権限がありません" };
  }

  const existingSchedule = await db.query.schedules.findFirst({
    where: eq(schedules.id, scheduleId),
  });

  if (!existingSchedule) {
    return { success: false, error: "スケジュールが見つかりません" };
  }

  await db.delete(schedules).where(eq(schedules.id, scheduleId));

  revalidatePath("/admin/schedules");
  revalidatePath(`/admin/students/${existingSchedule.studentId}`);

  return { success: true };
}

export async function toggleScheduleActive(
  scheduleId: number
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();

  if (
    !session?.user ||
    session.user.userType !== "admin" ||
    (session.user.role !== "admin" && session.user.role !== "super_admin")
  ) {
    return { success: false, error: "権限がありません" };
  }

  const existingSchedule = await db.query.schedules.findFirst({
    where: eq(schedules.id, scheduleId),
  });

  if (!existingSchedule) {
    return { success: false, error: "スケジュールが見つかりません" };
  }

  await db
    .update(schedules)
    .set({
      isActive: existingSchedule.isActive === 1 ? 0 : 1,
      updatedAt: new Date(),
    })
    .where(eq(schedules.id, scheduleId));

  revalidatePath("/admin/schedules");
  revalidatePath(`/admin/schedules/${scheduleId}`);
  revalidatePath(`/admin/students/${existingSchedule.studentId}`);

  return { success: true };
}
