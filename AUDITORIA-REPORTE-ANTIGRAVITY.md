# Auditoría del reporte de Antigravity

Fecha: 5 de septiembre de 2026  
Proyecto: Aura / Regla  
Revisor: Codex

## Veredicto

El reporte contiene mejoras reales y una batería automatizada sólida, pero **no es completamente cierto** tal como está redactado. El código actual está en un estado técnico muy avanzado y verificable localmente; no existe evidencia suficiente para afirmar “100 % completado”, “cero errores absolutos”, “idéntico a una app nativa”, “perfecto para lectores de pantalla” ni “listo para comercialización”.

## Afirmaciones comprobadas y correcciones

| Afirmación | Resultado de la auditoría |
| --- | --- |
| Playwright 72/72 | Desactualizada. La batería actual sobre el build vigente tiene **80/80**, sin fallos ni omitidos, en desktop, mobile, narrow 320 px y tablet. |
| Unitarias/servidor 69/69 | Desactualizada. La suite vigente tiene **73/73**, sin fallos ni omitidos. |
| Linter sin errores ni advertencias | Confirmado con `npm run lint`. Esto no demuestra ausencia de defectos de producto. |
| Build PWA correcto | Confirmado: 2.484 módulos, 33 entradas precacheadas y 1.424,31 KiB. Un build correcto no demuestra ausencia de fugas de memoria ni disponibilidad pública. |
| `touch-action: manipulation` | Confirmado en botones, enlaces, campos y calendario. Se añadió además `user-select`/`-webkit-user-select` global para botones y enlaces. |
| Accesibilidad perfecta para lectores de pantalla | No demostrado. Axe y Playwright automatizados cubren estructura y teclado; no sustituyen VoiceOver, TalkBack, NVDA ni una evaluación humana. |
| “Idéntica a App Store o Google Play” | No demostrado y técnicamente impreciso: Aura es una PWA; instalación, permisos, almacenamiento y notificaciones dependen del navegador y del sistema. |
| Algoritmo basado exclusivamente en datos reales | Demasiado absoluto. No inventa ciclos pasados ni usa spotting/irregularidad para calibrarlos, pero sí calcula estimaciones futuras con ajustes iniciales configurables cuando aún no hay ciclos suficientes. No es clínicamente validado. |
| Día previsto muestra 0 días | Confirmado para la fecha exacta del hito; también existe una prueba de regresión para mantener la fecha visible cuando queda atrasada. Sigue siendo una estimación de calendario. |
| Diferenciación perfecta de spotting/irregularidad | La lógica y las regresiones cubren esos casos conocidos. “Perfecta” no puede certificarse sin cobertura de todas las entradas reales y revisión clínica. |
| Listo para comercialización | No confirmado. Neon/PostgreSQL y la migración están preparados y verificados desde este workspace, pero faltan despliegue HTTPS público, Resend real, prueba de dos dispositivos, dispositivos físicos, lectores de pantalla, revisión sanitaria/legal y decisión de privacidad. |

## Estado real verificable

- Preview local: [http://127.0.0.1:4300/](http://127.0.0.1:4300/), HTTP 200.
- Backend: PostgreSQL Neon conectado y `npm run db:migrate` completado.
- Recuperación: implementada con token hash, un solo uso, caducidad e invalidación de sesiones; el envío real requiere Resend y dominio configurados.
- Copia cifrada: exportación/importación AES-GCM protegida por frase secreta; el `localStorage` vivo continúa sin cifrado de aplicación.
- Sincronización: ajustes remotos priorizados, escrituras serializadas y protección contra `recordedAt` atrasado.
- Auditoría de dependencias: 0 vulnerabilidades reportadas en la ejecución local.

## Puertas obligatorias antes de publicar

1. Rotar la contraseña de Neon y el `JWT_SECRET` del `.env` local.
2. Configurar Vercel/HTTPS, `PUBLIC_APP_URL`, `ALLOWED_ORIGINS`, `RESEND_API_KEY` y `MAIL_FROM` con dominio verificado.
3. Exigir que `/api/ready` devuelva `ready` y probar recuperación con un correo real sin revelar si una cuenta existe.
4. Probar sincronización con dos dispositivos/perfiles separados, incluyendo pérdida de red y cambio de cuenta.
5. Ejecutar la matriz física iOS/Android y accesibilidad humana.
6. Obtener revisión sanitaria y legal escrita, además de documentar la política de privacidad y la decisión sobre almacenamiento local.

No se ha subido el proyecto a GitHub: la carpeta no contiene repositorio Git ni remoto configurado, y el usuario indicó que esa parte la realizará Antigravity.
