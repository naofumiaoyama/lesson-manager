import { CalendarView } from "@/components/calendar/calendar-view";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function AdminEventsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">イベント管理</h1>
          <p className="text-muted-foreground">
            レッスン・コミュニティイベントの管理
          </p>
        </div>
        <Link href="/admin/events/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            イベント作成
          </Button>
        </Link>
      </div>

      <CalendarView />
    </div>
  );
}
