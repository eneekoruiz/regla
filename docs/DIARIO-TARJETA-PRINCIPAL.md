# Diario: tarjeta principal

Contrato de diseño de la pantalla principal. Antes de cambiarla, respeta estas reglas: existen para que se entienda de un vistazo y para no volver a acumular parches.

## Reglas de lectura

1. **La cabecera habla de fertilidad.** Título: «Ovulación en 5 días», «Ventana fértil en 3 días», «Hoy es tu ovulación estimada», «Próxima ventana fértil en 17 días». En días pasados solo sitúa el día («Día 5 de tu ciclo»).
2. **La gota habla de la regla.** Cifra central: días que faltan para la regla. Durante la regla, días que quedan de regla. Con retraso, días de retraso. Debajo va la fecha correspondiente.
3. **El día del ciclo** aparece en el rótulo pequeño de la gota: «HOY · DÍA 9».
4. **Colores únicos en toda la app:** rosa = regla, ámbar = días fértiles, ámbar intenso ✦ = ovulación. La línea de días, los calendarios, la leyenda y la gota usan los mismos.
5. **Registrar hoy es lo principal.** El botón de sangrado va relleno y destacado bajo «Tu registro de hoy».
6. **Días pendientes en una sola línea.** El aviso de «ayer sin registrar», la posible regla olvidada o un día pasado vacío aparecen arriba, uno como mucho y en una línea discreta. Se resuelven con un toque y se pueden cerrar hasta mañana. Solo se pide ponerse al día a quien ya usaba el diario ese día.

## La gota

- El contorno representa el ciclo completo. La punta es el día 1 y se recorre en sentido horario. Cada día ocupa la misma longitud de trazo (`src/utils/dropGeometry.ts`).
- El interior se llena según avanza el ciclo: casi vacía al empezar la regla, casi llena justo antes de la siguiente y llena con retraso.
- Se puede recorrer tocando o arrastrando cualquier punto, y con el teclado (flechas, Re Pág/Av Pág, Inicio/Fin, Esc). Es un `role="slider"` con `aria-valuetext` completo. «Volver» regresa al día consultado.
- Respeta el movimiento reducido: sin oleaje ni transiciones.

## Dónde está cada cosa

| Pieza | Archivo |
| --- | --- |
| Estado derivado del día (sin JSX) | `src/services/cycleSnapshot.ts` |
| Modelo de la gota, detalle al recorrerla, llenado | `src/services/cycleDial.ts` |
| Título y subtítulo de la cabecera | `src/services/cycleHeadline.ts` |
| Geometría de la gota | `src/utils/dropGeometry.ts` |
| Tarjeta (solo composición) | `src/components/Layout/HeroStatus.tsx` |
| Gota interactiva | `src/components/Layout/CycleDial.tsx` |
| Acciones del momento del ciclo | `src/components/Layout/HeroDayActions.tsx` |
| Aviso de días pendientes | `src/hooks/useCatchupNotice.tsx`, `src/components/Layout/PastCatchupBanner.tsx` |
| «Ayer sin registrar» (única fuente de verdad) | `src/hooks/useYesterdayCatchup.ts` |
| Registro rápido | `src/components/Layout/QuickLogBar.tsx` |
| Estilos | sección «DIARIO · TARJETA PRINCIPAL» al final de `src/index.css` |

## Pruebas

- `tests/unit/cycle-dial.test.mjs`: geometría, cada fase, regla, retraso, recorrido y llenado.
- `tests/e2e/hero-dials.spec.ts`: cabecera y gota por fase, teclado, puntero y vuelta al día.
- `tests/e2e/golden-master.spec.ts`: gota cuadrada y estable.
