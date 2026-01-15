import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { db } from "@/lib/db";
import { availabilityDefaults, availabilityExceptions } from "@/drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

// 管理者のリフレッシュトークンを使用（環境変数で設定）
// これにより、ログインなしでも空き時間を取得できる
async function getAuthClient() {
  console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + "...");
  console.log("GOOGLE_REFRESH_TOKEN exists:", !!process.env.GOOGLE_REFRESH_TOKEN);

  if (process.env.GOOGLE_REFRESH_TOKEN) {
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });
    return oauth2Client;
  }

  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    });
    return auth;
  }

  throw new Error("No authentication method available");
}

const calendar = google.calendar({ version: "v3" });

// デフォルトの営業時間設定（DBに設定がない場合のフォールバック）
const DEFAULT_BUSINESS_HOURS = {
  start: 10, // 10:00
  end: 18,   // 18:00
  slotDuration: 60, // 60分
};

// デフォルトの予約可能な曜日（DBに設定がない場合のフォールバック）
const DEFAULT_AVAILABLE_DAYS = [1, 2, 3, 4, 5]; // 月〜金

// DBから予約可能設定を取得
async function getAvailabilitySettings() {
  const defaults = await db.select().from(availabilityDefaults);

  if (defaults.length === 0) {
    // DBに設定がない場合はデフォルト値を返す
    return {
      daySettings: DEFAULT_AVAILABLE_DAYS.map(day => ({
        dayOfWeek: day,
        startTime: `${DEFAULT_BUSINESS_HOURS.start}:00`,
        endTime: `${DEFAULT_BUSINESS_HOURS.end}:00`,
        isEnabled: 1,
      })),
    };
  }

  return {
    daySettings: defaults.filter(d => d.isEnabled === 1),
  };
}

// 特定日の例外設定を取得
async function getExceptions(startDate: Date, endDate: Date) {
  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];

  const exceptions = await db
    .select()
    .from(availabilityExceptions)
    .where(
      and(
        gte(availabilityExceptions.date, startStr),
        lte(availabilityExceptions.date, endStr)
      )
    );

  return exceptions;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const daysAhead = parseInt(searchParams.get("days") || "14");

    // デフォルトは今日から2週間
    const now = new Date();
    const startDate = startParam
      ? new Date(startParam)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1); // 明日から
    const endDate = endParam
      ? new Date(endParam)
      : new Date(startDate.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    // DBから予約可能設定を取得
    const { daySettings } = await getAvailabilitySettings();
    const exceptions = await getExceptions(startDate, endDate);

    // 例外日のマップを作成（日付文字列 -> 例外データ）
    const exceptionMap = new Map<string, typeof exceptions[0]>();
    for (const exception of exceptions) {
      exceptionMap.set(exception.date, exception);
    }

    const authClient = await getAuthClient();
    const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

    // Googleカレンダーから予定を取得
    const response = await calendar.freebusy.query({
      auth: authClient as any,
      requestBody: {
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        timeZone: "Asia/Tokyo",
        items: [{ id: calendarId }],
      },
    });

    const busySlots = response.data.calendars?.[calendarId]?.busy || [];

    // 利用可能なスロットを計算
    const availableSlots: { date: string; slots: { start: string; end: string }[] }[] = [];
    const currentDate = new Date(startDate);

    while (currentDate < endDate) {
      const dayOfWeek = currentDate.getDay();
      const dateStr = currentDate.toISOString().split("T")[0];

      // この日が例外として無効になっていないかチェック
      const exception = exceptionMap.get(dateStr);
      if (exception && exception.type === "unavailable") {
        // 終日無効の場合はスキップ
        if (!exception.startTime && !exception.endTime) {
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }
      }

      // この曜日の設定を取得
      const daySetting = daySettings.find(d => d.dayOfWeek === dayOfWeek);

      // 予約可能な曜日かチェック
      if (daySetting && daySetting.isEnabled === 1) {
        const daySlots: { start: string; end: string }[] = [];

        // 営業時間を解析
        const [startHour, startMin] = daySetting.startTime.split(":").map(Number);
        const [endHour, endMin] = daySetting.endTime.split(":").map(Number);

        // 営業時間内のスロットを生成（1時間単位）
        for (let hour = startHour; hour < endHour; hour++) {
          const slotStart = new Date(currentDate);
          slotStart.setHours(hour, startMin || 0, 0, 0);

          const slotEnd = new Date(slotStart);
          slotEnd.setHours(hour + 1, startMin || 0, 0, 0);

          // 過去の時間はスキップ
          if (slotStart <= now) {
            continue;
          }

          // 例外で部分的に無効な時間帯かチェック
          if (exception && exception.startTime && exception.endTime) {
            const [excStartHour] = exception.startTime.split(":").map(Number);
            const [excEndHour] = exception.endTime.split(":").map(Number);
            if (hour >= excStartHour && hour < excEndHour) {
              continue;
            }
          }

          // このスロットが予定と重なっていないかチェック
          const isAvailable = !busySlots.some((busy) => {
            const busyStart = new Date(busy.start || "");
            const busyEnd = new Date(busy.end || "");
            return slotStart < busyEnd && slotEnd > busyStart;
          });

          if (isAvailable) {
            daySlots.push({
              start: slotStart.toISOString(),
              end: slotEnd.toISOString(),
            });
          }
        }

        if (daySlots.length > 0) {
          availableSlots.push({
            date: dateStr,
            slots: daySlots,
          });
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json({
      availableSlots,
      meta: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        timezone: "Asia/Tokyo",
        slotDuration: DEFAULT_BUSINESS_HOURS.slotDuration,
      },
    });
  } catch (error) {
    console.error("Error fetching available slots:", error);
    return NextResponse.json(
      { error: "Failed to fetch available slots", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
