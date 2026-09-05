# Aura: plan de salida a producción

Este documento convierte los límites de la revisión en una lista ejecutable. El código puede desplegar el frontend y el backend real cuando se configuren un origen HTTPS, Neon/PostgreSQL y un proveedor de correo. No se debe publicar con secretos del archivo `.env` actual: hay que rotar la contraseña de base de datos y crear un `JWT_SECRET` aleatorio nuevo antes de continuar.

## Arquitectura preparada

- Frontend React/Vite y función `/api` de Vercel en un mismo dominio.
- La función de Vercel delega al backend Express real cuando existen `DATABASE_URL` y `JWT_SECRET`; sin ellos continúa cerrada y devuelve 503.
- PostgreSQL almacena perfiles y registros por usuario. Las consultas usan el propietario autenticado y las sesiones JWT están limitadas por emisor, audiencia, algoritmo y versión de autenticación.
- Recuperación de cuenta mediante Resend: token aleatorio de un solo uso, almacenado únicamente como SHA-256, caducidad de 30 minutos, enlace HTTPS y revocación de sesiones anteriores al cambiar contraseña.
- `GET /api/ready` solo devuelve 200 cuando la base de datos responde y el correo de recuperación está configurado.

## Variables de producción

Configurar en el proveedor, nunca en el repositorio:

```text
NODE_ENV=production
DATABASE_URL=postgresql://... ?sslmode=require
JWT_SECRET=<32+ bytes aleatorios, distinto del entorno local>
PUBLIC_APP_URL=https://aura.tudominio.com
ALLOWED_ORIGINS=https://aura.tudominio.com
VITE_API_BASE_URL=/api
RESEND_API_KEY=re_...
MAIL_FROM=Aura <no-reply@tudominio.com>
```

El dominio del remitente debe estar verificado en Resend y el dominio web debe usar HTTPS. No reutilizar la contraseña que aparece en el `.env` local; revocarla en Neon aunque el archivo esté ignorado por Git.

## Despliegue de base de datos

Desde un entorno de mantenimiento con las variables de producción cargadas:

```bash
npm ci
npm run db:migrate
curl -fsS https://aura.tudominio.com/api/ready
npm run lint
npm test
npm run build
```

La respuesta esperada de `/api/ready` contiene `status: "ready"`, `database: "ready"` y `recovery: "configured"`. El script es idempotente y crea las tablas/índices necesarios, incluida la invalidación de sesiones y los tokens de recuperación.

## Prueba de recuperación

1. Crear una cuenta de prueba con un buzón controlado.
2. Solicitar recuperación con un correo existente y otro inexistente; ambos deben responder igual para no revelar cuentas.
3. Abrir el enlace recibido, guardar una contraseña nueva y comprobar que el enlace usado vuelve a fallar.
4. Confirmar que una sesión anterior deja de funcionar y que la nueva contraseña permite iniciar sesión.
5. Revisar que no aparecen tokens en logs, métricas, URLs persistidas ni correos de prueba.

## Prueba de sincronización entre dispositivos

Usar dos perfiles de navegador o un teléfono y un ordenador, ambos con la misma cuenta:

1. Registrar una nota, regla, síntoma y ajuste en el dispositivo A.
2. Esperar a que la petición termine y abrir/refrescar el dispositivo B.
3. Editar el mismo día en B y comprobar que el registro más reciente conserva sus campos completos en A.
4. Repetir sin red: el cambio debe permanecer local y aparecer como pendiente de sincronización al recuperar conexión.
5. Cerrar sesión, cambiar de cuenta y confirmar que ningún registro de la cuenta anterior aparece.

La sincronización existente conserva los registros locales y serializa escrituras. Para una edición simultánea del mismo día, el servidor acepta la versión con `recordedAt` más reciente y no deja que una petición atrasada sobrescriba una edición posterior. Sigue siendo necesario ejecutar la prueba con dos dispositivos reales y documentar cualquier conflicto de negocio más complejo.

## Dispositivos y accesibilidad humana

No se puede certificar esta parte desde Playwright. Antes de publicar, registrar una matriz con:

- Safari iOS actual y una versión anterior compatible; instalación PWA, teclado, VoiceOver, zoom 200 %, orientación y pérdida de conexión.
- Chrome Android actual; instalación, TalkBack, teclado virtual, rotación, ahorro de batería y vuelta desde segundo plano.
- Chrome/Edge/Safari de escritorio; lector NVDA/VoiceOver, navegación solo con teclado, zoom 200 % y alto contraste del sistema.
- Cada flujo: alta, inicio, recuperación, registro de regla, edición/borrado, exportación, importación, eliminar datos, cerrar sesión y cambio de cuenta.

Guardar fecha, dispositivo, versión, resultado y captura solo cuando no contenga datos de salud reales.

## Revisión sanitaria y legal

Antes de hacer pública la aplicación, un profesional sanitario debe revisar el motor de calendario, mensajes de sangrado, fertilidad, anticoncepción, embarazo, biomarcadores, medicación y derivación urgente. Un profesional legal/privacidad debe revisar RGPD/LOPDGDD, base jurídica y consentimiento, encargados de tratamiento, retención, exportación, borrado, transferencias internacionales, cookies, analítica, términos y política de privacidad.

Las estimaciones no deben presentarse como diagnóstico, confirmación de ovulación ni método anticonceptivo. La publicación queda bloqueada hasta conservar la aprobación escrita y la versión exacta revisada.

## Privacidad y copias

El modo local continúa guardando datos en el navegador. La exportación JSON no es un backup automático ni está cifrada por defecto; borrar datos del navegador puede eliminarla. Para publicar hay que elegir una de estas decisiones y documentarla:

1. Mantener modo privado local solo con una advertencia clara y exigir exportación manual cifrada antes de abandonar el dispositivo.
2. Integrar un almacén local cifrado con una clave derivada de una frase secreta que la usuaria conserve; si se pierde la frase, no hay recuperación.
3. Desactivar el modo local en producción y exigir cuenta sincronizada, con política de retención y borrado verificadas.

No afirmar “cifrado de grado nativo” mientras no exista una prueba de almacenamiento cifrado, gestión de claves, restauración y borrado. El archivo `src/services/cryptoVault.ts` sirve como base para copias cifradas, pero no está conectado automáticamente al almacenamiento diario.

## Criterio de publicación

Publicar solo cuando `/api/ready` sea `ready`, la recuperación haya sido probada con correo real, la sincronización haya sido probada con dos dispositivos, la matriz física de accesibilidad esté firmada, la revisión sanitaria/legal esté aprobada y la decisión de privacidad esté implementada y documentada. Si uno de esos puntos falla, mantener Aura en modo privado o staging.
