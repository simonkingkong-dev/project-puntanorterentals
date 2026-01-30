# Explicación de cambios realizados

## Tests (9.1)

Se añadieron Jest y React Testing Library con:
- `jest.config.ts` (usa `next/jest`)
- `jest.setup.ts` (importa `@testing-library/jest-dom`)
- `__tests__/lib/utils/date.test.ts` (generateDateRange, calculateNights, isDateAvailable)
- `__tests__/app/properties/actions.test.ts` (tipo CreateReservationInput)
- Scripts en `package.json`: `"test": "jest"`, `"test:watch": "jest --watch"`

**Instalar dependencias de test** (si no están ya):
```bash
npm install -D jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/dom @types/jest
```
Luego: `npm run test`

---

## Carpeta api/webhooks vacía (11.1)

Tras eliminar el flujo obsoleto, la carpeta `app/api/webhooks` puede quedar vacía. Puedes borrarla manualmente:
- Windows: `rmdir /s /q app\api\webhooks`
- O eliminar la carpeta `app/api/webhooks` desde el explorador de archivos.

---


## 2.1 – Por qué existían los logs de credenciales y qué implica eliminarlos

**Por qué existían:**  
Se usaban para depurar el login del admin: ver en la consola del servidor si el usuario y la contraseña que llegaban desde el formulario coincidían con los valores esperados (leyendo `ADMIN_USERNAME` y `ADMIN_PASSWORD` del `.env`). Así se comprobaba rápido si el fallo era de env, de typo o de comparación.

**Qué implica eliminarlos:**  
- **Seguridad:** Las credenciales (incluida la contraseña) dejaban de imprimirse en logs. En producción, los logs pueden verse en plataformas de hosting o guardarse en servicios externos; exponer usuario y contraseña ahí es un riesgo alto.  
- **Depuración:** Si el login falla, ya no verás en consola “qué se envió” vs “qué se esperaba”. Para depurar sin volver a loguear credenciales puedes: (1) revisar que `ADMIN_USERNAME` y `ADMIN_PASSWORD` estén definidos en `.env.local`, (2) añadir temporalmente un log solo de “login fallido” sin datos (por ejemplo `console.log('Login failed')`) o (3) usar un breakpoint en `validateAdminCredentials` en tu IDE.

---

## 2.3 – Cómo mejorar la autenticación del admin (manual)

Hoy el admin se valida con usuario y contraseña en variables de entorno y una cookie de sesión. Para producción es más robusto usar **Firebase Auth** (o otro IdP) y distinguir admins con **custom claims**. Pasos resumidos:

1. **Habilitar Firebase Auth** en la consola (Email/Password o el proveedor que quieras).
2. **Crear usuarios admin** en Firebase Auth (consola o Admin SDK). Para marcarlos como admin:
   - Opción A: En una **Cloud Function** que se dispare al crear el usuario (o en un script con Admin SDK), llamar a `admin.auth().setCustomUserClaims(uid, { admin: true })`.
   - Opción B: Desde un script local (Node) con `firebase-admin`, después de crear el usuario, llamar a `setCustomUserClaims` con ese `uid`.
3. **En el front del admin (login):**  
   En lugar de enviar usuario/contraseña a tu API y que esta compare con env, hacer que el usuario inicie sesión con **Firebase Auth** en el cliente (`signInWithEmailAndPassword`) y obtener el **ID token** (`user.getIdToken()`).
4. **En tu API de login (o middleware):**  
   Recibir el ID token, verificarlo con `admin.auth().verifyIdToken(idToken)` y comprobar `decodedToken.admin === true`. Si es válido y es admin, crear la cookie de sesión como ahora (o la lógica que uses).
5. **Eliminar** la dependencia de `ADMIN_USERNAME` y `ADMIN_PASSWORD` en el servidor para el login; las credenciales pasan a estar solo en Firebase Auth.

Así las contraseñas no viven en env ni en tus logs, y quien puede entrar al admin queda definido por Firebase Auth + custom claims.

---

## 6.1 – Qué significa “condicionar logs a NODE_ENV === 'development'”

**Qué significa:**  
Solo ejecutar `console.log` (o `console.warn`) cuando la app corre en entorno de desarrollo. En Node/Next, `process.env.NODE_ENV` es `'development'` al hacer `npm run dev` y suele ser `'production'` en build/deploy. Si envuelves el log así:

```js
if (process.env.NODE_ENV === 'development') {
  console.log('...');
}
```

entonces ese mensaje **solo aparece en tu máquina** (o en entornos donde NODE_ENV sea `development`), y **no en producción**, evitando ruido y fugas de información en logs de producción.

**Qué se hizo:**  
Se quitaron logs que no aportan en producción (por ejemplo credenciales, “Procesando reserva…”, “Email enviado a…”). Los que se mantienen (por ejemplo un `console.warn` si falta FIREBASE_PRIVATE_KEY) se dejaron condicionados a `NODE_ENV === 'development'` donde aplica.
