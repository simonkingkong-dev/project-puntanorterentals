'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface ReviewFormProps {
  propertyId: string;
}

export default function ReviewForm({ propertyId }: ReviewFormProps) {
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Por favor selecciona una calificación');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, author, rating, text }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? 'Error al enviar la reseña');
        return;
      }

      setSubmitted(true);
      toast.success('¡Reseña enviada! Será publicada tras revisión.');
    } catch {
      toast.error('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-green-800 font-medium">¡Gracias por tu reseña!</p>
        <p className="text-green-700 text-sm mt-1">
          Será publicada después de ser revisada por nuestro equipo.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-gray-50 p-6">
      <h4 className="font-semibold text-gray-900">Deja tu reseña</h4>

      {/* Star rating */}
      <div>
        <Label className="text-sm text-gray-700 mb-1 block">Calificación</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="focus:outline-none"
              aria-label={`${star} estrellas`}
            >
              <Star
                className={`w-7 h-7 transition-colors ${
                  star <= (hovered || rating)
                    ? 'text-amber-500 fill-amber-500'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="review-author" className="text-sm text-gray-700">
          Tu nombre
        </Label>
        <Input
          id="review-author"
          value={author}
          onChange={e => setAuthor(e.target.value)}
          placeholder="Nombre (opcional)"
          maxLength={80}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="review-text" className="text-sm text-gray-700">
          Comentario <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="review-text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Cuéntanos tu experiencia..."
          required
          minLength={10}
          maxLength={1000}
          rows={4}
          className="mt-1"
        />
        <p className="text-xs text-gray-400 mt-1">{text.length}/1000</p>
      </div>

      <Button type="submit" disabled={loading || rating === 0} className="w-full">
        {loading ? 'Enviando...' : 'Enviar reseña'}
      </Button>
    </form>
  );
}
