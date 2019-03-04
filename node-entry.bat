@echo off
SETLOCAL

:: Determine availability of required programs
call :which node
@if "%_path%"=="" (
	echo This program requires Node.js to run. >&2
	echo Download from https://nodejs.org >&2
	exit /b 2
)

:: Assert minimum required versions
node --version | findstr /R "^[vV]*[0-7]\. ^[vV]*8\.[0-4]*\." >NUL && (
	echo This program requires Node.js v8.5.0 or later.
	exit /b 2
)

:: Determine which flags are necessary to enter an ESM graph
set _flags=
node --help | findstr /R /C:"^ *--experimental-modules" >NUL && (
	set _flags=--no-warnings --experimental-modules
)

:: Program entry point
node %_flags% "%~dp0\..\lib\index.mjs" %*

:: Exit program
goto :eof

:: Set %_path% to location of named program: "call :which foo"
:which
set _path=
@for %%e in (%PATHEXT%) do @for %%i in (%1%%e) do @if not "%%~$PATH:i"=="" set _path=%%~$PATH:i
exit /b