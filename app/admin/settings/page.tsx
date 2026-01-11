import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { admins } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, User, Shield, Key } from "lucide-react";
import { AdminProfileForm } from "./admin-profile-form";
import { AdminList } from "./admin-list";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user || session.user.userType !== "admin") {
    redirect("/login");
  }

  const currentAdmin = await db.query.admins.findFirst({
    where: eq(admins.email, session.user.email!),
  });

  if (!currentAdmin) {
    redirect("/login");
  }

  const isSuperAdmin = session.user.role === "super_admin";

  // スーパー管理者の場合は全管理者一覧を取得
  const adminList = isSuperAdmin
    ? await db.select().from(admins)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">設定</h1>
        <p className="text-muted-foreground">
          アカウント設定と管理
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* プロフィール設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              プロフィール
            </CardTitle>
            <CardDescription>
              アカウント情報を編集します
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminProfileForm admin={currentAdmin} />
          </CardContent>
        </Card>

        {/* アカウント情報 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              アカウント情報
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">メールアドレス</p>
              <p className="font-medium">{currentAdmin.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">権限</p>
              <Badge variant={isSuperAdmin ? "default" : "secondary"}>
                {isSuperAdmin ? "スーパー管理者" : "管理者"}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">アカウント作成日</p>
              <p>
                {new Date(currentAdmin.createdAt).toLocaleDateString("ja-JP")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* スーパー管理者のみ: 管理者一覧 */}
      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              管理者一覧
            </CardTitle>
            <CardDescription>
              システムに登録されている管理者を管理します
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminList admins={adminList} currentAdminId={currentAdmin.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
