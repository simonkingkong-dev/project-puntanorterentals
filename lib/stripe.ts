import Stripe from 'stripe';

let _stripe: Stripe | null = null;

// Crea un stub de Stripe que permite el build pero falla en runtime cuando se usa
function createStripeStub(): Stripe {
  const errorMsg = 'STRIPE_SECRET_KEY is missing. Please configure it in Firebase App Hosting environment variables.';
  const stubHandler = {
    get(_target: unknown, prop: string | symbol) {
      // Retornamos otro Proxy para manejar propiedades anidadas (ej: paymentIntents.retrieve)
      return new Proxy(() => {}, {
        get(_target, nestedProp: string | symbol) {
          return stubHandler.get(_target, nestedProp);
        },
        apply() {
          throw new Error(errorMsg);
        },
      });
    },
  };
  return new Proxy({} as Stripe, stubHandler);
}

function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      // Si no hay STRIPE_SECRET_KEY, retornamos un stub que permite el build
      // pero fallará cuando se intente usar en runtime
      return createStripeStub();
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil',
      typescript: true,
    });
  }
  return _stripe;
}

// Lazy: solo se inicializa al primer uso (evita fallar durante next build)
// Durante build sin STRIPE_SECRET_KEY, el stub permite que el build continúe
// El error se lanzará solo cuando se intente usar Stripe en runtime
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    const real = getStripe();
    const val = (real as Record<string, unknown>)[prop as string];
    if (typeof val === 'function') return (val as (...args: unknown[]) => unknown).bind(real);
    return val;
  },
});