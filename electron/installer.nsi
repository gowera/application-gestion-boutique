Unicode true
Name "CONETEC Admin"
OutFile "${OUTPUT_FILE}"
InstallDir "$LOCALAPPDATA\CONETEC Admin"
RequestExecutionLevel user
Icon "${ICON_FILE}"
UninstallIcon "${ICON_FILE}"
SetCompressor /SOLID lzma

Page directory
Page instfiles
UninstPage uninstConfirm
UninstPage instfiles

Section "CONETEC Admin" SEC_APP
  SetOutPath "$INSTDIR"
  File /r "${APP_DIR}\*"
  WriteUninstaller "$INSTDIR\Désinstaller CONETEC.exe"
  CreateDirectory "$SMPROGRAMS\CONETEC"
  CreateShortcut "$DESKTOP\CONETEC Admin.lnk" "$INSTDIR\CONETEC.exe" "" "$INSTDIR\CONETEC.exe" 0
  CreateShortcut "$SMPROGRAMS\CONETEC\CONETEC Admin.lnk" "$INSTDIR\CONETEC.exe" "" "$INSTDIR\CONETEC.exe" 0
  CreateShortcut "$SMPROGRAMS\CONETEC\Désinstaller CONETEC.lnk" "$INSTDIR\Désinstaller CONETEC.exe"
SectionEnd

Section "Uninstall"
  Delete "$DESKTOP\CONETEC Admin.lnk"
  Delete "$SMPROGRAMS\CONETEC\CONETEC Admin.lnk"
  Delete "$SMPROGRAMS\CONETEC\Désinstaller CONETEC.lnk"
  RMDir "$SMPROGRAMS\CONETEC"
  RMDir /r "$INSTDIR"
SectionEnd