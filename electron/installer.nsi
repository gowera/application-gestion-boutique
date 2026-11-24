Unicode true
!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"

!define APP_NAME "Gestion Stock"
!define APP_PUBLISHER "Gestion Stock"
!ifndef APP_VERSION
!define APP_VERSION "1.4.3"
!endif
!define APP_EXE "GestionStock.exe"
!define APP_REGKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\Gestion StockAdmin"

Name "${APP_NAME}"
OutFile "${OUTPUT_FILE}"
InstallDir "$PROGRAMFILES64\Gestion Stock"
InstallDirRegKey HKLM "Software\GestionStock\Admin" "InstallDir"
RequestExecutionLevel admin
SetCompressor /SOLID lzma

VIProductVersion "${APP_VERSION}.0"
VIAddVersionKey "ProductName" "${APP_NAME}"
VIAddVersionKey "CompanyName" "${APP_PUBLISHER}"
VIAddVersionKey "FileDescription" "Installation de ${APP_NAME}"
VIAddVersionKey "FileVersion" "${APP_VERSION}"
VIAddVersionKey "LegalCopyright" "© GestionStock"

!define MUI_ICON "${ICON_FILE}"
!define MUI_UNICON "${ICON_FILE}"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APP_EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "Lancer ${APP_NAME}"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "French"

Section "Gestion Stock" SEC_APP
  SetShellVarContext all
  SetOutPath "$INSTDIR"
  File /r "${APP_DIR}\*"

  WriteUninstaller "$INSTDIR\Uninstall.exe"

  CreateDirectory "$SMPROGRAMS\GestionStock"
  CreateShortcut "$SMPROGRAMS\GestionStock\${APP_NAME}.lnk" "$INSTDIR\${APP_EXE}" "" "$INSTDIR\${APP_EXE}" 0
  CreateShortcut "$SMPROGRAMS\GestionStock\Désinstaller ${APP_NAME}.lnk" "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\${APP_EXE}" "" "$INSTDIR\${APP_EXE}" 0

  WriteRegStr HKLM "Software\GestionStock\Admin" "InstallDir" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\${APP_EXE}" "" "$INSTDIR\${APP_EXE}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\${APP_EXE}" "Path" "$INSTDIR"

  WriteRegStr HKLM "${APP_REGKEY}" "DisplayName" "${APP_NAME}"
  WriteRegStr HKLM "${APP_REGKEY}" "DisplayIcon" "$INSTDIR\${APP_EXE},0"
  WriteRegStr HKLM "${APP_REGKEY}" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKLM "${APP_REGKEY}" "Publisher" "${APP_PUBLISHER}"
  WriteRegStr HKLM "${APP_REGKEY}" "URLInfoAbout" ""
  WriteRegStr HKLM "${APP_REGKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "${APP_REGKEY}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr HKLM "${APP_REGKEY}" "QuietUninstallString" '"$INSTDIR\Uninstall.exe" /S'
  WriteRegDWORD HKLM "${APP_REGKEY}" "NoModify" 1
  WriteRegDWORD HKLM "${APP_REGKEY}" "NoRepair" 1

  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKLM "${APP_REGKEY}" "EstimatedSize" "$0"
SectionEnd

Section "Uninstall"
  SetShellVarContext all
  Delete "$DESKTOP\${APP_NAME}.lnk"
  Delete "$SMPROGRAMS\GestionStock\${APP_NAME}.lnk"
  Delete "$SMPROGRAMS\GestionStock\Désinstaller ${APP_NAME}.lnk"
  RMDir "$SMPROGRAMS\GestionStock"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKLM "${APP_REGKEY}"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\${APP_EXE}"
  DeleteRegKey HKLM "Software\GestionStock\Admin"
SectionEnd
