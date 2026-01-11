"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Student } from "@/drizzle/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/server/actions/students";

interface ProfileFormProps {
  student: Student;
}

export function ProfileForm({ student }: ProfileFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await updateProfile(formData);

      if (result.success) {
        setMessage({ type: "success", text: "プロフィールを更新しました" });
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.error || "更新に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "更新に失敗しました" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">名前</Label>
        <Input
          id="name"
          name="name"
          defaultValue={student.name}
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">メールアドレス</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={student.email}
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">電話番号</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={student.phone || ""}
          disabled={isLoading}
        />
      </div>

      {message && (
        <p
          className={`text-sm ${
            message.type === "success" ? "text-green-600" : "text-destructive"
          }`}
        >
          {message.text}
        </p>
      )}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "更新中..." : "更新する"}
      </Button>
    </form>
  );
}
