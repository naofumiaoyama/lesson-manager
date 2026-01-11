import { google, calendar_v3 } from "googleapis";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NEXTAUTH_URL
);

const calendar = google.calendar({ version: "v3" });

/**
 * OAuth認証クライアントを取得
 * アクセストークンを設定して返す
 */
function getAuthClient(accessToken?: string) {
  if (accessToken) {
    oauth2Client.setCredentials({ access_token: accessToken });
    return oauth2Client;
  }

  // サービスアカウントキーがある場合はそれを使用
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
    return auth;
  }

  // どちらもない場合はOAuth2クライアントを返す（エラーになる可能性あり）
  return oauth2Client;
}

export interface LessonEventParams {
  studentName: string;
  studentEmail: string;
  adminName: string;
  adminEmail: string;
  startTime: Date;
  endTime: Date;
  lessonNumber: number;
  meetingUrl?: string;
  description?: string;
  accessToken?: string;
}

/**
 * レッスンのカレンダーイベントを作成
 */
export async function createLessonEvent(
  params: LessonEventParams
): Promise<calendar_v3.Schema$Event> {
  const {
    studentName,
    studentEmail,
    adminName,
    adminEmail,
    startTime,
    endTime,
    lessonNumber,
    meetingUrl,
    description,
    accessToken,
  } = params;

  const authClient = getAuthClient(accessToken);

  const event: calendar_v3.Schema$Event = {
    summary: `【PrimaMateria】${studentName}様 第${lessonNumber}回レッスン`,
    description: description || generateLessonDescription(params),
    start: {
      dateTime: startTime.toISOString(),
      timeZone: "Asia/Tokyo",
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: "Asia/Tokyo",
    },
    attendees: [
      { email: studentEmail, displayName: studentName },
      { email: adminEmail, displayName: adminName },
    ],
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 24 * 60 }, // 1日前
        { method: "popup", minutes: 30 }, // 30分前
      ],
    },
  };

  // Google Meet URLがある場合は追加
  if (meetingUrl) {
    event.conferenceData = {
      entryPoints: [
        {
          entryPointType: "video",
          uri: meetingUrl,
          label: "Google Meet",
        },
      ],
    };
  }

  const response = await calendar.events.insert({
    auth: authClient as any,
    calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
    requestBody: event,
    sendUpdates: "all", // 参加者に通知を送信
  });

  return response.data;
}

/**
 * カレンダーイベントを更新
 */
export async function updateLessonEvent(
  eventId: string,
  params: Partial<LessonEventParams>
): Promise<calendar_v3.Schema$Event> {
  const authClient = getAuthClient(params.accessToken);

  const updateData: calendar_v3.Schema$Event = {};

  if (params.startTime) {
    updateData.start = {
      dateTime: params.startTime.toISOString(),
      timeZone: "Asia/Tokyo",
    };
  }

  if (params.endTime) {
    updateData.end = {
      dateTime: params.endTime.toISOString(),
      timeZone: "Asia/Tokyo",
    };
  }

  if (params.studentName && params.lessonNumber) {
    updateData.summary = `【PrimaMateria】${params.studentName}様 第${params.lessonNumber}回レッスン`;
  }

  if (params.description) {
    updateData.description = params.description;
  }

  const response = await calendar.events.patch({
    auth: authClient as any,
    calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
    eventId,
    requestBody: updateData,
    sendUpdates: "all",
  });

  return response.data;
}

/**
 * カレンダーイベントを削除
 */
export async function deleteLessonEvent(
  eventId: string,
  accessToken?: string
): Promise<void> {
  const authClient = getAuthClient(accessToken);

  await calendar.events.delete({
    auth: authClient as any,
    calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
    eventId,
    sendUpdates: "all",
  });
}

/**
 * 利用可能な時間枠を取得
 */
