$csvPath = "D:\Manggo\Data\hanviet.csv"
$dict = @{}

if (Test-Path $csvPath) {
    $lines = [System.IO.File]::ReadAllLines($csvPath, [System.Text.Encoding]::UTF8)
    foreach ($line in $lines) {
        if ($line.StartsWith("char,")) { continue }
        $parts = $line.Split(",")
        if ($parts.Count -ge 3) {
            $char = $parts[0].Trim()
            $hvRaw = $parts[1].Replace("[","").Replace("]","").Replace("'","").Replace('"','').Trim()
            $pyRaw = $parts[2].Trim()
            if ($char -and -not $dict.ContainsKey($char)) {
                $dict[$char] = @{ hv = $hvRaw; py = $pyRaw }
            }
        }
    }
}

$jsonStr = $dict | ConvertTo-Json -Compress
$finalJs = "const HANVIET_DICT = " + $jsonStr + ";"
[System.IO.File]::WriteAllText("D:\Manggo\VocabularyStudioiOS\hanviet_dict.js", $finalJs, [System.Text.Encoding]::UTF8)
Remove-Item "D:\Manggo\VocabularyStudioiOS\dict_builder.ps1" -Force -ErrorAction SilentlyContinue
Write-Host "Created hanviet_dict.js successfully!"
