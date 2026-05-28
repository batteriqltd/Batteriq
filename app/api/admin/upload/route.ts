import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { getAdminSession } from '@/lib/admin-auth'

export async function POST(req: Request) {
  const session = getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const productId = formData.get('productId') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPG, PNG, and WebP images allowed' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filename = `products/${productId}-${Date.now()}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('[UPLOAD] Storage error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filename)

    const publicUrl = urlData.publicUrl

    const { error: updateError } = await supabase
      .from('products')
      .update({
        featured_image: publicUrl,
        images: [publicUrl],
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)

    if (updateError) {
      console.error('[UPLOAD] DB update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    revalidatePath('/')
    revalidatePath('/power-stations')
    revalidatePath('/solar')
    revalidatePath('/bluetti')
    revalidatePath('/accessories')
    revalidatePath(`/products/${productId}`)

    console.log(`[UPLOAD] ✅ Image uploaded for product ${productId}: ${publicUrl}`)
    return NextResponse.json({ success: true, url: publicUrl })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    console.error('[UPLOAD] Exception:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
