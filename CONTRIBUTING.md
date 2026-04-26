# Contributing Guide

Gracias por querer contribuir a este starter de plugins para Flitware.

La meta de este proyecto no es solo ofrecer un ejemplo funcional, sino una base estable, clara y reutilizable para que otros desarrolladores construyan plugins externos con confianza.

## Antes de contribuir

Lee primero estos archivos:

- `README.md`
- `AGENTS.md`

Eso te dará el contexto necesario sobre:

- arquitectura del starter
- runtime del plugin
- entorno local
- mocks
- build productivo
- expectativas de mantenimiento

## Alcance del proyecto

Este repositorio es un starter publico. Eso significa que los cambios deben priorizar:

1. claridad para terceros
2. estabilidad del entorno de desarrollo
3. compatibilidad con `flux-proxy`
4. compatibilidad con Cloudscape
5. build single-file de producción

Si una mejora es muy específica de un dominio o de un equipo, evalúa si realmente pertenece a este starter.

## Tipos de contribución bienvenidos

- mejoras al entorno de desarrollo local
- mejoras al mock engine
- mejoras al ejemplo funcional del plugin
- mejoras en accesibilidad o UX
- fixes de theming y compatibilidad light/dark
- mejoras en documentación
- mejoras de testing y cobertura
- fixes del build de desarrollo o producción

## Tipos de contribución que requieren más cuidado

- cambios al contrato de `window.__PLUGIN_CONFIG__`
- cambios a `flux-proxy`
- cambios al bundling de Cloudscape
- cambios al formato final `dist/index.html`
- cambios que afecten el host local
- cambios que afecten `theme`, `language` o `cloudscapeTheme`

Si tocas una de esas áreas, documenta bien por qué lo hiciste y qué validaste.

## Flujo recomendado

### 1. Instala dependencias

```bash
npm install
```

### 2. Levanta el entorno local

```bash
npm run dev
```

Abre:

```txt
http://localhost:5500
```

### 3. Haz tus cambios

Trabaja en cambios pequeños y coherentes.

### 4. Valida antes de enviar

Como mínimo ejecuta:

```bash
npx tsc --noEmit --project tsconfig.json
npm test
npm run build
```

Si tocaste host local, mocks, runtime o bridge, ejecuta también:

```bash
npm run build:dev
npm run dev
```

## Reglas de calidad

### Mantén el starter genérico

Este proyecto no debe quedar amarrado a un dominio demasiado específico.

El dominio actual de tareas existe como ejemplo, no como una restricción del starter.

### No rompas el build de producción

`npm run build` debe seguir generando:

```txt
dist/index.html
```

No conviertas la salida productiva en múltiples archivos.

### No rompas Cloudscape

Ten cuidado con:

- minificación
- CSS inline
- resolución de dependencias
- comentarios legales requeridos por Cloudscape

### No rompas el runtime del plugin

El plugin depende de:

- `theme`
- `language`
- `cloudscapeTheme`
- `targetOrigin`
- `pluginVersion`

Si cambias algo ahí, actualiza también:

- host local
- documentación
- tests relevantes

### No rompas el cliente del plugin

`app/api/plugin-client.ts` contiene decisiones intencionales para evitar problemas de concurrencia y auto-cancelación.

No simplifiques esa capa sin validar el comportamiento real.

## Convenciones de cambios

### UI

- Reutiliza componentes existentes antes de agregar nuevos.
- Mantén la experiencia alineada con Cloudscape.
- Respeta light/dark mode.
- Mantén textos consistentes entre español e inglés si tocas traducciones.

### Datos mock

Si cambias mocks en `dev/task-dev-data.ts`, valida:

- listados
- relaciones
- `expand`
- filtros
- paginación
- `create`
- `update`
- `delete`

### Mock engine

Si cambias `dev/mock-engine.ts`, agrega o ajusta tests.

Ese archivo es parte crítica del starter.

### Documentación

Si cambias comportamiento público, actualiza:

- `README.md`
- `AGENTS.md` si aplica
- esta guía si el flujo de contribución cambia

## Testing

La suite actual cubre:

- utilidades de fecha
- utilidades de filtros
- mock engine
- adaptadores mock
- contrato básico del bridge

Ejecuta:

```bash
npm test
npm run test:coverage
```

Nota:

La cobertura de líneas y funciones está en muy buen nivel. Si haces cambios que introduzcan nuevas ramas, procura acompañarlas con tests explícitos.

## Pull requests

Cuando envíes un PR, intenta que incluya:

- propósito del cambio
- contexto del problema
- enfoque elegido
- riesgos o tradeoffs
- evidencia de validación

Un buen resumen de PR suele incluir algo como:

```txt
What changed
- ...

Why
- ...

Validation
- npx tsc --noEmit --project tsconfig.json
- npm test
- npm run build
```

## Checklist antes de enviar un PR

- el cambio está alineado con el objetivo del starter
- el código compila
- los tests pasan
- el build productivo pasa
- si tocaste dev host, lo probaste en `localhost:5500`
- la documentación relevante quedó actualizada
- no dejaste textos del dominio anterior por accidente

## Qué evitar

- cambios grandes sin contexto
- introducir dependencias innecesarias
- acoplar demasiado la UI al dominio de tareas
- romper la compatibilidad con `flux-proxy`
- romper el theming de Cloudscape
- subir cambios no relacionados dentro del mismo PR

## Si no estás seguro de si algo pertenece aquí

Hazte estas preguntas:

1. ¿Esto hace más útil el starter para terceros?
2. ¿Esto mantiene o mejora la estabilidad?
3. ¿Esto sigue siendo genérico y reutilizable?
4. ¿Esto puede documentarse de forma clara?

Si la mayoría de respuestas es “sí”, probablemente es un buen aporte.

## Gracias

Cada mejora en este starter ayuda a que otros desarrolladores puedan arrancar más rápido y con menos fricción. Ese impacto vale mucho.
