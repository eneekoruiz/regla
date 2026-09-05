# Relevo de Aura para Antigravity

Trabajo detenido por peticion del usuario el 2026-09-04. No esta certificado como terminado ni como libre de fallos. Todos los subagentes estan cerrados y la ultima ejecucion de Playwright fue interrumpida deliberadamente.

## Criterio del usuario

Mejorar tambien sus cambios recientes cuando exista una solucion mejor. Preservar la intencion, no congelar la implementacion. Estetica moderna, minima, personal y util; lenguaje cotidiano; sin apariencia de plantilla ni decoracion gratuita. Evitar perdida de datos y mantener el mismo catalogo local con y sin red.

## Helen aplicado

Referencia local: `.helen-reference`. Registro: `.helen-reference/docs/prompts/registry.json`.

- Full Polish y UX Visual Pass: diario/calendario/herramientas, jerarquia, estados, navegacion y microcopy.
- Premium Visual Polish, Responsive y Basic Accessibility: tokens compartidos, temas, botones, dialogos nativos, foco, contraste, tactil y areas seguras.
- Safe Clean Code y Prefinal/Security Hardening: contextos/hooks separados, persistencia, validaciones, sesiones, API y manejo de errores.
- Basic Performance y checkpoints build/lint/tests: carga diferida, recursos PWA precacheados y pruebas automatizadas.
- Criterios propios: primer uso sin datos ficticios, fallo de almacenamiento sin falsa confirmacion, catalogo offline en frio, persistencia por fecha, copias completas y revision adversarial de formularios.

Release Candidate y Client Delivery NO estan cerrados: faltan las verificaciones finales siguientes. No aplicar por aplicar prompts de landing, SEO comercial, 3D, shaders o animaciones de exhibicion a esta herramienta de salud.

## Implementado

- Nueva estructura visual de App, Header, HeroStatus, timeline, consejos, biomarcadores, herramientas y CSS global. Marca Aura, paleta verde con acentos rosa y dorado, claro/oscuro, botones e iconos coherentes, sin gradientes ornamentales.
- Formularios y herramientas unificados con ModalFrame: foco, Escape, restauracion de foco, scroll, estados pendientes y errores. Calendario mensual/anual y Hoy sin abrir el formulario.
- Cuestionarios guardados realmente en `logs[date].quizResults`; `saveQuizResult(result, date)` valida y persiste. QuizHistory permite consultar respuestas en el diario. Incluidos en backup y sincronizacion. Sin diagnostico automatico.
- Contextos y hooks separados sin silenciar Fast Refresh; timeline incluye fechas antiguas y el marcador de hoy se actualiza.
- Notas: publicacion de confirmacion posterior a persistir; rechazo de fallo de analisis o cuota. Revisar fallo E2E indicado abajo.
- Importaciones CSV/XML/JSON/texto con revision y confirmacion; rechazo explicito de imagen/PDF, sin OCR inventado. Exportacion JSON/PDF local.
- Catalogo de Confidente, historial por usuario, borrado confirmado y colores de ambos temas. Todo el catalogo de orientacion se resuelve localmente.
- 40 variantes de bienestar reescritas: retiradas afirmaciones de detox/reinicio celular, dosis y garantias hormonales. Referencias NHS/MedlinePlus usadas por Planck.
- JWT real, validacion de entradas, aislamiento por cuenta, CORS, limites y transacciones. Backend real requiere PostgreSQL y configuracion; no se ha probado esa integracion desplegada.

## Evidencia disponible

- Ultima bateria global completada: 64/64 tests internos. Russell anadio posteriormente 4 pruebas de notas que pasaron en su alcance; repetir `npm test` global.
- Lint global sin advertencias. Build completado; recompilar para incluir y verificar todos los ultimos cambios de agentes.
- Ultima ejecucion Playwright (desktop+narrow, 30 pruebas) interrumpida por el usuario. Se observaron 9 aprobadas y 1 fallida antes de detenerla: chat, cuestionario completo, CSV, XML, backup, PDF/ajustes, catalogo offline en frio, sangrado y temperatura; fallo en notas/cuota.
- El catalogo offline completo SI paso en escritorio: primera apertura de cada herramienta sin red, recarga, temperatura persistida y calendario. Falta repetirlo en los otros tamanos.
- Selenium habia pasado una version anterior: 12 vistas y 4 dialogos. El script actual incluye ademas horizontal (15 vistas/5 dialogos), aun sin ejecutar sobre el acabado final.
- Evidencia: `artifacts/playwright-results`, `artifacts/playwright-report`, `artifacts/selenium`, `artifacts/visual`.

## Pendientes prioritarios

1. Resolver `tests/e2e/data-flows.spec.ts:40`, notas/cuota. Tras provocar QuotaExceededError aparece el mensaje de error, pero el campo `getByLabel('Tu nota', { exact: true })` deja de encontrarse al comprobar que conserva el borrador. No asumir que es solo el selector: revisar montaje del dialogo/estado y confirmar que el texto no se pierde. Leer error-context y captura correspondientes.
2. En `wellnessAgent.ts`, `welcome_onboarding` o `personalized_worst_day` pueden tomar prioridad sobre la advertencia de sangrado muy abundante. Dar prioridad a alertas relevantes y cubrir con tests. Planck detecto esto pero solo tenia autorizado editar textos.
3. Error inicial de almacenamiento: `reportStorageError` emite un evento sincrono desde loadLogs/loadSettings. MainScreen escucha en useEffect y puede perder un aviso emitido durante el montaje del proveedor. Garantizar aviso inicial persistente y probar datos corruptos sin sobrescritura.
4. Completar Playwright en 320, 390, 768 y 1440, todos los dialogos en claro/oscuro, parte superior/inferior, foco y overflow. La revision del catalogo visual aun no ha terminado. Corregir causas sin debilitar aserciones.
5. Ejecutar Selenium final e inspeccionar personalmente capturas, especialmente 320px, horizontal, calendario, tendencias, informe y chat oscuro. No afirmar revision visual final solo por pasar axe.
6. Repetir build, lint, tests, auditoria de dependencias y revisar errores de consola. Verificar PostgreSQL/sincronizacion en entorno real antes de publicar; revision sanitaria/legal profesional pendiente.

## Continuacion

La preview independiente sigue disponible en http://127.0.0.1:4188/ (proceso 5644 al crearla). El puerto 5173 pertenece a otra instancia/Antigravity: no detenerla ni confundir proyectos. No reconstruir dist mientras corren las pruebas.

```powershell
npm run build
npm run lint
npm test
$env:AURA_URL='http://127.0.0.1:4188'
npm run test:e2e
npm run test:selenium
```

Playwright usa un worker para contener memoria. Sin AURA_URL levanta preview propia en 4187. Selenium usa 4175 sin AURA_URL. La regresion de Playwright 1.62 sobre navigator.onLine tras navegar esta documentada en https://github.com/microsoft/playwright/issues/42174: el test restaura solo el estado del navegador via CDP, mantiene el bloqueo de red y comprueba que falla una peticion no cacheada. No eliminar esa comprobacion ni parchear la app para simular offline.

Las limitaciones offline reales estan en README: primera descarga necesaria, cuenta/sincronizacion/enlaces externos requieren red, dictado depende del navegador, datos locales sin cifrado de aplicacion.
