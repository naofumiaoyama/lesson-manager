import { Resend } from "resend";
import type { Student, Lesson } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { emailLogs } from "@/drizzle/schema";

// Resend の遅延初期化（ビルド時にエラーを回避）
let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

const FROM_EMAIL = process.env.EMAIL_FROM || "PrimaMateria <onboarding@resend.dev>";
const SUPPORT_EMAIL = "support@primamateria.co.jp";
const LOGIN_URL = "https://manager.primamateria.co.jp/login";
const COMMUNITY_URL = "https://discord.gg/primamateria";

// 共通のメールスタイル
const emailStyles = {
  container: "font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;",
  header: "color: #2563eb; font-size: 24px; margin-bottom: 24px;",
  greeting: "font-size: 16px; margin-bottom: 16px;",
  paragraph: "font-size: 16px; line-height: 1.6; margin-bottom: 16px; color: #333;",
  highlight: "background: #f3f4f6; padding: 24px; border-radius: 8px; margin: 24px 0;",
  button: "display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;",
  footer: "margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;",
};

// メールログ記録用ヘルパー
async function logEmail(
  studentId: number,
  type: string,
  subject: string,
  success: boolean
) {
  try {
    await db.insert(emailLogs).values({
      studentId,
      type: type as any,
      subject,
      status: success ? "sent" : "failed",
    });
  } catch (error) {
    console.error("Failed to log email:", error);
  }
}

export async function sendWelcomeEmail(student: Student) {
  await getResend().emails.send({
    from: FROM_EMAIL,
    to: student.email,
    subject: "【PrimaMateria】ご入会ありがとうございます",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">PrimaMateria AIプログラミングスクール</h1>

        <p>${student.name}様</p>

        <p>PrimaMateria AIプログラミングスクールへのご入会、誠にありがとうございます。</p>

        <p>近日中に担当者より初回レッスンの日程調整についてご連絡いたします。</p>

        <p>何かご不明な点がございましたら、お気軽にお問い合わせください。</p>

        <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />

        <p style="color: #6b7280; font-size: 14px;">
          PrimaMateria AIプログラミングスクール<br />
          https://primamateria.co.jp
        </p>
      </div>
    `,
  });
}

export async function sendLessonConfirmationEmail(
  student: Pick<Student, "id" | "name" | "email" | "status" | "plan" | "stripeCustomerId" | "createdAt" | "updatedAt">,
  lesson: { startTime: Date; lessonNumber: number }
) {
  const startTime = lesson.startTime;
  const formattedDate = startTime.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const formattedTime = startTime.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: student.email,
    subject: `【PrimaMateria】第${lesson.lessonNumber}回レッスンのご案内`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">PrimaMateria AIプログラミングスクール</h1>

        <p>${student.name}様</p>

        <p>第${lesson.lessonNumber}回レッスンの日程が確定しましたのでお知らせいたします。</p>

        <div style="background: #f3f4f6; padding: 24px; border-radius: 8px; margin: 24px 0;">
          <h2 style="margin-top: 0;">レッスン日時</h2>
          <p style="font-size: 18px; font-weight: bold;">${formattedDate} ${formattedTime}</p>
        </div>

        <p>当日お会いできることを楽しみにしております。</p>

        <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />

        <p style="color: #6b7280; font-size: 14px;">
          PrimaMateria AIプログラミングスクール<br />
          https://primamateria.co.jp
        </p>
      </div>
    `,
  });
}

