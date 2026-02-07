/**
 * Optimizes a Supabase storage URL by adding transformation parameters.
 * Changes 'object/public' to 'render/image/public' and appends resizing params.
 */
export const getOptimizedImageUrl = (url: string | null | undefined, width = 150, height = 150) => {
    if (!url) return url;

    // Check if it's a Supabase storage URL
    if (url.includes('.supabase.co/storage/v1/object/public/')) {
        // Change to render/image/public for transformations
        // Reverted to object/public as render/image might not be enabled on the project
        const optimizedUrl = url;

        // Add transformation parameters
        const params = new URLSearchParams({
            width: width.toString(),
            height: height.toString(),
            resize: 'cover',
            format: 'webp',
            quality: '80'
        });

        return `${optimizedUrl}?${params.toString()}`;
    }

    return url;
};
