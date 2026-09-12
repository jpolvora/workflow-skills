#Requires -Version 5.1
<#
.SYNOPSIS
    GUI editor for Workflow Skills configuration (config.json).

.DESCRIPTION
    Native Windows Forms desktop configuration tool for workflow-skills.
    Provides categorized settings tabs, auto-detected Dark/Light themes,
    rich UI controls (checkboxes, dropdowns, radio buttons, file/folder browsers,
    numeric spinners), extended descriptions from config.schema.json and _comment_* keys,
    real-time search/filter, and atomic persistence with comment preservation and backups.

.PARAMETER ConfigPath
    Explicit path to config.json. Defaults to discovering {sharedDir}/config.json.

.PARAMETER RepoRoot
    Explicit repository root directory. Defaults to discovering Git/skills root.

.PARAMETER CheckOnly
    Validates configuration and schema bindings without launching the GUI.

.PARAMETER NonInteractive
    Runs validation and inspection headlessly without launching the GUI window.

.EXAMPLE
    .\Edit-WorkflowSkillsConfig.ps1

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File Edit-WorkflowSkillsConfig.ps1 -ConfigPath .agents/skills/ws-shared/config.json
#>

param(
    [string]$ConfigPath,
    [string]$RepoRoot,
    [switch]$CheckOnly,
    [switch]$NonInteractive,
    [switch]$FunctionsOnly
)

$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# Version & App Metadata
# ---------------------------------------------------------------------------
$script:AppName = 'Workflow Skills Config Editor'
$script:AppVersion = '1.0.0'
$script:IsDirty = $false
$script:ActiveConfigPath = $null
$script:BackupConfigPath = $null
$script:SchemaPath = $null
$script:ExamplePath = $null
$script:LoadedConfig = $null
$script:SchemaObj = $null
$script:ExampleObj = $null
$script:Descriptions = @{}
$script:FieldControls = @()
$script:RowPanels = @()
$script:MainForm = $null
$script:ThemeMode = 'auto' # auto, light, dark

# ---------------------------------------------------------------------------
# Headless / Non-Windows Environment Guard
# ---------------------------------------------------------------------------
function Test-CanRunGui {
    # Check OS platform
    $isWin = $false
    if ($PSVersionTable.PSVersion.Major -ge 6) {
        $isWin = $IsWindows
    }
    else {
        $isWin = ($env:OS -like '*Windows*')
    }

    if (-not $isWin) {
        return $false
    }

    # Check interactive user session
    try {
        if (-not [System.Environment]::UserInteractive) {
            return $false
        }
    }
    catch {
        return $false
    }

    return $true
}

# ---------------------------------------------------------------------------
# Path & Discovery Functions
# ---------------------------------------------------------------------------
function Find-WorkflowSkillsRepoRoot {
    param([string]$StartDir)

    if ([string]::IsNullOrWhiteSpace($StartDir)) {
        $StartDir = $PSScriptRoot
    }

    $current = [System.IO.Path]::GetFullPath($StartDir)
    while ($current) {
        if ((Test-Path (Join-Path $current '.agents')) -or (Test-Path (Join-Path $current '.git'))) {
            return $current
        }
        $parent = [System.IO.Path]::GetDirectoryName($current)
        if ($parent -eq $current) { break }
        $current = $parent
    }

    # Fallback to current directory
    return [System.IO.Path]::GetFullPath((Get-Location).Path)
}

function Resolve-ConfigurationPaths {
    param(
        [string]$ExplicitConfig,
        [string]$ExplicitRoot
    )

    $root = if ($ExplicitRoot) { [System.IO.Path]::GetFullPath($ExplicitRoot) } else { Find-WorkflowSkillsRepoRoot }
    $script:ResolvedRepoRoot = $root

    # Schema path
    $candidatesSchema = @(
        (Join-Path $root '.agents/skills/ws-shared/runtime/config.schema.json'),
        (Join-Path $PSScriptRoot '../config.schema.json'),
        (Join-Path $PSScriptRoot '../../runtime/config.schema.json')
    )
    foreach ($cand in $candidatesSchema) {
        if (Test-Path $cand) {
            $script:SchemaPath = [System.IO.Path]::GetFullPath($cand)
            break
        }
    }

    # Example path
    $candidatesExample = @(
        (Join-Path $root '.agents/skills/ws-shared/templates/config.json.example'),
        (Join-Path $PSScriptRoot '../../templates/config.json.example'),
        (Join-Path $PSScriptRoot '../../../templates/config.json.example')
    )
    foreach ($cand in $candidatesExample) {
        if (Test-Path $cand) {
            $script:ExamplePath = [System.IO.Path]::GetFullPath($cand)
            break
        }
    }

    # Target config path
    if ($ExplicitConfig) {
        $script:ActiveConfigPath = [System.IO.Path]::GetFullPath($ExplicitConfig)
    }
    else {
        $candidatesConfig = @(
            (Join-Path $root '.agents/skills/ws-shared/config.json'),
            (Join-Path $root 'config.json')
        )
        foreach ($cand in $candidatesConfig) {
            if (Test-Path $cand) {
                $script:ActiveConfigPath = [System.IO.Path]::GetFullPath($cand)
                break
            }
        }
        if (-not $script:ActiveConfigPath) {
            $script:ActiveConfigPath = [System.IO.Path]::GetFullPath((Join-Path $root '.agents/skills/ws-shared/config.json'))
        }
    }

    $script:BackupConfigPath = "$($script:ActiveConfigPath).bak"
}

# ---------------------------------------------------------------------------
# Theming Engine (modeled after cursor-profile-manager.ps1)
# ---------------------------------------------------------------------------
function Test-WindowsAppsUseLightTheme {
    try {
        $val = Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize' -Name AppsUseLightTheme -ErrorAction Stop
        return ($val.AppsUseLightTheme -ne 0)
    }
    catch {
        return $true
    }
}

function Get-UiThemePalettes {
    return @{
        light = @{
            BackColor      = [System.Drawing.Color]::FromArgb(245, 246, 248)
            PanelColor     = [System.Drawing.Color]::White
            TabControlBack = [System.Drawing.Color]::FromArgb(240, 242, 245)
            BorderColor    = [System.Drawing.Color]::FromArgb(220, 223, 228)
            TextMuted      = [System.Drawing.Color]::FromArgb(100, 105, 115)
            TextPrimary    = [System.Drawing.Color]::FromArgb(32, 33, 36)
            Accent         = [System.Drawing.Color]::FromArgb(0, 102, 204)
            AccentHover    = [System.Drawing.Color]::FromArgb(0, 90, 184)
            AccentText     = [System.Drawing.Color]::White
            InputBackColor = [System.Drawing.Color]::White
            InputForeColor = [System.Drawing.Color]::FromArgb(32, 33, 36)
            AltRowColor    = [System.Drawing.Color]::FromArgb(250, 251, 253)
            HighlightBack  = [System.Drawing.Color]::FromArgb(230, 242, 255)
            StatusColor    = [System.Drawing.Color]::FromArgb(20, 120, 60)
            WarningColor   = [System.Drawing.Color]::FromArgb(180, 95, 6)
        }
        dark = @{
            BackColor      = [System.Drawing.Color]::FromArgb(30, 31, 34)
            PanelColor     = [System.Drawing.Color]::FromArgb(40, 42, 46)
            TabControlBack = [System.Drawing.Color]::FromArgb(35, 36, 40)
            BorderColor    = [System.Drawing.Color]::FromArgb(65, 68, 75)
            TextMuted      = [System.Drawing.Color]::FromArgb(160, 165, 175)
            TextPrimary    = [System.Drawing.Color]::FromArgb(235, 238, 242)
            Accent         = [System.Drawing.Color]::FromArgb(0, 120, 215)
            AccentHover    = [System.Drawing.Color]::FromArgb(28, 140, 235)
            AccentText     = [System.Drawing.Color]::White
            InputBackColor = [System.Drawing.Color]::FromArgb(50, 52, 58)
            InputForeColor = [System.Drawing.Color]::FromArgb(235, 238, 242)
            AltRowColor    = [System.Drawing.Color]::FromArgb(44, 46, 52)
            HighlightBack  = [System.Drawing.Color]::FromArgb(20, 60, 100)
            StatusColor    = [System.Drawing.Color]::FromArgb(75, 195, 115)
            WarningColor   = [System.Drawing.Color]::FromArgb(255, 185, 80)
        }
    }
}

function Get-CurrentPalette {
    $palettes = Get-UiThemePalettes
    if ($script:ThemeMode -eq 'light') {
        return $palettes.light
    }
    elseif ($script:ThemeMode -eq 'dark') {
        return $palettes.dark
    }
    else {
        # auto
        if (Test-WindowsAppsUseLightTheme) {
            return $palettes.light
        }
        else {
            return $palettes.dark
        }
    }
}

