import type { CreateReservationInput } from '@/app/(public)/properties/actions';

describe('CreateReservationInput type', () => {
  it('has required fields for a reservation', () => {
    const valid: CreateReservationInput = {
      propertyId: 'prop-1',
      guestName: 'Juan',
      guestEmail: 'juan@test.com',
      guestPhone: '+52 123',
      checkIn: new Date('2025-02-01'),
      checkOut: new Date('2025-02-03'),
      guests: 2,
      totalAmount: 350,
    };
    expect(valid.propertyId).toBe('prop-1');
    expect(valid.totalAmount).toBe(350);
    expect(valid.guests).toBe(2);
  });
});
