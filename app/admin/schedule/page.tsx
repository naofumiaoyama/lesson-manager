import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SchedulePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">スケジュール管理</h1>
        <p className="text-muted-foreground">
          レッスンスケジュールの管理
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>カレンダー</CardTitle>
          <CardDescription>
            Googleカレンダーと連携してスケジュールを管理します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-96 items-center justify-center rounded-lg border border-dashed">
            <p className="text-muted-foreground">
              カレンダーコンポーネントを実装予定
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
