import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lessons } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarView } from "@/components/calendar/calendar-view";

export default async function StudentSchedulePage() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const studentId = parseInt(session.user.id);

  const allLessons = await db
    .select()
    .from(lessons)
    .where(
      eq(lessons.studentId, studentId)
    )
    .orderBy(lessons.startTime);

  const now = new Date();
  const upcomingLessons = allLessons.filter(
    (lesson) => new Date(lesson.startTime) >= now
  );
  const pastLessons = allLessons.filter(
    (lesson) => new Date(lesson.startTime) < now
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">スケジュール</h1>
        <p className="text-muted-foreground">
          レッスン・コミュニティイベントの確認
        </p>
      </div>

      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList>
          <TabsTrigger value="calendar">カレンダー</TabsTrigger>
          <TabsTrigger value="list">リスト表示</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <CalendarView />
        </TabsContent>

        <TabsContent value="list" className="space-y-6">

      <Card>
        <CardHeader>
          <CardTitle>今後のレッスン</CardTitle>
          <CardDescription>
            予定されているレッスン: {upcomingLessons.length}件
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
                    {lesson.notes && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {lesson.notes}
                      </p>
                    )}
                  </div>
                  {lesson.meetingUrl && (
                    <a
                      href={lesson.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
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

      <Card>
        <CardHeader>
          <CardTitle>過去のレッスン</CardTitle>
          <CardDescription>
            受講済みレッスン: {pastLessons.length}件
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pastLessons.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              まだレッスンを受講していません
            </p>
          ) : (
            <div className="space-y-4">
              {pastLessons.slice(-10).reverse().map((lesson) => (
                <div
                  key={lesson.id}
                  className="flex items-center justify-between rounded-lg border p-4 opacity-60"
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
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {lesson.status === "completed" ? "完了" : "キャンセル"}
                  </span>
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
