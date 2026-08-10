$lines = [System.IO.File]::ReadAllLines("D:\Manggo\Data\hanviet.csv", [System.Text.Encoding]::UTF8)
foreach ($l in $lines) {
    if ($l.Contains("才")) {
        Write-Host "FOUND:" $l
    }
}
