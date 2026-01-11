import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { students, lessons, schedules, emailLogs } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Mail,
  Calendar,
  User,
  CreditCard,
  History,
} from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { StudentEditForm } from "./student-edit-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

const statusMap = {
  provisional: { label: "仮登録", variant: "secondary" as const },
  active: { label: "アクティブ", variant: "default" as const },
  withdrawn: { label: "退会済み", variant: "destructive" as const },
};

const planMap = {
  monthly: "月額プラン",
  yearly: "年額プラン",
};

export default async function StudentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const studentId = parseInt(id, 10);

  if (isNaN(studentId)) {
    notFound();
  }

  const student = await db.query.students.findFirst({
    where: eq(students.id, studentId),
  });

  if (!student) {
    notFound();
  }

  const studentLessons = await db.query.lessons.findMany({
    where: eq(lessons.studentId, studentId),
    orderBy: [desc(lessons.startTime)],
  });

  const studentSchedules = await db.query.schedules.findMany({
    where: eq(schedules.studentId, studentId),
  });

  const studentEmailLogs = await db.query.emailLogs.findMany({
    where: eq(emailLogs.studentId, studentId),
    orderBy: [desc(emailLogs.sentAt)],
  });

  const status = statusMap[student.status];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/students">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{student.name}</h1>
          <p className="text-muted-foreground">{student.email}</p>
        </div>
        <Badge variant={status.variant} className="ml-auto">
          {status.label}
        </Badge>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">
            <User className="mr-2 h-4 w-4" />
            基本情報
          </TabsTrigger>
          <TabsTrigger value="lessons">
            <Calendar className="mr-2 h-4 w-4" />
            レッスン履歴
          </TabsTrigger>
          <TabsTrigger value="schedules">
            <History className="mr-2 h-4 w-4" />
            スケジュール
          </TabsTrigger>
          <TabsTrigger value="emails">
            <Mail className="mr-2 h-4 w-4" />
            メール履歴
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  基本情報
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StudentEditForm student={student} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  プラン情報
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">プラン</p>
                  <p className="font-medium">{planMap[student.plan]}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Stripe Customer ID
                  </p>
                  <p className="font-mono text-sm">
                    {student.stripeCustomerId}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">登録日</p>
                  <p className="font-medium">
                    {format(student.createdAt, "yyyy年M月d日 HH:mm", {
                      locale: ja,
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="lessons" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>レッスン履歴</CardTitle>
              <Button asChild>
                <Link href={`/admin/students/${student.id}/lessons/new`}>
                  レッスンを追加
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {studentLessons.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  レッスン履歴がありません
                </p>
              ) : (
                <div className="space-y-4">
                  {studentLessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between border-b pb-4 last:border-0"
                    >
                      <div>
                        <p className="font-medium">
                          第{lesson.lessonNumber}回レッスン
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(lesson.startTime, "yyyy年M月d日 HH:mm", {
                            locale: ja,
                          })}
                        </p>
                      </div>
                      <Badge
                        variant={
                          lesson.status === "completed"
                            ? "default"
                            : lesson.status === "cancelled"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {lesson.status === "scheduled"
                          ? "予定"
                          : lesson.status === "completed"
                            ? "完了"
                            : "キャンセル"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedules" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>固定スケジュール</CardTitle>
              <Button asChild>
                <Link href={`/admin/students/${student.id}/schedules/new`}>
                  スケジュールを追加
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {studentSchedules.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  固定スケジュールが設定されていません
                </p>
              ) : (
                <div className="space-y-4">
                  {studentSchedules.map((schedule) => {
                    const dayNames = [
                      "日曜日",
                      "月曜日",
                      "火曜日",
                      "水曜日",
                      "木曜日",
                      "金曜日",
                      "土曜日",
                    ];
                    return (
                      <div
                        key={schedule.id}
                        className="flex items-center justify-between border-b pb-4 last:border-0"
                      >
                        <div>
                          <p className="font-medium">
                            {dayNames[schedule.dayOfWeek]}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {schedule.startTime} - {schedule.endTime}
                          </p>
                        </div>
                        <Badge
                          variant={schedule.isActive === 1 ? "default" : "secondary"}
                        >
                          {schedule.isActive === 1 ? "有効" : "無効"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emails" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>メール送信履歴</CardTitle>
            </CardHeader>
            <CardContent>
              {studentEmailLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  メール送信履歴がありません
                </p>
              ) : (
                <div className="space-y-4">
                  {studentEmailLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between border-b pb-4 last:border-0"
                    >
                      <div>
                        <p className="font-medium">{log.subject}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(log.sentAt, "yyyy年M月d日 HH:mm", {
                            locale: ja,
                          })}
                        </p>
                      </div>
                      <Badge
                        variant={
                          log.status === "sent" ? "default" : "destructive"
                        }
                      >
                        {log.status === "sent" ? "送信済み" : "送信失敗"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
