import { BookingForm } from "./booking-form";

export const metadata = {
  title: "無料相談予約 | PrimaMateria AIプログラミングスクール",
  description: "PrimaMateria AIプログラミングスクールの無料相談をご予約ください。",
};

export default function BookingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* ヘッダー */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl">
            無料相談予約
          </h1>
          <p className="text-lg text-gray-600">
            PrimaMateria AIプログラミングスクールにご興味をお持ちいただきありがとうございます。<br />
            下記よりご都合の良い日時をお選びください。
          </p>
        </div>

        {/* 特徴 */}
        <div className="mb-12 grid gap-6 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="mb-3 text-3xl">🎯</div>
            <h3 className="mb-2 font-bold text-gray-900">完全無料</h3>
            <p className="text-sm text-gray-600">
              相談は完全無料です。お気軽にご参加ください。
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="mb-3 text-3xl">💻</div>
            <h3 className="mb-2 font-bold text-gray-900">オンライン開催</h3>
            <p className="text-sm text-gray-600">
              Google Meetを使用。自宅からお気軽にご参加いただけます。
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="mb-3 text-3xl">⏱️</div>
            <h3 className="mb-2 font-bold text-gray-900">約60分</h3>
            <p className="text-sm text-gray-600">
              学習プランや料金について丁寧にご説明します。
            </p>
          </div>
        </div>

        {/* 予約フォーム */}
        <BookingForm />

        {/* 注意事項 */}
        <div className="mt-12 rounded-lg bg-gray-50 p-6">
          <h3 className="mb-4 font-bold text-gray-900">ご予約に関して</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• ご予約完了後、確認メールをお送りします。</li>
            <li>• 日程変更・キャンセルはメールにてご連絡ください。</li>
            <li>• 当日は安定したインターネット環境でご参加ください。</li>
            <li>• ご質問やご相談内容を事前にまとめておくとスムーズです。</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
