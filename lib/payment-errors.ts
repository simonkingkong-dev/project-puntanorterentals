import type { Currency } from "@/components/ui/currency-select";

export type PaymentErrorInput = {
  type?: string;
  code?: string;
  decline_code?: string;
  declineCode?: string;
  message?: string;
};

/**
 * Qué debe hacer el cliente:
 * - `change_currency`: la tarjeta no admite la moneda → cambiarla en el selector.
 * - `contact_bank`: el banco rechazó → hablar con el banco o reintentar.
 * - `other_method`: usar otra tarjeta u otro método.
 * - `retry`: revisar datos o reintentar.
 */
export type PaymentFailureAction = "change_currency" | "contact_bank" | "other_method" | "retry";

export type PaymentFailure = {
  action: PaymentFailureAction;
  title: string;
  message: string;
  /** Monedas que se ofrecen como alternativa (solo en `change_currency`). */
  alternativeCurrencies: Currency[];
};

type Locale = "es" | "en";

const ALL_CURRENCIES: Currency[] = ["USD", "MXN", "EUR"];

const BANK_DECLINE_CODES = new Set([
  "generic_decline",
  "do_not_honor",
  "do_not_try_again",
  "call_issuer",
  "transaction_not_allowed",
  "not_permitted",
  "service_not_allowed",
  "issuer_not_available",
  "try_again_later",
  "restricted_card",
  "security_violation",
  "withdrawal_count_limit_exceeded",
  "card_velocity_exceeded",
  "approve_with_id",
  "reenter_transaction",
  "new_account_information_available",
  "no_action_taken",
  "revocation_of_authorization",
  "stop_payment_order",
  "merchant_blacklist",
]);

const TEXT = {
  es: {
    titleCurrency: "Tu tarjeta no admite esta moneda",
    titleBank: "Tu banco rechazó la transacción",
    titleMethod: "No se pudo cobrar con este método de pago",
    titleRetry: "No se pudo completar el pago",
    currency: (cur: string, alts: string) =>
      `Tu tarjeta no admite cobros en ${cur}. Cambia la moneda en el selector de «Resumen de pago» (por ejemplo a ${alts}) o prueba con otro método de pago. No se te ha cobrado nada.`,
    bank:
      "Tu banco rechazó la transacción. Comunícate con tu banco para que la apruebe e inténtalo de nuevo, o prueba con otro método de pago. No se te ha cobrado nada.",
    funds:
      "La tarjeta no tiene fondos o límite suficiente. Prueba con otro método de pago. No se te ha cobrado nada.",
    expired: "La tarjeta ha caducado. Usa otra tarjeta u otro método de pago.",
    cvc: "El código de seguridad (CVC) no es correcto. Revísalo e inténtalo de nuevo.",
    number: "El número de la tarjeta no es válido. Revísalo e inténtalo de nuevo.",
    auth:
      "Tu banco necesita verificar el pago y no se completó la verificación. Inténtalo de nuevo y aprueba el cargo en la app de tu banco, o usa otro método de pago.",
    processing: "Ocurrió un error al procesar la tarjeta. Inténtalo de nuevo en unos minutos.",
    fallback: "No se pudo completar el pago. Inténtalo de nuevo o prueba con otro método de pago.",
  },
  en: {
    titleCurrency: "Your card doesn't support this currency",
    titleBank: "Your bank declined the transaction",
    titleMethod: "This payment method couldn't be charged",
    titleRetry: "The payment couldn't be completed",
    currency: (cur: string, alts: string) =>
      `Your card doesn't support charges in ${cur}. Change the currency using the selector in «Payment Summary» (for example to ${alts}) or try another payment method. You have not been charged.`,
    bank:
      "Your bank declined the transaction. Contact your bank so they can approve it and try again, or use another payment method. You have not been charged.",
    funds:
      "The card has insufficient funds or limit. Try another payment method. You have not been charged.",
    expired: "The card has expired. Use another card or payment method.",
    cvc: "The security code (CVC) is incorrect. Check it and try again.",
    number: "The card number is not valid. Check it and try again.",
    auth:
      "Your bank needs to verify the payment and verification was not completed. Try again and approve the charge in your bank app, or use another payment method.",
    processing: "There was an error processing the card. Try again in a few minutes.",
    fallback: "The payment couldn't be completed. Try again or use another payment method.",
  },
} as const;

/**
 * Traduce un error de Stripe (de `confirmPayment` o de `last_payment_error` del
 * PaymentIntent) a un mensaje claro y a la acción que debe tomar el cliente.
 */
export function describePaymentFailure(
  error: PaymentErrorInput,
  currentCurrency: Currency,
  locale: Locale = "es"
): PaymentFailure {
  const tx = TEXT[locale];
  const code = error.code ?? "";
  const decline = error.decline_code ?? error.declineCode ?? "";

  if (decline === "currency_not_supported" || code === "currency_not_supported") {
    const alternativeCurrencies = ALL_CURRENCIES.filter((c) => c !== currentCurrency);
    return {
      action: "change_currency",
      title: tx.titleCurrency,
      message: tx.currency(currentCurrency, alternativeCurrencies.join(" / ")),
      alternativeCurrencies,
    };
  }

  const make = (action: PaymentFailureAction, title: string, message: string): PaymentFailure => ({
    action,
    title,
    message,
    alternativeCurrencies: [],
  });

  if (decline === "insufficient_funds" || code === "insufficient_funds") {
    return make("other_method", tx.titleMethod, tx.funds);
  }
  if (code === "expired_card" || decline === "expired_card") {
    return make("other_method", tx.titleMethod, tx.expired);
  }
  if (code === "incorrect_cvc" || code === "invalid_cvc" || decline === "incorrect_cvc") {
    return make("retry", tx.titleRetry, tx.cvc);
  }
  if (code === "incorrect_number" || code === "invalid_number" || decline === "incorrect_number") {
    return make("retry", tx.titleRetry, tx.number);
  }
  if (
    code === "authentication_required" ||
    code === "payment_intent_authentication_failure" ||
    decline === "authentication_required"
  ) {
    return make("contact_bank", tx.titleBank, tx.auth);
  }
  if (code === "processing_error") {
    return make("retry", tx.titleRetry, tx.processing);
  }
  if (BANK_DECLINE_CODES.has(decline)) {
    return make("contact_bank", tx.titleBank, tx.bank);
  }
  if (code === "card_declined" || decline) {
    // Rechazo de tarjeta sin motivo concreto (incluye robada/perdida/fraude: Stripe
    // recomienda no revelar el motivo real al cliente).
    return make("contact_bank", tx.titleBank, tx.bank);
  }

  // Los mensajes crudos de Stripe vienen en inglés: solo se muestran tal cual en inglés.
  const raw = locale === "en" ? error.message?.trim() : "";
  return make("other_method", tx.titleRetry, raw || tx.fallback);
}