export async function sendLessonConfirmedEmail(
  student: Student,
  lesson: Lesson
) {
  const startTime = new Date(lesson.startTime);
  const formattedDate = startTime.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const formattedTime = startTime.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: student.email,
    subject: "【PrimaMateria】初回レッスン日程のお知らせ",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">PrimaMateria AIプログラミングスクール</h1>

        <p>${student.name}様</p>

        <p>初回レッスンの日程が確定しましたのでお知らせいたします。</p>

        <div style="background: #f3f4f6; padding: 24px; border-radius: 8px; margin: 24px 0;">
          <h2 style="margin-top: 0;">レッスン日時</h2>
          <p style="font-size: 18px; font-weight: bold;">${formattedDate} ${formattedTime}</p>

          <h2>参加方法</h2>
          <p>オンライン（Google Meet）</p>
          ${lesson.meetingUrl ? `<p><a href="${lesson.meetingUrl}" style="color: #2563eb;">ミーティングに参加</a></p>` : ""}

          <h2>準備事項</h2>
          <ul>
            <li>PCまたはタブレット</li>
            <li>安定したインターネット環境</li>
            <li>筆記用具</li>
          </ul>
        </div>

        <p>当日お会いできることを楽しみにしております。</p>

        <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />

        <p style="color: #6b7280; font-size: 14px;">
          PrimaMateria AIプログラミングスクール<br />
          https://primamateria.co.jp
        </p>
      </div>
    `,
  });
}

export async function sendCommunityInviteEmail(
  student: Student,
  discordInviteUrl: string
) {
  await getResend().emails.send({
    from: FROM_EMAIL,
    to: student.email,
    subject: "【PrimaMateria】コミュニティへようこそ",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">PrimaMateria AIプログラミングスクール</h1>

        <p>${student.name}様</p>

        <p>初回レッスンのご受講、ありがとうございました。</p>

        <p>生徒専用コミュニティへの参加方法をご案内いたします。</p>

        <div style="background: #f3f4f6; padding: 24px; border-radius: 8px; margin: 24px 0;">
          <h2 style="margin-top: 0;">Discord参加リンク</h2>
          <p><a href="${discordInviteUrl}" style="color: #2563eb; font-size: 18px;">コミュニティに参加する</a></p>

          <h2>コミュニティでできること</h2>
          <ul>
            <li>他の生徒との交流</li>
            <li>質問・相談</li>
            <li>学習進捗の共有</li>
            <li>限定イベントへの参加</li>
          </ul>
        </div>

        <p>ぜひご活用ください。</p>

        <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />

        <p style="color: #6b7280; font-size: 14px;">
          PrimaMateria AIプログラミングスクール<br />
          https://primamateria.co.jp
        </p>
      </div>
    `,
  });
}

// ============================================================
// Phase 1: 入口（Entry）
// ============================================================

/**
 * 申し込み自動返信メール
 * トリガー: Stripe決済完了時
 */
export async function sendApplicationAutoReplyEmail(student: Student) {
  const subject = "【PrimaMateria】お申し込みありがとうございます";
  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: student.email,
      subject,
      html: `
        <div style="${emailStyles.container}">
          <h1 style="${emailStyles.header}">PrimaMateria AIプログラミングスクール</h1>

          <p style="${emailStyles.greeting}">${student.name}様</p>

          <p style="${emailStyles.paragraph}">
            この度は、PrimaMateria AIプログラミングスクールにお申し込みいただき、誠にありがとうございます。
          </p>

          <p style="${emailStyles.paragraph}">
            お申し込み内容を確認いたしました。<br />
            担当者より<strong>24時間以内</strong>にカウンセリング日程のご連絡をいたしますので、今しばらくお待ちください。
          </p>

          <div style="${emailStyles.highlight}">
            <h2 style="margin-top: 0; color: #2563eb;">お申し込み内容</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>プラン</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${student.plan === "monthly" ? "月額プラン" : "年額プラン"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>メールアドレス</strong></td>
                <td style="padding: 8px 0;">${student.email}</td>
              </tr>
            </table>
          </div>

          <p style="${emailStyles.paragraph}">
            ご不明な点がございましたら、お気軽にお問い合わせください。<br />
            <a href="mailto:${SUPPORT_EMAIL}" style="color: #2563eb;">${SUPPORT_EMAIL}</a>
          </p>

          <div style="${emailStyles.footer}">
            <p>
              PrimaMateria AIプログラミングスクール<br />
              <a href="https://primamateria.co.jp" style="color: #2563eb;">https://primamateria.co.jp</a>
            </p>
          </div>
        </div>
      `,
    });
    await logEmail(student.id, "application_auto_reply", subject, true);
  } catch (error) {
    console.error("Failed to send application auto reply email:", error);
    await logEmail(student.id, "application_auto_reply", subject, false);
    throw error;
  }
}

/**
 * カウンセリング前日リマインダー
 * トリガー: カウンセリング予定日の前日
 */
