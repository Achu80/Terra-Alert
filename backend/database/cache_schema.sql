CREATE TABLE IF NOT EXISTS public.prediction_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_key TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    prediction_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS prediction_cache_location_created_idx
    ON public.prediction_cache (location_key, created_at DESC);

CREATE INDEX IF NOT EXISTS prediction_cache_created_idx
    ON public.prediction_cache (created_at);

CREATE OR REPLACE FUNCTION public.delete_old_cache()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM public.prediction_cache
    WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;