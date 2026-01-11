import { NextRequest, NextResponse } from "next/server";
import { runScheduledEmailTasks } from "@/server/services/email-scheduler.service";

// Vercel Cron または外部サービスからの呼び出し用
// 毎日午前9時に実行することを推奨
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // 認証チェック（CRON_SECRETが設定されている場合）
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await runScheduledEmailTasks();
    return NextResponse.json({
      success: true,
      message: "Scheduled email tasks completed",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error running scheduled email tasks:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