export async function sendCounselingReminderEmail(
  student: Student,
  counselingDate: Date
) {
  const subject = "【PrimaMateria】明日のカウンセリングについて";
  const formattedDate = counselingDate.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const formattedTime = counselingDate.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: student.email,
      subject,
      html: `
        <div style="${emailStyles.container}">
          <h1 style="${emailStyles.header}">PrimaMateria AIプログラミングスクール</h1>

          <p style="${emailStyles.greeting}">${student.name}様</p>

          <p style="${emailStyles.paragraph}">
            明日のカウンセリングについてお知らせいたします。
          </p>

          <div style="${emailStyles.highlight}">
            <h2 style="margin-top: 0; color: #2563eb;">カウンセリング日時</h2>
            <p style="font-size: 20px; font-weight: bold; margin: 16px 0;">
              ${formattedDate}<br />
              ${formattedTime}
            </p>

            <h3 style="color: #374151; margin-top: 24px;">参加方法</h3>
            <p>オンライン（Google Meet）でのご参加となります。<br />
            当日、ミーティングリンクをメールでお送りいたします。</p>

            <h3 style="color: #374151;">ご準備いただくもの</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>PC またはタブレット</li>
              <li>安定したインターネット環境</li>
              <li>ご質問やご要望（もしあれば）</li>
            </ul>
          </div>

          <p style="${emailStyles.paragraph}">
            日程変更をご希望の場合は、お早めにご連絡ください。<br />
            <a href="mailto:${SUPPORT_EMAIL}" style="color: #2563eb;">${SUPPORT_EMAIL}</a>
          </p>

          <p style="${emailStyles.paragraph}">
            明日お会いできることを楽しみにしております。
          </p>

          <div style="${emailStyles.footer}">
            <p>
              PrimaMateria AIプログラミングスクール<br />
              <a href="https://primamateria.co.jp" style="color: #2563eb;">https://primamateria.co.jp</a>
            </p>
          </div>
        </div>
      `,
    });
    await logEmail(student.id, "counseling_reminder", subject, true);
  } catch (error) {
    console.error("Failed to send counseling reminder email:", error);
    await logEmail(student.id, "counseling_reminder", subject, false);
    throw error;
  }
}

// ============================================================
// Phase 2: 導入（Onboarding）
// ============================================================

/**
 * アカウント作成完了メール
 * トリガー: 生徒アカウント作成後
 */
export async function sendAccountCreationEmail(
  student: Student,
  temporaryPassword: string
) {
  const subject = "【PrimaMateria】アカウント作成完了のお知らせ";
  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: student.email,
      subject,
      html: `
        <div style="${emailStyles.container}">
          <h1 style="${emailStyles.header}">PrimaMateria AIプログラミングスクール</h1>

          <p style="${emailStyles.greeting}">${student.name}様</p>

          <p style="${emailStyles.paragraph}">
            学習管理システムのアカウントが作成されました。<br />
            以下の情報でログインしてください。
          </p>

          <div style="${emailStyles.highlight}">
            <h2 style="margin-top: 0; color: #2563eb;">ログイン情報</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; width: 40%;"><strong>ログインURL</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                  <a href="${LOGIN_URL}" style="color: #2563eb;">${LOGIN_URL}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>メールアドレス</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${student.email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>仮パスワード</strong></td>
                <td style="padding: 8px 0; font-family: monospace; font-size: 18px;">${temporaryPassword}</td>
              </tr>
            </table>
          </div>

          <p style="${emailStyles.paragraph}; color: #dc2626;">
            <strong>⚠️ セキュリティのため、初回ログイン後にパスワードを変更してください。</strong>
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${LOGIN_URL}" style="${emailStyles.button}">ログインする</a>
          </div>

          <p style="${emailStyles.paragraph}">
            ログインできない場合は、こちらまでご連絡ください。<br />
            <a href="mailto:${SUPPORT_EMAIL}" style="color: #2563eb;">${SUPPORT_EMAIL}</a>
          </p>

          <div style="${emailStyles.footer}">
            <p>
              PrimaMateria AIプログラミングスクール<br />
              <a href="https://primamateria.co.jp" style="color: #2563eb;">https://primamateria.co.jp</a>
            </p>
          </div>
        </div>
      `,
    });
    await logEmail(student.id, "account_creation", subject, true);
  } catch (error) {
    console.error("Failed to send account creation email:", error);
    await logEmail(student.id, "account_creation", subject, false);
    throw error;
  }
}

