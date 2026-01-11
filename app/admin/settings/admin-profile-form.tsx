"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAdminProfile } from "@/server/actions/admin-settings";

interface Admin {
  id: number;
  name: string;
  email: string;
}

interface AdminProfileFormProps {
  admin: Admin;
}

export function AdminProfileForm({ admin }: AdminProfileFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updateAdminProfile(formData);

      if (result.success) {
        setSuccess(true);
        router.refresh();
      } else {
        setError(result.error || "更新に失敗しました");
      }
    } catch {
      setError("予期しないエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 text-green-800 text-sm p-3 rounded-md">
          プロフィールを更新しました
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">名前</Label>
        <Input id="name" name="name" defaultValue={admin.name} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="currentPassword">現在のパスワード</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          placeholder="パスワードを変更する場合のみ入力"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">新しいパスワード</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          placeholder="8文字以上"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">新しいパスワード（確認）</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="もう一度入力してください"
        />
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "更新中..." : "更新する"}
      </Button>
    </form>
  );
}
