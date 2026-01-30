import nodemailer from 'nodemailer';
import { Reservation } from './types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !port || !user || !pass) {
    throw new Error(
      'Variables de email faltantes. Añade SMTP_HOST, SMTP_PORT, SMTP_USER y SMTP_PASS en .env.local (ver .env.local.example).'
    );
  }
  return nodemailer.createTransport({
    host,
    port: Number(port),
    secure: true,
    auth: { user, pass },
  });
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getOrCreateTransporter() {
  if (!transporter) transporter = getTransporter();
  return transporter;
}

export async function sendConfirmationEmail(reservation: Reservation) {
  const { guestName, guestEmail, checkIn, checkOut, totalAmount, id } = reservation;
  
  const formattedCheckIn = format(new Date(checkIn), "d 'de' MMMM, yyyy", { locale: es });
  const formattedCheckOut = format(new Date(checkOut), "d 'de' MMMM, yyyy", { locale: es });

  const transport = getOrCreateTransporter();
  try {
    await transport.sendMail({
      from: `"Punta Norte Rentals" <${process.env.SMTP_USER}>`,
      to: guestEmail,
      subject: "¡Tu reserva está confirmada! 🌴",
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #f97316;">¡Gracias por tu reserva, ${guestName}!</h1>
          <p>Estamos emocionados de recibirte. Aquí están los detalles de tu estancia:</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>ID de Reserva:</strong> ${id}</p>
            <p><strong>Check-in:</strong> ${formattedCheckIn}</p>
            <p><strong>Check-out:</strong> ${formattedCheckOut}</p>
            <p><strong>Total Pagado:</strong> $${totalAmount} USD</p>
          </div>

          <p>Si tienes alguna pregunta, responde a este correo.</p>
          <p>¡Nos vemos pronto!</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <small style="color: #666;">Punta Norte Rentals</small>
        </div>
      `,
    });
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Mail] Confirmación enviada a ${guestEmail}`);
    }
  } catch (error) {
    console.error('[Mail] Error enviando email:', error);
    // No lanzamos error para no romper el flujo del webhook, pero lo registramos
  }
}