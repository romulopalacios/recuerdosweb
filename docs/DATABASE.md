# Referencia de Base de Datos

---

## Tabla de Contenidos

1. [Visión General](#1-visión-general)
2. [Tabla: `memories`](#2-tabla-memories)
3. [Tabla: `photos`](#3-tabla-photos)
4. [Tabla: `shared_access`](#4-tabla-shared_access)
5. [Tabla: `push_subscriptions`](#5-tabla-push_subscriptions)
6. [Tabla: `categories`](#6-tabla-categories)
7. [Estrategia de Row Level Security](#7-estrategia-de-row-level-security)
8. [Políticas del Bucket de Storage](#8-políticas-del-bucket-de-storage)
9. [Funciones SECURITY DEFINER](#9-funciones-security-definer)
10. [Historial de Migraciones](#10-historial-de-migraciones)

---

## 1. Visión General

La base de datos se ejecuta en **PostgreSQL 15** mediante Supabase. **Row Level Security (RLS)** está habilitado en todas las tablas — ninguna consulta puede omitirlo a menos que sea emitida desde una Edge Function de Supabase usando la clave `service_role`.

El modelo de seguridad general es:

> **Los usuarios son dueños de sus filas (`user_id = auth.uid()`). Los invitados obtienen acceso del propietario a través de la tabla de unión `shared_access`. Las políticas RLS lo hacen cumplir a nivel de base de datos, de manera independiente al código de la aplicación.**

---

## 2. Tabla: `memories`

La entidad principal. Cada fila representa una entrada de recuerdo con fecha.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` | Identificador único |
| `user_id` | `uuid` | FK → `auth.users.id`, NOT NULL | Propietario del recuerdo |
| `title` | `text` | NOT NULL | Título corto |
| `content` | `text` | | Cuerpo de texto enriquecido |
| `memory_date` | `date` | NOT NULL | La fecha en que ocurrió el recuerdo |
| `category_id` | `uuid` | FK → `categories.id` | Categoría opcional |
| `location` | `text` | | Ubicación en texto libre |
| `mood` | `text` | CHECK in ('happy','romantic','nostalgic','excited','peaceful') | Etiqueta emocional |
| `is_favorite` | `boolean` | DEFAULT `false` | Marcador de favorito |
| `cover_photo_url` | `text` | | URL pública de la foto de portada |
| `tags` | `text[]` | DEFAULT `'{}'` | Array de etiquetas libres |
| `created_at` | `timestamptz` | DEFAULT `now()` | Momento de creación de la fila |
| `updated_at` | `timestamptz` | DEFAULT `now()` | Última modificación |

### Políticas RLS — `memories`

| Nombre de política | Operación | Quién | Condición |
|---|---|---|---|
| `memories: owner full control` | ALL | Autenticado | `user_id = auth.uid()` |
| `memories: shared guest read` | SELECT | Autenticado | Existe una fila activa `shared_access` para `(owner_id = user_id, guest_user_id = auth.uid())` |
| `memories: write-share guest can insert` | INSERT | Autenticado | `user_id` coincide con el propietario en un share activo con permiso `write` |
| `memories: write-share guest can update` | UPDATE | Autenticado | Igual que el anterior |
| `memories: write-share guest can delete` | DELETE | Autenticado | Igual que el anterior |

---

## 3. Tabla: `photos`

Una fila por archivo de foto. Múltiples fotos pueden pertenecer a un recuerdo.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` | Identificador único |
| `memory_id` | `uuid` | FK → `memories.id` ON DELETE CASCADE | Recuerdo padre |
| `user_id` | `uuid` | FK → `auth.users.id` | Propietario (igual que el del recuerdo) |
| `storage_path` | `text` | NOT NULL | Ruta dentro del bucket `photos` de Supabase Storage |
| `public_url` | `text` | NOT NULL | URL directa de CDN construida desde `storage_path` |
| `thumb_url` | `text` | | URL de miniatura 200×200 — poblada por la Edge Function `process-image` |
| `caption` | `text` | | Descripción opcional |
| `taken_at` | `timestamptz` | | Fecha EXIF (si está disponible) |
| `width` | `integer` | | Ancho de la imagen original en píxeles |
| `height` | `integer` | | Alto de la imagen original en píxeles |
| `size_bytes` | `integer` | | Tamaño del archivo |
| `order_index` | `integer` | DEFAULT `0` | Orden de visualización dentro del recuerdo |
| `created_at` | `timestamptz` | DEFAULT `now()` | Momento de creación de la fila |

### Políticas RLS — `photos`

Espeja las políticas de `memories`:

| Nombre de política | Operación | Quién | Condición |
|---|---|---|---|
| `photos: owner full control` | ALL | Autenticado | `user_id = auth.uid()` |
| `photos: shared guest read` | SELECT | Autenticado | Fila `shared_access` activa para el propietario del recuerdo padre |
| `photos: write-share guest can insert/update/delete` | DML | Autenticado | Share activo con permiso `write` |

---

## 4. Tabla: `shared_access`

La tabla central del sistema de invitaciones y compartición.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `uuid` | PK | Identificador único |
| `owner_id` | `uuid` | FK → `auth.users.id` ON DELETE CASCADE, NOT NULL | El usuario que comparte sus recuerdos |
| `guest_user_id` | `uuid` | FK → `auth.users.id` ON DELETE SET NULL | Se rellena cuando el invitado acepta |
| `invite_token` | `uuid` | DEFAULT `gen_random_uuid()`, UNIQUE, NOT NULL | Token criptográfico de invitación (uso único) |
| `permission` | `text` | DEFAULT `'read'`, CHECK (`'read'`\|`'write'`), NOT NULL | Nivel de acceso del invitado |
| `guest_name` | `text` | | Etiqueta de visualización opcional establecida por el propietario |
| `guest_email` | `text` | | Si se establece, solo esta dirección de email puede aceptar la invitación |
| `accepted_at` | `timestamptz` | | Se rellena al aceptar — el token queda invalidado a partir de ese momento |
| `expires_at` | `timestamptz` | NOT NULL | Fecha límite de validez (por defecto: 7 días desde la creación) |
| `created_at` | `timestamptz` | DEFAULT `now()` | Momento de creación de la fila |

### Propiedades de Seguridad del Token

- Los tokens son **UUID v4** (128 bits aleatorios) — fuerza bruta inviable.
- Los tokens son de **uso único** — una vez que `accepted_at` se establece, el token queda inválido.
- Los tokens **caducan** — `expires_at` se establece por defecto a `now() + 7 días`.
- Restricción por email — si `guest_email` está configurado, solo esa dirección puede llamar `accept_shared_invite()`.
- Protección ante condiciones de carrera — `accept_shared_invite()` usa `SELECT … FOR UPDATE` para evitar aceptaciones dobles concurrentes.

### Políticas RLS — `shared_access`

| Nombre de política | Operación | Quién | Condición |
|---|---|---|---|
| `shared_access: owner full control` | ALL | Autenticado | `owner_id = auth.uid()` |
| `shared_access: guest can read their own` | SELECT | Autenticado | `guest_user_id = auth.uid()` |
| `shared_access: guest can accept pending invite` | UPDATE | Autenticado | `accepted_at IS NULL AND expires_at > now()` → `WITH CHECK (guest_user_id = auth.uid() AND accepted_at IS NOT NULL)` |

> **Nota:** La política amplia `"any auth user can read pending invite by token"` (migración `_002`) fue **eliminada** en la migración `_20260302000001` y reemplazada por la función `accept_shared_invite()` con SECURITY DEFINER para prevenir la enumeración de invitaciones pendientes.

---

## 5. Tabla: `push_subscriptions`

Almacena el objeto de suscripción Web Push de cada usuario.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `uuid` | PK | Identificador único |
| `user_id` | `uuid` | FK → `auth.users.id` ON DELETE CASCADE, UNIQUE | Una suscripción por usuario |
| `endpoint` | `text` | NOT NULL | URL del endpoint push proporcionada por el navegador |
| `p256dh` | `text` | NOT NULL | Clave pública ECDH (para cifrado) |
| `auth` | `text` | NOT NULL | Secreto de autenticación (para cifrado) |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | Se actualiza al re-suscribirse |

### Políticas RLS — `push_subscriptions`

| Nombre de política | Operación | Quién | Condición |
|---|---|---|---|
| `push_subscriptions: owner only` | ALL | Autenticado | `user_id = auth.uid()` |

La restricción `UNIQUE (user_id)` significa que `usePushNotifications` usa un **upsert** (`INSERT … ON CONFLICT (user_id) DO UPDATE`) para gestionar las renovaciones de suscripción de forma transparente.

---

## 6. Tabla: `categories`

Cuadros definidos por el usuario para organizar recuerdos.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → `auth.users.id`, NOT NULL | Propietario |
| `name` | `text` | NOT NULL | Nombre de visualización |
| `description` | `text` | | Descripción opcional |
| `color` | `text` | NOT NULL | Uno de: `rose`, `pink`, `purple`, `blue`, `green`, `amber`, `orange`, `teal` |
| `icon` | `text` | NOT NULL | Uno de: `heart`, `star`, `camera`, `map-pin`, `music`, `coffee`, `gift`, `sun`, `moon`, `plane`, `home`, `sparkles` |
| `created_at` | `timestamptz` | DEFAULT `now()` | |

RLS: control total del propietario (`user_id = auth.uid()`). Los invitados con permiso `write` también pueden insertar/actualizar/eliminar categorías (mismo patrón que `memories`).

---

## 7. Estrategia de Row Level Security

### Principio de Mínimo Privilegio

Todas las tablas siguen el mismo patrón:

```
Usuario → posee sus filas (user_id = auth.uid())
Invitado → acceso otorgado mediante shared_access (subconsulta para validar el share)
Edge Functions → usan clave service_role → omiten RLS completamente
```

### Patrón de Verificación de Escritura del Invitado

Todas las políticas de invitado con permiso `write` usan la misma forma de subconsulta. Esto simplifica la auditoría:

```sql
-- Verificación estándar de invitado con escritura (reutilizada en memories, photos, categories)
user_id IN (
  SELECT sa.owner_id
  FROM public.shared_access sa
  WHERE sa.guest_user_id = auth.uid()
    AND sa.accepted_at  IS NOT NULL
    AND sa.expires_at   > now()
    AND sa.permission   = 'write'
)
```

Esta consulta se ejecuta en cada sentencia DML aplicable. PostgreSQL la evalúa eficientemente con un índice sobre `(guest_user_id, accepted_at, expires_at, permission)` si se añade.

### Aplicación de Caducidad

La caducidad del token (`expires_at > now()`) se aplica **a nivel de base de datos** en cada política RLS. No se necesita ningún cron job ni worker en segundo plano para invalidar tokens caducados — simplemente dejan de coincidir con la cláusula `USING`.

---

## 8. Políticas del Bucket de Storage

El bucket `photos` de Storage requiere políticas personalizadas para el escenario de escritura del invitado, ya que la política por defecto de Supabase Storage solo permite escrituras en el prefijo de ruta `{auth.uid()}/…`.

| Política | Operación | Condición |
|---|---|---|
| `photos bucket: owner can insert own folder` | INSERT | `(foldername)[1] = auth.uid()` |
| `photos bucket: owner can read own folder` | SELECT | `(foldername)[1] = auth.uid()` |
| `photos bucket: owner can delete own folder` | DELETE | `(foldername)[1] = auth.uid()` |
| `photos bucket: owner can update own folder` | UPDATE | `(foldername)[1] = auth.uid()` |
| `photos bucket: write-guest can insert to owner folder` | INSERT | Share `write` activo donde `owner_id = (foldername)[1]` |
| `photos bucket: write-guest can read owner folder` | SELECT | Share aceptado activo donde `owner_id = (foldername)[1]` |

La convención de ruta de almacenamiento es `{owner_user_id}/{memory_id}/{filename}`. El primer segmento de carpeta (`storage.foldername(name)[1]`) siempre es el `user_id` del propietario, lo que permite a las políticas usarlo como clave de unión contra `shared_access.owner_id`.

---

## 9. Funciones SECURITY DEFINER

### `accept_shared_invite(p_token UUID)`

**Esquema:** `public`  
**Retorna:** `public.shared_access`  
**Seguridad:** `SECURITY DEFINER` (se ejecuta como el rol `postgres`, omitiendo RLS)  
**Search path:** Establecido explícitamente a `public` para prevenir ataques de inyección de search_path.

**Validaciones realizadas (en orden):**

1. El token debe existir (`NOT FOUND` → `RAISE EXCEPTION 'INVALID_TOKEN'`)
2. El invocador no debe ser el propietario (`owner_id = caller_id` → `RAISE EXCEPTION 'OWN_INVITE'`)
3. El token no debe haber caducado (`expires_at < now()` → `RAISE EXCEPTION 'EXPIRED'`)
4. Si `guest_email` está configurado, el email del invocador debe coincidir (`RAISE EXCEPTION 'WRONG_EMAIL:%'`)
5. Si ya fue aceptado por este invocador → retorno idempotente (ya aceptado)
6. Si ya fue aceptado por otra persona → `RAISE EXCEPTION 'ALREADY_USED'`
7. Aceptar: `UPDATE … SET guest_user_id = caller_id, accepted_at = now()`

La fila se bloquea con `SELECT … FOR UPDATE` antes de cualquier verificación para que las aceptaciones concurrentes del mismo token se serialicen.

---

## 10. Historial de Migraciones

| Archivo | Fecha | Resumen |
|---|---|---|
| `20260301000001_shared_access_push.sql` | 2026-03-01 | Añade `thumb_url` a `photos`; crea las tablas `push_subscriptions` y `shared_access` con RLS base; extiende la política de lectura de `memories` para invitados |
| `20260301000002_fix_invite_rls.sql` | 2026-03-01 | Añade política SELECT permisiva para que invitados sin coincidencia puedan leer invitaciones pendientes por token (luego reemplazada) |
| `20260301000003_permission_column.sql` | 2026-03-01 | Añade columna `permission` a `shared_access`; añade políticas DML de invitado-escritura sobre `memories`, `photos` y `categories` |
| `20260301000004_storage_guest_policy.sql` | 2026-03-01 | Añade políticas del bucket Storage para subidas de invitado-escritura y gestión del propietario |
| `20260302000001_secure_invite_acceptance.sql` | 2026-03-02 | Elimina la política SELECT permisiva de invitaciones; introduce la función `accept_shared_invite()` con SECURITY DEFINER para prevenir la enumeración de invitaciones |

### Aplicar Migraciones

```bash
# Mediante Supabase CLI (recomendado para equipos)
supabase db push

# O pegar cada archivo secuencialmente en:
# Supabase Dashboard → SQL Editor → Run
```
