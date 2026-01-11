import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { students, lessons } from "@/drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar, BookOpen, Clock } from "lucide-react";

export default async function StudentMyPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const studentId = parseInt(session.user.id);

  const student = await db
    .select()
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);

  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const upcomingLessons = await db
    .select()
    .from(lessons)
    .where(
      and(
        eq(lessons.studentId, studentId),
        gte(lessons.startTime, now),
        lte(lessons.startTime, endOfMonth)
      )
    );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">マイページ</h1>
        <p className="text-muted-foreground">
          ようこそ、{session.user.name}さん
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今月のレッスン</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingLessons.length}</div>
            <p className="text-xs text-muted-foreground">
              予定されているレッスン
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">プラン</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {student[0]?.plan === "monthly" ? "月額" : "年額"}
            </div>
            <p className="text-xs text-muted-foreground">
              現在のプラン
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">次のレッスン</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {upcomingLessons.length > 0
                ? new Date(upcomingLessons[0].startTime).toLocaleDateString(
                    "ja-JP",
                    { month: "short", day: "numeric" }
                  )
                : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              {upcomingLessons.length > 0
                ? new Date(upcomingLessons[0].startTime).toLocaleTimeString(
                    "ja-JP",
                    { hour: "2-digit", minute: "2-digit" }
                  )
                : "予定なし"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>今後のレッスン</CardTitle>
          <CardDescription>
            予定されているレッスン一覧
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingLessons.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              予定されているレッスンはありません
            </p>
          ) : (
            <div className="space-y-4">
              {upcomingLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">第{lesson.lessonNumber}回レッスン</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(lesson.startTime).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        weekday: "short",
                      })}{" "}
                      {new Date(lesson.startTime).toLocaleTimeString("ja-JP", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" - "}
                      {new Date(lesson.endTime).toLocaleTimeString("ja-JP", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {lesson.meetingUrl && (
                    <a
                      href={lesson.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      参加する
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
