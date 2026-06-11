import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST() {
  revalidatePath('/', 'layout')
  revalidatePath('/ecoflow-kenya')
  revalidatePath('/ecoflow')
  revalidatePath('/power-stations')
  revalidatePath('/solar')
  revalidatePath('/bluetti')
  revalidatePath('/accessories')
  return NextResponse.json({ success: true, revalidated: true, timestamp: new Date().toISOString() })
}

export async function GET() {
  revalidatePath('/', 'layout')
  revalidatePath('/ecoflow-kenya')
  revalidatePath('/ecoflow')
  revalidatePath('/power-stations')
  revalidatePath('/solar')
  revalidatePath('/bluetti')
  revalidatePath('/accessories')
  return NextResponse.json({ success: true, revalidated: true, timestamp: new Date().toISOString() })
}
