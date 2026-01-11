"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import type { PlanConfig } from "@/lib/plans";

interface ApplyFormProps {
  plan: PlanConfig;
}

export default function ApplyForm({ plan }: ApplyFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          planId: plan.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "エラーが発生しました");
      }

      // Stripe Checkout ページにリダイレクト
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("決済ページのURLが取得できませんでした");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border-2 border-primary/30 p-8">
      <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
        <CreditCard className="h-6 w-6 text-primary" />
        お申し込みフォーム
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium">
            お名前 <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            placeholder="山田 太郎"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium">
            メールアドレス <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            placeholder="example@email.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
          />
          <p className="text-xs text-muted-foreground">
            決済完了後、このメールアドレスにログイン情報をお送りします
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              "処理中..."
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                決済画面に進む
              </>
            )}
          </button>
        </div>

        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            お申し込みにより、
            <a href="https://primamateria.co.jp/terms" className="text-primary hover:underline">利用規約</a>
            および
            <a href="https://primamateria.co.jp/privacy" className="text-primary hover:underline">プライバシーポリシー</a>
            に同意したものとみなされます。
          </p>
          <p className="text-xs text-muted-foreground">
            決済はStripeにより安全に処理されます。
          </p>
        </div>
      </form>
    </div>
  );
}