/**
 * レッスン予約リマインダー
 * トリガー: アカウント作成後、レッスン未予約の場合（3日後）
 */
export async function sendLessonBookingReminderEmail(student: Student) {
  const subject = "【PrimaMateria】レッスンのご予約はお済みですか？";
  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: student.email,
      subject,
      html: `
        <div style="${emailStyles.container}">
          <h1 style="${emailStyles.header}">PrimaMateria AIプログラミングスクール</h1>

          <p style="${emailStyles.greeting}">${student.name}様</p>

          <p style="${emailStyles.paragraph}">
            PrimaMateria へようこそ！<br />
            まだ初回レッスンのご予約がお済みでないようです。
          </p>

          <div style="${emailStyles.highlight}">
            <h2 style="margin-top: 0; color: #2563eb;">🎯 次のステップ</h2>
            <ol style="margin: 0; padding-left: 20px; line-height: 2;">
              <li>学習管理システムにログイン</li>
              <li>「レッスン予約」メニューを選択</li>
              <li>ご都合の良い日時を選択</li>
            </ol>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${LOGIN_URL}" style="${emailStyles.button}">今すぐ予約する</a>
          </div>

          <p style="${emailStyles.paragraph}">
            ご予約方法がわからない場合は、担当講師がサポートいたしますので、お気軽にご連絡ください。<br />
            <a href="mailto:${SUPPORT_EMAIL}" style="color: #2563eb;">${SUPPORT_EMAIL}</a>
          </p>

          <div style="${emailStyles.footer}">
            <p>
              PrimaMateria AIプログラミングスクール<br />
              <a href="https://primamateria.co.jp" style="color: #2563eb;">https://primamateria.co.jp</a>
            </p>
          </div>
        </div>
      `,
    });
    await logEmail(student.id, "lesson_booking_reminder", subject, true);
  } catch (error) {
    console.error("Failed to send lesson booking reminder email:", error);
    await logEmail(student.id, "lesson_booking_reminder", subject, false);
    throw error;
  }
}

/**
 * レッスン前日リマインダー
 * トリガー: レッスン予定日の前日
 */
export async function sendLessonDayBeforeReminderEmail(
  student: Student,
  lesson: Lesson,
  meetingUrl?: string
) {
  const subject = `【PrimaMateria】明日は第${lesson.lessonNumber}回レッスンです`;
  const startTime = new Date(lesson.startTime);
  const formattedDate = startTime.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const formattedTime = startTime.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: student.email,
      subject,
      html: `
        <div style="${emailStyles.container}">
          <h1 style="${emailStyles.header}">PrimaMateria AIプログラミングスクール</h1>

          <p style="${emailStyles.greeting}">${student.name}様</p>

          <p style="${emailStyles.paragraph}">
            明日のレッスンについてお知らせいたします。
          </p>

          <div style="${emailStyles.highlight}">
            <h2 style="margin-top: 0; color: #2563eb;">第${lesson.lessonNumber}回レッスン</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; width: 30%;"><strong>日時</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                  ${formattedDate}<br />
                  ${formattedTime}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>参加方法</strong></td>
                <td style="padding: 8px 0;">オンライン（Google Meet）</td>
              </tr>
            </table>
            ${meetingUrl ? `
              <div style="text-align: center; margin-top: 24px;">
                <a href="${meetingUrl}" style="${emailStyles.button}">ミーティングに参加</a>
              </div>
            ` : ""}
          </div>

          <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 24px 0;">
            <h3 style="margin-top: 0; color: #92400e;">📝 当日までにご確認ください</h3>
            <ul style="margin: 0; padding-left: 20px; color: #92400e;">
              <li>前回の学習内容の復習</li>
              <li>質問や相談したいことのメモ</li>
              <li>PCとインターネット環境の確認</li>
            </ul>
          </div>

          <p style="${emailStyles.paragraph}">
            ご都合が悪くなった場合は、お早めにご連絡ください。<br />
            <a href="mailto:${SUPPORT_EMAIL}" style="color: #2563eb;">${SUPPORT_EMAIL}</a>
          </p>

          <p style="${emailStyles.paragraph}">
            明日お会いできることを楽しみにしております！
          </p>

          <div style="${emailStyles.footer}">
            <p>
              PrimaMateria AIプログラミングスクール<br />
              <a href="https://primamateria.co.jp" style="color: #2563eb;">https://primamateria.co.jp</a>
            </p>
          </div>
        </div>
      `,
    });
    await logEmail(student.id, "lesson_day_before_reminder", subject, true);
  } catch (error) {
    console.error("Failed to send lesson day before reminder email:", error);
    await logEmail(student.id, "lesson_day_before_reminder", subject, false);
    throw error;
  }
}

