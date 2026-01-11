"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { createSchedule } from "@/server/actions/schedules";

interface Student {
  id: number;
  name: string;
  email: string;
}

interface NewScheduleFormProps {
  students: Student[];
}

const dayNames = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];

export function NewScheduleForm({ students }: NewScheduleFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<string>("");

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);

    // Selectコンポーネントの値をFormDataに追加
    formData.set("studentId", selectedStudentId);
    formData.set("dayOfWeek", selectedDayOfWeek);

    try {
      const result = await createSchedule(formData);

      if (result.success) {
        router.push("/admin/schedules");
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
        <Label htmlFor="dayOfWeek">曜日 *</Label>
        <Select
          value={selectedDayOfWeek}
          onValueChange={setSelectedDayOfWeek}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="曜日を選択" />
          </SelectTrigger>
          <SelectContent>
            {dayNames.map((name, index) => (
              <SelectItem key={index} value={index.toString()}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startTime">開始時間 *</Label>
          <Input id="startTime" name="startTime" type="time" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endTime">終了時間 *</Label>
          <Input id="endTime" name="endTime" type="time" required />
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "登録中..." : "登録する"}
        </Button>
        <Link href="/admin/schedules">
          <Button variant="outline" type="button">
            キャンセル
          </Button>
        </Link>
      </div>
    </form>
  );
}
