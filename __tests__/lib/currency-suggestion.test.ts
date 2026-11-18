import { suggestCurrency } from '@/lib/currency-suggestion';

describe('suggestCurrency', () => {
  it('México → MXN', () => {
    expect(suggestCurrency({ timeZone: 'America/Mexico_City' })).toBe('MXN');
    expect(suggestCurrency({ timeZone: 'America/Cancun' })).toBe('MXN');
  });

  it('Europa → EUR', () => {
    expect(suggestCurrency({ timeZone: 'Europe/Madrid' })).toBe('EUR');
    expect(suggestCurrency({ timeZone: 'Europe/Berlin' })).toBe('EUR');
    expect(suggestCurrency({ timeZone: 'Atlantic/Canary' })).toBe('EUR');
  });

  it('Estados Unidos y resto del mundo → USD', () => {
    expect(suggestCurrency({ timeZone: 'America/New_York' })).toBe('USD');
    expect(suggestCurrency({ timeZone: 'America/Los_Angeles' })).toBe('USD');
    expect(suggestCurrency({ timeZone: 'America/Bogota' })).toBe('USD');
    expect(suggestCurrency({ timeZone: 'Asia/Tokyo' })).toBe('USD');
  });

  it('sin zona horaria usa la región del idioma', () => {
    expect(suggestCurrency({ languages: ['es-MX'] })).toBe('MXN');
    expect(suggestCurrency({ languages: ['fr-FR'] })).toBe('EUR');
    expect(suggestCurrency({ languages: ['en-US'] })).toBe('USD');
  });

  it('la zona horaria manda sobre el idioma', () => {
    // Turista estadounidense en México con el teléfono en inglés.
    expect(suggestCurrency({ timeZone: 'America/Mexico_City', languages: ['en-US'] })).toBe('MXN');
  });

  it('sin datos → USD', () => {
    expect(suggestCurrency({})).toBe('USD');
    expect(suggestCurrency({ languages: ['es'] })).toBe('USD');
  });
});