// ============================================================
// Phase 3: 学習・コミュニティ（Learning & Community）
// ============================================================

/**
 * 週次学習目標メール
 * トリガー: 毎週月曜日
 */
export async function sendWeeklyLearningGoalsEmail(
  student: Student,
  weeklyGoals: string[],
  lastWeekProgress?: { completed: number; total: number }
) {
  const subject = "【PrimaMateria】今週の学習目標";
  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: student.email,
      subject,
      html: `
        <div style="${emailStyles.container}">
          <h1 style="${emailStyles.header}">PrimaMateria AIプログラミングスクール</h1>

          <p style="${emailStyles.greeting}">${student.name}様</p>

          <p style="${emailStyles.paragraph}">
            今週も一緒に頑張りましょう！<br />
            今週の学習目標をお知らせします。
          </p>

          ${lastWeekProgress ? `
            <div style="background: #dcfce7; padding: 16px; border-radius: 8px; margin: 24px 0;">
              <h3 style="margin-top: 0; color: #166534;">📊 先週の振り返り</h3>
              <p style="color: #166534; font-size: 24px; font-weight: bold; margin: 8px 0;">
                ${lastWeekProgress.completed} / ${lastWeekProgress.total} 達成
              </p>
              <p style="color: #166534; margin: 0;">
                ${lastWeekProgress.completed === lastWeekProgress.total
                  ? "素晴らしい！全ての目標を達成しました！🎉"
                  : "良いペースです。今週も頑張りましょう！"}
              </p>
            </div>
          ` : ""}

          <div style="${emailStyles.highlight}">
            <h2 style="margin-top: 0; color: #2563eb;">🎯 今週の目標</h2>
            <ul style="margin: 0; padding-left: 20px; line-height: 2;">
              ${weeklyGoals.map(goal => `<li>${goal}</li>`).join("")}
            </ul>
          </div>

          <p style="${emailStyles.paragraph}">
            分からないことがあれば、いつでもDiscordコミュニティで質問してください！
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${LOGIN_URL}" style="${emailStyles.button}">学習を始める</a>
          </div>

          <div style="${emailStyles.footer}">
            <p>
              PrimaMateria AIプログラミングスクール<br />
              <a href="https://primamateria.co.jp" style="color: #2563eb;">https://primamateria.co.jp</a>
            </p>
          </div>
        </div>
      `,
    });
    await logEmail(student.id, "weekly_learning_goals", subject, true);
  } catch (error) {
    console.error("Failed to send weekly learning goals email:", error);
    await logEmail(student.id, "weekly_learning_goals", subject, false);
    throw error;
  }
}

/**
 * 月次進捗レポート
 * トリガー: 毎月1日
 */
