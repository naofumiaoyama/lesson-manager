import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { students } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getCalendarEvents, getStudentLessonEvents } from "@/server/services/calendar.service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

    // デフォルトは今月
    const now = new Date();
    const startDate = startParam
      ? new Date(startParam)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = endParam
      ? new Date(endParam)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // 生徒かどうか確認
    const student = await db
      .select()
      .from(students)
      .where(eq(students.email, session.user.email))
      .limit(1);

    // セッションからアクセストークンを取得
    const accessToken = session.accessToken;

    let events;

    if (student.length > 0) {
      // 生徒の場合: 自分のレッスンとコミュニティイベントのみ
      events = await getStudentLessonEvents(
        session.user.email,
        startDate,
        endDate,
        accessToken
      );
    } else {
      // 管理者の場合: 全てのイベント
      events = await getCalendarEvents(startDate, endDate, accessToken);
    }

    // クライアント用にフォーマット
    const formattedEvents = events.map((event) => ({
      id: event.id,
      title: event.summary,
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      description: event.description,
      meetingUrl: event.conferenceData?.entryPoints?.[0]?.uri || event.hangoutLink,
      attendees: event.attendees?.map((a) => ({
        email: a.email,
        name: a.displayName,
        responseStatus: a.responseStatus,
      })),
      isAllDay: !event.start?.dateTime,
      color: getEventColor(event.summary || ""),
    }));

    return NextResponse.json({
      events: formattedEvents,
      meta: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        count: formattedEvents.length,
      },
    });
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 }
    );
  }
}

// イベントの種類に応じた色を返す
function getEventColor(title: string): string {
  if (title.includes("キックオフ") || title.includes("初回")) {
    return "#10b981"; // green
  }
  if (title.includes("レッスン")) {
    return "#3b82f6"; // blue
  }
  if (title.includes("コミュニティ") || title.includes("勉強会")) {
    return "#8b5cf6"; // purple
  }
  if (title.includes("カウンセリング")) {
    return "#f59e0b"; // amber
  }
  return "#6b7280"; // gray
}
