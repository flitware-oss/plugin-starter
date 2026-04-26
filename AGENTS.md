# AGENTS.md

Guia amigable para agentes de codigo que trabajen sobre este proyecto.

Si eres un agente y acabas de entrar a este repositorio, lee este archivo antes de editar nada.

## Que es este proyecto

Este repositorio es el starter publico de plugins externos para Flitware.

Su objetivo es servir como base para que desarrolladores construyan plugins con:

- `React`
- `TypeScript`
- `Cloudscape`
- `flux-proxy`
- entorno local con `iframe`
- mocks de colecciones con `CRUD`, `filter`, `sort`, `expand` y paginacion
- build productivo en un solo archivo `dist/index.html`

El dominio actual del ejemplo es gestion de tareas, pero la infraestructura es generica.

## Prioridades del proyecto

Cuando hagas cambios, prioriza esto en orden:

1. No romper el flujo de desarrollo local.
2. No romper el contrato del runtime entre host y plugin.
3. No romper el build single-file de produccion.
4. Mantener la herencia de tema, idioma y tokens de Cloudscape.
5. Mantener los mocks utiles para terceros.
6. Mantener el proyecto entendible para futuros desarrolladores.

## Mapa mental rapido

### Capa plugin

- `app/app.tsx`
  - entrypoint principal de React
- `app/runtime/plugin-runtime.tsx`
  - lee `window.__PLUGIN_CONFIG__`
  - aplica `theme`, `language` y `cloudscapeTheme`
  - escucha `flitware:runtime-sync`
- `app/api/plugin-client.ts`
  - cliente del plugin para hablar con el host mediante `flux-proxy`
- `app/screens/task-dashboard.tsx`
  - pantalla de ejemplo del starter
- `app/components/*`
  - componentes reutilizables del plugin

### Capa host local

- `dev/host.ts`
  - host de desarrollo que emula Flitware
- `dev/task-dev-data.ts`
  - datos mock del dominio
- `dev/mock-engine.ts`
  - motor mock con `CRUD`, `filter`, `sort`, `expand`, paginacion y persistencia
- `dev/flitware-theme.ts`
  - tema de Cloudscape simulado en el host local

### Tooling

- `build.js`
  - genera `dist/index.html`
- `dev-build.js`
  - genera `.dev`
- `watch.js`
  - recompila y levanta el host local
- `scripts/run-tests.mjs`
  - runner de tests

## Comandos base

Usa estos comandos como flujo normal:

```bash
npm run dev
npm run build:dev
npm run build
npm test
npx tsc --noEmit --project tsconfig.json
```

Si haces cambios relevantes, intenta validar al menos:

- `npx tsc --noEmit --project tsconfig.json`
- `npm test`
- `npm run build`

Si tocas entorno local o bridge, valida tambien:

- `npm run build:dev`
- `npm run dev`

## Contrato del runtime

El plugin depende de `window.__PLUGIN_CONFIG__`.

Espera algo como:

```ts
window.__PLUGIN_CONFIG__ = {
  theme: "light" | "dark",
  language: "es" | "en",
  cloudscapeTheme: Theme,
  fluxProxy: {
    targetOrigin: string
  },
  plugin: {
    installedPluginId: string,
    pluginId: string,
    version: string
  }
}
```

No cambies este contrato sin actualizar tambien:

- `app/runtime/plugin-runtime.tsx`
- `dev/host.ts`
- la documentacion del README

## Contrato de flux-proxy

La comunicacion plugin-host pasa por `flux-proxy`.

### Lado plugin

`app/api/plugin-client.ts` usa:

- `FluxProxy.childClient.getData`
- `FluxProxy.childClient.postData`

### Lado host

`dev/host.ts` resuelve mensajes usando:

- `createTaskMockEnvironment()`
- `resolvePluginProxyMessage(...)`

### Acciones actuales

- `getData`
- `postData`

### Operaciones actuales

- `create`
- `update`
- `delete`

Si extiendes estas operaciones, mantén consistencia entre:

- plugin client
- host dev
- mocks
- README
- tests

## Reglas importantes para editar

### 1. No rompas el build single-file

`build.js` debe seguir generando:

```txt
dist/index.html
```

No conviertas este starter en un build multiarchivo de produccion.

### 2. No rompas Cloudscape

Este starter preserva los comentarios legales requeridos por Cloudscape.

Ten cuidado si tocas:

- minificacion
- bundling
- loaders de assets
- inyeccion de CSS

### 3. No rompas el theming

El plugin debe reaccionar correctamente a:

- `theme`
- `language`
- `cloudscapeTheme`