function Set-ButtonFlatStyle {
    param(
        [System.Windows.Forms.Button]$Button,
        [switch]$Primary
    )

    $palette = Get-CurrentPalette
    $Button.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $Button.Cursor = [System.Windows.Forms.Cursors]::Hand
    $Button.UseVisualStyleBackColor = $false

    if ($Primary) {
        $Button.BackColor = $palette.Accent
        $Button.ForeColor = $palette.AccentText
        $Button.FlatAppearance.BorderSize = 0
        $Button.Font = New-Object System.Drawing.Font 'Segoe UI', 9, ([System.Drawing.FontStyle]::Bold)
        $Button.Add_MouseEnter({ $this.BackColor = (Get-CurrentPalette).AccentHover })
        $Button.Add_MouseLeave({ $this.BackColor = (Get-CurrentPalette).Accent })
    }
    else {
        $Button.BackColor = $palette.PanelColor
        $Button.ForeColor = $palette.TextPrimary
        $Button.FlatAppearance.BorderColor = $palette.BorderColor
        $Button.FlatAppearance.BorderSize = 1
        $Button.Font = New-Object System.Drawing.Font 'Segoe UI', 9
        $Button.Add_MouseEnter({ $this.BackColor = (Get-CurrentPalette).AltRowColor })
        $Button.Add_MouseLeave({ $this.BackColor = (Get-CurrentPalette).PanelColor })
    }
}

# ---------------------------------------------------------------------------
# Schema & Comment Inspection
# ---------------------------------------------------------------------------
function Load-JsonFileContent {
    param([string]$FilePath)

    if (-not (Test-Path $FilePath)) { return $null }
    try {
        $raw = [System.IO.File]::ReadAllText($FilePath, [System.Text.Encoding]::UTF8)
        if ([string]::IsNullOrWhiteSpace($raw)) { return $null }
        return ($raw | ConvertFrom-Json)
    }
    catch {
        Write-Warning "Could not parse JSON at $FilePath : $($_.Exception.Message)"
        return $null
    }
}

function Extract-SchemaDescriptions {
    param(
        $PropertiesObj,
        [string]$Prefix
    )

    if (-not $PropertiesObj) { return }

    foreach ($prop in $PropertiesObj.PSObject.Properties) {
        $name = $prop.Name
        $val = $prop.Value
        $fullKey = if ($Prefix) { "$Prefix.$name" } else { $name }

        if ($val -and $val.description) {
            $script:Descriptions[$fullKey] = [string]$val.description
        }

        # Recursively inspect nested properties
        if ($val -and $val.properties) {
            Extract-SchemaDescriptions -PropertiesObj $val.properties -Prefix $fullKey
        }
    }
}

function Build-DescriptionDatabase {
    $script:Descriptions.Clear()

    # 1. Inspect Schema properties descriptions recursively
    if ($script:SchemaObj -and $script:SchemaObj.properties) {
        Extract-SchemaDescriptions -PropertiesObj $script:SchemaObj.properties -Prefix ''
    }

    # 2. Inspect Example file comments (_comment and _comment_<prop>)
    if ($script:ExampleObj) {
        Extract-CommentsFromObject -Obj $script:ExampleObj -Prefix ''
    }

    # 3. Inspect Active Config comments (override if customized)
    if ($script:LoadedConfig) {
        Extract-CommentsFromObject -Obj $script:LoadedConfig -Prefix ''
    }
}

function Extract-CommentsFromObject {
    param(
        $Obj,
        [string]$Prefix
    )

    if (-not $Obj) { return }
    foreach ($p in $Obj.PSObject.Properties) {
        $pName = $p.Name
        $pVal = $p.Value

        if ($pName -like '_comment_*') {
            $targetProp = $pName.Substring(9)
            $fullKey = if ($Prefix) { "$Prefix.$targetProp" } else { $targetProp }
            if ($pVal -is [string] -and (-not [string]::IsNullOrWhiteSpace($pVal))) {
                $script:Descriptions[$fullKey] = $pVal
            }
        }
        elseif ($pName -eq '_comment') {
            if ($Prefix -and ($pVal -is [string])) {
                $script:Descriptions[$Prefix] = $pVal
            }
        }
        elseif ($pVal -is [System.Management.Automation.PSCustomObject]) {
            $nextPrefix = if ($Prefix) { "$Prefix.$pName" } else { $pName }
            Extract-CommentsFromObject -Obj $pVal -Prefix $nextPrefix
        }
    }
}

function Get-SettingDescription {
    param(
        [string]$Section,
        [string]$Key,
        [string]$Fallback = ''
    )

    $fullKey = if ($Section) { "$Section.$Key" } else { $Key }
    if ($script:Descriptions.ContainsKey($fullKey)) {
        return $script:Descriptions[$fullKey]
    }

    if ($Section -and $script:Descriptions.ContainsKey($Section)) {
        return $script:Descriptions[$Section]
    }

    if (-not $Section -and $script:Descriptions.ContainsKey($Key)) {
        return $script:Descriptions[$Key]
    }

    return $Fallback
}

