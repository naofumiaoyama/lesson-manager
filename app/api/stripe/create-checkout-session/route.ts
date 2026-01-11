import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getPlanConfig } from "@/lib/plans";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, planId } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: "名前とメールアドレスは必須です" },
        { status: 400 }
      );
    }

    if (!planId) {
      return NextResponse.json(
        { error: "プランIDは必須です" },
        { status: 400 }
      );
    }

    const planConfig = getPlanConfig(planId);
    if (!planConfig) {
      return NextResponse.json(
        { error: "無効なプランIDです" },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    // Stripe顧客を作成または取得
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customer: Stripe.Customer;

    if (customers.data.length > 0) {
      customer = customers.data[0];
      // 名前を更新
      if (customer.name !== name) {
        customer = await stripe.customers.update(customer.id, { name });
      }
    } else {
      customer = await stripe.customers.create({ name, email });
    }

    const isSubscription = planConfig.interval !== "one_time";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customer.id,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: {
              name: planConfig.name,
              description: planConfig.description,
            },
            unit_amount: planConfig.price,
            ...(isSubscription && {
              recurring: {
                interval: planConfig.interval as "month" | "year",
              },
            }),
          },
          quantity: 1,
        },
      ],
      mode: isSubscription ? "subscription" : "payment",
      success_url: `${baseUrl}/apply/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/apply/${planId}`,
      metadata: {
        customerName: name,
        customerEmail: email,
        planId: planId,
      },
      locale: "ja",
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({
      sessionId: session.id,
      checkoutUrl: session.url,
    });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "決済セッションの作成に失敗しました" },
      { status: 500 }
    );
  }
}
