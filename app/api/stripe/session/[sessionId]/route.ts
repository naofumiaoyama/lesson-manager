import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const stripe = getStripe();
    const { sessionId } = await params;

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["customer", "subscription"],
    });

    return NextResponse.json({
      customerEmail: (session.customer as Stripe.Customer)?.email,
      customerName: (session.customer as Stripe.Customer)?.name,
      status: session.status,
    });
  } catch (error) {
    console.error("Session retrieval error:", error);
    return NextResponse.json(
      { error: "セッション情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}
