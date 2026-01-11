import { CommunityEventForm } from "./community-event-form";

export default function NewEventPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">コミュニティイベント作成</h1>
        <p className="text-muted-foreground">
          勉強会やコミュニティイベントを作成します
        </p>
      </div>

      <CommunityEventForm />
    </div>
  );
}
