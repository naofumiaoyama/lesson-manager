import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { z } from "zod/v4";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

async function getAuthClient() {
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });
    return oauth2Client;
  }

  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
    return auth;
  }

  throw new Error("No authentication method available");
}

const calendar = google.calendar({ version: "v3" });

const bookingSchema = z.object({
  name: z.string().min(1, "お名前を入力してください"),
  email: z.string().email("正しいメールアドレスを入力してください"),
  phone: z.string().optional(),
  company: z.string().optional(),
  message: z.string().optional(),
  slotStart: z.string(),
  slotEnd: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "入力内容を確認してください", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, email, phone, company, message, slotStart, slotEnd } = parsed.data;

    const startTime = new Date(slotStart);
    const endTime = new Date(slotEnd);

    // 過去の日時はエラー
    if (startTime <= new Date()) {
      return NextResponse.json(
        { error: "選択された日時は予約できません" },
        { status: 400 }
      );
    }

    const authClient = await getAuthClient();
    const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

    // 再度空き状況を確認（競合チェック）
    const freebusyResponse = await calendar.freebusy.query({
      auth: authClient as any,
      requestBody: {
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        timeZone: "Asia/Tokyo",
        items: [{ id: calendarId }],
      },
    });

    const busySlots = freebusyResponse.data.calendars?.[calendarId]?.busy || [];
    if (busySlots.length > 0) {
      return NextResponse.json(
        { error: "申し訳ございません。選択された時間は既に予約が入っています。別の時間をお選びください。" },
        { status: 409 }
      );
    }

    // Googleカレンダーにイベントを作成
    const formattedDate = startTime.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
      timeZone: "Asia/Tokyo",
    });
    const formattedTime = startTime.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tokyo",
    });

    const event = await calendar.events.insert({
      auth: authClient as any,
      calendarId,
      conferenceDataVersion: 1,
      requestBody: {
        summary: `【無料相談】${name}様${company ? ` (${company})` : ""}`,
        description: `■ お名前: ${name}
■ メール: ${email}
${phone ? `■ 電話: ${phone}\n` : ""}${company ? `■ 会社名: ${company}\n` : ""}${message ? `■ ご相談内容:\n${message}` : ""}

---
PrimaMateria AIプログラミングスクール
無料相談予約`,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: "Asia/Tokyo",
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: "Asia/Tokyo",
        },
        attendees: [
          { email, displayName: name },
          { email: process.env.ADMIN_EMAIL || "naofumi.aoyama@primamateria.co.jp" },
        ],
        conferenceData: {
          createRequest: {
            requestId: `booking-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 }, // 1日前
            { method: "popup", minutes: 30 }, // 30分前
          ],
        },
      },
    });

    const meetingUrl = event.data.conferenceData?.entryPoints?.[0]?.uri || event.data.hangoutLink;

    // 確認メールを送信
    try {
      const fromEmail = process.env.EMAIL_FROM || "PrimaMateria <onboarding@resend.dev>";
      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: "【PrimaMateria】無料相談のご予約を承りました",
        html: `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2563eb; font-size: 24px; margin-bottom: 24px;">
              PrimaMateria AIプログラミングスクール
            </h1>

            <p style="font-size: 16px; margin-bottom: 16px;">${name}様</p>

            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
              無料相談のご予約ありがとうございます。<br />
              以下の日時でご予約を承りました。
            </p>

            <div style="background: #f3f4f6; padding: 24px; border-radius: 8px; margin: 24px 0;">
              <h2 style="margin-top: 0; color: #2563eb;">ご予約内容</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; width: 30%;"><strong>日時</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    ${formattedDate}<br />
                    ${formattedTime}〜（約60分）
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>形式</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">オンライン（Google Meet）</td>
                </tr>
                ${meetingUrl ? `
                <tr>
                  <td style="padding: 8px 0;"><strong>参加URL</strong></td>
                  <td style="padding: 8px 0;">
                    <a href="${meetingUrl}" style="color: #2563eb;">${meetingUrl}</a>
                  </td>
                </tr>
                ` : ""}
              </table>
            </div>

            ${meetingUrl ? `
            <div style="text-align: center; margin: 32px 0;">
              <a href="${meetingUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Google Meetに参加
              </a>
            </div>
            ` : ""}

            <div style="text-align: center; margin: 24px 0;">
              <a href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`【無料相談】PrimaMateria AIプログラミングスクール`)}&dates=${startTime.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}/${endTime.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}&details=${encodeURIComponent(`PrimaMateria AIプログラミングスクール 無料相談\n\n参加URL: ${meetingUrl || "後日お送りします"}\n\n■ 当日のご準備\n・PC またはタブレット\n・安定したインターネット環境\n・ご質問やご相談内容のメモ（あれば）`)}&location=${encodeURIComponent(meetingUrl || "オンライン")}" target="_blank" style="display: inline-block; background-color: #4285f4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                📅 Googleカレンダーに追加
              </a>
            </div>

            <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 24px 0;">
              <h3 style="margin-top: 0; color: #92400e;">当日のご準備</h3>
              <ul style="margin: 0; padding-left: 20px; color: #92400e;">
                <li>PC またはタブレット</li>
                <li>安定したインターネット環境</li>
                <li>ご質問やご相談内容のメモ（あれば）</li>
              </ul>
            </div>

            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
              ご都合が悪くなった場合は、お早めにご連絡ください。<br />
              <a href="mailto:support@primamateria.co.jp" style="color: #2563eb;">support@primamateria.co.jp</a>
            </p>

            <p style="font-size: 16px; line-height: 1.6;">
              当日お会いできることを楽しみにしております。
            </p>

            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
              <p>
                PrimaMateria AIプログラミングスクール<br />
                <a href="https://primamateria.co.jp" style="color: #2563eb;">https://primamateria.co.jp</a>
              </p>
            </div>
          </div>
        `,
      });

      // 管理者にも通知
      await resend.emails.send({
        from: fromEmail,
        to: process.env.ADMIN_EMAIL || "naofumi.aoyama@primamateria.co.jp",
        subject: `【新規予約】${name}様 - ${formattedDate} ${formattedTime}`,
        html: `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2563eb; font-size: 24px; margin-bottom: 24px;">
              新規無料相談予約
            </h1>

            <div style="background: #f3f4f6; padding: 24px; border-radius: 8px; margin: 24px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; width: 30%;"><strong>お名前</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>メール</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${email}</td>
                </tr>
                ${phone ? `
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>電話番号</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${phone}</td>
                </tr>
                ` : ""}
                ${company ? `
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>会社名</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${company}</td>
                </tr>
                ` : ""}
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>日時</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${formattedDate} ${formattedTime}</td>
                </tr>
                ${meetingUrl ? `
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Meet URL</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <a href="${meetingUrl}">${meetingUrl}</a>
                  </td>
                </tr>
                ` : ""}
              </table>

              ${message ? `
              <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                <strong>ご相談内容:</strong>
                <p style="margin-top: 8px; white-space: pre-wrap;">${message}</p>
              </div>
              ` : ""}
            </div>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
      console.error("Email error details:", JSON.stringify(emailError, null, 2));
      // メール送信失敗でも予約自体は成功とする
    }

    return NextResponse.json({
      success: true,
      message: "ご予約を承りました",
      booking: {
        id: event.data.id,
        date: formattedDate,
        time: formattedTime,
        meetingUrl,
      },
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    return NextResponse.json(
      { error: "予約の作成に失敗しました", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
