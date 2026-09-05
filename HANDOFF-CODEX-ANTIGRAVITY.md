# Relevo de Codex a Antigravity — Aura

Actualizado: 5 de septiembre de 2026, 14:30, Europe/Madrid.

**Este archivo existe como protección ante un corte de cuota.** El usuario pidió continuar hasta conseguir la mejor UI/UX razonable y dejar un relevo preciso si se agota el cupo. El cupo principal de 5 horas está agotado (100 %); el sistema ha cambiado a la reserva Luna. No se ha utilizado el reinicio disponible.

## Objetivo y ubicación

Proyecto: `C:\Users\User\Desktop\ENEKO\regla`. React 19, Vite, TypeScript, Tailwind 4, PWA, frontend español. No hay repositorio Git en esta carpeta. No publiques ni despliegues: el encargo es revisión e implementación local.

El usuario entregó un supuesto reporte de Antigravity que decía “100 % completado, cero flecos, producción”. **No era totalmente correcto para los archivos presentes.** Lee `REVIEW-2026-09-05.md` y `AUDITORIA-REPORTE-ANTIGRAVITY.md`: contienen la comparación de afirmaciones, evidencia, cambios y límites. No reutilices esa certificación ni afirmes tipado estricto, modelo clínicamente validado o backend público probado.

El informe original está en `C:\Users\User\.codex\attachments\889ab882-723a-4594-a6c5-d4177c3dbe7e\pasted-text.txt`. `HANDOFF-ANTIGRAVITY.md` es un relevo anterior de 4 de septiembre; este archivo es más reciente.

## Cambios realizados

- `src/index.css`: paleta cálida, verde/rosa, tipografía editorial local, tarjetas, navegación, grupos de herramientas, adaptación móvil y horizontal, botones con contraste, diálogos y pie de guardado fijo. Los textos terciarios se oscurecieron a `#58695f` después de detectar contraste insuficiente en Informe de salud.
- `src/App.tsx`: herramientas agrupadas por finalidad, foco al cambiar vista, instalación, y aviso de flujo muy abundante registrado hoy visible antes del contenido normal, también para sangrado irregular.
- `src/components/Layout/HeroStatus.tsx`: fase interactiva, resumen más claro, sin anillo vacío al comenzar, anillo compacto sin texto recortado. Si pasa la fecha estimada sin confirmar una regla, conserva los días transcurridos desde el último inicio real en vez de aparentar otro ciclo. Al registrar un nuevo inicio el contador vuelve a 1 y se recalibra la duración.
- `src/components/Auth/AuthScreens.tsx`: marca consistente y composición de bienvenida para escritorio; formulario móvil sencillo.
- Instalación añadida de verdad: `src/hooks/usePwaInstall.ts`, `src/components/Modals/PwaInstallModal.tsx`, Header y Ajustes → Mis datos. Usa el evento nativo si existe, guía manual/iOS si no. Solo `appinstalled` confirma la instalación. Sin popup automático ni cooldown innecesario.
- `src/services/predictiveEngine.ts` y `src/components/Modals/LegalComplianceModal.tsx`: retiradas afirmaciones no justificadas de salud hormonal, “estándar de oro”, filtrado FIGO y validación clínica. No se sustituyó el algoritmo por otro supuestamente validado.
- `src/services/predictiveEngine.ts`: corregido el índice de próximo ciclo para que una fecha prevista que lleva un día de retraso siga visible como pendiente; añadido test unitario. También se retiró lenguaje clínico FIGO de los mensajes de variación y se dejó claro que son señales orientativas.
- `src/components/Layout/HeroStatus.tsx`: el aviso de estimación indica si se basa en ciclos registrados o en los ajustes iniciales.
- `src/components/Calendar/AppleMonthlyCalendar.tsx`, `YearViewCalendar.tsx` y `ColorLegendModal.tsx`: regla registrada y regla estimada tienen tonos distintos y una leyenda explícita; la suite focalizada narrow (claro/oscuro) pasa 4/4.
- `src/services/wellnessAgent.ts`: aviso para flujo `very_heavy`, aunque no sea regla menstrual. El aviso anterior existía en un helper que el diario actual no utilizaba.
- `src/components/Modals/ColorLegendModal.tsx`: corregida lista de definiciones inválida (`dt/dd` demasiado anidados) que hacía fallar axe.
- `src/utils/dialogFocus.ts`, `ModalFrame.tsx`, `ChatDrawer.tsx`: contención de Tab/Shift+Tab, cierre y restauración del foco. El chat antes dejaba escapar Tab con Enviar deshabilitado. Ya pasó ese punto en la prueba de catálogo de producción.
- `MedicalExportModal.tsx`: etiquetas “Ciclo estimado” y “Sangrado estimado”, periodos registrados con singular correcto y explicación cuando faltan ciclos completos. El número de grupos de sangrado no se presenta como ciclos completos.
- `vite.config.ts`: excluir `artifacts` del watcher y limitar entradas del optimizador a `index.html`. Las trazas generadas provocaban recargas ajenas y un error EBUSY en Windows.
- `tests/e2e/review.spec.ts`: regresiones de instalación voluntaria, confirmación real, continuidad tras fecha estimada, nuevo inicio y aviso de sangrado irregular muy abundante.
- `tests/e2e/helpers.ts`: capturas de diálogos dentro del viewport, páginas normales completas. Se mantienen todas las aserciones de contraste, límites, desbordamiento, foco y restauración. Timeout explícito de captura 15 s para evitar bloqueos interminables.
- `scripts/selenium-review.mjs`: localizar Medicación por nombre (cambió el orden de herramientas) y desplazarla al centro antes del clic real para que la navegación fija no intercepte el clic.

