# Ninho Web

Repositório independente para preparar a versão web do Ninho. Esta entrega contém apenas o ambiente de desenvolvimento e uma tela estática indicando **Ambiente preparado**. Os recursos dos aplicativos ainda não foram portados.

## Desenvolvimento

Use Node.js 22.12 ou superior da linha 22, ou Node.js 24 ou superior, com npm. As versões de React, TypeScript, Vite e do plugin React foram reaproveitadas do ambiente Windows já instalado e estão fixadas no `package.json` e no `package-lock.json`.

```powershell
cd C:\Users\aless\Ninho-Web
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

`check` verifica os tipos de TypeScript. `test` executa os testes de implantação e CSP em Chromium. `build` repete a verificação de tipos e gera a saída estática em `dist`. `preview` permite conferir a compilação localmente.

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

## Limites desta preparação

- Não há cadastro, revisões, cronômetro, importação de arquivos, sincronização, IA, login ou integração com o Estratégia implementados nesta base.
- A futura versão web precisa de adaptações para armazenamento e arquivos selecionados pelo usuário. Ela não deve acessar caminhos privados do Windows nem depender das APIs do Electron.
- A integração da versão iOS com os modelos locais da Apple não está disponível nesta base web. Nenhuma chave de API ou serviço remoto foi configurado.
- A coruja original foi reaproveitada do Ninho. Nenhum PDF ou dado pessoal foi copiado.
- A hospedagem está preparada para GitHub Pages; a configuração do serviço e a primeira publicação dependem do repositório remoto.

Esta tela não tem regras de negócio. Os testes atuais verificam a entrega estática e a política de segurança; testes das funcionalidades de estudo deverão acompanhar a implementação de cada recurso.

## Segurança e validação

A saída de produção inclui CSP que permite scripts, estilos e imagens da própria origem e bloqueia scripts inline, conexões de dados, frames, objetos e alterações da URL base. A política não é aplicada ao servidor de desenvolvimento, que precisa do HMR do Vite. O documento também usa `no-referrer`.

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
