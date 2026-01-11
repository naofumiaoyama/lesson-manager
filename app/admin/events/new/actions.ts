"use server";

import { createCommunityEvent } from "@/server/services/calendar.service";

export async function createCommunityEventAction(formData: FormData) {
  try {
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const date = formData.get("date") as string;
    const startTime = formData.get("startTime") as string;
    const duration = parseInt(formData.get("duration") as string) || 60;
    const meetingUrl = formData.get("meetingUrl") as string;
    const isRecurring = formData.get("isRecurring") === "true";
    const recurrence = formData.get("recurrence") as string;

    if (!title || !date || !startTime) {
      return { success: false, error: "必須項目を入力してください" };
    }

    // 開始・終了時刻を作成
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = startTime.split(":").map(Number);

    const eventStartTime = new Date(year, month - 1, day, hour, minute);
    const eventEndTime = new Date(eventStartTime.getTime() + duration * 60000);

    // 繰り返しルールを生成
    let recurrenceRule: string | undefined;
    if (isRecurring) {
      const dayOfWeek = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][
        eventStartTime.getDay()
      ];

      switch (recurrence) {
        case "weekly":
          recurrenceRule = `RRULE:FREQ=WEEKLY;BYDAY=${dayOfWeek}`;
          break;
        case "biweekly":
          recurrenceRule = `RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=${dayOfWeek}`;
          break;
        case "monthly":
          recurrenceRule = `RRULE:FREQ=MONTHLY;BYDAY=1${dayOfWeek}`;
          break;
      }
    }

    const event = await createCommunityEvent({
      title,
      description: description || "",
      startTime: eventStartTime,
      endTime: eventEndTime,
      meetingUrl: meetingUrl || undefined,
      recurrenceRule,
    });

    return { success: true, eventId: event.id };
  } catch (error) {
    console.error("Failed to create community event:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "イベントの作成に失敗しました",
    };
  }
}
