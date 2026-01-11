import { db } from "@/lib/db";
import { students, admins } from "@/drizzle/schema";
import { eq, not } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar } from "lucide-react";
import { NewLessonForm } from "./new-lesson-form";

export default async function NewLessonPage() {
  // アクティブな生徒を取得
  const studentList = await db
    .select({
      id: students.id,
      name: students.name,
      email: students.email,
    })
    .from(students)
    .where(not(eq(students.status, "withdrawn")));

  // 管理者を取得
  const adminList = await db
    .select({
      id: admins.id,
      name: admins.name,
      email: admins.email,
    })
    .from(admins);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/lessons">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">新規レッスン作成</h1>
          <p className="text-muted-foreground">
            生徒のレッスンを予約します
          </p>
        </div>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            レッスン情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NewLessonForm students={studentList} admins={adminList} />
        </CardContent>
      </Card>
    </div>
  );
}
