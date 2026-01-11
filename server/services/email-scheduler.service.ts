/**
 * メール自動送信スケジューラー
 *
 * このサービスは以下のトリガーでメールを自動送信します：
 *
 * Phase 1: 入口
 * - 申し込み自動返信: Stripe Webhook で処理
 * - カウンセリング前日リマインダー: 毎日チェック
 *
 * Phase 2: 導入
 * - アカウント作成完了: 管理者がアカウント作成時
 * - レッスン予約リマインダー: アカウント作成後3日、レッスン未予約
 * - レッスン前日リマインダー: 毎日チェック
 *
 * Phase 3: 学習・コミュニティ
 * - 週次学習目標: 毎週月曜日
 * - 月次進捗レポート: 毎月1日
 *
 * Phase 4: 異常検知
 * - ログインなしチェックイン: 3日以上ログインなし
 * - 中間アンケート: 入会から1ヶ月後
 */

import { db } from "@/lib/db";
import { students, lessons, emailLogs } from "@/drizzle/schema";
import { eq, and, lt, gte, isNull, sql } from "drizzle-orm";
import {
  sendCounselingReminderEmail,
  sendLessonBookingReminderEmail,
  sendLessonDayBeforeReminderEmail,
  sendWeeklyLearningGoalsEmail,
  sendMonthlyProgressReportEmail,
  sendCheckinAfterNoLoginEmail,
  sendMidtermSurveyEmail,
} from "./mail.service";

// 日付ヘルパー関数
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * 翌日のレッスンに対してリマインダーを送信
 */
export async function sendLessonDayBeforeReminders() {
  const tomorrow = addDays(new Date(), 1);
  const tomorrowStart = startOfDay(tomorrow);
  const tomorrowEnd = endOfDay(tomorrow);

  try {
    // 翌日のレッスンを取得
    const tomorrowLessons = await db
      .select({
        lesson: lessons,
        student: students,
      })
      .from(lessons)
      .innerJoin(students, eq(lessons.studentId, students.id))
      .where(
        and(
          gte(lessons.startTime, tomorrowStart),
          lt(lessons.startTime, tomorrowEnd),
          eq(lessons.status, "scheduled")
        )
      );

    console.log(`Found ${tomorrowLessons.length} lessons for tomorrow`);

    for (const { lesson, student } of tomorrowLessons) {
      // 既に送信済みかチェック
      const existingLog = await db
        .select()
        .from(emailLogs)
        .where(
          and(
            eq(emailLogs.studentId, student.id),
            eq(emailLogs.type, "lesson_day_before_reminder"),
            gte(emailLogs.sentAt, startOfDay(new Date()))
          )
        )
        .limit(1);

      if (existingLog.length === 0) {
        try {
          await sendLessonDayBeforeReminderEmail(
            student,
            lesson,
            lesson.meetingUrl || undefined
          );
          console.log(`Sent lesson reminder to ${student.email}`);
        } catch (error) {
          console.error(`Failed to send lesson reminder to ${student.email}:`, error);
        }
      }
    }
  } catch (error) {
    console.error("Error in sendLessonDayBeforeReminders:", error);
  }
}

/**
 * アカウント作成後3日経過してレッスン未予約の生徒にリマインダー
 */
export async function sendLessonBookingReminders() {
  const threeDaysAgo = addDays(new Date(), -3);

  try {
    // 3日前にアカウント作成された生徒で、レッスンがない人を取得
    const studentsWithoutLessons = await db
      .select({ student: students })
      .from(students)
      .leftJoin(lessons, eq(students.id, lessons.studentId))
      .where(
        and(
          eq(students.status, "active"),
          lt(students.createdAt, threeDaysAgo),
          isNull(lessons.id)
        )
      )
      .groupBy(students.id);

    console.log(`Found ${studentsWithoutLessons.length} students without lessons`);

    for (const { student } of studentsWithoutLessons) {
      // 既に送信済みかチェック（7日以内）
      const existingLog = await db
        .select()
        .from(emailLogs)
        .where(
          and(
            eq(emailLogs.studentId, student.id),
            eq(emailLogs.type, "lesson_booking_reminder"),
            gte(emailLogs.sentAt, addDays(new Date(), -7))
          )
        )
        .limit(1);

      if (existingLog.length === 0) {
        try {
          await sendLessonBookingReminderEmail(student);
          console.log(`Sent lesson booking reminder to ${student.email}`);
        } catch (error) {
          console.error(`Failed to send lesson booking reminder to ${student.email}:`, error);
        }
      }
    }
  } catch (error) {
    console.error("Error in sendLessonBookingReminders:", error);
  }
}

/**
 * 3日以上ログインしていない生徒にチェックインメール
 * 注: last_login_at カラムが必要（未実装の場合はスキップ）
 */
export async function sendNoLoginCheckins() {
  // TODO: studentsテーブルに last_login_at カラムを追加後に実装
  console.log("sendNoLoginCheckins: Requires last_login_at column in students table");
}

/**
 * 入会から1ヶ月後の生徒に中間アンケート
 */
