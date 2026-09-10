@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Edit-WorkflowSkillsConfig.ps1" %*
