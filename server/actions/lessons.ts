"use server";

import { z } from "zod/v4";
import { db } from "@/lib/db";
import { lessons, students, admins, emailLogs } from "@/drizzle/schema";
import { eq, count } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createLessonEvent } from "@/server/services/calendar.service";
import { sendLessonConfirmationEmail } from "@/server/services/mail.service";

const createLessonSchema = z.object({
  studentId: z.coerce.number().min(1, "生徒を選択してください"),
  adminId: z.coerce.number().min(1, "講師を選択してください"),
  date: z.string().min(1, "日付を入力してください"),
  startTime: z.string().min(1, "開始時間を入力してください"),
  duration: z.coerce.number().min(15).max(180).default(60),
  lessonNumber: z.coerce.number().optional(),
  notes: z.string().optional(),
  sendNotification: z.coerce.boolean().default(true),
});

export async function createLesson(
  formData: FormData
): Promise<{ success: boolean; error?: string; lessonId?: number }> {
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
    adminId: formData.get("adminId"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    duration: formData.get("duration") || 60,
    lessonNumber: formData.get("lessonNumber") || undefined,
    notes: formData.get("notes") || undefined,
    sendNotification: formData.get("sendNotification") === "on",
  };

  const parsed = createLessonSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "入力内容に誤りがあります",
    };
  }

  // 生徒と管理者の存在確認
  const student = await db.query.students.findFirst({
    where: eq(students.id, parsed.data.studentId),
  });

  if (!student) {
    return { success: false, error: "生徒が見つかりません" };
  }

  const admin = await db.query.admins.findFirst({
    where: eq(admins.id, parsed.data.adminId),
  });

  if (!admin) {
    return { success: false, error: "講師が見つかりません" };
  }

  // レッスン回数の計算
  let lessonNumber = parsed.data.lessonNumber;
  if (!lessonNumber) {
    const [existingLessonsCount] = await db
      .select({ count: count() })
      .from(lessons)
      .where(eq(lessons.studentId, parsed.data.studentId));
    lessonNumber = (existingLessonsCount?.count || 0) + 1;
  }

  // 開始・終了時間の計算
  const startDateTime = new Date(`${parsed.data.date}T${parsed.data.startTime}`);
  const endDateTime = new Date(
    startDateTime.getTime() + parsed.data.duration * 60 * 1000
  );

  // レッスンを作成
  const [newLesson] = await db
    .insert(lessons)
    .values({
      studentId: parsed.data.studentId,
      adminId: parsed.data.adminId,
      startTime: startDateTime,
      endTime: endDateTime,
      status: "scheduled",
      lessonNumber,
      notes: parsed.data.notes || null,
    })
    .returning();

  // Google Calendarにイベントを作成（エラーが発生しても続行）
  try {
    const calendarEvent = await createLessonEvent({
      studentName: student.name,
      studentEmail: student.email,
      adminName: admin.name,
      adminEmail: admin.email,
      startTime: startDateTime,
      endTime: endDateTime,
      lessonNumber,
    });

    // カレンダーイベントIDを保存
    if (calendarEvent.id) {
      await db
        .update(lessons)
        .set({ calendarEventId: calendarEvent.id })
        .where(eq(lessons.id, newLesson.id));
    }
  } catch (error) {
    console.error("Failed to create calendar event:", error);
    // カレンダー作成に失敗しても、レッスンは作成済みなので続行
  }

  // 通知メールを送信
  if (parsed.data.sendNotification) {
    try {
      await sendLessonConfirmationEmail({
        id: newLesson.id,
        name: student.name,
        email: student.email,
        status: student.status,
        plan: student.plan,
        stripeCustomerId: student.stripeCustomerId,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt,
      }, {
        startTime: startDateTime,
        lessonNumber,
      });

      // メールログを記録
      await db.insert(emailLogs).values({
        studentId: student.id,
        type: "lesson_confirmation",
        subject: `【PrimaMateria】第${lessonNumber}回レッスンのご案内`,
        status: "sent",
      });
    } catch (emailError) {
      console.error("Failed to send lesson confirmation email:", emailError);

      // メール送信失敗のログを記録
      await db.insert(emailLogs).values({
        studentId: student.id,
        type: "lesson_confirmation",
        subject: `【PrimaMateria】第${lessonNumber}回レッスンのご案内`,
        status: "failed",
      });
    }
  }

  revalidatePath("/admin/lessons");
  revalidatePath(`/admin/students/${student.id}`);

  return { success: true, lessonId: newLesson.id };
}

const updateLessonSchema = z.object({
  status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
  notes: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

export async function updateLesson(
  lessonId: number,
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
    status: formData.get("status") || undefined,
    notes: formData.get("notes") || undefined,
    startTime: formData.get("startTime") || undefined,
    endTime: formData.get("endTime") || undefined,
  };

  const parsed = updateLessonSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "入力内容に誤りがあります",
    };
  }

  const existingLesson = await db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
  });

  if (!existingLesson) {
    return { success: false, error: "レッスンが見つかりません" };
  }

  const updateData: Partial<typeof lessons.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (parsed.data.status) {
    updateData.status = parsed.data.status;
  }
  if (parsed.data.notes !== undefined) {
    updateData.notes = parsed.data.notes;
  }
  if (parsed.data.startTime) {
    updateData.startTime = new Date(parsed.data.startTime);
  }
  if (parsed.data.endTime) {
    updateData.endTime = new Date(parsed.data.endTime);
  }

  await db.update(lessons).set(updateData).where(eq(lessons.id, lessonId));

  revalidatePath("/admin/lessons");
  revalidatePath(`/admin/lessons/${lessonId}`);
  revalidatePath(`/admin/students/${existingLesson.studentId}`);

  return { success: true };
}

export async function cancelLesson(
  lessonId: number
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();

  if (
    !session?.user ||
    session.user.userType !== "admin" ||
    (session.user.role !== "admin" && session.user.role !== "super_admin")
  ) {
    return { success: false, error: "権限がありません" };
  }

  const existingLesson = await db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
  });

  if (!existingLesson) {
    return { success: false, error: "レッスンが見つかりません" };
  }

  await db
    .update(lessons)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(eq(lessons.id, lessonId));

  revalidatePath("/admin/lessons");
  revalidatePath(`/admin/lessons/${lessonId}`);
  revalidatePath(`/admin/students/${existingLesson.studentId}`);

  return { success: true };
}

export async function completeLesson(
  lessonId: number
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();

  if (
    !session?.user ||
    session.user.userType !== "admin" ||
    (session.user.role !== "admin" && session.user.role !== "super_admin")
  ) {
    return { success: false, error: "権限がありません" };
  }

  const existingLesson = await db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
  });

  if (!existingLesson) {
    return { success: false, error: "レッスンが見つかりません" };
  }

  await db
    .update(lessons)
    .set({
      status: "completed",
      updatedAt: new Date(),
    })
    .where(eq(lessons.id, lessonId));

  // 初回レッスン完了時は生徒をアクティブに
  if (existingLesson.lessonNumber === 1) {
    await db
      .update(students)
      .set({
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(students.id, existingLesson.studentId));
  }

  revalidatePath("/admin/lessons");
  revalidatePath(`/admin/lessons/${lessonId}`);
  revalidatePath(`/admin/students/${existingLesson.studentId}`);

  return { success: true };
}
