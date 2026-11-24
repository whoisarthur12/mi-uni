# ADR-001 — Alcance y arquitectura base (adopciones y rechazos del informe externo)

- **Estado:** aceptada (heredada de `CONTEXT.md` v2, §3.5 y §12.1)
- **Contexto:** un informe externo propuso backend, telemetría, frameworks y ~40 herramientas. El dueño trabaja solo, sin costos y con GitHub Pages.
- **Decisión:** se adoptan motores compartidos, proyectos locales con entidades, bus de eventos, fichas técnicas, matriz de admisión y buscador. Se rechazan backend/cuentas/sincronización, telemetría remota (→ diagnóstico local), React/Next/TS obligatorio, monorepo/microservicios y plugins públicos. El catálogo ampliado queda en lista de espera.
- **Consecuencias:** PWA vanilla ES modules sin build; todo local; respaldo por exportación; AGPL-3.0.
