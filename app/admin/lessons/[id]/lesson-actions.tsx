"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";
import { completeLesson, cancelLesson } from "@/server/actions/lessons";

interface LessonActionsProps {
  lessonId: number;
}

export function LessonActions({ lessonId }: LessonActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete() {
    if (!confirm("このレッスンを完了にしますか？")) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await completeLesson(lessonId);

      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || "処理に失敗しました");
      }
    } catch {
      setError("予期しないエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCancel() {
    if (!confirm("このレッスンをキャンセルしますか？この操作は取り消せません。")) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await cancelLesson(lessonId);

      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || "処理に失敗しました");
      }
    } catch {
      setError("予期しないエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <Button
          onClick={handleComplete}
          disabled={isLoading}
          className="flex-1"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          レッスン完了
        </Button>
        <Button
          variant="destructive"
          onClick={handleCancel}
          disabled={isLoading}
          className="flex-1"
        >
          <XCircle className="mr-2 h-4 w-4" />
          キャンセル
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        ※ 初回レッスンを完了にすると、生徒のステータスが「アクティブ」に変更されます
      </p>
    </div>
  );
}
