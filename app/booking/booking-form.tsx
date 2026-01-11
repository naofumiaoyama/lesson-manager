"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";

interface TimeSlot {
  start: string;
  end: string;
}

interface DaySlots {
  date: string;
  slots: TimeSlot[];
}

type Step = "date" | "time" | "form" | "confirm" | "complete";

export function BookingForm() {
  const [step, setStep] = useState<Step>("date");
  const [availableSlots, setAvailableSlots] = useState<DaySlots[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 選択された値
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
  });
  const [bookingResult, setBookingResult] = useState<{
    date: string;
    time: string;
    meetingUrl?: string;
  } | null>(null);

  // 空き時間を取得
  useEffect(() => {
    async function fetchSlots() {
      try {
        setLoading(true);
        const res = await fetch("/api/booking/slots?days=14");
        if (!res.ok) {
          throw new Error("空き時間の取得に失敗しました");
        }
        const data = await res.json();
        setAvailableSlots(data.availableSlots);
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    }

    fetchSlots();
  }, []);

  // 日付選択
  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setStep("time");
  };

  // 時間選択
  const handleTimeSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setStep("form");
  };

  // フォーム入力
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep("confirm");
  };

  // 予約確定
  const handleConfirm = async () => {
    if (!selectedSlot) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/booking/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          slotStart: selectedSlot.start,
          slotEnd: selectedSlot.end,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "予約に失敗しました");
      }

      setBookingResult(data.booking);
      setStep("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "予約に失敗しました");
      setStep("form");
    } finally {
      setSubmitting(false);
    }
  };

  // 戻る
  const handleBack = () => {
    if (step === "time") setStep("date");
    else if (step === "form") setStep("time");
    else if (step === "confirm") setStep("form");
  };

  // 日付フォーマット
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  };

  // 時間フォーマット
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-white p-12 shadow-lg">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">空き時間を確認中...</span>
      </div>
    );
  }

  if (error && step !== "form") {
    return (
      <div className="rounded-lg bg-white p-12 text-center shadow-lg">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
        >
          再読み込み
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-lg md:p-8">
      {/* ステップインジケーター */}
      <div className="mb-8 flex items-center justify-center">
        {["日付選択", "時間選択", "情報入力", "確認", "完了"].map((label, i) => {
          const stepOrder: Step[] = ["date", "time", "form", "confirm", "complete"];
          const currentIndex = stepOrder.indexOf(step);
          const isActive = i <= currentIndex;
          const isCurrent = i === currentIndex;

          return (
            <div key={label} className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  isCurrent
                    ? "bg-blue-600 text-white"
                    : isActive
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {isActive && i < currentIndex ? (
                  <Check className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 4 && (
                <div
                  className={`mx-2 h-1 w-8 rounded ${
                    i < currentIndex ? "bg-blue-600" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* 日付選択 */}
      {step === "date" && (
        <div>
          <h2 className="mb-6 text-center text-xl font-bold">
            ご希望の日付を選択してください
          </h2>

          {availableSlots.length === 0 ? (
            <p className="text-center text-gray-600">
              現在予約可能な日程がありません。<br />
              お手数ですが、直接お問い合わせください。
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {availableSlots.map((day) => (
                <button
                  key={day.date}
                  onClick={() => handleDateSelect(day.date)}
                  className="rounded-lg border border-gray-200 p-4 text-left transition-colors hover:border-blue-500 hover:bg-blue-50"
                >
                  <div className="font-medium text-gray-900">
                    {formatDate(day.date)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {day.slots.length}件の空き
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 時間選択 */}
      {step === "time" && selectedDate && (
        <div>
          <button
            onClick={handleBack}
            className="mb-4 flex items-center text-blue-600 hover:underline"
          >
            <ChevronLeft className="h-4 w-4" />
            日付を変更
          </button>

          <h2 className="mb-2 text-center text-xl font-bold">
            {formatDate(selectedDate)}
          </h2>
          <p className="mb-6 text-center text-gray-600">
            ご希望の時間を選択してください
          </p>

          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
            {availableSlots
              .find((d) => d.date === selectedDate)
              ?.slots.map((slot) => (
                <button
                  key={slot.start}
                  onClick={() => handleTimeSelect(slot)}
                  className="rounded-lg border border-gray-200 p-4 text-center transition-colors hover:border-blue-500 hover:bg-blue-50"
                >
                  <div className="font-medium text-gray-900">
                    {formatTime(slot.start)}
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* 情報入力 */}
      {step === "form" && selectedSlot && (
        <div>
          <button
            onClick={handleBack}
            className="mb-4 flex items-center text-blue-600 hover:underline"
          >
            <ChevronLeft className="h-4 w-4" />
            時間を変更
          </button>

          <div className="mb-6 rounded-lg bg-blue-50 p-4 text-center">
            <span className="font-medium">
              {formatDate(selectedDate!)} {formatTime(selectedSlot.start)}〜
            </span>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                お名前 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="山田 太郎"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="example@email.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                電話番号
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="090-1234-5678"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                会社名・学校名
              </label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="株式会社〇〇"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                ご相談内容・ご質問
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="ご質問やご要望があればご記入ください"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700"
            >
              確認画面へ
            </button>
          </form>
        </div>
      )}

      {/* 確認 */}
      {step === "confirm" && selectedSlot && (
        <div>
          <h2 className="mb-6 text-center text-xl font-bold">
            ご予約内容の確認
          </h2>

          <div className="mb-6 space-y-4 rounded-lg bg-gray-50 p-6">
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-600">日時</span>
              <span className="font-medium">
                {formatDate(selectedDate!)} {formatTime(selectedSlot.start)}〜
              </span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-600">お名前</span>
              <span className="font-medium">{formData.name}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-600">メール</span>
              <span className="font-medium">{formData.email}</span>
            </div>
            {formData.phone && (
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-600">電話番号</span>
                <span className="font-medium">{formData.phone}</span>
              </div>
            )}
            {formData.company && (
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-600">会社名</span>
                <span className="font-medium">{formData.company}</span>
              </div>
            )}
            {formData.message && (
              <div>
                <span className="text-gray-600">ご相談内容</span>
                <p className="mt-1 whitespace-pre-wrap text-gray-900">
                  {formData.message}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleBack}
              className="flex-1 rounded-lg border border-gray-300 py-3 font-medium text-gray-700 hover:bg-gray-50"
            >
              修正する
            </button>
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="flex-1 rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  予約中...
                </span>
              ) : (
                "予約を確定する"
              )}
            </button>
          </div>
        </div>
      )}

      {/* 完了 */}
      {step === "complete" && bookingResult && (
        <div className="text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Check className="h-8 w-8 text-green-600" />
          </div>

          <h2 className="mb-4 text-2xl font-bold text-gray-900">
            ご予約ありがとうございます
          </h2>

          <p className="mb-6 text-gray-600">
            確認メールをお送りしましたのでご確認ください。
          </p>

          <div className="mb-8 rounded-lg bg-blue-50 p-6">
            <div className="mb-4 text-lg font-medium text-gray-900">
              {bookingResult.date}
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {bookingResult.time}〜
            </div>
            {bookingResult.meetingUrl && (
              <a
                href={bookingResult.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
              >
                Google Meetリンク
              </a>
            )}
          </div>

          <p className="text-sm text-gray-500">
            ご不明な点がございましたら、
            <a
              href="mailto:support@primamateria.co.jp"
              className="text-blue-600 hover:underline"
            >
              support@primamateria.co.jp
            </a>
            までお問い合わせください。
          </p>
        </div>
      )}
    </div>
  );
}
