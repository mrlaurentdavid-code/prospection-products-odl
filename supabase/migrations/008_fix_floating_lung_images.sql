-- Migration 008: Fix Floating Lung product images (keep only working images)
-- Remove first 7 images that have URL-encoded {width} placeholders
-- Keep only last 3 images that load correctly

CREATE OR REPLACE FUNCTION public.fix_floating_lung_images()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product_id UUID := 'c5066739-bcfa-489d-857d-bca1f0923944';
  v_current_images TEXT[];
  v_fixed_images TEXT[];
  v_result JSON;
BEGIN
  -- Get current images
  SELECT images INTO v_current_images
  FROM prospection.products
  WHERE id = v_product_id;

  -- Keep only last 3 images
  v_fixed_images := v_current_images[array_length(v_current_images, 1) - 2:array_length(v_current_images, 1)];

  -- Update the product
  UPDATE prospection.products
  SET images = v_fixed_images
  WHERE id = v_product_id;

  -- Return result
  SELECT json_build_object(
    'product_id', v_product_id,
    'before_count', array_length(v_current_images, 1),
    'after_count', array_length(v_fixed_images, 1),
    'images', v_fixed_images
  ) INTO v_result;

  RETURN v_result;
END;
$$;
