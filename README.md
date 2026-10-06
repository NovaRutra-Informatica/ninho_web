# Ninho Web

Versão web leve do Ninho, com uma experiência prática de estudos e a coruja original. Funciona como site estático no GitHub Pages, sem login, servidor de aplicação, telemetria ou modelo de IA.

## O que funciona

- Matérias e temas de estudo, histórico das últimas 50 sessões na tela e histórico completo no backup.
- Temporizador de 1 a 180 minutos, presets e ajuste por controle deslizante; cronômetro, pausa e retomada.
- Sessão em andamento persistida pelo relógio do sistema: recarregar ou mudar de aba não reinicia o tempo. O temporizador para na duração escolhida; o cronômetro tem limite defensivo de sete dias.
- Feedback e anotações ao concluir. A primeira revisão fica em 1, 3 ou 7 dias conforme o feedback, com progressão posterior de 1/3/7/14/30/60 dias. Essas regras são explícitas, sem personalização por IA.
- Banco de questões criado pelo usuário, com quatro alternativas, gabarito, explicação e histórico de acertos/erros.
- Exemplos opcionais para experimentar a interface, com confirmação antes de substituir dados.
- Backup JSON exportável e restauração validada. Uma importação inválida não altera os dados; importações válidas pedem confirmação e deixam a sessão importada pausada.
- Layout responsivo, navegação inferior com vidro em telas pequenas e temporizador no menu principal.

Os dados ficam em `localStorage`, na chave versionada `ninho-web:v1`, separados do cache do aplicativo. Não são compartilhados com os aplicativos nativos nem sincronizados entre dispositivos. Exporte backups periodicamente: apagar dados do site ou usar navegação privada pode remover o histórico. Quando o armazenamento fica cheio ou bloqueado, a interface mostra um aviso e mantém as alterações em memória para exportação. Dados corrompidos são preservados para download de recuperação.

Em produção HTTPS (ou localhost), um service worker guarda o aplicativo após a primeira visita completa e permite reabri-lo offline no mesmo endereço/navegador. Cada build cria um cache identificado pelo conteúdo; a atualização remove apenas caches anteriores do Ninho naquele caminho, nunca `localStorage`. Restrições do navegador podem impedir cache offline. O navegador verifica atualizações do shell em novas visitas; nenhum dado pessoal entra nesse cache. O servidor de desenvolvimento não registra service worker.

## Desenvolvimento

Use Node.js 22.12 ou superior da linha 22, ou Node.js 24 ou superior, com npm. As versões de React, TypeScript, Vite e do plugin React foram reaproveitadas do ambiente Windows já instalado e estão fixadas no `package.json` e no `package-lock.json`.

```powershell
cd C:\Users\aless\WebstormProjects\Ninho-Web
npm ci
npm run dev
```

Abra o endereço local mostrado pelo Vite, normalmente `http://127.0.0.1:5173`. O servidor fica acessível somente neste computador. Não há servidor de desenvolvimento iniciado automaticamente.

```powershell
npm run check
npx --no-install playwright install chromium
npm test
npm run build
npm run preview
```

`check` verifica os tipos de TypeScript. `test` executa os testes de implantação, CSP, offline e fluxos de estudo em Chromium headless. `build` repete a verificação de tipos e gera a saída estática em `dist`. `preview` permite conferir a compilação localmente.

## GitHub Pages

O workflow `.github/workflows/deploy-pages.yml` publica automaticamente quando houver um push na branch `prod`. Ele instala as dependências pelo lockfile, audita os pacotes, executa os testes, compila `dist` e entrega esse artefato ao GitHub Pages. Falhas na auditoria, nos testes ou na compilação impedem a publicação.

No repositório do GitHub:

1. Abra **Settings → Pages → Build and deployment → Source** e escolha **GitHub Actions**.
2. Se o ambiente `github-pages` restringir branches de implantação, permita `prod` em **Settings → Environments → github-pages**.
3. Inclua o workflow e os fontes na branch `prod` e envie essa branch. A execução aparecerá na aba **Actions**, com o endereço publicado ao concluir.

O caminho é obtido de `actions/configure-pages`, sem fixar nome de usuário ou repositório no código. Isso contempla `usuario.github.io/repositorio/`, sites na raiz e domínios próprios configurados no Pages. Para testar um caminho de projeto localmente:

