// One-time script: trim transparent/white padding from the header logo.
// Usage: node scripts/crop-logo.js
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const target = path.resolve(process.cwd(), 'public', 'logo.png')

async function main() {
  if (!fs.existsSync(target)) {
    console.error(`Source logo not found: ${target}`)
    process.exit(1)
  }

  // Read into a buffer first so we can safely overwrite the same file.
  const input = fs.readFileSync(target)
  const before = await sharp(input).metadata()

  const { data, info } = await sharp(input)
    .trim({ threshold: 10 }) // auto-remove surrounding whitespace/transparent padding
    .toBuffer({ resolveWithObject: true })

  fs.writeFileSync(target, data)

  console.log(`Original dimensions: ${before.width} x ${before.height}`)
  console.log(`Cropped  dimensions: ${info.width} x ${info.height}`)
  console.log(`Saved cropped logo -> ${target}`)
}

main().catch((err) => {
  console.error('Crop failed:', err)
  process.exit(1)
})
