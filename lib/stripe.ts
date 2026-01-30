import Stripe from 'stripe';

// Validamos que la clave secreta exista antes de iniciar
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is missing. Please add it to your .env.local file.');
}

// Inicializamos la instancia de SERVIDOR (Node.js)
// apiVersion debe coincidir con la que exige el paquete stripe instalado
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil',
  typescript: true,
});