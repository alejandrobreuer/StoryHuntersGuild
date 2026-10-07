import { z } from "zod";

// Plain `date` columns (epic/task due_date) — not a timestamptz, so no
// time-of-day/offset parsing needed, just a yyyy-mm-dd shape.
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida.");

export const epicStatusSchema = z.enum(["planning", "in_progress", "done", "cancelled"]);
export const taskStatusSchema = z.enum(["todo", "in_progress", "blocked", "done"]);

export const epicCreateSchema = z.object({
  title:       z.string().trim().min(1).max(120),
  description: z.string().max(5000).nullable().optional(),
  event_id:    z.string().uuid().nullable().optional(),
  owner_id:    z.string().uuid().nullable().optional(),
  due_date:    isoDate.nullable().optional(),
});

export const epicUpdateSchema = epicCreateSchema.partial().extend({
  status: epicStatusSchema.optional(),
});

export const taskCreateSchema = z.object({
  title:       z.string().trim().min(1).max(160),
  description: z.string().max(5000).nullable().optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  due_date:    isoDate.nullable().optional(),
});

export const taskUpdateSchema = taskCreateSchema.partial().extend({
  status: taskStatusSchema.optional(),
});

export const taskReorderSchema = z.object({
  status:      taskStatusSchema,
  ordered_ids: z.array(z.string().uuid()).min(1).max(500),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export const templateTaskSchema = z.object({
  // Present = update that existing template_task row; absent = insert new.
  id:              z.string().uuid().optional(),
  title:           z.string().trim().min(1).max(160),
  description:     z.string().max(5000).nullable().optional(),
  due_offset_days: z.number().int().min(0).max(365).nullable().optional(),
});

export const templateSchema = z.object({
  name:        z.string().trim().min(1).max(120),
  description: z.string().max(5000).nullable().optional(),
  tasks:       z.array(templateTaskSchema).max(200).default([]),
});

export const createEpicFromTemplateSchema = z.object({
  template_id: z.string().uuid(),
  title:       z.string().trim().min(1).max(120),
  description: z.string().max(5000).nullable().optional(),
  event_id:    z.string().uuid().nullable().optional(),
  owner_id:    z.string().uuid().nullable().optional(),
  due_date:    isoDate.nullable().optional(),
});

export const saveAsTemplateSchema = z.object({
  name:        z.string().trim().min(1).max(120),
  description: z.string().max(5000).nullable().optional(),
});
