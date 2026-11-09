export const MACOS_TCC_KEY_OVERRIDES = {
  'auto.hooks.useMacosTccPromptNotice.title': {
    es: '¿Ves avisos de “Coding Agent 2 quiere acceder…”?',
    ja: '「Coding Agent 2 がアクセスしようとしています…」という確認が表示されますか？',
    ko: '“Coding Agent 2에서 접근하려고 합니다…” 권한 요청이 표시되나요?',
    zh: '看到“Coding Agent 2 想要访问…”提示？'
  },
  'auto.hooks.useMacosTccPromptNotice.description': {
    es: 'Los mensajes de permisos de macOS pueden aparecer cuando un agente o una herramienta de terminal que se ejecuta en Coding Agent 2 intenta acceder a archivos protegidos. Concede acceso total al disco en Ajustes para reducir estos avisos.',
    ja: 'Coding Agent 2 で実行中のエージェントやターミナルツールが保護されたファイルにアクセスしようとすると、macOS の権限メッセージが表示されることがあります。これらの確認を減らすには、設定でフルディスクアクセスを許可してください。',
    ko: 'Coding Agent 2에서 실행 중인 에이전트나 터미널 도구가 보호된 파일에 접근하려고 하면 macOS 권한 메시지가 표시될 수 있습니다. 이러한 요청을 줄이려면 설정에서 전체 디스크 접근 권한을 허용하세요.',
    zh: '当 Coding Agent 2 中运行的智能体或终端工具尝试访问受保护的文件时，macOS 可能会显示权限信息。请在“设置”中授予“完全磁盘访问权限”，以减少此类提示。'
  },
  'auto.components.settings.DeveloperPermissionsPane.7ca17b62c8': {
    es: 'Cuando los agentes que ejecuta Coding Agent 2 leen datos de otras apps, macOS muestra el nombre de Coding Agent 2 porque es el proceso responsable de los comandos de terminal. Concede este permiso a Coding Agent 2 para reducir esos avisos. Después, cierra y vuelve a abrir Coding Agent 2.',
    ja: 'Coding Agent 2 が実行するエージェントがほかのアプリのデータを読み取ると、ターミナルコマンドの実行元プロセスである Coding Agent 2 の名前が macOS に表示されます。これらの確認を減らすには、Coding Agent 2 にこの権限を許可してください。その後、Coding Agent 2 を終了して再度開いてください。',
    ko: 'Coding Agent 2가 실행하는 에이전트가 다른 앱의 데이터를 읽으면, macOS는 터미널 명령을 실행하는 프로세스인 Coding Agent 2를 표시합니다. 이러한 요청을 줄이려면 Coding Agent 2에 이 권한을 허용하세요. 그런 다음 Coding Agent 2를 종료했다가 다시 여세요.',
    zh: '当 Coding Agent 2 运行的智能体读取其他应用的数据时，macOS 会显示 Coding Agent 2，因为 Coding Agent 2 是执行终端命令的进程。请为 Coding Agent 2 授予此权限，以减少此类提示。然后退出并重新打开 Coding Agent 2。'
  },
  'auto.components.settings.DeveloperPermissionsPane.c566bca278': {
    ko: '전체 디스크 접근 권한',
    zh: '完全磁盘访问权限'
  }
}