## Evidencia confirmada

- `npm test`: **73/73**, sin omitidos. Incluye recuperación, invalidación de sesión, hidratación remota y la regresión de fecha prevista atrasada.
- Compilación de producción correcta tras la última corrección; 2,484 módulos transformados y PWA actual de **33 entradas / 1424.31 KiB**. No recompilar mientras se ejecuten las pruebas contra `dist`.
- Lint sin advertencias en la ejecución final.
- Auditorías de dependencias raíz y servidor: **0 vulnerabilidades reportadas**. `artifacts/audit-dependencies.json` y `artifacts/audit-server-dependencies.json`.
- Selenium: **15 vistas y 5 diálogos** aprobados (1440, 390, 320, 768 y horizontal 844×390). `artifacts/audit-selenium.txt`, capturas en `artifacts/selenium`.
- Una batería completa anterior obtuvo **64 aprobadas / 8 fallidas**, todas las fallidas eran el catálogo visual en claro/oscuro por la leyenda. Al corregirlo se descubrió el foco del chat; corregido. Después, una pasada de catálogo de producción avanzó hasta Informe de salud y encontró dos contrastes insuficientes; ya se corrigieron.
- La comprobación de catálogo en desarrollo se bloqueó al capturar imágenes. No confundirla con pérdida de datos ni afirmar que el catálogo final pasó basándose en ella. Se cambió a producción y a capturas de viewport para modales.
- Se inspeccionaron capturas de acceso, diario vacío/con datos, móvil 320/390, oscuro, herramientas, tendencias, temperatura, leyenda, medicación y chat. La batería final de producción pasó el catálogo claro y oscuro en las cuatro geometrías probadas.
- Se conectó el backend real a Neon/PostgreSQL, se ejecutó `npm run db:migrate` y se añadió `/api/ready`. La recuperación usa tokens hash de un solo uso con caducidad, Resend y aumento de `auth_version` para cerrar sesiones previas.
- La sincronización de ajustes autenticados prioriza la copia remota cuando hay red; los fallos vuelven a la copia local. Ajustes ofrece exportación cifrada AES-GCM protegida por una frase secreta para copias manuales.
- El `upsert` de PostgreSQL rechaza escrituras de registros con `recordedAt` anterior al valor ya guardado, evitando que una petición atrasada de otro dispositivo borre una edición posterior.
- Tras recompilar, la batería Playwright completa pasó **80/80** y la suite visual aislada pasó **20/20**. La preview vuelve a estar accesible en `http://127.0.0.1:4300/` y responde HTTP 200.

## Punto exacto en curso

La batería completa de **80 pruebas sobre el build actual** ya terminó, con la salida redirigida al informe Playwright en:

`artifacts/audit-e2e-final.txt`