export async function sendMonthlyProgressReportEmail(
  student: Student,
  report: {
    month: string;
    lessonsCompleted: number;
    lessonsTotal: number;
    topicsLearned: string[];
    nextMonthGoals: string[];
    instructorComment?: string;
  }
) {
  const subject = `【PrimaMateria】${report.month}の学習レポート`;
  const completionRate = Math.round((report.lessonsCompleted / report.lessonsTotal) * 100);

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: student.email,
      subject,
      html: `
        <div style="${emailStyles.container}">
          <h1 style="${emailStyles.header}">PrimaMateria AIプログラミングスクール</h1>

          <p style="${emailStyles.greeting}">${student.name}様</p>

          <p style="${emailStyles.paragraph}">
            ${report.month}の学習お疲れ様でした！<br />
            月次レポートをお届けします。
          </p>

          <div style="${emailStyles.highlight}">
            <h2 style="margin-top: 0; color: #2563eb;">📊 ${report.month}の実績</h2>

            <div style="display: flex; justify-content: space-around; text-align: center; margin: 24px 0;">
              <div>
                <p style="font-size: 36px; font-weight: bold; color: #2563eb; margin: 0;">
                  ${report.lessonsCompleted}
                </p>
                <p style="color: #6b7280; margin: 0;">レッスン完了</p>
              </div>
              <div>
                <p style="font-size: 36px; font-weight: bold; color: #2563eb; margin: 0;">
                  ${completionRate}%
                </p>
                <p style="color: #6b7280; margin: 0;">達成率</p>
              </div>
            </div>

            <h3 style="color: #374151;">学習したトピック</h3>
            <ul style="margin: 0; padding-left: 20px;">
              ${report.topicsLearned.map(topic => `<li>${topic}</li>`).join("")}
            </ul>
          </div>

          ${report.instructorComment ? `
            <div style="background: #eff6ff; padding: 16px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #2563eb;">
              <h3 style="margin-top: 0; color: #1e40af;">💬 講師からのコメント</h3>
              <p style="color: #1e40af; margin: 0; font-style: italic;">
                "${report.instructorComment}"
              </p>
            </div>
          ` : ""}

          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 24px 0;">
            <h3 style="margin-top: 0; color: #374151;">🚀 来月の目標</h3>
            <ul style="margin: 0; padding-left: 20px;">
              ${report.nextMonthGoals.map(goal => `<li>${goal}</li>`).join("")}
            </ul>
          </div>

          <p style="${emailStyles.paragraph}">
            来月も一緒に頑張りましょう！
          </p>

          <div style="${emailStyles.footer}">
            <p>
              PrimaMateria AIプログラミングスクール<br />
              <a href="https://primamateria.co.jp" style="color: #2563eb;">https://primamateria.co.jp</a>
            </p>
          </div>
        </div>
      `,
    });
    await logEmail(student.id, "monthly_progress_report", subject, true);
  } catch (error) {
    console.error("Failed to send monthly progress report email:", error);
    await logEmail(student.id, "monthly_progress_report", subject, false);
    throw error;
  }
}

// ============================================================
// Phase 4: 異常検知（Anomaly Detection）
// ============================================================

/**
 * ログインなしチェックインメール
 * トリガー: 3日以上ログインがない場合
 */
export async function sendCheckinAfterNoLoginEmail(
  student: Student,
  daysSinceLastLogin: number
) {
  const subject = "【PrimaMateria】最近の学習状況はいかがですか？";
  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: student.email,
      subject,
      html: `
        <div style="${emailStyles.container}">
          <h1 style="${emailStyles.header}">PrimaMateria AIプログラミングスクール</h1>

          <p style="${emailStyles.greeting}">${student.name}様</p>

          <p style="${emailStyles.paragraph}">
            お元気ですか？<br />
            最近、学習管理システムへのログインがないようでしたので、ご連絡いたしました。
          </p>

          <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0; color: #92400e;">
              前回のログインから <strong>${daysSinceLastLogin}日</strong> 経過しています。
            </p>
          </div>

          <p style="${emailStyles.paragraph}">
            学習でお困りのことはありませんか？<br />
            以下のようなサポートが可能です：
          </p>

          <ul style="line-height: 2; color: #333;">
            <li>学習ペースの見直し・調整</li>
            <li>わからない箇所の個別サポート</li>
            <li>レッスン日程の変更</li>
            <li>その他、お困りごとの相談</li>
          </ul>

          <p style="${emailStyles.paragraph}">
            遠慮なくご相談ください。一緒に解決策を考えましょう。
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="mailto:${SUPPORT_EMAIL}?subject=学習について相談" style="${emailStyles.button}">サポートに連絡する</a>
          </div>

          <p style="${emailStyles.paragraph}">
            または、Discordコミュニティでも気軽に相談できます：<br />
            <a href="${COMMUNITY_URL}" style="color: #2563eb;">${COMMUNITY_URL}</a>
          </p>

          <div style="${emailStyles.footer}">
            <p>
              PrimaMateria AIプログラミングスクール<br />
              <a href="https://primamateria.co.jp" style="color: #2563eb;">https://primamateria.co.jp</a>
            </p>
          </div>
        </div>
      `,
    });
    await logEmail(student.id, "checkin_after_no_login", subject, true);
  } catch (error) {
    console.error("Failed to send check-in email:", error);
    await logEmail(student.id, "checkin_after_no_login", subject, false);
    throw error;
  }
}

