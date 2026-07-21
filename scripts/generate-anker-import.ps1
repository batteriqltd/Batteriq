$ErrorActionPreference = 'Stop'

$sourceWorkbook = 'C:\Users\WebSergeINTL\Downloads\07 2026 ANKER T2 PRICE LIST (1).xlsx'
$projectRoot = Split-Path -Parent $PSScriptRoot
$sqlPath = Join-Path $projectRoot 'supabase\migrations\new_data.sql'
$imageDirectory = Join-Path $projectRoot 'public\products\anker-t2'

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($sourceWorkbook)
try {
  $sheetEntry = $archive.GetEntry('xl/worksheets/sheet1.xml')
  $sheetReader = [System.IO.StreamReader]::new($sheetEntry.Open())
  $sheetXml = $sheetReader.ReadToEnd()
  $sheetReader.Dispose()

  # Excel's in-cell images reference rich values through the vm attribute.
  $imageByRow = @{}
  [regex]::Matches($sheetXml, '<c r="C(?<row>\d+)"[^>]*vm="(?<image>\d+)"') | ForEach-Object {
    $imageByRow[[int]$_.Groups['row'].Value] = [int]$_.Groups['image'].Value
  }

  New-Item -ItemType Directory -Force -Path $imageDirectory | Out-Null

  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $workbook = $excel.Workbooks.Open($sourceWorkbook, $null, $true)
  $worksheet = $workbook.Worksheets.Item(1)
  $rows = @()
  $usedRows = $worksheet.UsedRange.Rows.Count

  for ($rowNumber = 2; $rowNumber -le $usedRows; $rowNumber++) {
    $sku = ([string]$worksheet.Cells.Item($rowNumber, 1).Value2).Trim()
    if (-not $sku) { continue }

    $name = ([string]$worksheet.Cells.Item($rowNumber, 2).Value2).Trim()
    $sourceCategory = ([string]$worksheet.Cells.Item($rowNumber, 4).Value2).Trim()
    $sourceSubcategory = ([string]$worksheet.Cells.Item($rowNumber, 5).Value2).Trim()
    $price = [decimal]$worksheet.Cells.Item($rowNumber, 7).Value2
    $status = ([string]$worksheet.Cells.Item($rowNumber, 8).Value2).Trim()

    $brand = if ($name -match 'EUFY') { 'Eufy' } elseif ($name -match 'SOUNDCORE') { 'Soundcore' } elseif ($name -match 'NEBULA') { 'Nebula' } else { 'Anker' }
    $nameSlug = $name.ToLowerInvariant() -replace '[^a-z0-9\s-]', '' -replace '\s+', '-' -replace '-+', '-'
    $slug = "$($brand.ToLowerInvariant())-$($sku.ToLowerInvariant())-$($nameSlug.Trim('-'))"
    $inStock = $status -eq 'Stock'
    $imagePath = $null

    if ($imageByRow.ContainsKey($rowNumber)) {
      $imageNumber = $imageByRow[$rowNumber]
      $mediaEntry = $archive.GetEntry("xl/media/image$($imageNumber).jpeg")
      if ($null -ne $mediaEntry) {
        $imagePath = "/products/anker-t2/$sku.jpeg"
        $targetPath = Join-Path $imageDirectory "$sku.jpeg"
        $input = $mediaEntry.Open()
        $output = [System.IO.File]::Open($targetPath, [System.IO.FileMode]::Create)
        $input.CopyTo($output)
        $output.Dispose()
        $input.Dispose()
      }
    }

    $rows += [pscustomobject]@{
      sku = $sku; brand = $brand; name = $name; sourceCategory = $sourceCategory
      sourceSubcategory = $sourceSubcategory; price = $price; inStock = $inStock
      slug = $slug; imagePath = $imagePath; order = $rows.Count
    }
  }

  $workbook.Close($false)
  $excel.Quit()
}
finally {
  $archive.Dispose()
}

function Escape-Sql([string]$value) { return $value.Replace("'", "''") }

$values = foreach ($product in $rows) {
  $description = "$($product.name). Product SKU: $($product.sku)."
  $specs = (@{ source_category = $product.sourceCategory; source_subcategory = $product.sourceSubcategory } | ConvertTo-Json -Compress).Replace("'", "''")
  $images = if ($product.imagePath) { "ARRAY['$(Escape-Sql $product.imagePath)']::text[]" } else { "ARRAY[]::text[]" }
  $stock = if ($product.inStock) { 'true' } else { 'false' }
  $stockQty = if ($product.inStock) { '999' } else { '0' }
  "  ('$(Escape-Sql $product.sku)', '$(Escape-Sql $product.brand)', 'Accessories', '$(Escape-Sql $product.sourceSubcategory)', '$(Escape-Sql $product.name)', '$(Escape-Sql $product.slug)', '$(Escape-Sql $description)', '$specs'::jsonb, $images, $($product.price.ToString([Globalization.CultureInfo]::InvariantCulture)), $stock, $stockQty, false, $($product.order))"
}

$sql = @"
-- Batteriq Anker T2 catalogue import
-- Source: 07 2026 ANKER T2 PRICE LIST (1).xlsx
-- Client prices use the supplier's RRP INC VAT column only.
-- Product images are copied to public/products/anker-t2/ by the accompanying import preparation script.

BEGIN;

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_brand_check;
ALTER TABLE products ADD CONSTRAINT products_brand_check
  CHECK (brand IN ('EcoFlow', 'Bluetti', 'Anker', 'Eufy', 'Soundcore', 'Nebula'));

INSERT INTO products (
  sku, brand, category, subcategory, name, slug, description, specs, images,
  price_kes, in_stock, stock_qty, featured, sort_order
) VALUES
$($values -join ",`n")
ON CONFLICT (sku) DO UPDATE SET
  brand = EXCLUDED.brand,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  images = EXCLUDED.images,
  price_kes = EXCLUDED.price_kes,
  in_stock = EXCLUDED.in_stock,
  stock_qty = EXCLUDED.stock_qty,
  featured = EXCLUDED.featured,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

COMMIT;
"@

[System.IO.File]::WriteAllText($sqlPath, $sql, [System.Text.UTF8Encoding]::new($false))
"Generated $($rows.Count) product rows and $((Get-ChildItem -LiteralPath $imageDirectory -File).Count) SKU image files."
