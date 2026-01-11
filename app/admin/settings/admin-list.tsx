"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateAdminRole } from "@/server/actions/admin-settings";

interface Admin {
  id: number;
  name: string;
  email: string;
  role: "admin" | "super_admin";
  createdAt: Date;
}

interface AdminListProps {
  admins: Admin[];
  currentAdminId: number;
}

export function AdminList({ admins, currentAdminId }: AdminListProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRoleChange(adminId: number, newRole: string) {
    if (adminId === currentAdminId) {
      setError("自分自身の権限は変更できません");
      return;
    }

    setLoadingId(adminId);
    setError(null);

    try {
      const result = await updateAdminRole(adminId, newRole as "admin" | "super_admin");

      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || "更新に失敗しました");
      }
    } catch {
      setError("予期しないエラーが発生しました");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-sm text-muted-foreground">
              <th className="pb-3 font-medium">名前</th>
              <th className="pb-3 font-medium">メールアドレス</th>
              <th className="pb-3 font-medium">権限</th>
              <th className="pb-3 font-medium">登録日</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => {
              const isCurrentAdmin = admin.id === currentAdminId;
              return (
                <tr key={admin.id} className="border-b">
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{admin.name}</span>
                      {isCurrentAdmin && (
                        <Badge variant="outline" className="text-xs">
                          あなた
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-4 text-muted-foreground">{admin.email}</td>
                  <td className="py-4">
                    {isCurrentAdmin ? (
                      <Badge
                        variant={
                          admin.role === "super_admin" ? "default" : "secondary"
                        }
                      >
                        {admin.role === "super_admin"
                          ? "スーパー管理者"
                          : "管理者"}
                      </Badge>
                    ) : (
                      <Select
                        value={admin.role}
                        onValueChange={(value) =>
                          handleRoleChange(admin.id, value)
                        }
                        disabled={loadingId === admin.id}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">管理者</SelectItem>
                          <SelectItem value="super_admin">
                            スーパー管理者
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="py-4 text-muted-foreground">
                    {new Date(admin.createdAt).toLocaleDateString("ja-JP")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
