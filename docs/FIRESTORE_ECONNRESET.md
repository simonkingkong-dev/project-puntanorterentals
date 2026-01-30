# Error Firestore: ECONNRESET / UNAVAILABLE

Si ves en consola:

```
@firebase/firestore: Firestore (x.x.x): GrpcConnection RPC 'Listen' stream ... error. Code: 14 Message: 14 UNAVAILABLE: read ECONNRESET
```

**Qué significa:** La conexión entre tu app y los servidores de Firestore (Google) se está cerrando de forma inesperada. El código **14 UNAVAILABLE** y **ECONNRESET** indican un fallo de red o de entorno, no un bug en tu código.

## Causas habituales

1. **Firewall o antivirus**  
   Bloquea o cierra conexiones largas (gRPC) a `*.firestore.googleapis.com`. Prueba desactivar temporalmente o añadir una excepción.

2. **VPN o proxy**  
   Algunas VPNs/proxies cortan o alteran el tráfico. Prueba sin VPN o con otra red.

3. **Red inestable o restrictiva**  
   WiFi débil, redes corporativas o de universidad que limitan conexiones a servicios externos.

4. **Variables de entorno incorrectas**  
   Si `NEXT_PUBLIC_FIREBASE_*` apuntan a otro proyecto o están mal, las peticiones pueden fallar. Revisa `.env.local` y la consola de Firebase.

## Qué hacer

- Comprobar que **Firestore está habilitado** en la consola de Firebase para tu proyecto.
- Probar en **otra red** (por ejemplo, datos del móvil o otro WiFi).
- Si usas **Windows**, comprobar que el firewall no esté bloqueando Node/Chrome.
- En **producción** (Vercel, etc.), este error suele no aparecer; si solo pasa en local, es típico de red/firewall del equipo.

La aplicación puede seguir funcionando: muchas peticiones se completan antes de que se cierre la conexión. Si las páginas cargan pero ves el error de forma puntual, suele ser aceptable en desarrollo; si las lecturas/escrituras fallan a menudo, revisa red y firewall primero.
