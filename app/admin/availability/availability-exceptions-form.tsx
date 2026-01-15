"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";
import {
  createAvailabilityException,
  deleteAvailabilityException,
} from "@/server/actions/availability";
import type { AvailabilityException } from "@/drizzle/schema";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

type Props = {
  exceptions: AvailabilityException[];
};

export function AvailabilityExceptionsForm({ exceptions }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 新規追加フォームの状態
  const [newDate, setNewDate] = useState("");
  const [isAllDay, setIsAllDay] = useState(true);
  const [newStartTime, setNewStartTime] = useState("10:00");
  const [newEndTime, setNewEndTime] = useState("18:00");
  const [newReason, setNewReason] = useState("");

  const handleAdd = async () => {
    if (!newDate) {
      setMessage({ type: "error", text: "日付を選択してください" });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.set("date", newDate);
    if (!isAllDay) {
      formData.set("startTime", newStartTime);
      formData.set("endTime", newEndTime);
    }
    if (newReason) {
      formData.set("reason", newReason);
    }

    const result = await createAvailabilityException(formData);

    if (result.success) {
      setMessage({ type: "success", text: "例外設定を追加しました" });
      setNewDate("");
      setNewReason("");
      setIsAllDay(true);
    } else {
      setMessage({
        type: "error",
        text: result.error || "追加に失敗しました",
      });
    }

    setIsLoading(false);
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setMessage(null);

    const result = await deleteAvailabilityException(id);

    if (result.success) {
      setMessage({ type: "success", text: "例外設定を削除しました" });
    } else {
      setMessage({
        type: "error",
        text: result.error || "削除に失敗しました",
      });
    }

    setDeletingId(null);
  };

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, "yyyy年M月d日(E)", { locale: ja });
  };

  return (
    <div className="space-y-6">
      {/* 新規追加フォーム */}
      <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
        <h3 className="font-medium flex items-center gap-2">
          <Plus className="h-4 w-4" />
          新しい例外日を追加
        </h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="date">日付</Label>
            <Input
              id="date"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">理由（任意）</Label>
            <Input
              id="reason"
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="例: 祝日、休暇"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="allDay"
              checked={isAllDay}
              onCheckedChange={(checked) => setIsAllDay(checked === true)}
            />
            <Label htmlFor="allDay">終日オフにする</Label>
          </div>

          {!isAllDay && (
            <div className="flex items-center gap-2 pl-6">
              <Input
                type="time"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
                className="w-32"
              />
              <span className="text-muted-foreground">〜</span>
              <Input
                type="time"
                value={newEndTime}
                onChange={(e) => setNewEndTime(e.target.value)}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">のみオフ</span>
            </div>
          )}
        </div>

        <Button onClick={handleAdd} disabled={isLoading}>
          {isLoading ? "追加中..." : "追加"}
        </Button>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 登録済みの例外一覧 */}
      <div className="space-y-2">
        <h3 className="font-medium">登録済みの例外日</h3>

        {exceptions.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center border rounded-lg">
            例外設定はありません
          </p>
        ) : (
          <div className="space-y-2">
            {exceptions.map((exception) => (
              <div
                key={exception.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <span className="font-medium">
                      {formatDateDisplay(exception.date)}
                    </span>
                    {exception.startTime && exception.endTime ? (
                      <span className="text-muted-foreground ml-2">
                        {exception.startTime} - {exception.endTime}
                      </span>
                    ) : (
                      <Badge variant="secondary" className="ml-2">
                        終日
                      </Badge>
                    )}
                  </div>
                  {exception.reason && (
                    <span className="text-sm text-muted-foreground">
                      ({exception.reason})
                    </span>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(exception.id)}
                  disabled={deletingId === exception.id}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