Usó un único worker y terminó con **80 passed (9.4m)** en escritorio, móvil, perfil estrecho y tablet. Después de recompilar la mejora táctil global, `tests/e2e/visual.spec.ts` terminó con **20 passed (5.6m)** en las cuatro geometrías. El servidor de desarrollo del usuario está en **4300**.

Comando de esa batería:

```powershell
npx playwright test
```

Su informe normal: `artifacts/playwright-report/index.html`. Sus capturas y trazas: `artifacts/playwright-results/`.

## Pendientes, por orden

1. No quedan fallos automatizados abiertos en el alcance modificado: la batería actual muestra **80 passed (9.4m)** y la suite visual recompilada **20/20**; `npm test` muestra **73/73**; lint, build y ambas auditorías de dependencias pasan.
2. Si se modifica código después de este punto, repetir solo las pruebas afectadas y volver a compilar una vez antes de repetir la batería completa.
3. La validación pendiente es externa al workspace: publicación pública con HTTPS, Resend y dominio verificado, recuperación con correo real, sincronización entre dos dispositivos, dispositivos físicos, lectores de pantalla reales y revisión sanitaria/legal profesional. La migración Neon sí se ejecutó desde este workspace.
4. Mantener la preview local en `http://127.0.0.1:4300/` mientras el usuario la revise. No afirmar “100 %” ni certificación clínica.

### Estado por agotamiento de cuota

La batería actual terminó completa antes de este relevo: 80/80 y la suite visual posterior 20/20. Si Antigravity recibe este relevo más adelante, debe conservar los límites externos descritos arriba y no convertir las pruebas locales en certificación clínica o de producción.

## Límites que requieren otro entorno o revisión externa

La integración Neon/PostgreSQL y la migración del esquema sí se verificaron desde este workspace, pero todavía no existe un despliegue público ni un correo Resend probado con dominio real. La sincronización entre dos dispositivos, la instalación iOS/Android física y la accesibilidad con lectores de pantalla reales no están certificadas. Las predicciones no sirven para anticoncepción, diagnóstico o confirmación de ovulación. El almacenamiento local vivo no está cifrado por la aplicación; la exportación cifrada es manual y tampoco es un backup automático. La revisión sanitaria/legal profesional sigue pendiente antes de publicación.

Lee `docs/PRODUCTION-READINESS.md` antes de desplegar. No publiques con el `.env` actual: rota en Neon la contraseña que contiene y genera un `JWT_SECRET` nuevo. Configura `PUBLIC_APP_URL`, `RESEND_API_KEY`, `MAIL_FROM` y `ALLOWED_ORIGINS`; mantén el despliegue bloqueado hasta que `/api/ready` devuelva `ready` y se complete la matriz física y profesional.

## Preservación y herramientas

Se guardó el código anterior y las capturas de partida en `artifacts/pre-review`. No hay Git ni cambios subidos. No tocar `.env` ni datos personales del navegador. Todas las pruebas usan perfiles aislados. No se usaron agentes secundarios ni se crearon tareas independientes.

Runtime Python opcional: `C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe`. Node/npm ya disponibles. Para abrir una preview manual usa otro puerto libre, por ejemplo 4191, y el build existente; no publiques.

## Prompt listo para continuar

Continúa el trabajo de Aura en `C:\Users\User\Desktop\ENEKO\regla`. Primero lee `HANDOFF-CODEX-ANTIGRAVITY.md`, `REVIEW-2026-09-05.md` y `docs/PRODUCTION-READINESS.md`. Conserva las mejoras ya implementadas. Ejecuta `npm test`, `npm run lint`, `npm run build` y las pruebas de navegador solo cuando no haya otro proceso usando `dist`; no inventes certificación clínica ni “100 % libre de fallos”. Si se dispone de un dominio, Resend y un proyecto Vercel, completa la migración, `/api/ready`, recuperación con correo real y la prueba con dos dispositivos; si faltan credenciales, deja claro el bloqueo. Antes de publicar rota los secretos del `.env` local. Revisa la matriz iOS/Android/lector de pantalla y consigue la firma sanitaria/legal profesional. Actualiza los informes con evidencia exacta, conserva la preview local y deja otro relevo preciso si se agota el cupo.
