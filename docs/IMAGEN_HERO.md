# Imagen del Hero (inicio)

La página de inicio usa actualmente una imagen de Unsplash como fondo del hero. Para no depender de un servicio externo y controlar caché y disponibilidad:

1. **Descarga la imagen** desde:
   ```
   https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=2070&auto=format&fit=crop
   ```
   (Clic derecho > Guardar imagen como…)

2. **Guárdala en el proyecto** como:
   ```
   public/images/hero.jpg
   ```
   (Crea la carpeta `public/images` si no existe.)

3. **Cambia en** `app/(public)/page.tsx` la línea del hero:
   - De: `src="https://images.unsplash.com/..."`
   - A: `src="/images/hero.jpg"`

Opcional: sube la imagen a Firebase Storage, obtén la URL y usa esa URL en `src` (asegúrate de tener ese dominio en `next.config.js` > `images.remotePatterns`).
