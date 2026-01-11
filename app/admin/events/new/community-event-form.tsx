"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCommunityEventAction } from "./actions";

export function CommunityEventForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await createCommunityEventAction(formData);

      if (result.success) {
        router.push("/admin/events");
      } else {
        alert(result.error || "イベントの作成に失敗しました");
      }
    } catch (error) {
      console.error("Error creating event:", error);
      alert("イベントの作成に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>イベント情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">イベントタイトル *</Label>
            <Input
              id="title"
              name="title"
              placeholder="例: AI活用勉強会"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="イベントの詳細を入力してください"
              rows={4}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">開催日 *</Label>
              <Input id="date" name="date" type="date" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startTime">開始時間 *</Label>
              <Input id="startTime" name="startTime" type="time" required />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="duration">所要時間</Label>
              <Select name="duration" defaultValue="60">
                <SelectTrigger>
                  <SelectValue placeholder="所要時間を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30分</SelectItem>
                  <SelectItem value="60">1時間</SelectItem>
                  <SelectItem value="90">1時間30分</SelectItem>
                  <SelectItem value="120">2時間</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meetingUrl">ミーティングURL</Label>
              <Input
                id="meetingUrl"
                name="meetingUrl"
                type="url"
                placeholder="https://meet.google.com/..."
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isRecurring"
              checked={isRecurring}
              onCheckedChange={(checked: boolean | "indeterminate") => setIsRecurring(checked === true)}
            />
            <Label htmlFor="isRecurring" className="cursor-pointer">
              繰り返しイベントにする
            </Label>
          </div>

          {isRecurring && (
            <div className="space-y-2">
              <Label htmlFor="recurrence">繰り返し設定</Label>
              <Select name="recurrence" defaultValue="weekly">
                <SelectTrigger>
                  <SelectValue placeholder="繰り返しを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">毎週</SelectItem>
                  <SelectItem value="biweekly">隔週</SelectItem>
                  <SelectItem value="monthly">毎月</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" name="isRecurring" value="true" />
            </div>
          )}

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "作成中..." : "イベントを作成"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
