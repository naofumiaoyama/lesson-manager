// プラン定義
export interface PlanConfig {
  id: string;
  name: string;
  description: string;
  price: number;
  priceLabel: string;
  interval: "month" | "year" | "one_time";
  features: string[];
}

export const plans: Record<string, PlanConfig> = {
  monthly: {
    id: "monthly",
    name: "AIプログラミングスクール",
    description: "月額プラン",
    price: 9900,
    priceLabel: "¥9,900",
    interval: "month",
    features: [
      "全コースへの無制限アクセス",
      "AIプログラミング実践カリキュラム",
      "生成AI活用とRAGシステム構築",
      "プロンプトエンジニアリング技術",
      "月1回のオンライン個別相談",
      "専用Discordコミュニティへの参加",
      "実践プロジェクトのサポート",
      "いつでも解約可能",
    ],
  },
  yearly: {
    id: "yearly",
    name: "AIプログラミングスクール",
    description: "年額プラン（2ヶ月分お得）",
    price: 99000,
    priceLabel: "¥99,000",
    interval: "year",
    features: [
      "全コースへの無制限アクセス",
      "AIプログラミング実践カリキュラム",
      "生成AI活用とRAGシステム構築",
      "プロンプトエンジニアリング技術",
      "月1回のオンライン個別相談",
      "専用Discordコミュニティへの参加",
      "実践プロジェクトのサポート",
      "2ヶ月分お得（年額）",
    ],
  },
};

export function getPlanConfig(planId: string): PlanConfig | null {
  return plans[planId] || null;
}
