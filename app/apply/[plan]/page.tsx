"use client";

import { useParams } from "next/navigation";
import { plans, type PlanConfig } from "@/lib/plans";
import ApplyForm from "../apply-form";
import { ArrowLeft, Check, Shield } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default function ApplyPage() {
  const params = useParams();
  const planId = params.plan as string;
  const plan = plans[planId];

  if (!plan) {
    notFound();
  }

  const intervalLabel = plan.interval === "month" ? "/月" : plan.interval === "year" ? "/年" : "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container max-w-5xl mx-auto px-4 py-12">
        {/* Back Link */}
        <div className="mb-8">
          <Link
            href="https://primamateria.co.jp/services"
            className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            サービス詳細に戻る
          </Link>
        </div>

        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            {plan.name}
          </h1>
          <p className="text-xl text-muted-foreground">
            {plan.description}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Plan Summary */}
          <div className="bg-white rounded-xl shadow-sm border p-8">
            <h2 className="text-2xl font-semibold mb-6">プラン内容</h2>

            <div className="text-center pb-6 border-b mb-6">
              <div className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">
                {plan.description}
              </div>
              <div className="text-4xl font-bold text-primary">
                {plan.priceLabel}
                <span className="text-lg text-muted-foreground font-normal">{intervalLabel}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                税込価格{plan.interval !== "one_time" && " / いつでも解約可能"}
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {plan.features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-foreground text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>安全な決済システム（Stripe）</span>
              </div>
            </div>
          </div>

          {/* Application Form */}
          <ApplyForm plan={plan} />
        </div>
      </div>
    </div>
  );
}
