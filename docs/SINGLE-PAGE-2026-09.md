# Aura: pantalla central y motor predictivo

La pantalla principal reúne semana deslizable, anillo SVG, registro rápido, consejos en hojas inferiores y Confidente. Calendario, herramientas y perfil se abren sobre el diario. Se mantiene un tema claro incluso si el sistema está en modo oscuro. El anillo respeta movimiento reducido y la semana admite flechas del teclado.

## Recuperación de ciclos y pantalla fija

El diario usa `100vh` como respaldo de `100dvh`, con el desplazamiento de la página bloqueado. La distribución cambia con la altura disponible; en pantallas bajas los consejos se consultan desde una hoja flotante. Los diálogos permiten desplazamiento interno para conservar acceso a formularios largos. El anillo y la gota usan coordenadas SVG y proporciones fijas, sin animar el tamaño del contenedor.

Cuando han transcurrido más de 1,5 ciclos medios desde la última regla registrada, se ofrece recuperar el siguiente intervalo antes del saludo diario. Confirmar o ajustar añade únicamente las fechas elegidas, conserva las observaciones y recalcula las estimaciones. Cada mes requiere confirmación; nunca se rellenan meses automáticamente. Saltar aplaza la propuesta hasta otro día, sin crear registros. Los estados no cíclicos y la anticoncepción hormonal no activan esta propuesta. Un fallo de guardado mantiene la hoja abierta.

`tests/e2e/golden-master.spec.ts` comprueba igualdad de alturas de página y contenedores, controles alcanzables, estabilidad del SVG, contraste y recuperación persistente. Incluye 320×568 y 844×390 además de los cuatro tamaños de la configuración de Playwright. Las pruebas verifican geometría estable; no constituyen una medición de 60 fps en todos los dispositivos.

## Motor y personalización

`biologicalMachine.ts` contiene un reducer puro con estados cerrados: desconocido, menstrual, folicular, ovulación estimada, lútea, embarazo, posparto, menopausia y anticoncepción hormonal. El embarazo es una declaración del perfil, nunca una conclusión de síntomas o de una analítica aislada.

Las observaciones se conservan separadas de la estimación: el sangrado en embarazo o con anticoncepción hormonal sigue en el diario, sin convertirlo en una fase ovulatoria. Los ciclos en curso no se reinician por el paso del tiempo. El motor no inventa fases históricas sin ancla. Las fechas futuras de perfiles regulares son proyecciones, no registros.

