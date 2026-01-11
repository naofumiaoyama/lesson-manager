import Link from "next/link";
import { db } from "@/lib/db";
import { lessons, students, admins } from "@/drizzle/schema";
import { desc, eq } from "drizzle-orm";

// ビルド時の静的生成を無効化（DBクエリがあるため）
export const dynamic = "force-dynamic";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

const statusMap = {
  scheduled: { label: "予定", variant: "secondary" as const },
  completed: { label: "完了", variant: "default" as const },
  cancelled: { label: "キャンセル", variant: "destructive" as const },
};

export default async function LessonsPage() {
  // レッスン一覧を取得（生徒・管理者情報を含む）
  const lessonList = await db
    .select({
      id: lessons.id,
      startTime: lessons.startTime,
      endTime: lessons.endTime,
      status: lessons.status,
      lessonNumber: lessons.lessonNumber,
      notes: lessons.notes,
      studentId: lessons.studentId,
      adminId: lessons.adminId,
      studentName: students.name,
      studentEmail: students.email,
      adminName: admins.name,
    })
    .from(lessons)
    .leftJoin(students, eq(lessons.studentId, students.id))
    .leftJoin(admins, eq(lessons.adminId, admins.id))
    .orderBy(desc(lessons.startTime));

  // 今日のレッスンをカウント
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayLessons = lessonList.filter((lesson) => {
    const lessonDate = new Date(lesson.startTime);
    return lessonDate >= today && lessonDate < tomorrow;
  });

  // 予定されているレッスンをカウント
  const scheduledCount = lessonList.filter(
    (lesson) => lesson.status === "scheduled"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">レッスン管理</h1>
          <p className="text-muted-foreground">レッスンの予定と履歴を管理</p>
        </div>
        <Button asChild>
          <Link href="/admin/lessons/new">
            <Plus className="mr-2 h-4 w-4" />
            レッスンを追加
          </Link>
        </Button>
      </div>

      {/* サマリーカード */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>今日のレッスン</CardDescription>
            <CardTitle className="text-4xl">{todayLessons.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>予定されているレッスン</CardDescription>
            <CardTitle className="text-4xl">{scheduledCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>総レッスン数</CardDescription>
            <CardTitle className="text-4xl">{lessonList.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* レッスン一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            レッスン一覧
          </CardTitle>
          <CardDescription>
            全てのレッスン: {lessonList.length}件
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lessonList.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              まだレッスンが登録されていません
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-3 font-medium">日時</th>
                    <th className="pb-3 font-medium">生徒</th>
                    <th className="pb-3 font-medium">回数</th>
                    <th className="pb-3 font-medium">講師</th>
                    <th className="pb-3 font-medium">ステータス</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {lessonList.map((lesson) => {
                    const status = statusMap[lesson.status];
                    return (
                      <tr key={lesson.id} className="border-b">
                        <td className="py-4">
                          <div>
                            <p className="font-medium">
                              {format(lesson.startTime, "M月d日(E)", {
                                locale: ja,
                              })}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(lesson.startTime, "HH:mm")} -{" "}
                              {format(lesson.endTime, "HH:mm")}
                            </p>
                          </div>
                        </td>
                        <td className="py-4">
                          <div>
                            <p className="font-medium">
                              {lesson.studentName || "不明"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {lesson.studentEmail}
                            </p>
                          </div>
                        </td>
                        <td className="py-4">第{lesson.lessonNumber}回</td>
                        <td className="py-4">
                          {lesson.adminName || "未割当"}
                        </td>
                        <td className="py-4">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                        <td className="py-4">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/lessons/${lesson.id}`}>
                              詳細
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
