"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Mail, ArrowRight } from "lucide-react";
import Link from "next/link";

interface SessionInfo {
  customerEmail: string;
  customerName: string;
  status: string;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      fetch(`/api/stripe/session/${sessionId}`)
        .then((res) => res.json())
        .then((data) => {
          setSessionInfo(data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-2xl shadow-lg border p-8 text-center">
          {/* Success Icon */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold mb-2">
            お申し込みありがとうございます
          </h1>
          <p className="text-muted-foreground mb-8">
            PrimaMateria AIプログラミングスクールへようこそ！
          </p>

          {/* Session Info */}
          {loading ? (
            <div className="bg-slate-50 rounded-lg p-6 mb-8">
              <p className="text-muted-foreground">読み込み中...</p>
            </div>
          ) : sessionInfo ? (
            <div className="bg-slate-50 rounded-lg p-6 mb-8 text-left">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="h-5 w-5 text-primary" />
                <span className="font-medium">確認メールを送信しました</span>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>{sessionInfo.customerEmail}</strong> 宛てに、ログイン情報を記載したメールをお送りしました。
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-lg p-6 mb-8 text-left">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="h-5 w-5 text-primary" />
                <span className="font-medium">確認メールをご確認ください</span>
              </div>
              <p className="text-sm text-muted-foreground">
                ご登録いただいたメールアドレス宛てに、ログイン情報を記載したメールをお送りしました。
              </p>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-blue-50 rounded-lg p-6 mb-8 text-left">
            <h3 className="font-semibold text-blue-900 mb-3">次のステップ</h3>
            <ol className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="font-bold">1.</span>
                <span>メールに記載されたログイン情報を確認</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">2.</span>
                <span>学習管理システムにログイン</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">3.</span>
                <span>初回レッスンの日程を予約</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">4.</span>
                <span>Discordコミュニティに参加</span>
              </li>
            </ol>
          </div>

          {/* CTA */}
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors w-full"
          >
            ログインページへ
            <ArrowRight className="h-4 w-4" />
          </Link>

          <p className="mt-4 text-sm text-muted-foreground">
            ご不明な点がございましたら、
            <a href="mailto:support@primamateria.co.jp" className="text-primary hover:underline">
              support@primamateria.co.jp
            </a>
            までお問い合わせください。
          </p>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-2xl shadow-lg border p-8 text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full animate-pulse" />
          </div>
          <div className="h-8 bg-slate-100 rounded animate-pulse mb-2" />
          <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4 mx-auto" />
        </div>
      </div>
    </div>
  );
}

export default function ApplySuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SuccessContent />
    </Suspense>
  );
}
