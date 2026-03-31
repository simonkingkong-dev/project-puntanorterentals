import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

const MXN_MARGIN = 0.2;

async function getUsdMxnRate(): Promise<number> {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=MXN', {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error('Exchange API error');
    const data = (await res.json()) as { rates?: { MXN?: number } };
    const officialRate = data.rates?.MXN;
    if (typeof officialRate !== 'number' || !Number.isFinite(officialRate) || officialRate <= 0) {
      throw new Error('Invalid MXN rate');
    }
    return officialRate + MXN_MARGIN;
  } catch {
    const fallback = Number(process.env.USD_MXN_RATE) || 17.2;
    return fallback + MXN_MARGIN;
  }
}

async function getUsdEurRate(): Promise<number> {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR', {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error('Exchange API error');
    const data = (await res.json()) as { rates?: { EUR?: number } };
    const officialRate = data.rates?.EUR;
    if (typeof officialRate !== 'number' || !Number.isFinite(officialRate) || officialRate <= 0) {
      throw new Error('Invalid EUR rate');
    }
    return officialRate;
  } catch {
    return Number(process.env.USD_EUR_RATE) || 0.92;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { amount, currency = 'usd', reservationId, modification } = await request.json();
    const requestedCurrency = String(currency || 'usd').toLowerCase();
    const normalizedCurrency =
      requestedCurrency === 'mxn' || requestedCurrency === 'eur' ? requestedCurrency : 'usd';

    // Validate amount (Stripe minimum is $0.50 USD)
    if (!amount || amount < 0.5) {
      return NextResponse.json(
        { error: 'El monto debe ser de al menos $0.50 USD' },
        { status: 400 }
      );
    }

    // Create payment intent
    const metadata: Record<string, string> = {
      reservationId: reservationId || '',
      baseAmountUsd: String(Number(amount)),
      chargeCurrency: normalizedCurrency.toUpperCase(),
    };
    if (modification === true || modification === '1') metadata.modification = '1';
    let chargeAmount = Number(amount);
    if (normalizedCurrency === 'mxn') {
      const rate = await getUsdMxnRate();
      chargeAmount = Number(amount) * rate;
      metadata.usdMxnRateApplied = String(rate);
    } else if (normalizedCurrency === 'eur') {
      const rate = await getUsdEurRate();
      chargeAmount = Number(amount) * rate;
      metadata.usdEurRateApplied = String(rate);
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(chargeAmount * 100), // smallest currency unit
      currency: normalizedCurrency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}