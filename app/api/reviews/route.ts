import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/reviews
 * Crea una reseña para una propiedad. Requiere propertyId, author, rating y text.
 * Las reseñas quedan en estado 'pending' hasta que el admin las apruebe.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { propertyId, author, rating, text } = body;

    if (!propertyId || !author || !rating || !text) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: propertyId, author, rating, text' },
        { status: 400 },
      );
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'El rating debe ser un número entre 1 y 5' },
        { status: 400 },
      );
    }

    if (text.trim().length < 10) {
      return NextResponse.json(
        { error: 'La reseña debe tener al menos 10 caracteres' },
        { status: 400 },
      );
    }

    // Verificar que la propiedad existe
    const propertySnap = await adminDb.collection('properties').doc(propertyId).get();
    if (!propertySnap.exists) {
      return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 });
    }

    const reviewData = {
      propertyId,
      author: author.trim(),
      rating,
      text: text.trim(),
      status: 'pending', // Admin debe aprobar antes de mostrar
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('reviews').add(reviewData);

    return NextResponse.json(
      { id: docRef.id, message: 'Reseña enviada. Será publicada tras revisión.' },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * GET /api/reviews?propertyId=xxx
 * Devuelve las reseñas aprobadas de una propiedad.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get('propertyId');

  if (!propertyId) {
    return NextResponse.json({ error: 'propertyId es requerido' }, { status: 400 });
  }

  try {
    const snapshot = await adminDb
      .collection('reviews')
      .where('propertyId', '==', propertyId)
      .where('status', '==', 'approved')
      .orderBy('createdAt', 'desc')
      .get();

    const reviews = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        author: data.author,
        rating: data.rating,
        text: data.text,
        date: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
      };
    });

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
