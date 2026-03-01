import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { IconPicker } from '@/components/ui/IconPicker'
import { getIconEmoji } from '@/lib/categoryData'
import { useCreateCategory, useUpdateCategory } from '@/hooks/useCategories'
import type { Category, CategoryColor, CategoryIcon } from '@/types'

// ─── Zod schema ──────────────────────────────────────────────────────────────

const schema = z.object({
  name:        z.string().min(1, 'El nombre es obligatorio').max(40, 'Máximo 40 caracteres'),
  description: z.string().max(120, 'Máximo 120 caracteres').optional(),
  color:       z.string() as z.ZodType<CategoryColor>,
  icon:        z.string() as z.ZodType<CategoryIcon>,
})

type FormValues = z.infer<typeof schema>

// ─── Props ────────────────────────────────────────────────────────────────────

interface CategoryFormProps {
  open: boolean
  onClose: () => void
  /** Passed when editing an existing category */
  editing?: Category | null
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CategoryForm({ open, onClose, editing }: CategoryFormProps) {
  const isEditing = Boolean(editing)
  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory()
  const isPending = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:        '',
      description: '',
      color:       'rose',
      icon:        'heart',
    },
  })

  // Pre-fill when editing
  useEffect(() => {
    if (editing) {
      reset({
        name:        editing.name,
        description: editing.description ?? '',
        color:       editing.color,
        icon:        editing.icon,
      })
    } else {
      reset({ name: '', description: '', color: 'rose', icon: 'heart' })
    }
  }, [editing, reset, open])

  const selectedColor = watch('color')
  const selectedIcon  = watch('icon')

  async function onSubmit(values: FormValues) {
    if (isEditing && editing) {
      await updateMutation.mutateAsync({ id: editing.id, input: values })
    } else {
      await createMutation.mutateAsync(values)
    }
    onClose()
  }

  // Visual preview
  const preview = {
    emoji: getIconEmoji(selectedIcon as CategoryIcon),
    colorClass: {
      rose:   'from-rose-500 to-pink-500',
      pink:   'from-pink-500 to-fuchsia-500',
      purple: 'from-purple-500 to-violet-500',
      blue:   'from-blue-500 to-sky-500',
      green:  'from-green-500 to-emerald-500',
      amber:  'from-amber-500 to-yellow-500',
      orange: 'from-orange-500 to-red-400',
      teal:   'from-teal-500 to-cyan-500',
    }[selectedColor] ?? 'from-rose-500 to-pink-500',
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar categoría' : 'Nueva categoría'}
      description={isEditing ? 'Cambia los detalles de esta categoría.' : 'Crea una nueva categoría para organizar tus recuerdos.'}
      size="sm"
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="category-form"
            loading={isPending}
          >
            {isEditing ? 'Guardar cambios' : 'Crear categoría'}
          </Button>
        </>
      }
    >
      {/* Preview */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-pink-50 mb-5">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${preview.colorClass} flex items-center justify-center text-xl shadow-sm flex-shrink-0`}>
          {preview.emoji}
        </div>
        <div>
          <p className="font-semibold text-gray-800 text-sm">{watch('name') || 'Sin nombre'}</p>
          <p className="text-xs text-gray-400">{watch('description') || 'Sin descripción'}</p>
        </div>
      </div>

      <form id="category-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Nombre"
          placeholder="Ej: Viajes, Cenas, Fechas especiales…"
          error={errors.name?.message}
          {...register('name')}
        />

        <Textarea
          label="Descripción (opcional)"
          placeholder="¿Qué tipo de recuerdos guarda esta categoría?"
          rows={2}
          error={errors.description?.message}
          {...register('description')}
        />

        <ColorPicker
          label="Color"
          value={selectedColor as CategoryColor}
          onChange={(c) => setValue('color', c, { shouldValidate: true })}
        />

        <IconPicker
          label="Ícono"
          value={selectedIcon as CategoryIcon}
          onChange={(i) => setValue('icon', i, { shouldValidate: true })}
        />
      </form>
    </Modal>
  )
}
