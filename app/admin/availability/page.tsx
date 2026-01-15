import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, CalendarOff } from "lucide-react";
import {
  getAvailabilityDefaults,
  getAvailabilityExceptions,
} from "@/server/actions/availability";
import { AvailabilityDefaultsForm } from "./availability-defaults-form";
import { AvailabilityExceptionsForm } from "./availability-exceptions-form";

export const dynamic = "force-dynamic";

const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

export default async function AvailabilityPage() {
  const defaults = await getAvailabilityDefaults();
  const exceptions = await getAvailabilityExceptions();

  // 曜日ごとのデフォルト設定をマップに変換
  const defaultsByDay = new Map<
    number,
    { startTime: string; endTime: string; isEnabled: number }
  >();
  for (const d of defaults) {
    defaultsByDay.set(d.dayOfWeek, {
      startTime: d.startTime,
      endTime: d.endTime,
      isEnabled: d.isEnabled,
    });
  }

  // 初期値を設定（平日10:00-18:00）
  const initialDefaults = dayNames.map((_, index) => {
    const existing = defaultsByDay.get(index);
    if (existing) {
      return {
        dayOfWeek: index,
        startTime: existing.startTime,
        endTime: existing.endTime,
        isEnabled: existing.isEnabled,
      };
    }
    // デフォルト: 平日(1-5)は10:00-18:00、土日(0,6)は無効
    const isWeekday = index >= 1 && index <= 5;
    return {
      dayOfWeek: index,
      startTime: "10:00",
      endTime: "18:00",
      isEnabled: isWeekday ? 1 : 0,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">予約可能日時設定</h1>
        <p className="text-muted-foreground">
          デフォルトの予約可能時間と特定日のオフ設定を管理
        </p>
      </div>

      <Tabs defaultValue="defaults" className="space-y-4">
        <TabsList>
          <TabsTrigger value="defaults" className="gap-2">
            <Clock className="h-4 w-4" />
            デフォルト設定
          </TabsTrigger>
          <TabsTrigger value="exceptions" className="gap-2">
            <CalendarOff className="h-4 w-4" />
            例外設定（オフ日）
          </TabsTrigger>
        </TabsList>

        <TabsContent value="defaults">
          <Card>
            <CardHeader>
              <CardTitle>曜日ごとのデフォルト設定</CardTitle>
              <CardDescription>
                各曜日の予約可能な時間帯を設定します。無効にした曜日は予約を受け付けません。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AvailabilityDefaultsForm initialDefaults={initialDefaults} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exceptions">
          <Card>
            <CardHeader>
              <CardTitle>特定日のオフ設定</CardTitle>
              <CardDescription>
                祝日や休暇など、特定の日を予約不可にします。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AvailabilityExceptionsForm exceptions={exceptions} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
