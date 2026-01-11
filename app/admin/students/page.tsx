import Link from "next/link";
import { db } from "@/lib/db";
import { students } from "@/drizzle/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const statusLabels = {
  provisional: "仮登録",
  active: "本登録",
  withdrawn: "退会",
};

const statusColors = {
  provisional: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  withdrawn: "bg-gray-100 text-gray-800",
};

export default async function StudentsPage() {
  const studentList = await db
    .select()
    .from(students)
    .orderBy(desc(students.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">生徒管理</h1>
          <p className="text-muted-foreground">
            生徒の一覧と管理
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/students/new">
            <Plus className="mr-2 h-4 w-4" />
            生徒を追加
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>生徒一覧</CardTitle>
          <CardDescription>
            登録されている生徒: {studentList.length}名
          </CardDescription>
        </CardHeader>
        <CardContent>
          {studentList.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              まだ生徒が登録されていません
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-3 font-medium">名前</th>
                    <th className="pb-3 font-medium">メールアドレス</th>
                    <th className="pb-3 font-medium">プラン</th>
                    <th className="pb-3 font-medium">ステータス</th>
                    <th className="pb-3 font-medium">登録日</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {studentList.map((student) => (
                    <tr key={student.id} className="border-b">
                      <td className="py-4 font-medium">{student.name}</td>
                      <td className="py-4 text-muted-foreground">
                        {student.email}
                      </td>
                      <td className="py-4">
                        {student.plan === "monthly" ? "月額" : "年額"}
                      </td>
                      <td className="py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            statusColors[student.status]
                          }`}
                        >
                          {statusLabels[student.status]}
                        </span>
                      </td>
                      <td className="py-4 text-muted-foreground">
                        {new Date(student.createdAt).toLocaleDateString("ja-JP")}
                      </td>
                      <td className="py-4">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/students/${student.id}`}>
                            詳細
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