export async function sendMidtermSurveys() {
  const oneMonthAgo = addDays(new Date(), -30);
  const oneMonthAgoStart = startOfDay(oneMonthAgo);
  const oneMonthAgoEnd = endOfDay(oneMonthAgo);
  const surveyUrl = process.env.MIDTERM_SURVEY_URL || "https://forms.google.com/example";

  try {
    // 1ヶ月前に入会した生徒を取得
    const eligibleStudents = await db
      .select()
      .from(students)
      .where(
        and(
          eq(students.status, "active"),
          gte(students.createdAt, oneMonthAgoStart),
          lt(students.createdAt, oneMonthAgoEnd)
        )
      );

    console.log(`Found ${eligibleStudents.length} students for midterm survey`);

    for (const student of eligibleStudents) {
      // 既に送信済みかチェック
      const existingLog = await db
        .select()
        .from(emailLogs)
        .where(
          and(
            eq(emailLogs.studentId, student.id),
            eq(emailLogs.type, "midterm_survey")
          )
        )
        .limit(1);

      if (existingLog.length === 0) {
        try {
          await sendMidtermSurveyEmail(student, surveyUrl);
          console.log(`Sent midterm survey to ${student.email}`);
        } catch (error) {
          console.error(`Failed to send midterm survey to ${student.email}:`, error);
        }
      }
    }
  } catch (error) {
    console.error("Error in sendMidtermSurveys:", error);
  }
}

/**
 * 毎週月曜日に週次学習目標メールを送信
 */
export async function sendWeeklyGoals() {
  const today = new Date();
  // 月曜日かチェック (0=日曜, 1=月曜, ...)
  if (today.getDay() !== 1) {
    console.log("sendWeeklyGoals: Not Monday, skipping");
    return;
  }

  try {
    const activeStudents = await db
      .select()
      .from(students)
      .where(eq(students.status, "active"));

    console.log(`Sending weekly goals to ${activeStudents.length} students`);

    for (const student of activeStudents) {
      // 既に今週送信済みかチェック
      const existingLog = await db
        .select()
        .from(emailLogs)
        .where(
          and(
            eq(emailLogs.studentId, student.id),
            eq(emailLogs.type, "weekly_learning_goals"),
            gte(emailLogs.sentAt, startOfDay(today))
          )
        )
        .limit(1);

      if (existingLog.length === 0) {
        try {
          // TODO: 生徒ごとの学習目標を動的に取得
          const weeklyGoals = [
            "今週のレッスン内容の復習",
            "練習課題の完了",
            "コミュニティでの質問または回答",
          ];
          await sendWeeklyLearningGoalsEmail(student, weeklyGoals);
          console.log(`Sent weekly goals to ${student.email}`);
        } catch (error) {
          console.error(`Failed to send weekly goals to ${student.email}:`, error);
        }
      }
    }
  } catch (error) {
    console.error("Error in sendWeeklyGoals:", error);
  }
}

/**
 * 毎月1日に月次進捗レポートを送信
 */
export async function sendMonthlyReports() {
  const today = new Date();
  // 1日かチェック
  if (today.getDate() !== 1) {
    console.log("sendMonthlyReports: Not the 1st, skipping");
    return;
  }

  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const monthName = lastMonth.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
  });

  try {
    const activeStudents = await db
      .select()
      .from(students)
      .where(eq(students.status, "active"));

    console.log(`Sending monthly reports to ${activeStudents.length} students`);

    for (const student of activeStudents) {
      // 既に送信済みかチェック
      const existingLog = await db
        .select()
        .from(emailLogs)
        .where(
          and(
            eq(emailLogs.studentId, student.id),
            eq(emailLogs.type, "monthly_progress_report"),
            gte(emailLogs.sentAt, startOfDay(today))
          )
        )
        .limit(1);

      if (existingLog.length === 0) {
        try {
          // 先月のレッスン数を取得
          const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

          const completedLessons = await db
            .select()
            .from(lessons)
            .where(
              and(
                eq(lessons.studentId, student.id),
                eq(lessons.status, "completed"),
                gte(lessons.startTime, lastMonthStart),
                lt(lessons.startTime, lastMonthEnd)
              )
            );

          // TODO: 学習トピックと目標を動的に取得
          const report = {
            month: monthName,
            lessonsCompleted: completedLessons.length,
            lessonsTotal: 4, // 想定月間レッスン数
            topicsLearned: ["AIプログラミング基礎", "プロンプトエンジニアリング"],
            nextMonthGoals: ["実践プロジェクト開始", "コード品質の向上"],
          };

          await sendMonthlyProgressReportEmail(student, report);
          console.log(`Sent monthly report to ${student.email}`);
        } catch (error) {
          console.error(`Failed to send monthly report to ${student.email}:`, error);
        }
      }
    }
  } catch (error) {
    console.error("Error in sendMonthlyReports:", error);
  }
}

/**
 * すべてのスケジュール済みメールタスクを実行
 * Cron Job または Vercel Cron から呼び出す
 */
export async function runScheduledEmailTasks() {
  console.log("Running scheduled email tasks...");

  await sendLessonDayBeforeReminders();
  await sendLessonBookingReminders();
  await sendNoLoginCheckins();
  await sendMidtermSurveys();
  await sendWeeklyGoals();
  await sendMonthlyReports();

  console.log("Scheduled email tasks completed");
}
