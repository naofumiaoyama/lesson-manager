# Lesson Manager - Claude Code ガイド

## プロジェクト概要

PrimaMateria AIプログラミングスクールの生徒・レッスン管理システム。生徒情報の管理、Googleカレンダー連携によるスケジュール管理、自動メール送信機能を提供する。

## 関連ドキュメント

- `REQUIREMENTS.md` - 要件定義書
- `ARCHITECTURE.md` - アーキテクチャ設計書
- `../CLAUDE.md` - プロジェクト共通ルール（**必ず参照すること**）

## ディレクトリ構造

```
lesson-manager/
├── app/                     # Next.js App Router
│   ├── (auth)/              # 認証グループ
│   ├── admin/               # 管理者向けページ
│   ├── student/             # 生徒向けページ
│   └── api/                 # API Routes
├── components/              # 共通コンポーネント
│   ├── ui/                  # shadcn/ui
│   ├── layout/              # レイアウト
│   └── forms/               # フォーム
├── lib/                     # ユーティリティ・設定
├── server/                  # サーバーサイドロジック
│   ├── actions/             # Server Actions
│   ├── services/            # ビジネスロジック
│   ├── trpc/                # tRPCルーター
│   └── templates/           # メールテンプレート（React Email）
├── drizzle/                 # データベーススキーマ
│   ├── schema.ts
│   └── migrations/
└── types/                   # 型定義
```

## 技術スタック

### フレームワーク
- Next.js 15（App Router）
- React 19 + TypeScript 5

### フロントエンド
- Tailwind CSS 4
- shadcn/ui
- react-hook-form + zod（フォーム）
- date-fns（日付操作）

### バックエンド
- Server Components（データ取得）
- Server Actions（データ更新）
- tRPC 11（クライアントからの動的操作用）
- Drizzle ORM + PostgreSQL（Neon）
- NextAuth.js（認証）
- googleapis（Google Calendar）
- Resend + React Email（メール）

## コーディング規約

### TypeScript
- `strict: true` を使用
- `any` は禁止、必ず型を定義する
- 型定義は `types/index.ts` に集約

### コンポーネント
- 関数コンポーネントのみ使用
- Props の型は `interface` で定義
- ファイル名はPascalCase（例: `StudentList.tsx`）
- Server Components をデフォルトとし、必要な場合のみ `'use client'`

### データ取得パターン

**Server Components（推奨）:**
```typescript
// app/admin/students/page.tsx
import { db } from '@/lib/db';
import { students } from '@/drizzle/schema';

export default async function StudentsPage() {
  const studentList = await db.select().from(students);
  return <StudentList students={studentList} />;
}
```

**Server Actions（データ更新）:**
```typescript
// server/actions/students.ts
'use server';

import { revalidatePath } from 'next/cache';

export async function updateProfile(formData: FormData) {
  // バリデーション & DB更新
  revalidatePath('/student/profile');
}
```

**tRPC（クライアントからの動的操作）:**
```typescript
// カレンダーのドラッグ&ドロップなど、クライアント側で動的に操作が必要な場合
const { data } = trpc.lessons.list.useQuery({ startDate, endDate });
```

### データベース
- テーブル名は複数形スネークケース（例: `students`, `email_logs`）
- カラム名はキャメルケース（例: `stripeCustomerId`）
- 外部キーは `テーブル名単数Id`（例: `studentId`）
- `createdAt`, `updatedAt` は全テーブルに付与

### 認証・認可
- NextAuth.js を使用
- Middleware でルートを保護
- Server Actions / tRPC で認証状態を確認

```typescript
// middleware.ts
export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      if (req.nextUrl.pathname.startsWith('/admin')) {
        return token?.role === 'admin' || token?.role === 'super_admin';
      }
      return !!token;
    },
  },
});
```

### エラーハンドリング
- ビジネスロジックのエラーは Service 層で throw
- Server Actions ではエラーをキャッチして適切なレスポンスを返す
- クライアントには必要最小限のエラー情報のみ公開

### 命名規則
- Service: `xxxService`（例: `studentService`）
- Server Action: `xxxAction` または動詞形（例: `updateProfile`）
- Hook: `useXxx`（例: `useStudents`）

## 外部サービス連携

### Stripe Webhook
- エンドポイント: `/api/stripe/webhook`
- 署名検証必須
- 処理するイベント:
  - `checkout.session.completed` → 生徒登録
  - `customer.subscription.deleted` → 退会処理

### Google Calendar API
- OAuth 2.0 認証
- スコープ: `calendar`, `calendar.events`
- カレンダー操作は `CalendarService` に集約

### メール送信
- Resend API + React Email を使用
- テンプレートは `server/templates/` に React コンポーネントとして定義
- 送信ログは `email_logs` テーブルに保存

## 開発コマンド

```bash
# 開発サーバー起動
pnpm dev

# ビルド
pnpm build

# 本番起動
pnpm start

# 型チェック
pnpm check

# フォーマット
pnpm format

# Lint
pnpm lint

# テスト
pnpm test

# DBマイグレーション生成
pnpm db:generate

# DBマイグレーション適用
pnpm db:migrate

# DB スタジオ（GUI）
pnpm db:studio
```

## 環境変数

```env
# Database
DATABASE_URL=

# NextAuth
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Mail
RESEND_API_KEY=

# App
NODE_ENV=
```

## corporate-site との関係

- corporate-site の Stripe 決済完了時に本システムの Webhook が呼ばれる
- 認証システムは独立（NextAuth.js セッション）
- UI コンポーネント（shadcn/ui）は同じ設定を使用
- 将来的に corporate-site も Next.js に移行予定

## セキュリティ注意事項

- パスワードは必ず bcrypt でハッシュ化
- NextAuth.js のセッションは HttpOnly Cookie
- Stripe Webhook は署名検証必須
- Google OAuth トークンは安全に保存
- 生徒は自分のデータのみアクセス可能
- Server Actions は自動的に CSRF 対策済み
