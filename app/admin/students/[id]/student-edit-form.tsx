"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateStudent } from "@/server/actions/admin-students";

interface Student {
  id: number;
  name: string;
  email: string;
  status: "provisional" | "active" | "withdrawn";
  plan: "monthly" | "yearly";
}

interface StudentEditFormProps {
  student: Student;
}

export function StudentEditForm({ student }: StudentEditFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);

    try {
      const result = await updateStudent(student.id, formData);

      if (result.success) {
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

      <div className="space-y-2">
        <Label htmlFor="name">名前</Label>
        <Input id="name" name="name" defaultValue={student.name} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">メールアドレス</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={student.email}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">ステータス</Label>
        <Select name="status" defaultValue={student.status}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="provisional">仮登録</SelectItem>
            <SelectItem value="active">アクティブ</SelectItem>
            <SelectItem value="withdrawn">退会済み</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="plan">プラン</Label>
        <Select name="plan" defaultValue={student.plan}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">月額プラン</SelectItem>
            <SelectItem value="yearly">年額プラン</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "更新中..." : "更新する"}
      </Button>
    </form>
  );
}
