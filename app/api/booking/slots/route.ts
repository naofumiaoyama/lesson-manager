import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

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

// 営業時間設定
const BUSINESS_HOURS = {
  start: 10, // 10:00
  end: 21,   // 21:00
  slotDuration: 60, // 60分
  bufferTime: 0, // 予約間のバッファ
};

// 予約可能な曜日（0=日曜, 1=月曜, ...）
const AVAILABLE_DAYS = [1, 2, 3, 4, 5, 6]; // 月〜土

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

      // 予約可能な曜日かチェック
      if (AVAILABLE_DAYS.includes(dayOfWeek)) {
        const dateStr = currentDate.toISOString().split("T")[0];
        const daySlots: { start: string; end: string }[] = [];

        // 営業時間内のスロットを生成
        for (let hour = BUSINESS_HOURS.start; hour < BUSINESS_HOURS.end; hour++) {
          const slotStart = new Date(currentDate);
          slotStart.setHours(hour, 0, 0, 0);

          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + BUSINESS_HOURS.slotDuration);

          // 過去の時間はスキップ
          if (slotStart <= now) {
            continue;
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
        slotDuration: BUSINESS_HOURS.slotDuration,
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
