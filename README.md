# Aura · Ciclo menstrual

Aura es una app React/Vite para registrar ciclo menstrual, síntomas, bienestar diario, biomarcadores, intimidad, medicación y exportaciones médicas. Está pensada como experiencia mobile-first con funcionamiento local y soporte opcional para API sincronizada.

## Estado actual

- Frontend: React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion y PWA.
- Datos locales: `localStorage` para ajustes y registros diarios.
- API local opcional: `server/index.js` con PostgreSQL, bcrypt y JWT.
- API Vercel mínima: `api/index.js`, sin autenticación simulada; devuelve error seguro si el backend sincronizado no está configurado.

## Desarrollo

```bash
npm install
npm run dev
```

Para levantar frontend y servidor local juntos:

```bash
npm run dev:full
```

## Verificación

```bash
npm run lint
npm run build
npm test
npm run test:e2e
npm run test:selenium
```

## Variables de entorno

Copia `.env.example` a `.env` y configura:

- `DATABASE_URL`: conexión PostgreSQL para el servidor local.
- `JWT_SECRET`: secreto aleatorio de al menos 32 caracteres para firmar sesiones.
- `ALLOWED_ORIGINS`: orígenes permitidos del frontend, separados por comas.
- `VITE_API_BASE_URL`: base de API; usa `/api` para despliegue monodominio o una URL completa para servidor externo.
- `NODE_ENV`: usa `production` en el despliegue público.
- `PUBLIC_APP_URL`: origen HTTPS exacto que recibirá los enlaces de recuperación.
- `ALLOWED_ORIGINS`: lista separada por comas de orígenes HTTPS permitidos.
- `RESEND_API_KEY` y `MAIL_FROM`: proveedor y remitente verificado para recuperación de cuenta.

## Prompts de Helen aplicables

La referencia de Helen está en `.helen-reference` y queda ignorada por git. Para esta app encajan sobre todo:

- `full-polish`: pulido de UX, visual, responsive, accesibilidad y verificación rápida.
- `ux-visual-pass`: revisión del flujo principal, estados y microcopy.
- `security-hardening`: revisión de secretos, auth, entradas y dependencias.
- `release-candidate`: build, lint, SEO/PWA, seguridad y checklist final antes de publicar.
- `client-delivery`: revisión de última milla, documentación y preparación de entrega.

No conviene aplicar directamente los prompts de 3D, shaders, landing hero o conversión: Aura es una herramienta íntima de salud, así que necesita calma, claridad, privacidad y fiabilidad antes que espectáculo visual.

## Uso sin conexión

Tras una primera carga completa con conexión, la PWA conserva el código, los iconos y todas las herramientas. Diario, calendario, tendencias, temperatura, medicación, perfil, cuestionarios, Confidente, consejos, importación y generación de PDF se ejecutan en el dispositivo. Las pruebas desconectan la red antes de abrir por primera vez las herramientas para detectar módulos que falten en la caché.

El catálogo de Confidente y los consejos son locales, tanto con conexión como sin ella. No hay un segundo catálogo remoto más completo. Las importaciones admiten texto, CSV, XML y copias JSON; no se promete lectura automática de imágenes o PDF.

El acceso con cuenta, la sincronización con otro dispositivo y los enlaces externos sí necesitan red. El dictado depende del navegador y puede requerir conexión. No es posible instalar la PWA por primera vez sin haber descargado sus recursos. Los registros de este navegador no están cifrados por la aplicación: usa un dispositivo protegido y exporta copias periódicas.

## Pruebas de navegador

Playwright utiliza el paquete de producción, por lo que debe ejecutarse después de `npm run build`. Comprueba 320, 390, 768 y 1440 píxeles, temas claro y oscuro, accesibilidad automatizada, persistencia, importaciones, exportaciones y arranque sin red. Selenium realiza una segunda revisión de navegación, diálogos y capturas en Chrome.

Los informes y capturas quedan en `artifacts/`. Cada prueba usa un perfil aislado y no modifica los datos de uso personal. Playwright levanta su propio servidor en el puerto 4187; `AURA_URL` permite utilizar una instancia ya disponible. Selenium usa el puerto 4175 si no se indica `AURA_URL`.

## Límites de la verificación

- La sincronización con PostgreSQL requiere un entorno real configurado; las pruebas locales de API no sustituyen esa integración ni una prueba de carga.
- La recuperación real necesita un proveedor de correo transaccional verificado. El endpoint solo responde como aceptado cuando el mensaje se ha enviado correctamente y los tokens se almacenan únicamente como hash, caducan a los 30 minutos y se invalidan al usarse.
- Las revisiones automáticas y visuales no sustituyen una auditoría manual con tecnologías de asistencia y dispositivos iOS/Android reales.
- Aura no diagnostica, no confirma la ovulación y no debe utilizarse como método anticonceptivo. El contenido sanitario y legal necesita revisión profesional antes de una publicación pública.
- El borrado de datos del navegador elimina la copia local. Una sesión local no equivale a una cuenta recuperable desde otro dispositivo.
