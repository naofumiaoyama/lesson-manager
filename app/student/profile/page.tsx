import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { students } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProfileForm } from "./ProfileForm";

export default async function StudentProfilePage() {
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

  if (student.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">プロフィール</h1>
        <p className="text-muted-foreground">
          プロフィール情報の確認・編集
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
            <CardDescription>
              プロフィール情報を編集できます
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm student={student[0]} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>契約情報</CardTitle>
            <CardDescription>
              現在の契約内容
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">プラン</p>
              <p className="font-medium">
                {student[0].plan === "monthly" ? "月額プラン" : "年額プラン"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ステータス</p>
              <p className="font-medium">
                {student[0].status === "active"
                  ? "本登録"
                  : student[0].status === "provisional"
                  ? "仮登録"
                  : "退会"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">入会日</p>
              <p className="font-medium">
                {new Date(student[0].createdAt).toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
