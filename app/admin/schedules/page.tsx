import Link from "next/link";
import { db } from "@/lib/db";
import { schedules, students } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock } from "lucide-react";

const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

export default async function SchedulesPage() {
  // スケジュール一覧を取得（生徒情報を含む）
  const scheduleList = await db
    .select({
      id: schedules.id,
      dayOfWeek: schedules.dayOfWeek,
      startTime: schedules.startTime,
      endTime: schedules.endTime,
      isActive: schedules.isActive,
      studentId: schedules.studentId,
      studentName: students.name,
      studentEmail: students.email,
    })
    .from(schedules)
    .leftJoin(students, eq(schedules.studentId, students.id))
    .orderBy(schedules.dayOfWeek, schedules.startTime);

  // 曜日ごとにグループ化
  const schedulesByDay = dayNames.map((_, index) =>
    scheduleList.filter((s) => s.dayOfWeek === index)
  );

  // アクティブなスケジュール数
  const activeCount = scheduleList.filter((s) => s.isActive === 1).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">スケジュール管理</h1>
          <p className="text-muted-foreground">
            生徒の固定スケジュールを管理
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/schedules/new">
            <Plus className="mr-2 h-4 w-4" />
            スケジュールを追加
          </Link>
        </Button>
      </div>

      {/* サマリーカード */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>総スケジュール数</CardDescription>
            <CardTitle className="text-4xl">{scheduleList.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>アクティブなスケジュール</CardDescription>
            <CardTitle className="text-4xl">{activeCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* 曜日別スケジュール */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {dayNames.map((dayName, dayIndex) => {
          const daySchedules = schedulesByDay[dayIndex];
          return (
            <Card key={dayIndex}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {dayName}曜日
                </CardTitle>
                <CardDescription>
                  {daySchedules.length}件のスケジュール
                </CardDescription>
              </CardHeader>
              <CardContent>
                {daySchedules.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    スケジュールなし
                  </p>
                ) : (
                  <div className="space-y-3">
                    {daySchedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="border rounded-lg p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {schedule.startTime} - {schedule.endTime}
                          </span>
                          <Badge
                            variant={
                              schedule.isActive === 1 ? "default" : "secondary"
                            }
                          >
                            {schedule.isActive === 1 ? "有効" : "無効"}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {schedule.studentName || "不明"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {schedule.studentEmail}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          asChild
                        >
                          <Link href={`/admin/schedules/${schedule.id}`}>
                            詳細
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 全スケジュール一覧テーブル */}
      <Card>
        <CardHeader>
          <CardTitle>全スケジュール一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {scheduleList.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              まだスケジュールが登録されていません
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-3 font-medium">生徒</th>
                    <th className="pb-3 font-medium">曜日</th>
                    <th className="pb-3 font-medium">時間</th>
                    <th className="pb-3 font-medium">ステータス</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleList.map((schedule) => (
                    <tr key={schedule.id} className="border-b">
                      <td className="py-4">
                        <div>
                          <p className="font-medium">
                            {schedule.studentName || "不明"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {schedule.studentEmail}
                          </p>
                        </div>
                      </td>
                      <td className="py-4">
                        {dayNames[schedule.dayOfWeek]}曜日
                      </td>
                      <td className="py-4">
                        {schedule.startTime} - {schedule.endTime}
                      </td>
                      <td className="py-4">
                        <Badge
                          variant={schedule.isActive === 1 ? "default" : "secondary"}
                        >
                          {schedule.isActive === 1 ? "有効" : "無効"}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/schedules/${schedule.id}`}>
                            編集
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