```powershell
$env:PAGES_BASE_PATH = '/ninho_web'
npm run build
npm run preview
```

Nesse exemplo, abra `http://127.0.0.1:4173/ninho_web/`. Para voltar à raiz no mesmo terminal:

```powershell
Remove-Item Env:PAGES_BASE_PATH
npm run build
```

A escrita no Pages e o token OIDC ficam restritos ao job de deploy; a instalação e os testes têm somente permissões de leitura. As Actions oficiais estão fixadas por SHA. A publicação em andamento termina antes da próxima, evitando interromper uma entrega.

O workflow foi preparado e validado localmente. Nenhum push, execução remota ou publicação foi realizado nesta alteração. [Vite no GitHub Pages](https://vite.dev/guide/static-deploy#github-pages), [workflows do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Limites da versão web

- Não há login, sincronização, análise de PDFs, IA, importação de bancos externos de questões nem integração com o Estratégia. O backup JSON abrange os dados criados nesta versão.
- O site não acessa caminhos privados do Windows e não depende de APIs do Electron.
- A integração da versão iOS com modelos locais da Apple não faz parte da versão web. Nenhuma chave de API ou serviço remoto foi configurado.
- A coruja original foi reaproveitada do Ninho. Nenhum PDF ou dado pessoal foi copiado.
- A hospedagem está preparada para GitHub Pages; a configuração do serviço e a primeira publicação dependem do repositório remoto.

Os testes cobrem sessão e feedback, relógio após recarga e pausa, cronômetro, questões e respostas, progressão da revisão, exportação/restauração, corrupção/quota de armazenamento, responsividade e reabertura offline nos três caminhos de hospedagem. As capturas geradas por testes ficam em `test-results` e não são versionadas.

## Segurança e validação

A saída de produção inclui CSP que permite scripts, estilos, imagens e service worker da própria origem e bloqueia scripts inline, conexões externas, frames, objetos e alterações da URL base. As conexões da própria origem atendem ao cache offline; o aplicativo não envia os dados de estudo. A política não é aplicada ao servidor de desenvolvimento, que precisa do HMR do Vite. O documento também usa `no-referrer`.

Em 22/09/2026, a implementação dos recursos de estudo passou no TypeScript, build e 19 testes Chromium headless. O bundle principal de produção tem cerca de 79 kB gzip, sem fontes, bibliotecas gráficas ou IA baixadas de serviços externos. Nenhum commit, push ou deploy foi realizado.

Em 15/09/2026, `npm audit` incluindo desenvolvimento encontrou **0 vulnerabilidades conhecidas em 53 dependências**. TypeScript, build, actionlint 1.7.12 e os **7 testes Chromium** passaram. Os testes constroem a aplicação na raiz e em dois subdiretórios, verificam assets por HTTP e exercitam o bloqueio de conteúdo pela CSP no navegador. A auditoria consulta os avisos publicados no registro npm; isso não prova ausência de falhas desconhecidas.

Essa contagem cobre o lockfile do aplicativo, não as bibliotecas internas das GitHub Actions. A versão oficial mais recente de `actions/checkout` conferida nesta data, 7.0.1, ainda contém `undici` 6.27.0, com três avisos publicados: [retry/proxy](https://github.com/advisories/GHSA-8xcm-r25x-g524), [corpo semelhante a Blob](https://github.com/advisories/GHSA-m8rv-5g2x-5cg5) e [atributos de cookie](https://github.com/advisories/GHSA-v3r7-h72x-cjcm). A exploração desses caminhos no checkout não foi demonstrada nesta revisão. Os SHAs fixos e as permissões reduzidas limitam alterações e acesso, mas não corrigem essas dependências internas; uma versão oficial corrigida deverá substituir o pin quando disponível.

Também foram encontrados avisos nos lockfiles públicos das demais Actions. O relatório `security/actions-audit.json` registra os pacotes, versões, SHAs e identificadores dos avisos. A tabela conta combinações pacote/versão com correspondência no OSV, **não falhas exploráveis confirmadas no workflow**:

| Action auditada | Combinações com avisos |
| --- | ---: |
| checkout 7.0.1 | 1 |
| setup-node 7.0.0 | 3 |
| configure-pages 6.0.0 | 5 |
| deploy-pages 5.0.1 | 20 |
| upload-artifact 7.0.0, usado internamente por upload-pages-artifact 5.0.0 | 7 |

As Actions não entram no JavaScript entregue aos usuários do site, mas fazem parte da cadeia de publicação. Os pacotes internos e seus bundles oficiais não foram modificados. O pipeline permanece preparado, com essas pendências documentadas para atualização das Actions pelos mantenedores; ele não foi executado remotamente.

O arquivo `.github/dependabot.yml` prepara propostas semanais de atualização de npm e GitHub Actions, sem fusão automática. Ele terá efeito após ser publicado na branch padrão do repositório e o serviço estar disponível no GitHub.

GitHub Pages hospeda arquivos estáticos, sem servidor da aplicação para definir cabeçalhos HTTP personalizados. `frame-ancestors`, por exemplo, não funciona em CSP via meta e não foi incluído como uma proteção fictícia. As regras precisarão acompanhar os recursos futuros de arquivos, rede e IA. [CSP via meta](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP), [limite de frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors).

## Git e arquivos locais

Revise e versione os fontes, o lockfile e o workflow. Commits, staging, branches, remotos e publicação ficam sob seu controle.

O `.gitignore` exclui dependências, compilação, relatórios, variáveis de ambiente, credenciais comuns, bancos de dados e materiais pessoais. O `package-lock.json` deve ser versionado. Não é necessário criar `.env` para executar esta base; se houver configuração pública futuramente, não coloque segredos em variáveis `VITE_*`, pois elas são incluídas no código entregue ao navegador.

## Meu perfil, boas-vindas e tutoriais

Na primeira abertura, a coruja conduz dez conversas curtas em uma tela própria, sem sidebar: nome; objetivo; motivação e prazo; matérias; ponto de partida; rotina; dias e horário; minutos e blocos de foco; preferências e dificuldades; adaptações e resumo. O mascote original reage a cada etapa, com balões e transições que respeitam a redução de animações. As fontes DM Sans e Fraunces são incluídas localmente, com suas licenças, sem baixar recursos externos. As respostas são salvas enquanto são preenchidas no mesmo armazenamento local dos estudos e entram no backup JSON. A etapa é retomada ao reabrir o navegador; o perfil só fica concluído na confirmação final. Se o navegador recusar a gravação, o cadastro oferece **Baixar cópia** para preservar o rascunho e não libera a conclusão silenciosamente. O botão **Meu perfil**, no topo, permite editá-las. Dados anteriores sem perfil continuam abrindo normalmente.

Esta versão não chama modelos de IA nem simula a geração de um plano. Ao terminar o questionário, apresenta o resumo salvo e orienta o primeiro estudo. Tutoriais aparecem na primeira visita a cada tela disponível; **Como funciona** repete o tutorial atual e o perfil permite reabrir todos. Em **Seus dados**, tema claro/escuro/sistema e redução de animações são salvos automaticamente.

Verificação: `npm run build` e os 25 testes Playwright passaram, incluindo onboarding em desktop/celular, edição e recarga do perfil, backup, tutorial por tela, tema persistente, funcionamento offline nos três caminhos de publicação do GitHub Pages, armazenamento corrompido/quota e sincronização entre abas. Não há dependência nova nem recursos de IA no bundle.


O painel também apresenta **O que ficou registrado**: sessões, minutos e dias nos últimos 28 dias, respostas corretas/tentativas/questões distintas e revisões com data prevista até agora. É um resumo descritivo dos dados, sem modelo, personalização por IA, porcentagem de domínio ou inferência de atenção. Repetições contam como novas tentativas e registros futuros ficam fora da amostra. Esta versão não adiciona rastreamento de uso de outras aplicações nem coleta de navegação.

## Paridade de interação com os aplicativos

As correções de interação seguem a versão iOS `0f92bf3`. O site mantém uma única navegação responsiva. Os tutoriais de cada tela aparecem em um diálogo central com **Ver depois** e **Próximo/Entendi**, bloqueiam toques e teclado nos controles de fundo e podem ser repetidos por **Como funciona**. O conteúdo rola em telas pequenas; a conclusão só fecha o diálogo depois de ser gravada. Se o armazenamento falhar, a mensagem permanece no tutorial e permite tentar novamente.

O foguinho ao lado do perfil abre o calendário dos dias estudados e sempre mostra a contagem, inclusive zero. Sessões concluídas com tempo positivo, revisões registradas e questões respondidas contam como estudo; a resposta não precisa estar correta. Registros futuros não contam. A sequência de ontem permanece até hoje, mas a chama fica cinza até existir uma atividade válida no dia atual. A passagem de dias usa o calendário local, inclusive no horário de verão. O calendário permite consultar meses anteriores, sem avançar além do mês atual. Revisões novas conservam seu histórico de datas no backup; arquivos antigos podem conter apenas a última revisão de cada tema.

**Sons de navegação**, em **Seus dados**, começa desligado. Quando ativado, usa um tom discreto de 720 Hz por 70 ms, com intervalo mínimo de 140 ms e sem sobreposição, em menus, ajuda, tutoriais e calendário. Salvamentos automáticos de preferências ficam silenciosos. O navegador pode impedir áudio; isso não impede a ação. O contexto de áudio é liberado após breve ociosidade, ao ocultar a aba ou desligar o som. As transições de telas, etapas, calendário e mascote respeitam tanto a preferência de redução de animações do site quanto a do sistema.

A restauração manual validada só anuncia sucesso depois de gravar o backup no navegador. Uma falha de gravação conserva a coleção atual, mantém a confirmação aberta e permite nova tentativa. Esta versão continua sendo um site estático para GitHub Pages: **não inclui personalização por IA, modelos locais, backup diário nativo, iCloud ou sincronização entre aparelhos**. Backups continuam sendo arquivos JSON exportados pelo usuário.

Os testes de interação cobrem centralização em 1280×900 e 390×844, rolagem em 320×300, bloqueio de fundo e teclado, redução de animações, falhas de persistência, sequência e calendário, revisões e questões, preservação na restauração e som opcional. As capturas de interface usam um perfil sintético e ficam em `test-results`.

O histórico de revisões respeita o limite validado dos backups. Ao chegar a 20 mil registros, revisões repetidas no mesmo dia local podem ser reunidas, conservando todos os dias estudados. Se ainda houver mais de 20 mil dias distintos, a revisão não substitui os dados e apresenta um erro persistente; nunca grava um arquivo que o próprio leitor recusaria.

Validação local: a suíte completa de 36 testes Playwright passou, incluindo os 11 testes de interação e dois casos no limite de histórico. A verificação de tipos e a compilação também passaram. O JavaScript principal de produção ficou em aproximadamente 88,6 kB gzip, sem dependência nova para estes recursos. Nenhum commit, push ou deploy foi realizado nesta atualização de paridade.

## Desempenho e testes de carga

As listas de matérias e revisões mostram até 48 itens por página, com pesquisa na coleção completa. Seletores com mais de 100 matérias permitem pesquisa e paginação de todos os resultados em grupos de 100, mantendo a seleção disponível ao mudar de página. Isso inclui nomes exatos após muitos prefixos e matérias importadas com nomes idênticos. Isso limita o trabalho da interface sem remover registros do armazenamento ou do backup. Totais por matéria são calculados em uma passagem; vínculos entre respostas e questões usam um índice. As informações derivadas são reaproveitadas entre renderizações e o relógio de foco não recalcula todo o histórico a cada segundo.

Em 23/09/2026, o teste headless usou Chromium 153.0.8010.12, Windows, 24 processadores lógicos informados pelo navegador, janela de 1280×900 e dados sintéticos iguais antes/depois: 71, 1.000 e 5.000 itens **em cada** coleção de matérias, sessões, revisões, questões e respostas. Foram três passagens pelas cinco telas por cenário. A coluna final inclui a revisão de segurança das gravações e dos seletores (`after-review`). Medianas em milissegundos:

| Itens por coleção | Abrir matérias: antes → depois | Abrir revisões: antes → depois | Validar backup: antes → depois | Elementos na tela de matérias: antes → depois |
| --- | ---: | ---: | ---: | ---: |
| 71 | 29,7 → 29,1 | 29,3 → 21,9 | 0,2 → 0,1 | 1.129 → 929 |
| 1.000 | 131,8 → 27,6 | 148,5 → 20,6 | 5,1 → 0,9 | 9.490 → 929 |
| 5.000 | 815,1 → 28,9 | 797,6 → 22,2 | 35,2 → 5,4 | 45.490 → 929 |

No cenário de 5.000 itens, a derivação dos totais por matéria caiu de 66 para 0,3 ms; uma alteração de duração salva caiu de 146,3 para 34,3 ms (uma amostra por execução, não uma mediana). As tarefas do navegador acima de 50 ms passaram de 32 para zero nesse ensaio. A memória JavaScript observada ao final, antes de forçar coleta, foi de 268,24 para 11,66 MiB; após coleta forçada, de 13,75 para 10,97 MiB. Isso mede o heap JavaScript naquele instante, não o pico nem a memória total do navegador, e sofre influência da coleta automática.

Antes da revisão final das gravações, um ensaio adicional de 100 navegações com as cinco coleções de 5.000 itens passou: medianas de 28,8 ms para matérias e 20,9 ms para revisões, zero tarefas acima de 50 ms observadas e 11,05 MiB de heap retido após coleta. A carga continua completa: 25.000 registros e aproximadamente 2,66 MB de JSON. Os testes verificam que edição, pesquisa, paginação, seleção fora da primeira página e salvamento mantêm as quantidades e vínculos válidos.

Os tempos de navegação incluem dois frames de apresentação; não são INP nem uma garantia em outros aparelhos. A interface medida é de produção, enquanto os microtestes dos algoritmos importam os mesmos módulos TypeScript pelo servidor local do Vite. Amostras abaixo de 1 ms têm resolução limitada. O computador não foi isolado de outros processos e não houve limitação artificial de CPU. Os testes não usam limites temporais apertados como critério de CI, não transmitem dados e não adicionam monitoramento ao aplicativo.

Para reproduzir as três cargas e guardar medições em `.cache/performance`:

```powershell
$env:NINHO_PERFORMANCE = '1'
$env:NINHO_PERFORMANCE_LABEL = 'minha-medicao'
bun run test tests/performance.spec.ts
```

Para repetir o ensaio de 100 navegações:

```powershell
$env:NINHO_PERFORMANCE_ROUNDS = '20'
$env:NINHO_PERFORMANCE_SIZES = '5000'
$env:NINHO_PERFORMANCE_LABEL = 'carga-repetida'
bun run test tests/performance.spec.ts
Remove-Item Env:NINHO_PERFORMANCE, Env:NINHO_PERFORMANCE_LABEL, Env:NINHO_PERFORMANCE_ROUNDS, Env:NINHO_PERFORMANCE_SIZES
```

Toda alteração é serializada e validada pelo mesmo leitor de backups antes de substituir o armazenamento ou o estado em memória. Uma coleção acima de 20 mil registros é recusada com mensagem visível, mantendo os dados anteriores, o formulário e o tempo da sessão. Não há descarte de registros para liberar espaço. Se os dados forem válidos mas a quota do navegador falhar, o modo em memória continua disponível com aviso e exportação; ações que exigem persistência, como concluir o tutorial ou restaurar um backup, continuam abertas até salvar.

Essa verificação adiciona trabalho deliberado a cada gravação. A amostra final de alterar a duração, incluindo serializar, validar e gravar o estado completo mais dois frames, foi de 29,4 ms com 71 itens, 29,2 ms com 1.000 e 34,3 ms com 5.000 por coleção. No cenário maior, eram 32,7 ms após a otimização inicial e 146,3 ms na linha de base. São amostras únicas sujeitas a variação, não medianas nem uma medição isolada de I/O. A repetição final das três cargas não observou tarefas acima de 50 ms.

Os resultados locais de referência são `baseline-71.json`, `baseline-1000.json`, `baseline-5000.json`, os correspondentes `after-*.json`, `stress-5000.json` e os três `after-review-*.json`. As medições anteriores foram preservadas. Cada arquivo inclui as amostras, tarefas longas, contagens de DOM e métricas do navegador. A suíte completa com as cargas ativadas passou em **48 testes** (43,2 s): 45 funcionais e três perfis de carga. Inclui seis regressões da revisão: acesso ao último nome duplicado e limites de matérias, questões, respostas, sessões e revisões; todas confirmam que os dados recusados não chegam ao armazenamento e continuam reabríveis. Sem `NINHO_PERFORMANCE=1`, somente os três perfis são omitidos. TypeScript e build passaram; JavaScript de produção: **89,86 kB gzip**, sem nova dependência. Nenhum commit, push ou deploy foi realizado.
