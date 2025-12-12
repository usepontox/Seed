; Deep PDV - Inno Setup Script
; Cria um instalador profissional para Windows

#define MyAppName "Deep PDV"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Alpha 7 Software Solutions"
#define MyAppURL "https://deeppdvs.com.br"
#define MyAppExeName "Deep PDV.exe"
#define SourceFolder "dist-electron\Deep PDV-win32-x64"

[Setup]
; Informações básicas
AppId={{A7B8C9D0-E1F2-4A5B-8C9D-0E1F2A3B4C5D}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}

; Diretórios
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes

; Saída
OutputDir=dist-electron
OutputBaseFilename=Deep-PDV-Setup-{#MyAppVersion}

; Compressão
Compression=lzma2/max
SolidCompression=yes

; Privilégios
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog

; Visual
WizardStyle=modern
; SetupIconFile=build\icon.ico
; UninstallDisplayIcon={app}\{#MyAppExeName}

; Idioma
ShowLanguageDialog=no

; Arquitetura
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Tasks]
Name: "desktopicon"; Description: "Criar atalho na Área de Trabalho"; GroupDescription: "Atalhos:"; Flags: unchecked
Name: "quicklaunchicon"; Description: "Criar atalho na Barra de Tarefas"; GroupDescription: "Atalhos:"; Flags: unchecked

[Files]
; Copiar todos os arquivos da aplicação
Source: "{#SourceFolder}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; Atalho no Menu Iniciar
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Desinstalar {#MyAppName}"; Filename: "{uninstallexe}"

; Atalho na Área de Trabalho
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

; Atalho na Barra de Tarefas (Windows 7+)
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: quicklaunchicon

[Run]
; Executar após instalação
Filename: "{app}\{#MyAppExeName}"; Description: "Executar {#MyAppName}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; Limpar arquivos de configuração ao desinstalar
Type: filesandordirs; Name: "{userappdata}\{#MyAppName}"

[Code]
// Verificar se já existe instalação anterior
function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
  UninstallString: String;
begin
  Result := True;
  
  // Verificar se já está instalado
  if RegQueryStringValue(HKLM, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#SetupSetting("AppId")}_is1', 
                         'UninstallString', UninstallString) then
  begin
    if MsgBox('Uma versão anterior do {#MyAppName} foi detectada. Deseja desinstalar antes de continuar?', 
              mbConfirmation, MB_YESNO) = IDYES then
    begin
      Exec(RemoveQuotes(UninstallString), '/SILENT', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    end
    else
    begin
      Result := False;
    end;
  end;
end;

// Mensagem de boas-vindas personalizada
procedure InitializeWizard();
begin
  WizardForm.WelcomeLabel2.Caption := 
    'Este assistente irá instalar o {#MyAppName} em seu computador.' + #13#10 + #13#10 +
    'Sistema completo de gestão comercial com PDV, controle de estoque, ' +
    'financeiro e emissão de NFC-e.' + #13#10 + #13#10 +
    'Clique em Avançar para continuar.';
end;
