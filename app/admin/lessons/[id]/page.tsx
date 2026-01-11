import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { lessons, students, admins } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, User, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { LessonActions } from "./lesson-actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

const statusMap = {
  scheduled: { label: "予定", variant: "secondary" as const },
  completed: { label: "完了", variant: "default" as const },
  cancelled: { label: "キャンセル", variant: "destructive" as const },
};

export default async function LessonDetailPage({ params }: PageProps) {
  const { id } = await params;
  const lessonId = parseInt(id, 10);

  if (isNaN(lessonId)) {
    notFound();
  }

  const lesson = await db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
  });

  if (!lesson) {
    notFound();
  }

  const student = await db.query.students.findFirst({
    where: eq(students.id, lesson.studentId),
  });

  const admin = lesson.adminId
    ? await db.query.admins.findFirst({
        where: eq(admins.id, lesson.adminId),
      })
    : null;

  const status = statusMap[lesson.status];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/lessons">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            第{lesson.lessonNumber}回レッスン
          </h1>
          <p className="text-muted-foreground">
            {student?.name || "不明"} 様
          </p>
        </div>
        <Badge variant={status.variant} className="text-base px-3 py-1">
          {status.label}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              レッスン情報
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">日時</p>
              <p className="font-medium text-lg">
                {format(lesson.startTime, "yyyy年M月d日(E)", { locale: ja })}
              </p>
              <p className="text-muted-foreground">
                {format(lesson.startTime, "HH:mm")} -{" "}
                {format(lesson.endTime, "HH:mm")}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">レッスン回数</p>
              <p className="font-medium">第{lesson.lessonNumber}回</p>
            </div>

            {lesson.notes && (
              <div>
                <p className="text-sm text-muted-foreground">メモ</p>
                <p className="whitespace-pre-wrap">{lesson.notes}</p>
              </div>
            )}

            <div>
              <p className="text-sm text-muted-foreground">作成日</p>
              <p>
                {format(lesson.createdAt, "yyyy年M月d日 HH:mm", { locale: ja })}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                生徒情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {student ? (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">名前</p>
                    <p className="font-medium">{student.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">メールアドレス</p>
                    <p>{student.email}</p>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={`/admin/students/${student.id}`}>
                      生徒詳細を見る
                    </Link>
                  </Button>
                </>
              ) : (
                <p className="text-muted-foreground">生徒情報が見つかりません</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                講師情報
              </CardTitle>
            </CardHeader>
            <CardContent>
              {admin ? (
                <div className="space-y-2">
                  <p className="font-medium">{admin.name}</p>
                  <p className="text-sm text-muted-foreground">{admin.email}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">講師が未割当です</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {lesson.status === "scheduled" && (
        <Card>
          <CardHeader>
            <CardTitle>アクション</CardTitle>
          </CardHeader>
          <CardContent>
            <LessonActions lessonId={lesson.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
