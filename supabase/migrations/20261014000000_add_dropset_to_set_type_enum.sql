-- Migration: Adiciona 'dropset' ao enum set_type para compatibilidade total
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
        WHERE pg_type.typname = 'set_type' AND pg_enum.enumlabel = 'dropset'
    ) THEN
        ALTER TYPE set_type ADD VALUE 'dropset';
    END IF;
END $$;
