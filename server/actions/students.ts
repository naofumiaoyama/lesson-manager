"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { students } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";

const updateProfileSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  phone: z.string().optional(),
});

export async function updateProfile(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id || session.user.userType !== "student") {
    return { success: false, error: "認証が必要です" };
  }

  const studentId = parseInt(session.user.id);

  const parsed = updateProfileSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { name, email, phone } = parsed.data;

  // メールアドレスが変更された場合、既存ユーザーとの重複チェック
  const existingStudent = await db
    .select()
    .from(students)
    .where(eq(students.email, email))
    .limit(1);

  if (existingStudent.length > 0 && existingStudent[0].id !== studentId) {
    return { success: false, error: "このメールアドレスは既に使用されています" };
  }

  await db
    .update(students)
    .set({
      name,
      email,
      phone: phone || null,
    })
    .where(eq(students.id, studentId));

  revalidatePath("/student/profile");

  return { success: true };
}
