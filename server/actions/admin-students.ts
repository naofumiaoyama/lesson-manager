"use server";

import { z } from "zod/v4";
import { db } from "@/lib/db";
import { students } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const updateStudentSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  email: z.email("有効なメールアドレスを入力してください"),
  status: z.enum(["provisional", "active", "withdrawn"]),
  plan: z.enum(["monthly", "yearly"]),
});

export async function updateStudent(
  studentId: number,
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
    name: formData.get("name"),
    email: formData.get("email"),
    status: formData.get("status"),
    plan: formData.get("plan"),
  };

  const parsed = updateStudentSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "入力内容に誤りがあります",
    };
  }

  const existingStudent = await db.query.students.findFirst({
    where: eq(students.id, studentId),
  });

  if (!existingStudent) {
    return { success: false, error: "生徒が見つかりません" };
  }

  // メールアドレスの重複チェック（自分以外）
  if (parsed.data.email !== existingStudent.email) {
    const duplicateEmail = await db.query.students.findFirst({
      where: eq(students.email, parsed.data.email),
    });

    if (duplicateEmail) {
      return { success: false, error: "このメールアドレスは既に使用されています" };
    }
  }

  await db
    .update(students)
    .set({
      name: parsed.data.name,
      email: parsed.data.email,
      status: parsed.data.status,
      plan: parsed.data.plan,
      updatedAt: new Date(),
    })
    .where(eq(students.id, studentId));

  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin/students");

  return { success: true };
}

const createStudentSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  email: z.email("有効なメールアドレスを入力してください"),
  plan: z.enum(["monthly", "yearly"]),
  stripeCustomerId: z.string().optional(),
});

export async function createStudent(
  formData: FormData
): Promise<{ success: boolean; error?: string; studentId?: number }> {
  const session = await auth();

  if (
    !session?.user ||
    session.user.userType !== "admin" ||
    (session.user.role !== "admin" && session.user.role !== "super_admin")
  ) {
    return { success: false, error: "権限がありません" };
  }

  const rawData = {
    name: formData.get("name"),
    email: formData.get("email"),
    plan: formData.get("plan"),
    stripeCustomerId: formData.get("stripeCustomerId") || undefined,
  };

  const parsed = createStudentSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "入力内容に誤りがあります",
    };
  }

  // メールアドレスの重複チェック
  const duplicateEmail = await db.query.students.findFirst({
    where: eq(students.email, parsed.data.email),
  });

  if (duplicateEmail) {
    return { success: false, error: "このメールアドレスは既に使用されています" };
  }

  const [newStudent] = await db
    .insert(students)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      plan: parsed.data.plan,
      stripeCustomerId: parsed.data.stripeCustomerId || `manual_${Date.now()}`,
      status: "provisional",
    })
    .returning();

  revalidatePath("/admin/students");

  return { success: true, studentId: newStudent.id };
}

export async function deleteStudent(
  studentId: number
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();

  if (
    !session?.user ||
    session.user.userType !== "admin" ||
    session.user.role !== "super_admin"
  ) {
    return { success: false, error: "この操作にはスーパー管理者権限が必要です" };
  }

  const existingStudent = await db.query.students.findFirst({
    where: eq(students.id, studentId),
  });

  if (!existingStudent) {
    return { success: false, error: "生徒が見つかりません" };
  }

  // 論理削除（ステータスを withdrawn に変更）
  await db
    .update(students)
    .set({
      status: "withdrawn",
      updatedAt: new Date(),
    })
    .where(eq(students.id, studentId));

  revalidatePath("/admin/students");

  return { success: true };
}