export async function getAvailableSlots(
  startDate: Date,
  endDate: Date,
  accessToken?: string
): Promise<{ start: Date; end: Date }[]> {
  const authClient = getAuthClient(accessToken);

  const response = await calendar.freebusy.query({
    auth: authClient as any,
    requestBody: {
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      timeZone: "Asia/Tokyo",
      items: [{ id: process.env.GOOGLE_CALENDAR_ID || "primary" }],
    },
  });

  const busySlots =
    response.data.calendars?.[process.env.GOOGLE_CALENDAR_ID || "primary"]
      ?.busy || [];

  // 営業時間（9:00-21:00）内で空いている時間を計算
  const availableSlots: { start: Date; end: Date }[] = [];
  const currentDate = new Date(startDate);

  while (currentDate < endDate) {
    const dayStart = new Date(currentDate);
    dayStart.setHours(9, 0, 0, 0);
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(21, 0, 0, 0);

    // 1時間ごとのスロットを作成
    for (let hour = 9; hour < 21; hour++) {
      const slotStart = new Date(currentDate);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(currentDate);
      slotEnd.setHours(hour + 1, 0, 0, 0);

      // このスロットがbusyスロットと重なっていないか確認
      const isAvailable = !busySlots.some((busy) => {
        const busyStart = new Date(busy.start || "");
        const busyEnd = new Date(busy.end || "");
        return slotStart < busyEnd && slotEnd > busyStart;
      });

      if (isAvailable) {
        availableSlots.push({ start: slotStart, end: slotEnd });
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return availableSlots;
}

/**
 * レッスン説明文を生成
 */
function generateLessonDescription(params: LessonEventParams): string {
  const { studentName, lessonNumber, meetingUrl } = params;

  let description = `PrimaMateria AIプログラミングスクール
第${lessonNumber}回レッスン

【生徒】${studentName}様

`;

  if (meetingUrl) {
    description += `【ミーティングURL】
${meetingUrl}

`;
  }

  description += `---
このレッスンはPrimaMateria AIプログラミングスクールのレッスンです。
ご不明な点がございましたら、お気軽にお問い合わせください。`;

  return description;
}

/**
 * カレンダーイベントを取得
 */
export async function getCalendarEvents(
  startDate: Date,
  endDate: Date,
  accessToken?: string,
  calendarId?: string
): Promise<calendar_v3.Schema$Event[]> {
  const authClient = getAuthClient(accessToken);

  const response = await calendar.events.list({
    auth: authClient as any,
    calendarId: calendarId || process.env.GOOGLE_CALENDAR_ID || "primary",
    timeMin: startDate.toISOString(),
    timeMax: endDate.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    timeZone: "Asia/Tokyo",
  });

  return response.data.items || [];
}

/**
 * 特定の生徒のレッスンイベントを取得
 */
export async function getStudentLessonEvents(
  studentEmail: string,
  startDate: Date,
  endDate: Date,
  accessToken?: string
): Promise<calendar_v3.Schema$Event[]> {
  const events = await getCalendarEvents(startDate, endDate, accessToken);

  // 生徒がattendeeに含まれているイベントをフィルタ
  return events.filter((event) =>
    event.attendees?.some((attendee) => attendee.email === studentEmail)
  );
}

export interface CommunityEventParams {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  meetingUrl?: string;
  attendeeEmails?: string[];
  isRecurring?: boolean;
  recurrenceRule?: string; // e.g., "RRULE:FREQ=WEEKLY;BYDAY=SA"
  accessToken?: string;
}

/**
 * コミュニティイベントを作成
 */
export async function createCommunityEvent(
  params: CommunityEventParams
): Promise<calendar_v3.Schema$Event> {
  const {
    title,
    description,
    startTime,
    endTime,
    meetingUrl,
    attendeeEmails,
    recurrenceRule,
    accessToken,
  } = params;

  const authClient = getAuthClient(accessToken);

  const event: calendar_v3.Schema$Event = {
    summary: `【PrimaMateria】${title}`,
    description: `${description}

---
PrimaMateria AIプログラミングスクール
コミュニティイベント`,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: "Asia/Tokyo",
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: "Asia/Tokyo",
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 24 * 60 }, // 1日前
        { method: "popup", minutes: 60 }, // 1時間前
      ],
    },
  };

  // 繰り返し設定
  if (recurrenceRule) {
    event.recurrence = [recurrenceRule];
  }

  // 参加者
  if (attendeeEmails && attendeeEmails.length > 0) {
    event.attendees = attendeeEmails.map((email) => ({ email }));
  }

  // Google Meet URL
  if (meetingUrl) {
    event.conferenceData = {
      entryPoints: [
        {
          entryPointType: "video",
          uri: meetingUrl,
          label: "Google Meet",
        },
      ],
    };
  }

  const response = await calendar.events.insert({
    auth: authClient as any,
    calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
    requestBody: event,
    sendUpdates: attendeeEmails && attendeeEmails.length > 0 ? "all" : "none",
  });

  return response.data;
}

/**
 * キックオフレッスン（初回レッスン）のイベントを作成
 */
export async function createKickoffLessonEvent(
  params: Omit<LessonEventParams, "lessonNumber">
): Promise<calendar_v3.Schema$Event> {
  return createLessonEvent({
    ...params,
    lessonNumber: 1,
    description: `PrimaMateria AIプログラミングスクール
【キックオフレッスン（初回）】

【生徒】${params.studentName}様

このレッスンでは以下の内容を行います：
・学習プラットフォームの使い方
・学習計画の確認
・目標設定
・質疑応答

${params.meetingUrl ? `【ミーティングURL】\n${params.meetingUrl}\n` : ""}
---
ご不明な点がございましたら、お気軽にお問い合わせください。`,
  });
}

export { oauth2Client };