Si tocas el runtime, verifica:

- `awsui-light-mode`
- `awsui-dark-mode`
- `applyMode`
- `applyDensity`
- `applyTheme`

### 4. No rompas la estabilidad del cliente

`app/api/plugin-client.ts` fuerza `requestKey: null` por una razon:

- evitar auto-cancelaciones molestas durante busquedas y filtros concurrentes

No quites eso sin una razon muy clara.

### 5. Mantén el host local autosuficiente

El modo desarrollo debe seguir funcionando sin la app principal real.

Eso implica mantener:

- mocks funcionales
- persistencia local
- `iframe`
- toolbar de `theme` e `idioma`
- `pluginVersion`

## Como pensar cambios nuevos

Si quieres agregar una capacidad nueva, intenta seguir esta secuencia:

1. Ajusta el dominio mock.
2. Ajusta el adaptador del host.
3. Ajusta la UI.
4. Ajusta tests.
5. Ajusta README si cambia el comportamiento publico.

## Si cambias el dominio

Este starter hoy usa tareas. Si lo migras a otro dominio:

- cambia `dev/task-dev-data.ts`
- cambia `app/screens/task-dashboard.tsx`
- revisa textos de `plugin.config.json`
- revisa README
- revisa tests

No hace falta reescribir toda la infraestructura si el objetivo solo es cambiar el ejemplo funcional.

## Si agregas nuevas colecciones mock

Hazlo en `dev/task-dev-data.ts`.

Checklist:

- define records
- define relations
- prueba `expand`
- prueba filtros sobre relaciones
- prueba `create`, `update`, `delete`
- prueba paginacion

## Si agregas nuevas capacidades de query

El lugar correcto es `dev/mock-engine.ts`.

Antes de tocarlo, recuerda que ese archivo es parte critica del starter.

Si agregas soporte nuevo para:

- operadores
- arrays
- nested expand
- sort especial
- filtros avanzados

tambien debes:

- agregar tests
- documentarlo en README

## Estilo esperado de codigo

- Prefiere cambios pequenos y composables.
- Reutiliza componentes existentes antes de crear otros.
- Mantén nombres claros y directos.
- Evita acoplar UI con datos mock innecesariamente.
- Si agregas helpers, colocalos en `app/utils` o `dev` segun su responsabilidad.

## Donde empezar segun el tipo de tarea

### UI o UX

Empieza en:

- `app/screens/task-dashboard.tsx`
- `app/components/*`

### Bridge o comunicacion

Empieza en:

- `app/api/plugin-client.ts`
- `dev/host.ts`
- `dev/task-dev-data.ts`

### Mocks, filtros o relaciones

Empieza en:

- `dev/mock-engine.ts`
- `dev/task-dev-data.ts`

### Tema y runtime

Empieza en:

- `app/runtime/plugin-runtime.tsx`
- `dev/flitware-theme.ts`
- `dev/host.ts`

### Build

Empieza en:

- `build.js`
- `dev-build.js`
- `watch.js`

## Anti-patrones a evitar

- No dejar strings del dominio viejo si cambias el ejemplo.
- No meter llamadas reales a servicios externos dentro del dev host.
- No duplicar logica del mock engine dentro de la UI.
- No romper el contrato de `window.__PLUGIN_CONFIG__`.
- No mover la logica de tema a componentes de pantalla.
- No asumir que el plugin siempre correra solo en modo local.

## Checklist antes de cerrar una tarea

- `TypeScript` en verde
- tests en verde
- build de produccion en verde
- si tocaste host o runtime, build dev en verde
- README actualizado si cambiaste comportamiento publico

## Archivos que un agente deberia leer primero

Si tienes poco tiempo, lee en este orden:

1. `README.md`
2. `AGENTS.md`
3. `app/runtime/plugin-runtime.tsx`
4. `app/api/plugin-client.ts`
5. `dev/host.ts`
6. `dev/mock-engine.ts`
7. `dev/task-dev-data.ts`
8. `app/screens/task-dashboard.tsx`

## Resumen corto para arrancar rapido

Si solo necesitas una version ultra corta:

- corre `npm run dev`
- mira `app/screens/task-dashboard.tsx`
- usa `usePluginApi()` para datos
- mantén `plugin-runtime.tsx` intacto salvo que realmente estés tocando tema/runtime
- usa `dev/task-dev-data.ts` para mocks
- valida con `npm test`, `npm run build` y `npx tsc --noEmit --project tsconfig.json`

Si llegaste hasta aquí, ya tienes el contexto suficiente para trabajar con seguridad sobre este starter.
