"use server";

import { z } from "zod/v4";
import { db } from "@/lib/db";
import { admins } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

const updateProfileSchema = z
  .object({
    name: z.string().min(1, "名前は必須です"),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      // パスワード変更する場合は全てのフィールドが必要
      if (data.newPassword || data.confirmPassword) {
        return data.currentPassword && data.newPassword && data.confirmPassword;
      }
      return true;
    },
    {
      message: "パスワードを変更する場合は、現在のパスワードと新しいパスワードを入力してください",
    }
  )
  .refine(
    (data) => {
      if (data.newPassword) {
        return data.newPassword.length >= 8;
      }
      return true;
    },
    {
      message: "新しいパスワードは8文字以上で入力してください",
    }
  )
  .refine(
    (data) => {
      if (data.newPassword && data.confirmPassword) {
        return data.newPassword === data.confirmPassword;
      }
      return true;
    },
    {
      message: "新しいパスワードが一致しません",
    }
  );

export async function updateAdminProfile(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();

  if (!session?.user || session.user.userType !== "admin") {
    return { success: false, error: "権限がありません" };
  }

  const rawData = {
    name: formData.get("name"),
    currentPassword: formData.get("currentPassword") || undefined,
    newPassword: formData.get("newPassword") || undefined,
    confirmPassword: formData.get("confirmPassword") || undefined,
  };

  const parsed = updateProfileSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "入力内容に誤りがあります",
    };
  }

  const currentAdmin = await db.query.admins.findFirst({
    where: eq(admins.email, session.user.email!),
  });

  if (!currentAdmin) {
    return { success: false, error: "管理者が見つかりません" };
  }

  const updateData: Partial<typeof admins.$inferInsert> = {
    name: parsed.data.name,
    updatedAt: new Date(),
  };

  // パスワード変更
  if (parsed.data.currentPassword && parsed.data.newPassword) {
    const isValidPassword = await bcrypt.compare(
      parsed.data.currentPassword,
      currentAdmin.passwordHash
    );

    if (!isValidPassword) {
      return { success: false, error: "現在のパスワードが正しくありません" };
    }

    const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 12);
    updateData.passwordHash = hashedPassword;
  }

  await db
    .update(admins)
    .set(updateData)
    .where(eq(admins.id, currentAdmin.id));

  revalidatePath("/admin/settings");

  return { success: true };
}

export async function updateAdminRole(
  adminId: number,
  newRole: "admin" | "super_admin"
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();

  if (
    !session?.user ||
    session.user.userType !== "admin" ||
    session.user.role !== "super_admin"
  ) {
    return { success: false, error: "この操作にはスーパー管理者権限が必要です" };
  }

  const currentAdmin = await db.query.admins.findFirst({
    where: eq(admins.email, session.user.email!),
  });

  if (!currentAdmin) {
    return { success: false, error: "管理者が見つかりません" };
  }

  // 自分自身の権限は変更不可
  if (currentAdmin.id === adminId) {
    return { success: false, error: "自分自身の権限は変更できません" };
  }

  const targetAdmin = await db.query.admins.findFirst({
    where: eq(admins.id, adminId),
  });

  if (!targetAdmin) {
    return { success: false, error: "対象の管理者が見つかりません" };
  }

  await db
    .update(admins)
    .set({
      role: newRole,
      updatedAt: new Date(),
    })
    .where(eq(admins.id, adminId));

  revalidatePath("/admin/settings");

  return { success: true };
}

const createAdminSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  email: z.email("有効なメールアドレスを入力してください"),
  password: z.string().min(8, "パスワードは8文字以上で入力してください"),
  role: z.enum(["admin", "super_admin"]),
});

export async function createAdmin(
  formData: FormData
): Promise<{ success: boolean; error?: string; adminId?: number }> {
  const session = await auth();

  if (
    !session?.user ||
    session.user.userType !== "admin" ||
    session.user.role !== "super_admin"
  ) {
    return { success: false, error: "この操作にはスーパー管理者権限が必要です" };
  }

  const rawData = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role") || "admin",
  };

  const parsed = createAdminSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "入力内容に誤りがあります",
    };
  }

  // メールアドレスの重複チェック
  const existingAdmin = await db.query.admins.findFirst({
    where: eq(admins.email, parsed.data.email),
  });

  if (existingAdmin) {
    return { success: false, error: "このメールアドレスは既に使用されています" };
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 12);

  const [newAdmin] = await db
    .insert(admins)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: hashedPassword,
      role: parsed.data.role,
    })
    .returning();

  revalidatePath("/admin/settings");

  return { success: true, adminId: newAdmin.id };
}