# ---------------------------------------------------------------------------
# Config Get / Set Helpers
# ---------------------------------------------------------------------------
function Get-ConfigValue {
    param(
        [string]$Path,
        $DefaultValue = $null
    )

    if ([string]::IsNullOrWhiteSpace($Path) -or (-not $script:LoadedConfig)) {
        return $DefaultValue
    }

    $parts = @($Path.Split('.') | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($parts.Length -eq 0) {
        return $DefaultValue
    }

    $curr = $script:LoadedConfig
    foreach ($p in $parts) {
        if ($null -eq $curr) { return $DefaultValue }
        if ($curr -is [System.Management.Automation.PSCustomObject]) {
            $match = $curr.PSObject.Properties.Match($p)
            if ($match -and $match.Count -gt 0) {
                $curr = $curr.$p
            }
            else {
                return $DefaultValue
            }
        }
        else {
            return $DefaultValue
        }
    }
    if ($null -eq $curr) { return $DefaultValue }
    return $curr
}

function Set-ConfigValue {
    param(
        [string]$Path,
        $Value
    )

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return
    }

    if (-not $script:LoadedConfig) {
        $script:LoadedConfig = New-Object -TypeName PSObject
    }

    $parts = @($Path.Split('.') | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($parts.Length -eq 0) {
        return
    }

    $curr = $script:LoadedConfig

    for ($i = 0; $i -lt ($parts.Length - 1); $i++) {
        $p = $parts[$i]
        if ([string]::IsNullOrWhiteSpace($p)) { continue }

        $propMatch = $curr.PSObject.Properties.Match($p)
        if (-not $propMatch -or $propMatch.Count -eq 0) {
            $newObj = New-Object -TypeName PSObject
            $curr | Add-Member -MemberType NoteProperty -Name $p -Value $newObj -Force
            $curr = $newObj
        }
        else {
            $child = $curr.$p
            if (-not ($child -is [System.Management.Automation.PSCustomObject])) {
                $child = New-Object -TypeName PSObject
                $curr.$p = $child
            }
            $curr = $child
        }
    }

    $finalKey = $parts[-1]
    if (-not [string]::IsNullOrWhiteSpace($finalKey)) {
        $finalMatch = $curr.PSObject.Properties.Match($finalKey)
        if ($finalMatch -and $finalMatch.Count -gt 0) {
            $curr.$finalKey = $Value
        }
        else {
            $curr | Add-Member -MemberType NoteProperty -Name $finalKey -Value $Value -Force
        }
    }

    $script:IsDirty = $true
    Update-WindowTitle
}

# ---------------------------------------------------------------------------
# Formatting & JSON Serialization
# ---------------------------------------------------------------------------
function Format-JsonToTwoSpaces {
    param([string]$RawJson)

    try {
        $node = Get-Command 'node' -ErrorAction SilentlyContinue
        if ($node) {
            $scriptNode = "const fs = require('fs'); const d = JSON.parse(fs.readFileSync(0, 'utf8')); console.log(JSON.stringify(d, null, 2));"
            $pinfo = New-Object System.Diagnostics.ProcessStartInfo
            $pinfo.FileName = $node.Source
            $pinfo.Arguments = "-e ""$scriptNode"""
            $pinfo.RedirectStandardInput = $true
            $pinfo.RedirectStandardOutput = $true
            $pinfo.RedirectStandardError = $true
            $pinfo.UseShellExecute = $false
            $pinfo.CreateNoWindow = $true

            $proc = [System.Diagnostics.Process]::Start($pinfo)
            $proc.StandardInput.Write($RawJson)
            $proc.StandardInput.Close()
            $out = $proc.StandardOutput.ReadToEnd()
            $proc.WaitForExit()
            if ($proc.ExitCode -eq 0 -and (-not [string]::IsNullOrWhiteSpace($out))) {
                return $out.Trim()
            }
        }
    }
    catch {}

    # Pure PowerShell formatter fallback
    $indent = 0
    $inString = $false
    $escape = $false
    $sb = New-Object System.Text.StringBuilder

    for ($i = 0; $i -lt $RawJson.Length; $i++) {
        $c = $RawJson[$i]
        if ($escape) {
            [void]$sb.Append($c)
            $escape = $false
            continue
        }
        if ($c -eq '\') {
            [void]$sb.Append($c)
            $escape = $true
            continue
        }
        if ($c -eq '"') {
            $inString = -not $inString
            [void]$sb.Append($c)
            continue
        }
        if ($inString) {
            [void]$sb.Append($c)
            continue
        }
        if ($c -eq '{' -or $c -eq '[') {
            [void]$sb.Append($c)
            $indent += 2
            [void]$sb.AppendLine()
            [void]$sb.Append((' ' * $indent))
        }
        elseif ($c -eq '}' -or $c -eq ']') {
            $indent = [Math]::Max(0, $indent - 2)
            [void]$sb.AppendLine()
            [void]$sb.Append((' ' * $indent))
            [void]$sb.Append($c)
        }
        elseif ($c -eq ',') {
            [void]$sb.Append($c)
            [void]$sb.AppendLine()
            [void]$sb.Append((' ' * $indent))
        }
        elseif ($c -eq ':') {
            [void]$sb.Append(': ')
        }
        elseif (-not [char]::IsWhiteSpace($c)) {
            [void]$sb.Append($c)
        }
    }
    return $sb.ToString()
}

function Save-ConfigurationFile {
    if (-not $script:ActiveConfigPath) {
        throw "Active config path is not set."
    }

    # Create parent folder if missing
    $parentDir = [System.IO.Path]::GetDirectoryName($script:ActiveConfigPath)
    if (-not (Test-Path $parentDir)) {
        [void](New-Item -ItemType Directory -Path $parentDir -Force)
    }

    # 1. Save backup copy
    if (Test-Path $script:ActiveConfigPath) {
        Copy-Item -Path $script:ActiveConfigPath -Destination $script:BackupConfigPath -Force
    }

    # 2. Serialize JSON
    $rawJson = $script:LoadedConfig | ConvertTo-Json -Depth 20 -Compress:$false
    $formattedJson = Format-JsonToTwoSpaces -RawJson $rawJson

    # 3. Write UTF-8 file (without BOM)
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($script:ActiveConfigPath, "$formattedJson`n", $utf8NoBom)

    $script:IsDirty = $false
    Update-WindowTitle
}

function Reload-Configuration {
    Resolve-ConfigurationPaths -ExplicitConfig $script:ActiveConfigPath -ExplicitRoot $script:ResolvedRepoRoot
    $script:SchemaObj = Load-JsonFileContent -FilePath $script:SchemaPath
    $script:ExampleObj = Load-JsonFileContent -FilePath $script:ExamplePath
    $script:LoadedConfig = Load-JsonFileContent -FilePath $script:ActiveConfigPath

    if (-not $script:LoadedConfig -and $script:ExampleObj) {
        # Initialize from example
        $script:LoadedConfig = $script:ExampleObj
    }

    Build-DescriptionDatabase
    $script:IsDirty = $false
}

function Update-WindowTitle {
    if (-not $script:MainForm) { return }
    $dirtyMarker = if ($script:IsDirty) { '* ' } else { '' }
    $relPath = if ($script:ActiveConfigPath) {
        $script:ActiveConfigPath.Replace($script:ResolvedRepoRoot, '').TrimStart('\/')
    } else { 'config.json' }
    $script:MainForm.Text = "$dirtyMarker$($script:AppName) - $relPath"
}

# ---------------------------------------------------------------------------
# UI Construction (WinForms)
# ---------------------------------------------------------------------------
function Initialize-WinFormsApp {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    [void][System.Windows.Forms.Application]::EnableVisualStyles()
    [void][System.Windows.Forms.Application]::SetCompatibleTextRenderingDefault($false)

    if (-not ('TextBoxCue' -as [type])) {
        Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class TextBoxCue {
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern IntPtr SendMessage(IntPtr hWnd, int msg, IntPtr wParam, string lParam);

    public static void SetCue(IntPtr handle, string cue) {
        if (handle != IntPtr.Zero) {
            SendMessage(handle, 0x1501, IntPtr.Zero, cue);
        }
    }
}
'@
    }
}

function Add-ConfigFieldRow {
    param(
        [System.Windows.Forms.Panel]$ParentPanel,
        [ref]$YOffset,
        [string]$Section,
        [string]$Key,
        [string]$LabelText,
        [string]$Type, # 'bool', 'string', 'path-folder', 'path-file', 'enum', 'int', 'array'
        $DefaultVal = $null,
        [string[]]$Options = @(),
        [int]$MinVal = 0,
        [int]$MaxVal = 100,
        [string]$Placeholder = ''
    )

    $palette = Get-CurrentPalette
    $configPath = if ($Section) { "$Section.$Key" } else { $Key }
    $currentVal = Get-ConfigValue -Path $configPath -DefaultValue $DefaultVal
    $desc = Get-SettingDescription -Section $Section -Key $Key

    $rowPanel = New-Object System.Windows.Forms.Panel
    $rowPanel.Location = New-Object System.Drawing.Point(10, $YOffset.Value)
    $rowPanel.Width = $ParentPanel.ClientSize.Width - 30
    $rowPanel.Anchor = [System.Windows.Forms.AnchorStyles]::Top -bor [System.Windows.Forms.AnchorStyles]::Left -bor [System.Windows.Forms.AnchorStyles]::Right
    $rowPanel.BackColor = $palette.PanelColor

    # Tag for search filtering
    $rowPanel.Tag = @{
        Section     = $Section
        Key         = $Key
        Label       = $LabelText
        Description = $desc
        ConfigPath  = $configPath
    }

    $innerY = 6

    # 1. Label or Checkbox
    if ($Type -eq 'bool') {
        $chk = New-Object System.Windows.Forms.CheckBox
        $chk.Text = $LabelText
        $chk.Checked = [bool]$currentVal
        $chk.Font = New-Object System.Drawing.Font 'Segoe UI', 9.5, ([System.Drawing.FontStyle]::Bold)
        $chk.ForeColor = $palette.TextPrimary
        $chk.Location = New-Object System.Drawing.Point(8, $innerY)
        $chk.AutoSize = $true
        $chk.Cursor = [System.Windows.Forms.Cursors]::Hand
        $chk.Tag = $configPath

        $chk.Add_CheckedChanged({
            if ($this.Tag) {
                Set-ConfigValue -Path ([string]$this.Tag) -Value $this.Checked
            }
        })

        $rowPanel.Controls.Add($chk)
        $innerY += 26

        $script:FieldControls += @{
            Type    = 'bool'
            Control = $chk
            Path    = $configPath
        }
    }
    else {
        $lbl = New-Object System.Windows.Forms.Label
        $lbl.Text = $LabelText
        $lbl.Font = New-Object System.Drawing.Font 'Segoe UI', 9.5, ([System.Drawing.FontStyle]::Bold)
        $lbl.ForeColor = $palette.TextPrimary
        $lbl.Location = New-Object System.Drawing.Point(8, $innerY)
        $lbl.AutoSize = $true
        $rowPanel.Controls.Add($lbl)
        $innerY += 22

        # Control Rendering based on Type
        if ($Type -eq 'string') {
            $txt = New-Object System.Windows.Forms.TextBox
            $txt.Text = [string]$currentVal
            $txt.Font = New-Object System.Drawing.Font 'Segoe UI', 9
            $txt.BackColor = $palette.InputBackColor
            $txt.ForeColor = $palette.InputForeColor
            $txt.Location = New-Object System.Drawing.Point(8, $innerY)
            $txt.Width = [Math]::Min(560, $rowPanel.Width - 30)
            $txt.Anchor = [System.Windows.Forms.AnchorStyles]::Top -bor [System.Windows.Forms.AnchorStyles]::Left -bor [System.Windows.Forms.AnchorStyles]::Right
            $txt.Tag = $configPath

            if ($Placeholder) {
                $h = $txt.Handle
                [TextBoxCue]::SetCue($h, $Placeholder)
            }

            $txt.Add_TextChanged({
                if ($this.Tag) {
                    Set-ConfigValue -Path ([string]$this.Tag) -Value $this.Text
                }
            })

            $rowPanel.Controls.Add($txt)
            $innerY += 28

            $script:FieldControls += @{
                Type    = 'string'
                Control = $txt
                Path    = $configPath
            }
        }
        elseif ($Type -eq 'path-folder' -or $Type -eq 'path-file') {
            $txt = New-Object System.Windows.Forms.TextBox
            $txt.Text = [string]$currentVal
            $txt.Font = New-Object System.Drawing.Font 'Segoe UI', 9
            $txt.BackColor = $palette.InputBackColor
            $txt.ForeColor = $palette.InputForeColor
            $txt.Location = New-Object System.Drawing.Point(8, $innerY)
            $txt.Width = [Math]::Min(480, $rowPanel.Width - 110)
            $txt.Anchor = [System.Windows.Forms.AnchorStyles]::Top -bor [System.Windows.Forms.AnchorStyles]::Left -bor [System.Windows.Forms.AnchorStyles]::Right
            $txt.Tag = $configPath

            $btnBrowse = New-Object System.Windows.Forms.Button
            $btnBrowse.Text = 'Browse...'
            $btnBrowse.Size = New-Object System.Drawing.Size(75, 24)
            $btnBrowse.Location = New-Object System.Drawing.Point(($txt.Right + 8), ($innerY - 1))
            $btnBrowse.Anchor = [System.Windows.Forms.AnchorStyles]::Top -bor [System.Windows.Forms.AnchorStyles]::Right
            Set-ButtonFlatStyle -Button $btnBrowse
            $btnBrowse.Tag = @{
                TextBox  = $txt
                IsFolder = ($Type -eq 'path-folder')
                Label    = $LabelText
            }

            $btnBrowse.Add_Click({
                $targetTxt = $this.Tag.TextBox
                $isFolder = $this.Tag.IsFolder
                $lbl = $this.Tag.Label
                if ($isFolder) {
                    $dlg = New-Object System.Windows.Forms.FolderBrowserDialog
                    $dlg.Description = "Select folder for $lbl"
                    if ($targetTxt.Text -and (Test-Path $targetTxt.Text)) {
                        $dlg.SelectedPath = $targetTxt.Text
                    }
                    if ($dlg.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
                        # Store relative to repo root if inside repo
                        $sel = $dlg.SelectedPath
                        if ($sel.StartsWith($script:ResolvedRepoRoot)) {
                            $sel = $sel.Substring($script:ResolvedRepoRoot.Length).TrimStart('\/').Replace('\', '/')
                        }
                        $targetTxt.Text = $sel
                    }
                }
                else {
                    $dlg = New-Object System.Windows.Forms.OpenFileDialog
                    $dlg.Title = "Select file for $lbl"
                    $dlg.Filter = "Markdown and Config files (*.md;*.json)|*.md;*.json|All files (*.*)|*.*"
                    if ($dlg.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
                        $sel = $dlg.FileName
                        if ($sel.StartsWith($script:ResolvedRepoRoot)) {
                            $sel = $sel.Substring($script:ResolvedRepoRoot.Length).TrimStart('\/').Replace('\', '/')
                        }
                        $targetTxt.Text = $sel
                    }
                }
            })

            $txt.Add_TextChanged({
                if ($this.Tag) {
                    Set-ConfigValue -Path ([string]$this.Tag) -Value $this.Text
                }
            })

            $rowPanel.Controls.Add($txt)
            $rowPanel.Controls.Add($btnBrowse)
            $innerY += 28

            $script:FieldControls += @{
                Type    = 'path'
                Control = $txt
                Path    = $configPath
            }
        }
        elseif ($Type -eq 'enum') {
            $cmb = New-Object System.Windows.Forms.ComboBox
            $cmb.DropDownStyle = [System.Windows.Forms.ComboBoxStyle]::DropDownList
            $cmb.Font = New-Object System.Drawing.Font 'Segoe UI', 9
            $cmb.BackColor = $palette.InputBackColor
            $cmb.ForeColor = $palette.InputForeColor
            $cmb.Location = New-Object System.Drawing.Point(8, $innerY)
            $cmb.Width = 260
            $cmb.Tag = $configPath

            foreach ($opt in $Options) {
                [void]$cmb.Items.Add($opt)
            }

            $strVal = [string]$currentVal
            $idx = $cmb.Items.IndexOf($strVal)
            if ($idx -ge 0) {
                $cmb.SelectedIndex = $idx
            }
            elseif ($cmb.Items.Count -gt 0) {
                $cmb.SelectedIndex = 0
            }

            $cmb.Add_SelectedIndexChanged({
                if ($this.Tag -and $this.SelectedItem) {
                    Set-ConfigValue -Path ([string]$this.Tag) -Value $this.SelectedItem.ToString()
                }
            })

            $rowPanel.Controls.Add($cmb)
            $innerY += 28

            $script:FieldControls += @{
                Type    = 'enum'
                Control = $cmb
                Path    = $configPath
            }
        }
        elseif ($Type -eq 'int') {
            $num = New-Object System.Windows.Forms.NumericUpDown
            $num.Minimum = [decimal]$MinVal
            $num.Maximum = [decimal]$MaxVal
            $num.Font = New-Object System.Drawing.Font 'Segoe UI', 9
            $num.BackColor = $palette.InputBackColor
            $num.ForeColor = $palette.InputForeColor
            $num.Location = New-Object System.Drawing.Point(8, $innerY)
            $num.Width = 120
            $num.Tag = $configPath

            $intVal = 0
            if ([int]::TryParse([string]$currentVal, [ref]$intVal)) {
                $num.Value = [decimal]([Math]::Max($MinVal, [Math]::Min($MaxVal, $intVal)))
            }
            else {
                $num.Value = [decimal]$MinVal
            }

            $num.Add_ValueChanged({
                if ($this.Tag) {
                    Set-ConfigValue -Path ([string]$this.Tag) -Value ([int]$this.Value)
                }
            })

            $rowPanel.Controls.Add($num)
            $innerY += 28

            $script:FieldControls += @{
                Type    = 'int'
                Control = $num
                Path    = $configPath
            }
        }
        elseif ($Type -eq 'array') {
            $txtArr = New-Object System.Windows.Forms.TextBox
            $txtArr.Multiline = $true
            $txtArr.ScrollBars = [System.Windows.Forms.ScrollBars]::Vertical
            $txtArr.Font = New-Object System.Drawing.Font 'Consolas', 9
            $txtArr.BackColor = $palette.InputBackColor
            $txtArr.ForeColor = $palette.InputForeColor
            $txtArr.Location = New-Object System.Drawing.Point(8, $innerY)
            $txtArr.Size = New-Object System.Drawing.Size([Math]::Min(560, $rowPanel.Width - 30), 60)
            $txtArr.Anchor = [System.Windows.Forms.AnchorStyles]::Top -bor [System.Windows.Forms.AnchorStyles]::Left -bor [System.Windows.Forms.AnchorStyles]::Right
            $txtArr.Tag = $configPath

            if ($currentVal -is [System.Collections.IEnumerable] -and -not ($currentVal -is [string])) {
                $txtArr.Text = ($currentVal -join "`r`n")
            }

            $txtArr.Add_TextChanged({
                if ($this.Tag) {
                    $lines = @($this.Lines | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | ForEach-Object { $_.Trim() })
                    Set-ConfigValue -Path ([string]$this.Tag) -Value $lines
                }
            })

            $rowPanel.Controls.Add($txtArr)
            $innerY += 66

            $script:FieldControls += @{
                Type    = 'array'
                Control = $txtArr
                Path    = $configPath
            }
        }
    }

    # Description Label
    if ($desc) {
        $lblDesc = New-Object System.Windows.Forms.Label
        $lblDesc.Text = $desc
        $lblDesc.Font = New-Object System.Drawing.Font 'Segoe UI', 8.25
        $lblDesc.ForeColor = $palette.TextMuted
        $lblDesc.Location = New-Object System.Drawing.Point(8, $innerY)
        $lblDesc.Width = $rowPanel.Width - 20
        $lblDesc.Anchor = [System.Windows.Forms.AnchorStyles]::Top -bor [System.Windows.Forms.AnchorStyles]::Left -bor [System.Windows.Forms.AnchorStyles]::Right
        $lblDesc.AutoSize = $false
        
        # Calculate needed height
        $linesEst = [Math]::Ceiling($desc.Length / 90.0)
        $lblDesc.Height = [Math]::Max(18, [int]($linesEst * 16))
        $rowPanel.Controls.Add($lblDesc)
        $innerY += $lblDesc.Height + 4
    }

    # Separator Line
    $sep = New-Object System.Windows.Forms.Panel
    $sep.Location = New-Object System.Drawing.Point(0, ($innerY + 4))
    $sep.Size = New-Object System.Drawing.Size($rowPanel.Width, 1)
    $sep.BackColor = $palette.BorderColor
    $sep.Anchor = [System.Windows.Forms.AnchorStyles]::Bottom -bor [System.Windows.Forms.AnchorStyles]::Left -bor [System.Windows.Forms.AnchorStyles]::Right
    $rowPanel.Controls.Add($sep)

    $rowPanel.Height = $innerY + 8
    $ParentPanel.Controls.Add($rowPanel)

    $script:RowPanels += $rowPanel
    $YOffset.Value += $rowPanel.Height + 6
}

$script:NavButtons = @()
$script:SectionPanels = @()
$script:ActiveTabIndex = 0
$script:HeaderPanel = $null
$script:NavPanel = $null
$script:NavFlow = $null
$script:ContentContainer = $null
$script:FooterPanel = $null
$script:LblTitle = $null
$script:LblPath = $null
$script:LblTheme = $null
$script:CmbTheme = $null
$script:TxtSearch = $null
$script:LblStatus = $null

function Switch-SectionTab {
    param([int]$Index)

    if ($Index -lt 0 -or $Index -ge $script:SectionPanels.Count) { return }
    $palette = Get-CurrentPalette

    for ($i = 0; $i -lt $script:NavButtons.Count; $i++) {
        $btn = $script:NavButtons[$i]
        $pnl = $script:SectionPanels[$i]

        if ($i -eq $Index) {
            $pnl.Visible = $true
            $pnl.BringToFront()
            $btn.BackColor = $palette.Accent
            $btn.ForeColor = $palette.AccentText
            $btn.Font = New-Object System.Drawing.Font 'Segoe UI', 9, ([System.Drawing.FontStyle]::Bold)
        }
        else {
            $pnl.Visible = $false
            $btn.BackColor = $palette.PanelColor
            $btn.ForeColor = $palette.TextPrimary
            $btn.Font = New-Object System.Drawing.Font 'Segoe UI', 9
        }
    }
    $script:ActiveTabIndex = $Index
}

function Populate-Sections {
    param(
        [System.Windows.Forms.FlowLayoutPanel]$NavContainer,
        [System.Windows.Forms.Panel]$ContentContainer
    )

    $NavContainer.Controls.Clear()
    $ContentContainer.Controls.Clear()
    $script:NavButtons = @()
    $script:SectionPanels = @()
    $script:RowPanels = @()
    $script:FieldControls = @()

    $palette = Get-CurrentPalette

    $tabs = @(
        @{ Title = 'Project & SCM'; Id = 'project' },
        @{ Title = 'Verification & Test'; Id = 'verification' },
        @{ Title = 'Defaults & DAG'; Id = 'defaults' },
        @{ Title = 'Subagents & Models'; Id = 'models' },
        @{ Title = 'Plans & Artifacts'; Id = 'plans' },
        @{ Title = 'Rules & Invariants'; Id = 'rules' },
        @{ Title = 'External Integrations'; Id = 'integrations' }
    )

    for ($tabIdx = 0; $tabIdx -lt $tabs.Count; $tabIdx++) {
        $tabInfo = $tabs[$tabIdx]
        $idxCopy = $tabIdx

        # 1. Nav Tab Button
        $btn = New-Object System.Windows.Forms.Button
        $btn.Text = $tabInfo.Title
        $btn.Height = 32
        $btn.AutoSize = $true
        $btn.Margin = New-Object System.Windows.Forms.Padding(3, 4, 3, 4)
        $btn.Padding = New-Object System.Windows.Forms.Padding(10, 2, 10, 2)
        $btn.Cursor = [System.Windows.Forms.Cursors]::Hand
        Set-ButtonFlatStyle -Button $btn
        $btn.Tag = @{ OriginalTitle = $tabInfo.Title; Id = $tabInfo.Id; Index = $idxCopy }

        $btn.Add_Click({
            Switch-SectionTab -Index $this.Tag.Index
        })

        $NavContainer.Controls.Add($btn)
        $script:NavButtons += $btn

        # 2. Section Panel
        $page = New-Object System.Windows.Forms.Panel
        $page.Dock = [System.Windows.Forms.DockStyle]::Fill
        $page.BackColor = $palette.BackColor
        $page.AutoScroll = $true
        $page.Visible = ($tabIdx -eq 0)
        $page.Tag = @{ Id = $tabInfo.Id; Title = $tabInfo.Title }

        $page.Add_Resize({
            $w = [Math]::Max(480, $this.ClientSize.Width - 36)
            foreach ($c in $this.Controls) {
                if ($c -is [System.Windows.Forms.Panel] -and $c.Tag) {
                    $c.Width = $w
                }
            }
        })

        $y = [ref]10

        switch ($tabInfo.Id) {
            'project' {
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'project' -Key 'name' -LabelText 'Project Name' -Type 'string' -Placeholder 'e.g. workflow-skills'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'project' -Key 'baseBranch' -LabelText 'Base PR Target Branch' -Type 'string' -DefaultVal 'main' -Placeholder 'main or master'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'project' -Key 'workingBranch' -LabelText 'Working Delivery Branch' -Type 'string' -DefaultVal 'develop' -Placeholder 'develop'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'project' -Key 'repoUrl' -LabelText 'Repository Remote URL' -Type 'string' -Placeholder 'https://github.com/org/repo'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'project' -Key 'gitRemote' -LabelText 'Git Remote Name' -Type 'string' -DefaultVal 'origin'

                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'providers' -Key 'active' -LabelText 'Active Spec Provider' -Type 'enum' -Options @('local', 'github', 'azure-devops') -DefaultVal 'local'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'providers' -Key 'scm' -LabelText 'Active SCM / PR Host' -Type 'enum' -Options @('github', 'azure-devops') -DefaultVal 'github'

                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'issueTrackers.github' -Key 'enabled' -LabelText 'Enable GitHub Issue Tracker' -Type 'bool' -DefaultVal $false
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'issueTrackers.github' -Key 'org' -LabelText 'GitHub Org / Owner' -Type 'string'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'issueTrackers.github' -Key 'repo' -LabelText 'GitHub Repository' -Type 'string'

                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'issueTrackers.azureDevOps' -Key 'enabled' -LabelText 'Enable Azure DevOps Tracker' -Type 'bool' -DefaultVal $false
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'issueTrackers.azureDevOps' -Key 'org' -LabelText 'Azure DevOps Organization' -Type 'string'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'issueTrackers.azureDevOps' -Key 'project' -LabelText 'Azure DevOps Project' -Type 'string'
            }
            'verification' {
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'verification' -Key 'backendBuild' -LabelText 'Backend Build Command' -Type 'string' -Placeholder 'npm run build | dotnet build'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'verification' -Key 'backendTest' -LabelText 'Backend Test Command' -Type 'string' -Placeholder 'npm test | dotnet test'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'verification' -Key 'backendFormat' -LabelText 'Backend Format / Lint Command' -Type 'string'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'verification' -Key 'frontendBuild' -LabelText 'Frontend Build Command' -Type 'string'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'verification' -Key 'frontendTest' -LabelText 'Frontend Test Command' -Type 'string'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'verification' -Key 'localReviewCommand' -LabelText 'Local Review Command' -Type 'string' -Placeholder 'cursor-reviewer --dry-run'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'verification' -Key 'mutationTest' -LabelText 'Mutation Testing Command' -Type 'string' -Placeholder 'stryker run | npx stryker run'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'verification' -Key 'mutationThreshold' -LabelText 'Mutation Score Threshold (%)' -Type 'int' -MinVal 0 -MaxVal 100 -DefaultVal 80
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'verification' -Key 'testGlobs' -LabelText 'Test Surface Probe Patterns' -Type 'array' -DefaultVal @('test/**/*.js', 'tests/**/*', '**/*.test.*', '**/*.spec.*')

                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'dagThresholds' -Key 'maxImplementationSteps' -LabelText 'DAG Max Implementation Steps' -Type 'int' -MinVal 1 -MaxVal 50 -DefaultVal 5
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'dagThresholds' -Key 'maxExpectedFiles' -LabelText 'DAG Max Expected Files' -Type 'int' -MinVal 1 -MaxVal 50 -DefaultVal 10
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'dagThresholds' -Key 'maxLayers' -LabelText 'DAG Max Architectural Layers' -Type 'int' -MinVal 1 -MaxVal 20 -DefaultVal 3
            }
            'defaults' {
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults' -Key 'enableDag' -LabelText 'Enable DAG Parallel Tasks (defaults.enableDag)' -Type 'bool' -DefaultVal $false
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults' -Key 'verboseMode' -LabelText 'Verbose Step Preview (defaults.verboseMode)' -Type 'bool' -DefaultVal $true
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults' -Key 'autoMode' -LabelText 'Autonomous Advance Mode (defaults.autoMode)' -Type 'bool' -DefaultVal $false
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults' -Key 'scoreAndRefine' -LabelText 'Score & Refine Loop (defaults.scoreAndRefine)' -Type 'bool' -DefaultVal $false
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults' -Key 'minVerifyScore' -LabelText 'Minimum Step 5 Verification Score (1-10)' -Type 'int' -MinVal 1 -MaxVal 10 -DefaultVal 9
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults' -Key 'gateGranularity' -LabelText 'Gate Prompt Granularity' -Type 'enum' -Options @('step', 'phase') -DefaultVal 'step'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults' -Key 'autoload' -LabelText 'Autoload Skills in Repo Root AGENTS.md' -Type 'bool' -DefaultVal $false
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults' -Key 'autoloadTaskLifecycle' -LabelText 'Include ws-task-lifecycle in Autoload' -Type 'bool' -DefaultVal $false
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults' -Key 'skipTesting' -LabelText 'Skip Step 7 Testing' -Type 'bool' -DefaultVal $false
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults' -Key 'skipMutationTesting' -LabelText 'Skip Step 7 Mutation Testing' -Type 'bool' -DefaultVal $true
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults' -Key 'parallelVerifyReview' -LabelText 'Parallel Verify & Review (Steps 5 & 6)' -Type 'bool' -DefaultVal $false
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults' -Key 'contextBudget' -LabelText 'Subagent Context Budget (UTF-8 Bytes)' -Type 'int' -MinVal 18000 -MaxVal 128000 -DefaultVal 32000
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults.contextHygiene' -Key 'pruneAfterStep' -LabelText 'Prune Prior Step Context' -Type 'bool' -DefaultVal $true
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults.providerCompat' -Key 'stabilizeStaticPrefix' -LabelText 'Stabilize Static Dispatch Prefix' -Type 'bool' -DefaultVal $true
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults.providerCompat' -Key 'thinkingToolCompat' -LabelText 'Preserve Thinking Text in Tool Turns' -Type 'bool' -DefaultVal $false
            }
            'models' {
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults' -Key 'modelsPreset' -LabelText 'Active Models Preset Bundle' -Type 'enum' -Options @('default', 'cursor', 'deepseek', 'opencode', 'cheap', 'custom') -DefaultVal 'default'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults' -Key 'plannerModel' -LabelText 'Planner Model (Steps 0-3)' -Type 'string' -Placeholder 'e.g. composer-2.5 | claude-3-7-sonnet'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults' -Key 'executionModel' -LabelText 'Execution Model (Step 4)' -Type 'string' -Placeholder 'e.g. composer-2.5'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults' -Key 'reviewerModel' -LabelText 'Reviewer Model (Steps 5-6)' -Type 'string' -Placeholder 'e.g. cursor-grok-4.6-high'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults' -Key 'testingModel' -LabelText 'Testing Model (Step 7)' -Type 'string' -Placeholder 'e.g. composer-2.5'

                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults.reviewJury' -Key 'size' -LabelText 'Step 6 Review Jury Size (1-3)' -Type 'int' -MinVal 1 -MaxVal 3 -DefaultVal 1

                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults.specializedSubagents' -Key 'enabled' -LabelText 'Compile Specialized Host Subagents' -Type 'bool' -DefaultVal $false
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults.specializedSubagents' -Key 'targetHost' -LabelText 'Specialized Subagents Target Host' -Type 'enum' -Options @('auto', 'cursor', 'claude', 'generic') -DefaultVal 'auto'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults.specializedSubagents' -Key 'agentPrefix' -LabelText 'Specialized Subagents Agent Prefix' -Type 'string' -DefaultVal 'ws'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults.specializedSubagents' -Key 'directory' -LabelText 'Specialized Subagents Output Location' -Type 'string' -DefaultVal 'projectLevel'

                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults.hostAdapter' -Key 'mode' -LabelText 'Host Dispatch Adapter Mode' -Type 'enum' -Options @('auto', 'native-tool', 'cli-command', 'inline-isolated', 'cursor', 'claude', 'opencode', 'antigravity') -DefaultVal 'auto'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults.hostAdapter' -Key 'cliTemplate' -LabelText 'Host Adapter CLI Template' -Type 'string'
            }
            'plans' {
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'plans' -Key 'dir' -LabelText 'Plans Directory ({plansDir})' -Type 'path-folder' -DefaultVal '.agents/plans'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'plans' -Key 'specsDir' -LabelText 'Specs Directory ({specsDir})' -Type 'path-folder' -DefaultVal '.agents/specs'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'plans' -Key 'wikiDir' -LabelText 'Wiki Directory ({wikiDir})' -Type 'path-folder' -DefaultVal '.agents/specs/wiki'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'plans' -Key 'diagnosticsDir' -LabelText 'Diagnostics Directory' -Type 'path-folder' -DefaultVal '.agents/plans/diagnostics'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'plans' -Key 'worktreesDir' -LabelText 'Worktrees Directory Template' -Type 'string' -DefaultVal '.agents/plans/{slug}/worktrees'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'plans' -Key 'useWorktrees' -LabelText 'Use Git Worktrees for Step 4' -Type 'bool' -DefaultVal $false
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'plans' -Key 'enforceSpecPrefixOrdering' -LabelText 'Enforce NNNN- Spec Prefix Ordering' -Type 'bool' -DefaultVal $false

                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'reviews' -Key 'dir' -LabelText 'Code Reviews Directory' -Type 'path-folder' -DefaultVal '.agents/codereviews'

                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'tracking' -Key 'featuresMdEnabled' -LabelText 'Include Features File in Completion Walk' -Type 'bool' -DefaultVal $true
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'tracking' -Key 'canonicalFiles' -LabelText 'Canonical Tracking Files' -Type 'array' -DefaultVal @('FEATURES.md', 'PLAN.md', 'PRODUCT.PRD')

                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults.deliveryCommitArtifacts' -Key 'includeRefinedPlan' -LabelText 'Step 8 Delivery: Include Refined Plan' -Type 'bool' -DefaultVal $true
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults.deliveryCommitArtifacts' -Key 'includeDeliveryResult' -LabelText 'Step 8 Delivery: Include Result Summary' -Type 'bool' -DefaultVal $false
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults.deliveryCommitArtifacts' -Key 'includeSpec' -LabelText 'Step 8 Delivery: Include Spec File' -Type 'bool' -DefaultVal $false
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults.deliveryCommitArtifacts' -Key 'includeCheckReport' -LabelText 'Step 8 Delivery: Include Step 5 Check Report' -Type 'bool' -DefaultVal $false
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults.deliveryCommitArtifacts' -Key 'includeCodeReview' -LabelText 'Step 8 Delivery: Include Step 6 Review Report' -Type 'bool' -DefaultVal $false
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults.deliveryCommitArtifacts' -Key 'includeTestingReport' -LabelText 'Step 8 Delivery: Include Step 7 Test Report' -Type 'bool' -DefaultVal $false
            }
            'rules' {
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'rules' -Key 'harness' -LabelText 'Harness Rule Path' -Type 'path-file' -DefaultVal '.agents/skills/ws-shared/AGENTS.md'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'rules' -Key 'seniorDeveloper' -LabelText 'Senior Developer Gate Rule Path' -Type 'path-file' -DefaultVal '.agents/skills/ws-senior-developer/SKILL.md'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'rules' -Key 'karpathyGuidelines' -LabelText 'Karpathy Diff Hygiene Rule Path' -Type 'path-file' -DefaultVal '.agents/skills/ws-karpathy-guidelines/SKILL.md'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'rules' -Key 'stackFile' -LabelText 'Project Stack File' -Type 'path-file' -DefaultVal '.agents/skills/ws-shared/STACK.md'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'rules' -Key 'changelogFile' -LabelText 'Project Changelog File' -Type 'path-file' -DefaultVal '.agents/skills/ws-shared/CHANGELOG.md'

                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'invariants' -Key 'skipQualityGates' -LabelText 'Skip Soft Quality Gates (CLI --skip-gates)' -Type 'bool' -DefaultVal $false
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'invariants' -Key 'commitPlanFilesOnlyAtStep8' -LabelText 'Stage Plan Files Only at Step 8 Close' -Type 'bool' -DefaultVal $true
            }
            'integrations' {
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'preview' -Key 'dryRunCommand' -LabelText 'Pipeline Review Dry-Run Command' -Type 'string' -Placeholder 'e.g. npm run review:dry'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'preview' -Key 'localReviewCommand' -LabelText 'Local Review Command' -Type 'string' -Placeholder 'cursor-reviewer --dry-run'

                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'specMemo' -Key 'enabled' -LabelText 'Enable External spec-memo Vault Bridge' -Type 'bool' -DefaultVal $false
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'specMemo' -Key 'mode' -LabelText 'spec-memo Storage Mode' -Type 'enum' -Options @('vault', 'hybrid', 'local', 'disabled') -DefaultVal 'vault'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'specMemo' -Key 'cli' -LabelText 'spec-memo CLI Launcher' -Type 'string' -DefaultVal 'memo'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'specMemo' -Key 'mcpServerName' -LabelText 'spec-memo MCP Namespace' -Type 'string' -DefaultVal 'spec-memo'
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'specMemo' -Key 'bootstrapOnSession' -LabelText 'Bootstrap spec-memo on Session Start' -Type 'bool' -DefaultVal $true

                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'fable' -Key 'enabled' -LabelText 'Enable Fable Evidence Engine' -Type 'bool' -DefaultVal $false
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'fable' -Key 'autoAudit' -LabelText 'Automatic Fable Adversarial Audit' -Type 'bool' -DefaultVal $false
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'fable' -Key 'autoDetectDomain' -LabelText 'Autodetect Domain Adapter' -Type 'bool' -DefaultVal $false
                Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'fable' -Key 'auditVerdictsBlockShip' -LabelText 'Audit Verdicts That Block Ship' -Type 'enum' -Options @('refuted', 'caveats', 'false') -DefaultVal 'refuted'
            }
        }

        $ContentContainer.Controls.Add($page)
        $script:SectionPanels += $page
    }

    # Activate first tab
    Switch-SectionTab -Index 0
}

function Apply-FilterQuery {
    param([string]$Query)

    $hasQuery = -not [string]::IsNullOrWhiteSpace($Query)
    $q = if ($hasQuery) { $Query.Trim().ToLowerInvariant() } else { '' }

    $firstMatchingIndex = -1

    for ($i = 0; $i -lt $script:SectionPanels.Count; $i++) {
        $page = $script:SectionPanels[$i]
        $btn = $script:NavButtons[$i]
        $origTitle = $btn.Tag.OriginalTitle
        $visibleCount = 0
        $y = 10

        foreach ($ctrl in $page.Controls) {
            if ($ctrl -is [System.Windows.Forms.Panel] -and $ctrl.Tag) {
                $tag = $ctrl.Tag
                $match = $true
                if ($hasQuery) {
                    $match = ($tag.Key.ToLowerInvariant().Contains($q) -or
                              $tag.Label.ToLowerInvariant().Contains($q) -or
                              $tag.Section.ToLowerInvariant().Contains($q) -or
                              $tag.Description.ToLowerInvariant().Contains($q))
                }

                $ctrl.Visible = $match
                if ($match) {
                    $ctrl.Location = New-Object System.Drawing.Point(16, $y)
                    $y += $ctrl.Height + 6
                    $visibleCount++
                }
            }
        }

        if ($hasQuery) {
            $btn.Text = "$origTitle ($visibleCount)"
            if ($visibleCount -gt 0 -and $firstMatchingIndex -eq -1) {
                $firstMatchingIndex = $i
            }
        }
        else {
            $btn.Text = $origTitle
        }
    }

    if ($hasQuery -and $firstMatchingIndex -ge 0) {
        Switch-SectionTab -Index $firstMatchingIndex
    }
}

function Apply-ThemeToUi {
    $palette = Get-CurrentPalette
    if (-not $script:MainForm) { return }

    $script:MainForm.BackColor = $palette.BackColor
    $script:HeaderPanel.BackColor = $palette.PanelColor
    $script:NavPanel.BackColor = $palette.BackColor
    $script:NavFlow.BackColor = $palette.BackColor
    $script:ContentContainer.BackColor = $palette.BackColor
    $script:FooterPanel.BackColor = $palette.PanelColor

    $script:LblTitle.ForeColor = $palette.TextPrimary
    $script:LblPath.ForeColor = $palette.TextMuted
    $script:LblTheme.ForeColor = $palette.TextMuted
    $script:CmbTheme.BackColor = $palette.InputBackColor
    $script:CmbTheme.ForeColor = $palette.InputForeColor
    $script:TxtSearch.BackColor = $palette.InputBackColor
    $script:TxtSearch.ForeColor = $palette.InputForeColor

    $script:NavSep.BackColor = $palette.BorderColor
    $script:FootSep.BackColor = $palette.BorderColor

    # Update tab buttons
    for ($i = 0; $i -lt $script:NavButtons.Count; $i++) {
        $btn = $script:NavButtons[$i]
        if ($i -eq $script:ActiveTabIndex) {
            $btn.BackColor = $palette.Accent
            $btn.ForeColor = $palette.AccentText
        } else {
            $btn.BackColor = $palette.PanelColor
            $btn.ForeColor = $palette.TextPrimary
        }
    }

    # Update section panels
    foreach ($pnl in $script:SectionPanels) {
        $pnl.BackColor = $palette.BackColor
    }

    # Update row panels
    foreach ($row in $script:RowPanels) {
        $row.BackColor = $palette.PanelColor
        foreach ($c in $row.Controls) {
            if ($c -is [System.Windows.Forms.Label]) {
                if ($c.Font.Bold) {
                    $c.ForeColor = $palette.TextPrimary
                } else {
                    $c.ForeColor = $palette.TextMuted
                }
            }
            elseif ($c -is [System.Windows.Forms.TextBox] -or $c -is [System.Windows.Forms.ComboBox] -or $c -is [System.Windows.Forms.NumericUpDown]) {
                $c.BackColor = $palette.InputBackColor
                $c.ForeColor = $palette.InputForeColor
            }
            elseif ($c -is [System.Windows.Forms.CheckBox]) {
                $c.ForeColor = $palette.TextPrimary
            }
            elseif ($c -is [System.Windows.Forms.Panel]) {
                $c.BackColor = $palette.BorderColor
            }
        }
    }
}

function Show-ConfigEditorGui {
    Initialize-WinFormsApp
    $palette = Get-CurrentPalette

    $script:MainForm = New-Object System.Windows.Forms.Form
    $script:MainForm.Text = "$($script:AppName) - config.json"
    $script:MainForm.Size = New-Object System.Drawing.Size(1020, 720)
    $script:MainForm.MinimumSize = New-Object System.Drawing.Size(860, 560)
    $script:MainForm.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
    $script:MainForm.BackColor = $palette.BackColor
    $script:MainForm.Font = New-Object System.Drawing.Font 'Segoe UI', 9

    # -----------------------------------------------------------------------
    # 1. Header Panel (Title, Target info, Filter search, Theme toggle)
    # -----------------------------------------------------------------------
    $script:HeaderPanel = New-Object System.Windows.Forms.Panel
    $script:HeaderPanel.Dock = [System.Windows.Forms.DockStyle]::Top
    $script:HeaderPanel.Height = 64
    $script:HeaderPanel.BackColor = $palette.PanelColor

    $script:LblTitle = New-Object System.Windows.Forms.Label
    $script:LblTitle.Text = $script:AppName
    $script:LblTitle.Font = New-Object System.Drawing.Font 'Segoe UI', 12.5, ([System.Drawing.FontStyle]::Bold)
    $script:LblTitle.ForeColor = $palette.TextPrimary
    $script:LblTitle.Location = New-Object System.Drawing.Point(16, 10)
    $script:LblTitle.AutoSize = $true
    $script:HeaderPanel.Controls.Add($script:LblTitle)

    $script:LblPath = New-Object System.Windows.Forms.Label
    $rel = if ($script:ActiveConfigPath) { $script:ActiveConfigPath.Replace($script:ResolvedRepoRoot, '').TrimStart('\/') } else { 'config.json' }
    $script:LblPath.Text = "Target: $rel"
    $script:LblPath.Font = New-Object System.Drawing.Font 'Segoe UI', 8.25
    $script:LblPath.ForeColor = $palette.TextMuted
    $script:LblPath.Location = New-Object System.Drawing.Point(18, 36)
    $script:LblPath.AutoSize = $true
    $script:HeaderPanel.Controls.Add($script:LblPath)

    # Theme Toggle
    $script:LblTheme = New-Object System.Windows.Forms.Label
    $script:LblTheme.Text = 'Theme:'
    $script:LblTheme.Font = New-Object System.Drawing.Font 'Segoe UI', 8.5
    $script:LblTheme.ForeColor = $palette.TextMuted
    $script:LblTheme.AutoSize = $true
    $script:HeaderPanel.Controls.Add($script:LblTheme)

    $script:CmbTheme = New-Object System.Windows.Forms.ComboBox
    $script:CmbTheme.DropDownStyle = [System.Windows.Forms.ComboBoxStyle]::DropDownList
    $script:CmbTheme.Font = New-Object System.Drawing.Font 'Segoe UI', 8.5
    $script:CmbTheme.BackColor = $palette.InputBackColor
    $script:CmbTheme.ForeColor = $palette.InputForeColor
    $script:CmbTheme.Width = 100
    [void]$script:CmbTheme.Items.Add('Auto (OS)')
    [void]$script:CmbTheme.Items.Add('Dark')
    [void]$script:CmbTheme.Items.Add('Light')
    $script:CmbTheme.SelectedIndex = 0
    $script:HeaderPanel.Controls.Add($script:CmbTheme)

    # Search Box
    $script:TxtSearch = New-Object System.Windows.Forms.TextBox
    $script:TxtSearch.Font = New-Object System.Drawing.Font 'Segoe UI', 9
    $script:TxtSearch.BackColor = $palette.InputBackColor
    $script:TxtSearch.ForeColor = $palette.InputForeColor
    $script:TxtSearch.Width = 240
    [TextBoxCue]::SetCue($script:TxtSearch.Handle, 'Search options, keys, or descriptions...')
    $script:HeaderPanel.Controls.Add($script:TxtSearch)

    # Responsive Header Layout
    $layoutHeader = {
        $w = $script:HeaderPanel.ClientSize.Width
        $sWidth = [Math]::Max(180, [Math]::Min(300, [int]($w * 0.28)))
        $script:TxtSearch.Width = $sWidth
        $script:TxtSearch.Location = New-Object System.Drawing.Point(($w - $sWidth - 16), 16)
        $script:CmbTheme.Location = New-Object System.Drawing.Point(($script:TxtSearch.Left - 112), 16)
        $script:LblTheme.Location = New-Object System.Drawing.Point(($script:CmbTheme.Left - 52), 19)
    }
    $script:HeaderPanel.Add_Resize($layoutHeader)

    # -----------------------------------------------------------------------
    # 2. Navigation Tab Bar (Height=42, Dock=Top)
    # -----------------------------------------------------------------------
    $script:NavPanel = New-Object System.Windows.Forms.Panel
    $script:NavPanel.Dock = [System.Windows.Forms.DockStyle]::Top
    $script:NavPanel.Height = 44
    $script:NavPanel.BackColor = $palette.BackColor

    $script:NavFlow = New-Object System.Windows.Forms.FlowLayoutPanel
    $script:NavFlow.Dock = [System.Windows.Forms.DockStyle]::Fill
    $script:NavFlow.FlowDirection = [System.Windows.Forms.FlowDirection]::LeftToRight
    $script:NavFlow.WrapContents = $false
    $script:NavFlow.AutoScroll = $true
    $script:NavFlow.BackColor = $palette.BackColor
    $script:NavFlow.Padding = New-Object System.Windows.Forms.Padding(12, 4, 12, 4)
    $script:NavPanel.Controls.Add($script:NavFlow)

    $script:NavSep = New-Object System.Windows.Forms.Panel
    $script:NavSep.Dock = [System.Windows.Forms.DockStyle]::Bottom
    $script:NavSep.Height = 1
    $script:NavSep.BackColor = $palette.BorderColor
    $script:NavPanel.Controls.Add($script:NavSep)

    # -----------------------------------------------------------------------
    # 3. Content Container (Fills middle area)
    # -----------------------------------------------------------------------
    $script:ContentContainer = New-Object System.Windows.Forms.Panel
    $script:ContentContainer.Dock = [System.Windows.Forms.DockStyle]::Fill
    $script:ContentContainer.BackColor = $palette.BackColor

    # -----------------------------------------------------------------------
    # 4. Footer Panel (Height=52, Dock=Bottom)
    # -----------------------------------------------------------------------
    $script:FooterPanel = New-Object System.Windows.Forms.Panel
    $script:FooterPanel.Dock = [System.Windows.Forms.DockStyle]::Bottom
    $script:FooterPanel.Height = 52
    $script:FooterPanel.BackColor = $palette.PanelColor

    $script:FootSep = New-Object System.Windows.Forms.Panel
    $script:FootSep.Dock = [System.Windows.Forms.DockStyle]::Top
    $script:FootSep.Height = 1
    $script:FootSep.BackColor = $palette.BorderColor
    $script:FooterPanel.Controls.Add($script:FootSep)

    $script:LblStatus = New-Object System.Windows.Forms.Label
    $script:LblStatus.Text = "Ready. $($script:Descriptions.Count) option descriptions loaded."
    $script:LblStatus.Font = New-Object System.Drawing.Font 'Segoe UI', 8.5
    $script:LblStatus.ForeColor = $palette.StatusColor
    $script:LblStatus.Location = New-Object System.Drawing.Point(16, 17)
    $script:LblStatus.AutoSize = $true
    $script:FooterPanel.Controls.Add($script:LblStatus)

    $btnReset = New-Object System.Windows.Forms.Button
    $btnReset.Text = 'Reload'
    $btnReset.Size = New-Object System.Drawing.Size(80, 28)
    Set-ButtonFlatStyle -Button $btnReset
    $script:FooterPanel.Controls.Add($btnReset)

    $btnApply = New-Object System.Windows.Forms.Button
    $btnApply.Text = 'Apply'
    $btnApply.Size = New-Object System.Drawing.Size(80, 28)
    Set-ButtonFlatStyle -Button $btnApply
    $script:FooterPanel.Controls.Add($btnApply)

    $btnSave = New-Object System.Windows.Forms.Button
    $btnSave.Text = 'Save'
    $btnSave.Size = New-Object System.Drawing.Size(85, 28)
    Set-ButtonFlatStyle -Button $btnSave -Primary
    $script:FooterPanel.Controls.Add($btnSave)

    $btnCancel = New-Object System.Windows.Forms.Button
    $btnCancel.Text = 'Cancel'
    $btnCancel.Size = New-Object System.Drawing.Size(80, 28)
    Set-ButtonFlatStyle -Button $btnCancel
    $script:FooterPanel.Controls.Add($btnCancel)

    # Responsive Footer Layout
    $layoutFooter = {
        $w = $script:FooterPanel.ClientSize.Width
        $btnCancel.Location = New-Object System.Drawing.Point(($w - 96), 12)
        $btnSave.Location   = New-Object System.Drawing.Point(($w - 192), 12)
        $btnApply.Location  = New-Object System.Drawing.Point(($w - 282), 12)
        $btnReset.Location  = New-Object System.Drawing.Point(($w - 372), 12)
    }
    $script:FooterPanel.Add_Resize($layoutFooter)

    # -----------------------------------------------------------------------
    # Add Controls in Proper Z-Order
    # -----------------------------------------------------------------------
    $script:MainForm.Controls.Add($script:ContentContainer)
    $script:MainForm.Controls.Add($script:NavPanel)
    $script:MainForm.Controls.Add($script:HeaderPanel)
    $script:MainForm.Controls.Add($script:FooterPanel)

    $script:FooterPanel.SendToBack()
    $script:HeaderPanel.SendToBack()
    $script:NavPanel.SendToBack()
    $script:ContentContainer.BringToFront()

    # Populate sections and tab buttons
    Populate-Sections -NavContainer $script:NavFlow -ContentContainer $script:ContentContainer

    # Initial Layout
    & $layoutHeader
    & $layoutFooter

    # -----------------------------------------------------------------------
    # Event Handlers
    # -----------------------------------------------------------------------
    $script:TxtSearch.Add_TextChanged({
        Apply-FilterQuery -Query $this.Text
    })

    $script:CmbTheme.Add_SelectedIndexChanged({
        switch ($this.SelectedIndex) {
            1 { $script:ThemeMode = 'dark' }
            2 { $script:ThemeMode = 'light' }
            default { $script:ThemeMode = 'auto' }
        }
        Apply-ThemeToUi
        $script:LblStatus.Text = "Theme switched to $($script:ThemeMode)."
    })

    $btnReset.Add_Click({
        Reload-Configuration
        Populate-Sections -NavContainer $script:NavFlow -ContentContainer $script:ContentContainer
        $script:LblStatus.Text = "Configuration reloaded from disk."
        $script:LblStatus.ForeColor = (Get-CurrentPalette).StatusColor
    })

    $btnApply.Add_Click({
        try {
            Save-ConfigurationFile
            $script:LblStatus.Text = "Saved successfully at $(Get-Date -Format 'HH:mm:ss') (backup updated)."
            $script:LblStatus.ForeColor = (Get-CurrentPalette).StatusColor
        }
        catch {
            [System.Windows.Forms.MessageBox]::Show(
                "Error saving configuration:`n$($_.Exception.Message)",
                'Save Error',
                [System.Windows.Forms.MessageBoxButtons]::OK,
                [System.Windows.Forms.MessageBoxIcon]::Error
            ) | Out-Null
        }
    })

    $btnSave.Add_Click({
        try {
            Save-ConfigurationFile
            $script:MainForm.DialogResult = [System.Windows.Forms.DialogResult]::OK
            $script:MainForm.Close()
        }
        catch {
            [System.Windows.Forms.MessageBox]::Show(
                "Error saving configuration:`n$($_.Exception.Message)",
                'Save Error',
                [System.Windows.Forms.MessageBoxButtons]::OK,
                [System.Windows.Forms.MessageBoxIcon]::Error
            ) | Out-Null
        }
    })

    $btnCancel.Add_Click({
        $script:MainForm.Close()
    })

    $script:MainForm.Add_FormClosing({
        param($sender, $e)
        if ($script:IsDirty) {
            $resp = [System.Windows.Forms.MessageBox]::Show(
                "You have unsaved changes. Do you want to save before exiting?",
                'Unsaved Changes',
                [System.Windows.Forms.MessageBoxButtons]::YesNoCancel,
                [System.Windows.Forms.MessageBoxIcon]::Question
            )
            if ($resp -eq [System.Windows.Forms.DialogResult]::Yes) {
                try {
                    Save-ConfigurationFile
                }
                catch {
                    $e.Cancel = $true
                }
            }
            elseif ($resp -eq [System.Windows.Forms.DialogResult]::Cancel) {
                $e.Cancel = $true
            }
        }
    })

    Update-WindowTitle
    [void]$script:MainForm.ShowDialog()
}

# ---------------------------------------------------------------------------
# Main Entry Point
# ---------------------------------------------------------------------------
try {
    Resolve-ConfigurationPaths -ExplicitConfig $ConfigPath -ExplicitRoot $RepoRoot
    Reload-Configuration

    if ($FunctionsOnly) {
        return
    }

    if ($CheckOnly -or $NonInteractive) {
        Write-Host "=== $($script:AppName) Diagnostic ==="
        Write-Host "Repository root : $($script:ResolvedRepoRoot)"
        Write-Host "Target config   : $($script:ActiveConfigPath) $(if (Test-Path $script:ActiveConfigPath) { '[Found]' } else { '[Missing]' })"
        Write-Host "Schema file     : $($script:SchemaPath) $(if (Test-Path $script:SchemaPath) { '[Found]' } else { '[Missing]' })"
        Write-Host "Example file    : $($script:ExamplePath) $(if (Test-Path $script:ExamplePath) { '[Found]' } else { '[Missing]' })"
        Write-Host "Descriptions    : $($script:Descriptions.Count) entries indexed from schema and comments."
        Write-Host "GUI Interactive : $(Test-CanRunGui)"
        Write-Host "Status          : Validation PASSED."
        exit 0
    }

    if (-not (Test-CanRunGui)) {
        Write-Warning "GUI execution requires a Windows desktop session with interactive user display."
        Write-Host "To configure settings via terminal CLI, run:"
        Write-Host "  node .agents/skills/ws-configure-project/scripts/auto_configure.cjs"
        exit 0
    }

    Show-ConfigEditorGui
}
catch {
    Write-Error "Unhandled error in $($script:AppName): $($_.Exception.Message)"
    exit 1
}
