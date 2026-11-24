# ADR-009 — Red del entorno de desarrollo en la nube

- **Estado:** aceptada (registro de la decisión del dueño, 24-nov-2026).
- **Contexto:** Claude Code trabaja en un contenedor en la nube con red limitada. El dueño controla qué hosts puede alcanzar ese entorno. Ampliar la red de desarrollo no cambia lo que hace la app (eso lo rigen ADR-004 y ADR-007), pero sí lo que el agente puede descargar o consultar. Por eso cada ampliación debe quedar registrada y aprobada.

## Estado actual del entorno "Default" (personal del dueño)
- **Acceso:** limitado.
- **Registros de paquetes:** permitidos por defecto (npm, PyPI, apt…). Se usaron para instalar herramientas de medición (Playwright, MDN BCD, paquetes en evaluación).
- **Servidores MCP:** permitidos.
- **Hosts añadidos expresamente**, lista exacta:

| Host | Desde | Para qué | Aprobado |
|---|---|---|---|
| `cdn.playwright.dev` | sesión anterior | Descargar Firefox y WebKit de Playwright para medir en 3 motores | Dueño |
| `api.crossref.org` | 24-nov-2026 | S5: medir el CORS y las respuestas por DOI | Dueño |
| `openlibrary.org` | 24-nov-2026 | S5: medir el CORS y las respuestas por ISBN | Dueño |
| `www.googleapis.com` | 24-nov-2026 | S5: medir el CORS de Google Books por ISBN | Dueño |

- **Bloqueados (observado):** `whoisarthur12.github.io`, por lo que las URLs de Pages no se pueden comprobar por HTTP desde el contenedor; `webkit.org` y `www.gnu.org`. `raw.githubusercontent.com` y `github.com` (git) sí respondieron.

## Decisión
1. **Ninguna ampliación sin el dueño.** El agente pide cada host nuevo explicando para qué es, y lo añade solo tras su aprobación expresa en el chat. La herramienta de entorno muestra además su propia confirmación.
2. Cada ampliación se añade a la tabla de este ADR y a `INSTRUCTIONS.md` §9.1 en el mismo PR.
3. Hosts exactos, nunca comodines ni "acceso sin restricciones".
4. La red de desarrollo **no** autoriza que la app use esos hosts: la app solo puede usar lo que permitan su CSP y su net-guard (ADR-007).

## Consecuencias
- Los cambios del entorno "Default" afectan a todas las sesiones futuras del dueño que lo usen.
- Para comprobar Pages por HTTP haría falta añadir `whoisarthur12.github.io`. No se ha pedido: hoy se verifica contra el árbol de `main` y el artefacto de despliegue de Pages.
