# Recuerdos Web — Documentación Técnica

> **"Un diario de recuerdos compartidos para parejas y familias, construido para escalar con fiabilidad."**

---

## Tabla de Contenidos

1. [Descripción del Proyecto](#1-descripción-del-proyecto)
2. [Características Principales](#2-características-principales)
3. [Stack Tecnológico](#3-stack-tecnológico)
4. [Estructura del Repositorio](#4-estructura-del-repositorio)
5. [Primeros Pasos](#5-primeros-pasos)
6. [Variables de Entorno](#6-variables-de-entorno)
7. [Ejecución en Desarrollo](#7-ejecución-en-desarrollo)
8. [Tests](#8-tests)
9. [Despliegue (Vercel + Supabase)](#9-despliegue-vercel--supabase)
10. [Documentación Adicional](#10-documentación-adicional)

---

## 1. Descripción del Proyecto

**Recuerdos Web** es una Progressive Web App (PWA) que permite a parejas y familias crear, enriquecer y revivir recuerdos compartidos. Los usuarios pueden escribir entradas de diario, adjuntar álbumes de fotos, etiquetar emociones, categorizar eventos e invitar a su pareja a ver o co-crear su línea de tiempo — todo en tiempo real.

La aplicación está diseñada para funcionar como un diario individual que puede convertirse en una experiencia compartida en cualquier momento mediante un enlace de invitación criptográfico, sin necesidad de que ambos usuarios compartan una misma cuenta.

---

## 2. Características Principales

| Característica | Descripción |
|---|---|
| **Diario de Recuerdos** | Entradas de texto enriquecido con fecha, estado de ánimo, ubicación, etiquetas y álbumes de fotos. |
| **Álbumes de Fotos** | Carga por arrastrar y soltar con progreso en tiempo real, visor lightbox y cuadrícula con scroll virtual para mejor rendimiento. |
| **Vista de Línea de Tiempo** | Vista cronológica mes a mes con filtro por año y orden de clasificación. |
| **Categorías** | Categorías personalizables con color e icono para organizar los recuerdos. |
| **Búsqueda y Filtros** | Filtrar por rango de fechas, estado de ánimo, categoría, favoritos y texto libre. |
| **Modo Compartido** | Sistema de invitación por token — el propietario otorga acceso `read` o `write` a un invitado. El acceso puede revocarse en cualquier momento. |
| **Sincronización en Tiempo Real** | Supabase Postgres Changes (WebSocket) — ambas parejas ven las actualizaciones al instante. |
| **Notificaciones Push** | Web Push API + VAPID. Envía una notificación cuando un invitado acepta una invitación. Detecta aniversarios de recuerdos al cargar la app. |
| **Exportar Álbum de Fotos** | Exporta las fotos de un recuerdo como PDF usando `html2canvas` + `jsPDF`. |
| **PWA / Shell Offline** | El service worker pre-cachea el shell de la app para carga instantánea. |
| **Paleta de Comandos** | Overlay de navegación rápida con `Cmd/Ctrl+K`. |

---

## 3. Stack Tecnológico

### Frontend

| Capa | Librería / Herramienta | Versión |
|---|---|---|
| Framework | React | 18.3 |
| Lenguaje | TypeScript | 5.6 |
| Build tool | Vite | 5.4 |
| Enrutamiento | React Router DOM | 7.13 |
| Estado del servidor | TanStack React Query | 5.90 |
| Estado global | Zustand | 5.0 |
| Formularios | React Hook Form + Zod | 7.71 / 4.3 |
| Animaciones | Framer Motion | 12 |
| Estilos | Tailwind CSS v4 | 4.2 |
| Iconos | Lucide React | 0.575 |
| Notificaciones toast | Sonner | 2.0 |
| Scroll virtual | TanStack Virtual | 3.13 |
| Exportar PDF | jsPDF + html2canvas | 4.2 / 1.4 |
| Utilidades de fechas | date-fns | 4.1 |

### Backend / Infraestructura

| Capa | Servicio |
|---|---|
| Base de datos | Supabase (PostgreSQL 15) |
| Autenticación | Supabase Auth (email/contraseña + magic link) |
| Almacenamiento de archivos | Supabase Storage (bucket `photos`) |
| Edge Functions | Supabase Edge Runtime (Deno) |
| Tiempo real | Supabase Realtime (Postgres Changes) |
| Hosting | Vercel (Vite SPA con reglas de reescritura SPA) |
| Notificaciones Push | Web Push API + VAPID (formato compatible con `web-push`) |

### Testing

| Herramienta | Rol |
|---|---|
| Playwright | Tests end-to-end (Chromium, Firefox, Mobile) |

---

## 4. Estructura del Repositorio

```
recuerdosweb/
├── docs/                    # ← Estás aquí
│   ├── README.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   └── HOOKS.md
├── e2e/                     # Especificaciones de tests Playwright
│   ├── helpers/             # Fixtures compartidos y helpers de mock de Supabase
│   ├── auth.spec.ts
│   ├── gallery.spec.ts
│   ├── memories.spec.ts
│   └── sharing.spec.ts
├── public/
│   ├── sw.js                # Service worker (push + shell offline)
│   └── manifest.json        # Manifiesto PWA
├── src/
│   ├── components/          # Componentes UI reutilizables (ui/, layout/, memories/, …)
│   ├── hooks/               # Hooks React personalizados (data fetching + efectos)
│   ├── lib/                 # Cliente Supabase, singleton queryClient, utilidades
│   ├── pages/               # Componentes de página a nivel de ruta
│   ├── services/            # Llamadas directas a la API de Supabase (sin dependencias React)
│   ├── store/               # Stores globales Zustand (authStore)
│   └── types/               # Tipos TypeScript del dominio
├── supabase/
│   ├── functions/
│   │   ├── process-image/   # Edge Function: generación de miniaturas
│   │   └── send-push/       # Edge Function: despachador Web Push
│   └── migrations/          # Migraciones SQL ordenadas
├── vercel.json              # Configuración de despliegue Vercel (SPA rewrite, cabeceras CSP)
├── vite.config.ts
├── playwright.config.ts
└── package.json
```

---

## 5. Primeros Pasos

### Prerrequisitos

- **Node.js** ≥ 20 LTS
- **npm** ≥ 10
- Un proyecto en **Supabase** (el plan gratuito es suficiente)
- Una cuenta en **Vercel** (para el despliegue en producción)

### Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/your-org/recuerdosweb.git
cd recuerdosweb

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# → Rellena los valores descritos en el §6 de abajo

# 4. Aplicar migraciones de base de datos
npx supabase db push
# o pega cada archivo de supabase/migrations/ en el Editor SQL de Supabase

# 5. Desplegar Edge Functions
npx supabase functions deploy process-image --no-verify-jwt
npx supabase functions deploy send-push
```

---

## 6. Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto (nunca lo incluyas en el control de versiones).

```dotenv
# ── Supabase ──────────────────────────────────────────────────────────────────
# Se encuentran en: Supabase Dashboard → Project Settings → API
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...

# ── Web Push (VAPID) ──────────────────────────────────────────────────────────
# Genera un par de claves una única vez por proyecto:
#   npx web-push generate-vapid-keys
# La clave PÚBLICA va aquí (lado cliente). La clave PRIVADA va en los Secrets
# de las Edge Functions de Supabase (nunca en este archivo).
VITE_VAPID_PUBLIC_KEY=BNxxxxxxxxxxxxxxxxxxxxxxxx...
```

### `.env.example` (este sí se incluye en el repositorio)

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key-here
```

### Secrets de las Edge Functions de Supabase

Configúralos desde el Dashboard de Supabase → Project → Edge Functions → Secrets, o mediante la CLI:

```bash
supabase secrets set VAPID_PRIVATE_KEY="your-private-key"
supabase secrets set VAPID_SUBJECT="mailto:you@example.com"
```

> `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` son **inyectados automáticamente** por el Supabase Edge Runtime — no los configures manualmente.

---

## 7. Ejecución en Desarrollo

```bash
# Iniciar el servidor de desarrollo de Vite (http://localhost:5173)
npm run dev

# Verificar tipos sin emitir
npx tsc --noEmit

# Linting
npm run lint
```

---

## 8. Tests

El proyecto usa **Playwright** para tests end-to-end contra el servidor de desarrollo en ejecución.

```bash
# Ejecutar tests E2E en Chromium sin interfaz gráfica
npm run test:e2e

# Abrir la UI interactiva de Playwright
npm run test:e2e:ui

# Ejecutar en todos los navegadores configurados (Chromium + Firefox + Mobile Chrome)
npm run test:e2e:full

# Ver el último informe HTML
npm run test:e2e:report
```

Los archivos de test están en `e2e/`. Los helpers compartidos (fixtures, mock de Supabase) están en `e2e/helpers/`.

---

## 9. Despliegue (Vercel + Supabase)

### Vercel

El archivo `vercel.json` en la raíz del repositorio viene preconfigurado:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**Cabeceras de seguridad** configuradas en `vercel.json`:

| Cabecera | Valor |
|---|---|
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | cámara, micrófono, geolocalización, pago — todos bloqueados |
| `Content-Security-Policy` | Restringe scripts, estilos, conexiones e imágenes a `self` + `*.supabase.co` |

**Variables de entorno requeridas en Vercel** (configurar en Project → Settings → Environment Variables):

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_VAPID_PUBLIC_KEY
```

### Supabase Storage

Crea un bucket público llamado `photos` en Supabase Storage. La aplicación asume que este bucket está configurado como **público** (no se usan URLs firmadas; la app construye las URLs de CDN directamente).

---

## 10. Documentación Adicional

| Documento | Descripción |
|---|---|
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Arquitectura del sistema, ciclo de vida de Notificaciones Push, flujos de Edge Functions, sistema de compartición |
| [DATABASE.md](./docs/DATABASE.md) | Esquemas de tablas, políticas RLS, historial de migraciones |
| [HOOKS.md](./docs/HOOKS.md) | Referencia de hooks personalizados, integración de React Query, singleton QueryClient |