/**
 * 中間アンケートメール
 * トリガー: 入会から1ヶ月後
 */
export async function sendMidtermSurveyEmail(
  student: Student,
  surveyUrl: string
) {
  const subject = "【PrimaMateria】1ヶ月間ありがとうございます - ご意見をお聞かせください";
  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: student.email,
      subject,
      html: `
        <div style="${emailStyles.container}">
          <h1 style="${emailStyles.header}">PrimaMateria AIプログラミングスクール</h1>

          <p style="${emailStyles.greeting}">${student.name}様</p>

          <p style="${emailStyles.paragraph}">
            PrimaMateria にご入会いただいてから1ヶ月が経ちました。<br />
            いつもご利用いただき、ありがとうございます。
          </p>

          <p style="${emailStyles.paragraph}">
            より良いサービスをご提供するため、簡単なアンケートにご協力いただけますでしょうか。<br />
            <strong>所要時間は約3分</strong>です。
          </p>

          <div style="${emailStyles.highlight}">
            <h2 style="margin-top: 0; color: #2563eb; text-align: center;">📝 中間アンケート</h2>
            <p style="text-align: center; color: #6b7280;">
              レッスンの満足度や改善してほしい点などをお聞かせください。
            </p>
            <div style="text-align: center; margin-top: 24px;">
              <a href="${surveyUrl}" style="${emailStyles.button}">アンケートに回答する</a>
            </div>
          </div>

          <p style="${emailStyles.paragraph}">
            いただいたご意見は、サービス改善に活用させていただきます。<br />
            ご協力よろしくお願いいたします。
          </p>

          <div style="${emailStyles.footer}">
            <p>
              PrimaMateria AIプログラミングスクール<br />
              <a href="https://primamateria.co.jp" style="color: #2563eb;">https://primamateria.co.jp</a>
            </p>
          </div>
        </div>
      `,
    });
    await logEmail(student.id, "midterm_survey", subject, true);
  } catch (error) {
    console.error("Failed to send midterm survey email:", error);
    await logEmail(student.id, "midterm_survey", subject, false);
    throw error;
  }
}

// ============================================================
// 決済関連
// ============================================================

/**
 * 支払い失敗通知メール
 * トリガー: Stripe invoice.payment_failed イベント
 */
export async function sendPaymentFailedEmail(student: Student) {
  const subject = "【PrimaMateria】お支払いに関するお知らせ";
  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: student.email,
      subject,
      html: `
        <div style="${emailStyles.container}">
          <h1 style="${emailStyles.header}">PrimaMateria AIプログラミングスクール</h1>

          <p style="${emailStyles.greeting}">${student.name}様</p>

          <p style="${emailStyles.paragraph}">
            お支払いの処理に失敗しました。<br />
            お手数ですが、登録されているお支払い情報をご確認ください。
          </p>

          <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #dc2626;">
            <h3 style="margin-top: 0; color: #dc2626;">⚠️ ご確認ください</h3>
            <ul style="margin: 0; padding-left: 20px; color: #7f1d1d;">
              <li>クレジットカードの有効期限</li>
              <li>利用限度額</li>
              <li>カード会社の承認状況</li>
            </ul>
          </div>

          <p style="${emailStyles.paragraph}">
            お支払い情報の更新は、以下のリンクから行えます。
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${LOGIN_URL}" style="${emailStyles.button}">お支払い情報を確認する</a>
          </div>

          <p style="${emailStyles.paragraph}">
            ご不明な点がございましたら、お気軽にお問い合わせください。<br />
            <a href="mailto:${SUPPORT_EMAIL}" style="color: #2563eb;">${SUPPORT_EMAIL}</a>
          </p>

          <div style="${emailStyles.footer}">
            <p>
              PrimaMateria AIプログラミングスクール<br />
              <a href="https://primamateria.co.jp" style="color: #2563eb;">https://primamateria.co.jp</a>
            </p>
          </div>
        </div>
      `,
    });
    await logEmail(student.id, "reminder", subject, true);
  } catch (error) {
    console.error("Failed to send payment failed email:", error);
    await logEmail(student.id, "reminder", subject, false);
    throw error;
  }
}
