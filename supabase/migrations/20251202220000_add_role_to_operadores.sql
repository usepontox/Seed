-- Migration: Add role column to operadores table
-- Data: 2025-12-02

ALTER TABLE public.operadores 
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'operador';

-- Add check constraint for role
ALTER TABLE public.operadores 
ADD CONSTRAINT check_operador_role CHECK (role IN ('operador', 'supervisor'));

-- Update existing records to have 'operador' role (already handled by default, but good for clarity)
UPDATE public.operadores SET role = 'operador' WHERE role IS NULL;
