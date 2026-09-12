param([string]$ProjectRoot)

Add-Type -AssemblyName System.Drawing
$srcPath = "C:\Users\Muzam\Downloads\ChatGPT Image Sep 12, 2026, 03_19_48 PM.png"
$outDir = Join-Path $ProjectRoot "public"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$src = [System.Drawing.Bitmap]::new($srcPath)

function Crop-Save($x, $y, $w, $h, $outName, $makeTransparent) {
    $rect = [System.Drawing.Rectangle]::new($x, $y, $w, $h)
    $crop = $src.Clone($rect, $src.PixelFormat)
    if ($makeTransparent) {
        for ($py = 0; $py -lt $crop.Height; $py++) {
            for ($px = 0; $px -lt $crop.Width; $px++) {
                $c = $crop.GetPixel($px, $py)
                if (($c.R -lt 30) -and ($c.G -lt 30) -and ($c.B -lt 30)) {
                    $crop.SetPixel($px, $py, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
                }
            }
        }
    }
    $outPath = Join-Path $outDir $outName
    $crop.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $crop.Dispose()
    Write-Host "saved $outName ($w x $h)"
}

# logo mark only (book stack + amber bookmark), transparent bg
Crop-Save 215 335 200 255 "logo-mark.png" $true
# wordmark "Paprivo" only (white text + amber dot), transparent bg
Crop-Save 435 360 615 160 "logo-wordmark.png" $true
# full hero lockup: mark + wordmark + tagline, transparent bg
Crop-Save 215 335 830 245 "logo-full.png" $true
# white app tile for favicon (kept opaque)
Crop-Save 235 878 140 140 "favicon-source.png" $false

$src.Dispose()
Write-Host "done"
