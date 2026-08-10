$cvdictPath = "D:\Manggo\Data\CVDICT.u8"
$csvPath = "D:\Manggo\Data\hanviet.csv"
$vocabPath = "D:\Manggo\Data\vocabulary-counter.json"

$dict = @{}

# 1. Parse CVDICT.u8 (122,589 words)
if (Test-Path $cvdictPath) {
    $lines = [System.IO.File]::ReadAllLines($cvdictPath, [System.Text.Encoding]::UTF8)
    foreach ($line in $lines) {
        if ($line.StartsWith("#")) { continue }
        # Match pattern: Trad Simp [pinyin] /meaning/
        if ($line -match '^(\S+)\s+(\S+)\s+\[(.*?)\]\s+/(.*?)/$') {
            $simp = $matches[2].Trim()
            $py = $matches[3].Trim()
            $meaning = $matches[4].Trim()
            
            if ($simp -and -not $dict.ContainsKey($simp)) {
                $dict[$simp] = @{ py = $py; meaning = $meaning }
            }
        }
    }
}

# 2. Parse hanviet.csv (for character-level Hán Việt)
if (Test-Path $csvPath) {
    $lines = [System.IO.File]::ReadAllLines($csvPath, [System.Text.Encoding]::UTF8)
    foreach ($line in $lines) {
        if ($line.StartsWith("char,")) { continue }
        $parts = $line.Split(",")
        if ($parts.Count -ge 3) {
            $char = $parts[0].Trim()
            $hvRaw = $parts[1].Replace("[","").Replace("]","").Replace("'","").Replace('"','').Trim()
            $pyRaw = $parts[2].Trim()
            
            if ($char) {
                if (-not $dict.ContainsKey($char)) {
                    $dict[$char] = @{ py = $pyRaw; hv = $hvRaw }
                } else {
                    if ($hvRaw) { $dict[$char]["hv"] = $hvRaw }
                    if (-not $dict[$char]["py"]) { $dict[$char]["py"] = $pyRaw }
                }
            }
        }
    }
}

# 3. Parse vocabulary-counter.json
if (Test-Path $vocabPath) {
    try {
        $vocabJson = Get-Content $vocabPath -Encoding UTF8 | ConvertFrom-Json
        if ($vocabJson -and $vocabJson.vocabulary) {
            foreach ($prop in $vocabJson.vocabulary.PSObject.Properties) {
                $w = $prop.Name
                $info = $prop.Value
                if ($w) {
                    if (-not $dict.ContainsKey($w)) {
                        $dict[$w] = @{ py = [string]$info.pinyin; hv = [string]$info.han_viet; meaning = [string]$info.meaning }
                    } else {
                        if ($info.pinyin) { $dict[$w]["py"] = [string]$info.pinyin }
                        if ($info.han_viet) { $dict[$w]["hv"] = [string]$info.han_viet }
                    }
                }
            }
        }
    } catch {}
}

Write-Host "Total Dictionary Entries Loaded:" $dict.Count

$jsonStr = $dict | ConvertTo-Json -Compress
$finalJs = "const HANVIET_DICT = " + $jsonStr + ";"
[System.IO.File]::WriteAllText("D:\Manggo\VocabularyStudioiOS\hanviet_dict.js", $finalJs, [System.Text.Encoding]::UTF8)
Write-Host "Created full hanviet_dict.js successfully!"
