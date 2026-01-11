import { db } from "@/lib/db";
import { students } from "@/drizzle/schema";
import { not, eq } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clock } from "lucide-react";
import { NewScheduleForm } from "./new-schedule-form";

export default async function NewSchedulePage() {
  // アクティブな生徒を取得
  const studentList = await db
    .select({
      id: students.id,
      name: students.name,
      email: students.email,
    })
    .from(students)
    .where(not(eq(students.status, "withdrawn")));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/schedules">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">新規スケジュール作成</h1>
          <p className="text-muted-foreground">
            生徒の固定スケジュールを登録します
          </p>
        </div>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            スケジュール情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NewScheduleForm students={studentList} />
        </CardContent>
      </Card>
    </div>
  );
}
