# Aura: entrega para Antigravity

Actualizado el 9 de septiembre de 2026. Este es el relevo vigente; los otros archivos `HANDOFF-*` son históricos y no describen el estado de esta entrega.

## Código y alcance

- Repositorio: https://github.com/eneekoruiz/regla
- Rama: `codex/account-only-release`
- Pull request: https://github.com/eneekoruiz/regla/pull/1
- Cambio principal publicado: `ce2891536a5377652f419d64465a60c48f00d1f5`. Hay un commit posterior de preparacion de relevo en esta misma rama.
- Carpeta de trabajo usada para esta entrega: `C:\Users\User\Desktop\ENEKO\regla-release`.

El usuario ha autorizado subir los cambios a GitHub y preparar el despliegue. El acceso anónimo «modo privado local» se ha retirado: ahora se entra con una cuenta. Se conserva la caché por cuenta para trabajar sin conexión después de iniciar sesión. Los registros antiguos sin cuenta se pueden descargar para recuperarlos; no se borran ni se atribuyen automáticamente a otra cuenta.

El ZIP de entrega contiene el código completo de esta rama en su versión final, incluido este documento. No contiene `.git`, dependencias instaladas, archivos `.env` reales ni el historial antiguo de Git. Para continuar, es preferible trabajar desde la rama remota. No copiar encima de una carpeta que contenga trabajo sin guardar. La carpeta original `regla` tiene trabajo independiente: esta entrega procede de `regla-release`.

## Cambios incluidos

- Pantalla de acceso solo con cuenta, mensajes de error claros y tiempo máximo de espera.
- Rechazo de sesiones antiguas `dev-token`, `local-*` y `offline-*`; conservación de los registros recuperables.
- Recuperación descargable de registros del modo antiguo, sin crear una sesión local.
- API que exige configuración real de PostgreSQL y JWT; se retiraron las credenciales y secretos de respaldo embebidos.
- Validación de sesión, aislamiento entre cuentas y arranque del esquema del servidor.
- Comprobación de cuentas reales con usuarios de prueba desechables y limpieza posterior.
- Pruebas de navegador adaptadas al acceso con cuenta, a los grupos de herramientas y a las pestañas actuales de Ajustes.
- Correcciones de accesibilidad, adaptación a 320 px y limpieza de código incluidas en el cambio principal.
- Indicador visible de estado sin conexion en movil despues de arrancar desde cache offline.
- Ajustes de contraste en modo oscuro para el microcalendario y los textos verdes de modales informativos.

## Verificación y límites

La revisión de esta entrega confirmó lint, compilación de producción y 77 pruebas internas. La prueba de cuentas contra PostgreSQL comprobó registro, inicio de sesión, identidad autenticada, rechazo de contraseña incorrecta, persistencia y aislamiento entre dos cuentas; eliminó los usuarios de prueba al terminar. También pasó el acceso con cuenta en los cuatro tamaños configurados en Playwright, incluido 320 px. En esta pasada final pasaron `tests/e2e/offline.spec.ts --project=mobile` y `tests/e2e/visual.spec.ts --project=mobile`, incluyendo contraste claro/oscuro, catalogo, cierre por teclado y foco de modales.

Las pruebas de interfaz simulan las respuestas de autenticación; la comprobación `test:accounts` es la que usa el servidor y la base de datos reales. El resultado de una no sustituye al de la otra. Las comprobaciones locales no certifican un despliegue público, la entrega real de correo ni una validación clínica.

La preview de Vercel del cambio principal se construyó correctamente, según su estado en GitHub. Las peticiones públicas a `/api/health` y `/api/ready` redirigieron a la autenticación de Vercel. Por ello, el funcionamiento del inicio de sesión en esa preview pública todavía no está verificado. No presentar ese despliegue como validado hasta completar las comprobaciones siguientes.

## Continuar desde GitHub

En un clon limpio:

```sh
git clone --branch codex/account-only-release https://github.com/eneekoruiz/regla.git aura-release
cd aura-release
npm ci
npx playwright install chromium
npm run lint
npm test
npm run build
npx playwright test tests/e2e/visual.spec.ts -g "acceso con cuenta"
npx playwright test tests/e2e/data-flows.spec.ts tests/e2e/offline.spec.ts --project=mobile
```

No reconstruir `dist` mientras Playwright esté usando la preview. Para verificar cuentas, configurar una base de datos de pruebas en un archivo `.env` privado y ejecutar `npm run test:accounts`. La variable `AURA_ENV_FILE` permite indicar la ruta de ese archivo; nunca publicarlo. Este script crea registros de prueba y los elimina después.

Si se parte únicamente del ZIP, abrirlo en una carpeta nueva y leer este documento. El código ya está disponible en la rama remota; no hace falta crear otro repositorio ni subir dependencias o secretos. Para aportar cambios posteriores, usar esa rama o una rama derivada y actualizar el pull request existente.

## Terminar el despliegue en Vercel

1. Abrir el proyecto Vercel conectado a `eneekoruiz/regla` con una sesión autorizada. Revisar la preview correspondiente al último commit de la rama, no solo una anterior.
2. Configurar las variables del servidor en el entorno adecuado: `DATABASE_URL`, `JWT_SECRET`, `PUBLIC_APP_URL`, `ALLOWED_ORIGINS`, `RESEND_API_KEY` y `MAIL_FROM`. Usar `VITE_API_BASE_URL=/api` para la instalación bajo un solo dominio. `.env.example` contiene solo ejemplos; no son credenciales válidas.
3. Generar un secreto JWT aleatorio de al menos 32 caracteres y rotar las credenciales antiguas que se habían incluido como respaldo en el historial. Eliminarlas del código actual no las elimina de commits anteriores. Nunca colocar secretos del servidor en variables con prefijo `VITE_`.
4. Comprobar que el dominio de recuperación y los orígenes autorizados corresponden al dominio de destino y que el remitente está verificado en Resend. Mantener HTTPS.
5. Desplegar el último commit. Con acceso permitido por la protección de Vercel, comprobar `/api/health` y `/api/ready`; este último debe devolver HTTP 200 con estado `ready`. Revisar el motivo concreto si devuelve 503.
6. Desde la URL desplegada, registrar una cuenta de prueba, cerrar sesión, iniciar sesión, guardar un registro, recargar y confirmar que persiste. Verificar que una segunda cuenta no ve sus datos y que la contraseña incorrecta falla. Eliminar los datos de prueba al finalizar.
7. Probar recuperación con un correo real autorizado y comprobar el enlace, su caducidad y el cierre de sesiones anteriores. Verificar sincronización entre dos dispositivos y funcionamiento sin red después del primer acceso.
8. Revisar el pull request y promover la versión validada. Registrar la URL final, el commit y los resultados; no afirmar que producción está verificada basándose solo en la compilación.

Consultar también `docs/PRODUCTION-READINESS.md` para los límites del producto. Esta entrega no aporta nuevas extensiones nativas ni certifica integraciones HealthKit/Health Connect, widgets o uso anticonceptivo.

## Instrucción lista para el agente

Continúa Aura desde la rama `codex/account-only-release` de `eneekoruiz/regla` y el pull request 1. Lee primero este archivo. Conserva el acceso exclusivamente con cuenta, la recuperación de los registros locales antiguos y el aislamiento de datos por usuaria. Los cambios principales ya están subidos a GitHub. Completa la configuración y verificación de Vercel con credenciales autorizadas, corrige cualquier fallo reproducible y actualiza el mismo pull request. No incluyas secretos, `.env`, dependencias instaladas ni datos personales en GitHub. Documenta por separado las comprobaciones locales y las realizadas en el dominio desplegado.
