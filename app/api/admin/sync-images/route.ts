import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readdirSync, existsSync } from 'fs'
import { join } from 'path'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Debug: test a single known-missing product first
    const debug: Record<string, unknown> = {}

    const { data: testRead, error: testReadErr } = await supabase
      .from('products')
      .select('id, slug, images')
      .eq('slug', 'lifepo4-battery')
      .single()

    debug.testRead = testRead
    debug.testReadErr = testReadErr

    if (testRead) {
      const newImages = ['/products/ecoflow/lifepo4-battery.jpg']
      const { data: testWrite, error: testWriteErr } = await supabase
        .from('products')
        .update({ images: newImages })
        .eq('slug', 'lifepo4-battery')
        .select('slug, images')

      debug.testWrite = testWrite
      debug.testWriteErr = testWriteErr
    }

    // Read all image files from public/products
    const publicDir = join(process.cwd(), 'public', 'products')
    const brandFolders = ['ecoflow', 'bluetti']
    const fileMap: Record<string, string> = {}

    for (const brand of brandFolders) {
      const dir = join(publicDir, brand)
      if (!existsSync(dir)) continue
      const files = readdirSync(dir)
      for (const file of files) {
        if (!/\.(jpg|jpeg|png|webp)$/i.test(file)) continue
        const slug = file.replace(/\.(jpg|jpeg|png|webp)$/i, '')
        fileMap[slug] = `/products/${brand}/${file}`
      }
    }

    const { data: products, error } = await supabase
      .from('products')
      .select('id, slug, name, images')
      .order('slug')

    if (error) throw new Error(error.message)

    const results: { slug: string; name: string; path: string; updated: boolean; error?: string }[] = []
    let updatedCount = 0

    for (const product of products ?? []) {
      const imagePath = fileMap[product.slug]
      if (!imagePath) continue

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentImages: string[] = (product as any).images ?? []
      const alreadyFirst = currentImages[0] === imagePath

      if (alreadyFirst) {
        results.push({ slug: product.slug, name: product.name, path: imagePath, updated: false })
        continue
      }

      const others = currentImages.filter((img: string) => img !== imagePath)
      const newImages = [imagePath, ...others]

      const { data: updateData, error: updateError } = await supabase
        .from('products')
        .update({ images: newImages })
        .eq('slug', product.slug)
        .select('slug, images')

      if (updateError) {
        results.push({ slug: product.slug, name: product.name, path: imagePath, updated: false, error: updateError.message })
      } else if (!updateData || updateData.length === 0) {
        results.push({ slug: product.slug, name: product.name, path: imagePath, updated: false, error: 'no rows returned from update' })
      } else {
        results.push({ slug: product.slug, name: product.name, path: imagePath, updated: true })
        updatedCount++
      }
    }

    return NextResponse.json({
      success: true,
      debug,
      filesFound: Object.keys(fileMap).length,
      productsScanned: (products ?? []).length,
      updated: updatedCount,
      results,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
