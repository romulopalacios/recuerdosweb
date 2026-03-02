import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Heart } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { TagInput } from '@/components/ui/TagInput'
import { MoodPicker } from '@/components/ui/MoodPicker'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useCreateMemory, useUpdateMemory } from '@/hooks/useMemories'
import { useCategories } from '@/hooks/useCategories'
import type { Memory } from '@/types'
import { cn } from '@/lib/utils'

// ─── Zod schema ──────────────────────────────────────────────────────────────

const schema = z.object({
  title:       z.string().min(1, 'El título es obligatorio').max(100),
  content:     z.string().max(5000).optional(),
  memory_date: z.string().min(1, 'La fecha es obligatoria'),
  category_id: z.string().optional(),
  location:    z.string().max(100).optional(),
  mood:        z.enum(['happy', 'romantic', 'nostalgic', 'excited', 'peaceful']).optional(),
  tags:        z.array(z.string()).max(10).default([]),
  is_favorite: z.boolean().default(false),
})

type FormValues = z.infer<typeof schema>

// ─── Props ────────────────────────────────────────────────────────────────────

interface MemoryFormProps {
  open: boolean
  onClose: () => void
  editing?:  Memory | null
  /** Write-permission guests pass the owner's id so new records belong to the owner */
  ownerId?:  string
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MemoryForm({ open, onClose, editing, ownerId }: MemoryFormProps) {
  const isEditing = Boolean(editing)
  const createMutation = useCreateMemory(ownerId)
  const updateMutation = useUpdateMemory()
  const isPending = createMutation.isPending || updateMutation.isPending
  const { data: categories = [] } = useCategories()

  // Unsaved-changes guard
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      title:       '',
      content:     '',
      memory_date: format(new Date(), 'yyyy-MM-dd'),
      category_id: '',
      location:    '',
      mood:        undefined,
      tags:        [],
      is_favorite: false,
    },
  })

  // Prevent accidental page refresh / tab close when form has unsaved data
  useEffect(() => {
    if (!open || !isDirty) return
    function beforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [open, isDirty])

  // Intercept the close request: if the form is dirty, ask first
  function handleClose() {
    if (isDirty && !isPending) {
      setConfirmDiscard(true)
    } else {
      onClose()
    }
  }

  // Pre-fill when editing
  useEffect(() => {
    if (editing) {
      reset({
        title:       editing.title,
        content:     editing.content ?? '',
        memory_date: editing.memory_date.split('T')[0],
        category_id: editing.category_id ?? '',
        location:    editing.location ?? '',
        mood:        editing.mood,
        tags:        editing.tags ?? [],
        is_favorite: editing.is_favorite,
      })
    } else {
      reset({
        title:       '',
        content:     '',
        memory_date: format(new Date(), 'yyyy-MM-dd'),
        category_id: '',
        location:    '',
        mood:        undefined,
        tags:        [],
        is_favorite: false,
      })
    }
  }, [editing, reset, open])

  const isFavorite = watch('is_favorite')
  const contentVal = watch('content') ?? ''

  async function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      category_id: values.category_id || null,
      tags: values.tags ?? [],
    }
    if (isEditing && editing) {
      await updateMutation.mutateAsync({ id: editing.id, input: payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
    onClose()
  }

  const categoryOptions = [
    { value: '', label: 'Sin categoría' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ]

  return (
    <>
    <Modal
      open={open}
      onClose={handleClose}
      title={isEditing ? 'Editar recuerdo' : 'Nuevo recuerdo 💕'}
      description={isEditing ? 'Actualiza los detalles de este recuerdo.' : 'Guarda un momento especial para siempre.'}
      size="lg"
      footer={
        <>
          {/* Favorite toggle in footer */}
          <button
            type="button"
            onClick={() => setValue('is_favorite', !isFavorite)}
            className={cn(
              'mr-auto flex items-center gap-1.5 text-sm font-medium transition-colors cursor-pointer',
              isFavorite ? 'text-rose-600' : 'text-gray-400 hover:text-rose-400',
            )}
          >
            <Heart size={16} className={isFavorite ? 'fill-rose-500' : ''} />
            {isFavorite ? 'Favorito' : 'Marcar favorito'}
          </button>
          <Button variant="ghost" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="memory-form" loading={isPending}>
            {isEditing ? 'Guardar cambios' : 'Guardar recuerdo'}
          </Button>
        </>
      }
    >
      <form id="memory-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Row: Title + Date */}
        <div className="grid sm:grid-cols-5 gap-4">
          <div className="sm:col-span-3">
            <Input
              label="Título *"
              placeholder="¿Qué fue este momento?"
              error={errors.title?.message}
              {...register('title')}
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              type="date"
              label="Fecha del recuerdo *"
              error={errors.memory_date?.message}
              {...register('memory_date')}
            />
          </div>
        </div>

        {/* Notes */}
        <Textarea
          label="Notas (opcional)"
          placeholder="Escribe todo lo que recuerdas de este momento… cómo te sentiste, qué dijeron, qué olores había…"
          rows={4}
          maxChars={5000}
          currentLength={contentVal.length}
          error={errors.content?.message}
          {...register('content')}
        />

        {/* Row: Category + Location */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Controller
            name="category_id"
            control={control}
            render={({ field }) => (
              <Select
                label="Categoría (opcional)"
                options={categoryOptions}
                placeholder="Elige una categoría"
                error={errors.category_id?.message}
                {...field}
              />
            )}
          />
          <Input
            label="Lugar (opcional)"
            placeholder="¿Dónde fue? Ej: París, restaurante…"
            error={errors.location?.message}
            {...register('location')}
          />
        </div>

        {/* Mood */}
        <Controller
          name="mood"
          control={control}
          render={({ field }) => (
            <MoodPicker
              label="Estado de ánimo (opcional)"
              value={field.value}
              onChange={(mood) => field.onChange(mood)}
            />
          )}
        />

        {/* Tags */}
        <Controller
          name="tags"
          control={control}
          render={({ field }) => (
            <TagInput
              label="Etiquetas (opcional)"
              tags={field.value ?? []}
              onChange={field.onChange}
              placeholder="Escribe una etiqueta y presiona Enter…"
              maxTags={10}
              hint="Hasta 10 etiquetas. Útil para buscar recuerdos."
            />
          )}
        />
      </form>
    </Modal>

    {/* Discard confirmation — shown when user tries to close a dirty form */}
    <ConfirmDialog
      open={confirmDiscard}
      onClose={() => setConfirmDiscard(false)}
      onConfirm={() => { setConfirmDiscard(false); onClose() }}
      title="¿Descartar cambios?"
      description="Tienes cambios sin guardar. Si cierras ahora se perderán."
      confirmLabel="Sí, descartar"
      cancelLabel="Seguir editando"
      danger
    />
    </>
  )
}
