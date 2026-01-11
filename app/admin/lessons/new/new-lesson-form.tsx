"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createLesson } from "@/server/actions/lessons";

interface Student {
  id: number;
  name: string;
  email: string;
}

interface Admin {
  id: number;
  name: string;
  email: string;
}

interface NewLessonFormProps {
  students: Student[];
  admins: Admin[];
}

export function NewLessonForm({ students, admins }: NewLessonFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedAdminId, setSelectedAdminId] = useState<string>("");

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);

    // Selectコンポーネントの値をFormDataに追加
    formData.set("studentId", selectedStudentId);
    formData.set("adminId", selectedAdminId);

    try {
      const result = await createLesson(formData);

      if (result.success && result.lessonId) {
        router.push(`/admin/lessons/${result.lessonId}`);
      } else {
        setError(result.error || "登録に失敗しました");
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
        <Label htmlFor="studentId">生徒 *</Label>
        <Select
          value={selectedStudentId}
          onValueChange={setSelectedStudentId}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="生徒を選択" />
          </SelectTrigger>
          <SelectContent>
            {students.map((student) => (
              <SelectItem key={student.id} value={student.id.toString()}>
                {student.name} ({student.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="adminId">講師 *</Label>
        <Select
          value={selectedAdminId}
          onValueChange={setSelectedAdminId}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="講師を選択" />
          </SelectTrigger>
          <SelectContent>
            {admins.map((admin) => (
              <SelectItem key={admin.id} value={admin.id.toString()}>
                {admin.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date">日付 *</Label>
          <Input id="date" name="date" type="date" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="startTime">開始時間 *</Label>
          <Input id="startTime" name="startTime" type="time" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration">レッスン時間（分）</Label>
        <Select name="duration" defaultValue="60">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30分</SelectItem>
            <SelectItem value="60">60分</SelectItem>
            <SelectItem value="90">90分</SelectItem>
            <SelectItem value="120">120分</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="lessonNumber">レッスン回数</Label>
        <Input
          id="lessonNumber"
          name="lessonNumber"
          type="number"
          min="1"
          placeholder="自動計算（空欄可）"
        />
        <p className="text-xs text-muted-foreground">
          空欄の場合、生徒の既存レッスン数+1が自動設定されます
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">メモ</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="レッスンに関するメモ..."
          rows={3}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="sendNotification"
          name="sendNotification"
          className="rounded"
          defaultChecked
        />
        <Label htmlFor="sendNotification" className="font-normal">
          生徒に通知メールを送信する
        </Label>
      </div>

      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "登録中..." : "登録する"}
        </Button>
        <Link href="/admin/lessons">
          <Button variant="outline" type="button">
            キャンセル
          </Button>
        </Link>
      </div>
    </form>
  );
}