SOP e irregularidad desactivan el día de ovulación y la ventana fértil calculada. La pantalla no presenta una probabilidad de embarazo que este modelo no puede medir. El chat usa fecha seleccionada, síntomas, perfil del ciclo, etapa, anticoncepción y hábitos pertinentes, con respuestas incluidas localmente. No es un LLM ni realiza diagnósticos. Referencia: [NHS: planificación familiar natural](https://www.nhs.uk/contraception/methods-of-contraception/natural-family-planning/).

## Persistencia y sincronización

El guardado local es inmediato y validado antes de confirmar en pantalla. Se conserva el formato anterior de localStorage para no romper historiales, con un espejo transaccional en IndexedDB. No se presenta ese espejo como un cifrado: el almacenamiento del dispositivo no tiene cifrado propio por contraseña. La exportación cifrada existente sigue disponible.

La cola pendiente es persistente y está separada por cuenta. Cada revisión solo puede confirmar su propia escritura. Al reconectar, las preferencias locales pendientes tienen prioridad sobre una copia antigua del servidor. Los reintentos se agrupan y usan espera creciente. La sesión se vuelve a comprobar antes de enviar y confirmar.

Los permisos de Salud y la visibilidad del widget se conservan exclusivamente en el dispositivo: no se suben ni se activan al recuperar preferencias de otra instalación. Las escrituras de Salud se serializan y comparan con una huella por fecha; sus identificadores están separados por cuenta. Editar una nota no vuelve a exportar años de sangrado.

El service worker precarga también los módulos de las herramientas. El registro y las consultas locales funcionan tras un arranque en frío sin red. La sincronización remota se reanuda al abrir, volver a la app o recuperar conexión; **no hay un proceso que garantice subir cambios con el navegador cerrado**. La cola permanece guardada hasta el siguiente inicio.

El backend existente usa PostgreSQL y JWT y puede conectarse a PostgreSQL alojado en Supabase mediante `DATABASE_URL`. No se ha provisionado ni desplegado un nuevo servicio de nube, ni probado una cuenta real contra producción. Hay que configurar servidor, HTTPS, secretos y recuperación de cuenta antes de ofrecer sincronización pública.

## Salud y widgets nativos

Se incluyen los proyectos Capacitor `android/` e `ios/`, el puente `AuraDevice`, la conexión desde Herramientas → Salud y widgets, y las implementaciones Kotlin/Swift. La web informa de que esta función requiere la aplicación nativa, sin simular permisos ni importaciones.

La conexión inicial es voluntaria y solicita permisos del sistema. Después se lee al abrir o reactivar Aura. No se puede importar silenciosamente antes de la autorización del sistema: [Apple HealthKit](https://developer.apple.com/documentation/healthkit/authorizing-access-to-health-data) y [Health Connect](https://developer.android.com/health-and-fitness/health-connect/read-data).

La importación añade días ausentes, conserva las correcciones locales y no reexporta automáticamente lo importado. Se escribe solo sangrado creado o corregido en Aura, usando identificadores propios y versiones para evitar duplicados. No se envían notas, síntomas ni intimidad a Salud. Android solicita permiso de historial cuando está disponible; sin él, la lectura tiene la limitación del sistema. Apple puede devolver una colección vacía cuando no se permite leer; HealthKit no revela a la app si la lectura fue denegada. La sincronización no propaga eliminaciones de otros orígenes.

Los widgets consumen una instantánea local, con presentación discreta por defecto. La usuaria activa la visualización de datos en su pantalla de inicio. La instantánea caduca por fecha y se limpia al salir de la cuenta. iOS incluye tamaños pequeño y mediano con WidgetKit; Android incluye un widget redimensionable. No consultan la red ni recalculan la fase biológica.

### Compilación móvil pendiente de verificar

En este equipo no están disponibles JDK/Android SDK ni Xcode/Swift. **Los fuentes nativos no se han compilado ni probado en dispositivos.** La validación web no sustituye esa comprobación.

1. Ejecutar `npm run native:sync` para copiar la versión web a los proyectos.
2. Android: instalar JDK 21 y Android SDK 36; abrir con `npm run native:android`, sincronizar Gradle y compilar. Probar Health Connect, permisos parciales, historial y widget con un dispositivo compatible. El mínimo configurado es Android 9.
3. iOS: en macOS, instalar Xcode y XcodeGen; desde `ios/App`, ejecutar `xcodegen generate` para generar el proyecto con el target de WidgetKit. Abrir con `npm run native:ios`, seleccionar equipo de firma y configurar HealthKit y el App Group `group.app.aura.privatecycle` en ambos targets. El proyecto generado exige iOS 17 para los widgets.
4. Para nube nativa, configurar `VITE_API_BASE_URL` con una URL HTTPS real y permitir el origen del WebView en el servidor. `/api` por sí solo no apunta a un servidor dentro de una app instalada.
5. Antes de distribuir, comprobar importación de varios años, revocación de permisos, corrección de días exportados, cambio de cuenta, limpieza de widgets, accesibilidad y consumo en dispositivos reales. Completar las declaraciones de privacidad de ambas tiendas.

## Verificación reproducible

- `npm run build`: compilación de TypeScript estricto y PWA de producción.
- `npm run lint`: análisis estático sin advertencias.
- `npm test`: pruebas de auth, diario, copias, chat, máquina biológica, cola y aislamiento de cuentas.
- `npm run test:e2e`: Playwright y axe; registro, permisos de almacenamiento, exportaciones, inicio offline y contraste.
- `npx playwright test tests/e2e/single-page.spec.ts`: pantalla central a 320, 390, 768 y 1440 px, saludo, descubrimiento progresivo, cierre, persistencia y errores del navegador.

La máquina de estados asegura coherencia del software; no valida clínicamente las predicciones. La versión completa no debe calificarse como lista para distribución nativa hasta completar las verificaciones indicadas.

### Auditoría del 8 de septiembre de 2026

- Compilación de producción y análisis estático completados; 87 pruebas unitarias y de servidor aprobadas.
- Recorrido de pantalla central aprobado a 320, 390, 768 y 1440 px: saludo, síntomas progresivos, persistencia, consejos, calendario, contraste con axe y ausencia de errores del navegador.
- Arranque en frío y apertura del catálogo completo sin red aprobados a 320 px, incluido guardado y recuperación de temperatura tras recargar.
- Catálogo completo de diálogos aprobado a 320 px con axe, límites del viewport, recorrido del foco y cierre con Escape. La medición de posición espera a que termine la animación de entrada.
- Regresión de manchado aprobada en móvil: guardar, recargar, reabrir con el valor correcto, quitar y comprobar su eliminación tras otra recarga.
- Auditoría de dependencias de producción: cero vulnerabilidades conocidas comunicadas por npm.
- Recursos web copiados a iOS y Android con Capacitor; esto no constituye una compilación nativa.
- Capturas conservadas en `artifacts/single-page-review/` (carpeta local ignorada por Git).
