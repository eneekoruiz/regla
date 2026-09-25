# Diario: tarjeta principal

Contrato de diseño de la pantalla principal. Antes de cambiarla, respeta estas reglas: existen para que se entienda de un vistazo y para no volver a acumular parches.

## Reglas de lectura

1. **La gota es la protagonista.** Es un avatar (la gota del Confidente, con sus ojos) y ocupa todo el espacio libre de la tarjeta. Si falta sitio, se recoge antes el texto accesorio que la gota.
2. **La cabecera habla de fertilidad.** Título: «Ovulación en 5 días», «Ventana fértil en 3 días», «Hoy es tu ovulación estimada», «Próxima ventana fértil en 17 días». En días pasados solo sitúa el día («Día 5 de tu ciclo»). El chip de encima dice el día y la fase («Día 9 · Ventana Fértil») y abre la leyenda.
3. **La gota habla de la regla.** Cifra central: días que faltan para la regla. Durante la regla, días que quedan de regla. Con retraso, días de retraso. Debajo va la fecha correspondiente.
4. **El círculo de fases (solo en ordenador) dice dónde estás:** fase y día del ciclo («Fase folicular · 4 de 28 días»). Aparece junto a la gota cuando la tarjeta es ancha; en el móvil no.
5. **Colores únicos en toda la app:** rosa = regla, ámbar = días fértiles, ámbar intenso ✦ = ovulación. En el círculo, además, rosa claro = fase folicular y lavanda = fase lútea, como en la leyenda. La línea de días, los calendarios, la leyenda, la gota y el círculo usan los mismos.
6. **Registrar hoy es lo principal.** El botón de sangrado va relleno y destacado bajo «Tu registro de hoy», siempre a la vista sin desplazarse.
7. **Los días pendientes no ocupan sitio.** La gota los pregunta en un bocadillo («¿Y ayer?», «¿Y tu regla?», «¿Y este día?»). Al tocarlo se abre una ventana con las respuestas de un toque, «Contárselo al Confidente» y «Recordármelo mañana». Solo se pregunta a quien ya usaba el diario ese día, y el Confidente también lo recuerda en la columna de consejos.

## La gota

- El contorno representa el ciclo completo. La punta es el día 1 y se recorre en sentido horario. Cada día ocupa la misma longitud de trazo (`src/utils/dropGeometry.ts`).
- El interior se llena por volumen según avanza el ciclo: casi vacía al empezar la regla, casi llena justo antes de la siguiente y llena con retraso. Al aparecer se llena desde vacía.
- Sus ojos miran al día marcado (o a su bocadillo cuando pregunta algo) y parpadean de vez en cuando. Durante la regla los cierra (descansa), en los días fértiles se animan y después se calman, como la mascota del Confidente.
- Se puede recorrer tocando o arrastrando cualquier punto, y con el teclado (flechas, Re Pág/Av Pág, Inicio/Fin, Esc). Es un `role="slider"` con `aria-valuetext` completo. Al recorrerla aparece la fecha del día y su fase, el círculo de fases marca el mismo día y «Volver» regresa al día consultado.
- Respeta el movimiento reducido: sin llenado animado, oleaje, parpadeo ni transiciones.

## Tamaños

- **Móvil en vertical:** la tarjeta ocupa la primera pantalla (App.tsx mide `--hero-fill`) y la gota se queda con el resto. En pantallas bajas se ocultan, por este orden, el subtítulo, la pista «Recorre la gota» y el rótulo «Tu registro de hoy». Con una pregunta pendiente, la columna de consejos se aparta y el diario cabe en una pantalla.
- **Móvil en horizontal:** gota compacta y registro de hoy en una sola fila.
- **Ordenador:** la gota y el círculo de fases, uno junto al otro.

## Dónde está cada cosa

| Pieza | Archivo |
| --- | --- |
| Estado derivado del día (sin JSX) | `src/services/cycleSnapshot.ts` |
| Modelo de la gota, detalle al recorrerla, llenado y gesto del avatar | `src/services/cycleDial.ts` |
| Modelo del círculo de fases | `src/services/phaseRing.ts` |
| Título y subtítulo de la cabecera | `src/services/cycleHeadline.ts` |
| Geometría de la gota (recorrido y volumen) | `src/utils/dropGeometry.ts` |
| Tarjeta (solo composición) | `src/components/Layout/HeroStatus.tsx` |
| Gota-avatar interactiva | `src/components/Layout/CycleDial.tsx` |
| Círculo de fases | `src/components/Layout/PhaseRing.tsx` |
| Acciones del momento del ciclo | `src/components/Layout/HeroDayActions.tsx` |
| Pregunta por días pendientes (bocadillo y ventana) | `src/hooks/useCatchupNotice.tsx`, `src/components/Layout/CatchupNotice.tsx` |
| «Ayer sin registrar» (única fuente de verdad) | `src/hooks/useYesterdayCatchup.ts` |
| Registro rápido | `src/components/Layout/QuickLogBar.tsx` |
| Estilos | sección «DIARIO · TARJETA PRINCIPAL» al final de `src/index.css` |

## Pruebas

- `tests/unit/cycle-dial.test.mjs`: geometría y volumen, cada fase, regla, retraso, recorrido, llenado, gesto del avatar y círculo de fases.
- `tests/e2e/hero-dials.spec.ts`: cabecera y gota por fase, teclado, puntero, vuelta al día y la pregunta por ayer con su ventana.
- `tests/e2e/golden-master.spec.ts`: diario sin desplazamiento (también en 320×568) y gota estable.
