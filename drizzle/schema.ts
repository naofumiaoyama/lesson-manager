import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  time,
  date,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const studentStatusEnum = pgEnum("student_status", [
  "provisional",
  "active",
  "withdrawn",
]);

export const studentPlanEnum = pgEnum("student_plan", ["monthly", "yearly"]);

export const adminRoleEnum = pgEnum("admin_role", ["super_admin", "admin"]);

export const lessonTypeEnum = pgEnum("lesson_type", ["individual", "group"]);

export const lessonStatusEnum = pgEnum("lesson_status", [
  "scheduled",
  "completed",
  "cancelled",
]);


export const emailTypeEnum = pgEnum("email_type", [
  // Phase 1: 入口
  "application_auto_reply",      // 申し込み自動返信
  "counseling_reminder",         // カウンセリング前日リマインダー
  // Phase 2: 導入
  "account_creation",            // アカウント作成完了
  "lesson_booking_reminder",     // レッスン予約リマインダー
  "lesson_day_before_reminder",  // レッスン前日リマインダー
  // Phase 3: 学習・コミュニティ
  "weekly_learning_goals",       // 週次学習目標
  "monthly_progress_report",     // 月次進捗レポート
  "community_invite",            // コミュニティ招待
  // Phase 4: 異常検知
  "checkin_after_no_login",      // 3日ログインなしチェックイン
  "midterm_survey",              // 中間アンケート
  // Legacy (既存互換)
  "welcome",
  "lesson_confirmation",
  "lesson_confirmed",
  "reminder",
  "reschedule",
]);

export const emailStatusEnum = pgEnum("email_status", ["sent", "failed"]);

export const exceptionTypeEnum = pgEnum("exception_type", ["unavailable"]);

// Tables
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  status: studentStatusEnum("status").notNull().default("provisional"),
  plan: studentPlanEnum("plan").notNull(),
  profileImage: varchar("profile_image", { length: 512 }),
  discordId: varchar("discord_id", { length: 100 }),
  googleCalendarId: varchar("google_calendar_id", { length: 100 }),
  passwordHash: varchar("password_hash", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  role: adminRoleEnum("role").notNull().default("admin"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  adminId: integer("admin_id").references(() => admins.id),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 (Sunday-Saturday)
  startTime: varchar("start_time", { length: 5 }).notNull(), // HH:MM format
  endTime: varchar("end_time", { length: 5 }).notNull(), // HH:MM format
  isActive: integer("is_active").notNull().default(1), // 1=active, 0=inactive
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  adminId: integer("admin_id")
    .notNull()
    .references(() => admins.id),
  scheduleId: integer("schedule_id").references(() => schedules.id, {
    onDelete: "set null",
  }),
  lessonNumber: integer("lesson_number").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  type: lessonTypeEnum("type").notNull().default("individual"),
  status: lessonStatusEnum("status").notNull().default("scheduled"),
  calendarEventId: varchar("calendar_event_id", { length: 255 }),
  meetingUrl: varchar("meeting_url", { length: 512 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  type: emailTypeEnum("type").notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  status: emailStatusEnum("status").notNull(),
});

// 予約可能日時のデフォルト設定（曜日ごと）
export const availabilityDefaults = pgTable("availability_defaults", {
  id: serial("id").primaryKey(),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 (Sunday-Saturday)
  startTime: varchar("start_time", { length: 5 }).notNull(), // HH:MM format
  endTime: varchar("end_time", { length: 5 }).notNull(), // HH:MM format
  isEnabled: integer("is_enabled").notNull().default(1), // 1=enabled, 0=disabled
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// 特定日時の例外設定（オフにする日時）
export const availabilityExceptions = pgTable("availability_exceptions", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  startTime: varchar("start_time", { length: 5 }), // HH:MM format (null = all day)
  endTime: varchar("end_time", { length: 5 }), // HH:MM format (null = all day)
  type: exceptionTypeEnum("type").notNull().default("unavailable"),
  reason: varchar("reason", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Relations
export const studentsRelations = relations(students, ({ many }) => ({
  lessons: many(lessons),
  schedules: many(schedules),
  emailLogs: many(emailLogs),
}));

export const adminsRelations = relations(admins, ({ many }) => ({
  lessons: many(lessons),
  schedules: many(schedules),
}));

export const schedulesRelations = relations(schedules, ({ one, many }) => ({
  student: one(students, {
    fields: [schedules.studentId],
    references: [students.id],
  }),
  admin: one(admins, {
    fields: [schedules.adminId],
    references: [admins.id],
  }),
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one }) => ({
  student: one(students, {
    fields: [lessons.studentId],
    references: [students.id],
  }),
  admin: one(admins, {
    fields: [lessons.adminId],
    references: [admins.id],
  }),
  schedule: one(schedules, {
    fields: [lessons.scheduleId],
    references: [schedules.id],
  }),
}));

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  student: one(students, {
    fields: [emailLogs.studentId],
    references: [students.id],
  }),
}));

// Types
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type Admin = typeof admins.$inferSelect;
export type NewAdmin = typeof admins.$inferInsert;
export type Schedule = typeof schedules.$inferSelect;
export type NewSchedule = typeof schedules.$inferInsert;
export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;
export type EmailLog = typeof emailLogs.$inferSelect;
export type NewEmailLog = typeof emailLogs.$inferInsert;
export type AvailabilityDefault = typeof availabilityDefaults.$inferSelect;
export type NewAvailabilityDefault = typeof availabilityDefaults.$inferInsert;
export type AvailabilityException = typeof availabilityExceptions.$inferSelect;
export type NewAvailabilityException = typeof availabilityExceptions.$inferInsert;
