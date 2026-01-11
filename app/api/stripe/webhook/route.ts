import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { students } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { sendAccountCreationEmail, sendPaymentFailedEmail } from "@/server/services/mail.service";
import crypto from "crypto";
import bcrypt from "bcryptjs";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not set" },
      { status: 500 }
    );
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === "subscription" && session.customer) {
          const customerId =
            typeof session.customer === "string"
              ? session.customer
              : session.customer.id;

          // 顧客情報を取得
          const customer = await stripe.customers.retrieve(customerId);

          if (customer.deleted) {
            break;
          }

          const email = customer.email;
          const name = customer.name || customer.email?.split("@")[0] || "名前未設定";

          if (!email) {
            console.error("Customer email not found");
            break;
          }

          // 既存の生徒をチェック
          const existingStudent = await db
            .select()
            .from(students)
            .where(eq(students.email, email))
            .limit(1);

          // サブスクリプション情報を取得してプランを判定
          const subscriptionId = session.subscription as string;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const plan = subscription.items.data[0]?.price.recurring?.interval === "year"
            ? "yearly"
            : "monthly";

          if (existingStudent.length > 0) {
            // 既存生徒を再有効化
            await db
              .update(students)
              .set({
                status: "active",
                stripeCustomerId: customerId,
                plan: plan as "monthly" | "yearly",
              })
              .where(eq(students.email, email));
            console.log(`Reactivated student: ${email}`);
          } else {
            // 新規生徒を作成（仮パスワード生成）
            const tempPassword = crypto.randomBytes(12).toString("base64url");
            const passwordHash = await bcrypt.hash(tempPassword, 10);

            const [newStudent] = await db
              .insert(students)
              .values({
                stripeCustomerId: customerId,
                email,
                name,
                plan: plan as "monthly" | "yearly",
                status: "active",
                passwordHash,
              })
              .returning();

            console.log(`Created new student: ${email}`);

            // アカウント作成完了メールを送信
            try {
              await sendAccountCreationEmail(newStudent, tempPassword);
            } catch (emailError) {
              console.error("Failed to send account creation email:", emailError);
            }
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        // 生徒のステータスを退会に更新
        await db
          .update(students)
          .set({ status: "withdrawn" })
          .where(eq(students.stripeCustomerId, customerId));
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("Payment failed for invoice:", invoice.id);

        // 生徒に支払い失敗通知を送信
        const failedCustomerId = typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;

        if (failedCustomerId) {
          const student = await db
            .select()
            .from(students)
            .where(eq(students.stripeCustomerId, failedCustomerId))
            .limit(1);

          if (student.length > 0) {
            try {
              await sendPaymentFailedEmail(student[0]);
            } catch (emailError) {
              console.error("Failed to send payment failed email:", emailError);
            }
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
