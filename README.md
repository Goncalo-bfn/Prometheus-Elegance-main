# Prometheus Elegance — Loja Online & Painel Administrativo

Loja moderna, responsiva e 100% autossuficiente (HTML5, CSS3 e JavaScript puro), com **Painel de Administração integrado**.

Sem dependências de serviços terceiros, sem planilhas externas e sem complicação.

---

## 📁 Estrutura do Projeto

```text
├── assets/
│   └── images/              # Imagens dos produtos, banners e logotipo
├── css/
│   ├── fonts.css            # Tipografia (Montserrat & Playfair Display)
│   ├── site.css             # Estilos da loja
│   └── admin.css            # Estilos do painel administrativo
├── data/
│   └── products.json        # Arquivo de dados dos produtos
├── editor/
│   ├── index.html           # Editor simples do catálogo, sem login
│   └── app.js               # Lógica do editor e importação/exportação JSON
├── js/
│   ├── app.js               # Catálogo da loja, categorias e carrinho WhatsApp
│   └── admin.js             # Lógica do painel admin (cadastro, edição, fotos)
├── admin.html               # Página do Painel Administrativo
├── index.html               # Página principal da loja
├── abrir-editor.bat         # Abre o editor simples no Windows
├── iniciar-servidor.bat     # Atalho para iniciar no Windows com 1 clique
├── server.js                # Servidor Node.js nativo (para publicar na nuvem)
├── server.ps1               # Servidor nativo Windows PowerShell
├── robots.txt               # Configuração para motores de busca
└── README.md                # Este guia
```

---

## 🚀 Como Rodar Localmente no seu Computador

Você tem três opções:

* **Opção 1 (Recomendada para admin):** Dê **duplo clique no arquivo `iniciar-servidor.bat`**.
  Ele inicia o servidor local e abre o painel administrativo automaticamente em `http://localhost:3000/admin.html`.
* **Opção 2 (Sem Node / sem login):** Dê **duplo clique no arquivo `abrir-editor.bat`** ou abra a pasta `editor` e depois `index.html`. Esta tela permite editar o catálogo sem instalar dependências e sem autenticação.
* **Opção 3:** Basta dar duplo clique direto no arquivo `index.html`.

### Editor simples para a equipe/fornecedor

Abra `editor/index.html` no navegador ou use `abrir-editor.bat` no Windows.

- No site publicado no Render, abra `https://SEU-SITE/editor/` e entre com as mesmas credenciais do painel admin na primeira vez. Depois, ao cadastrar ou editar um produto e tocar em **Salvar e publicar**, a mudança é gravada pelo servidor no catálogo do Supabase. Exclusões também são publicadas imediatamente.
- O botão **Ver loja** abre a página da loja para conferir as mudanças.
- Para editar fotos, escolha a imagem do celular/computador; o editor reduz a foto e inclui no catálogo.
- Se abrir o editor como arquivo local/offline, ele não tem acesso ao servidor online: **Salvar produto** atualiza apenas este navegador. Para publicar na loja, acesse o editor pelo endereço online.
- No Render, configure o armazenamento Supabase descrito abaixo para que as alterações do catálogo não se percam quando o serviço reiniciar ou for publicado novamente.

### Persistir alterações no Render com Supabase

O sistema de arquivos do Render é temporário. Para manter o catálogo após reinicializações e novas publicações, conecte o serviço a um projeto Supabase:

1. Crie um projeto no Supabase e abra o **SQL Editor**.
2. Execute este SQL para criar a tabela privada do catálogo:

```sql
create table if not exists public.catalog (
  id integer primary key check (id = 1),
  products jsonb not null
);

alter table public.catalog enable row level security;
revoke all on table public.catalog from anon, authenticated;
grant select, insert, update on table public.catalog to service_role;
```

3. No painel do Supabase, copie a URL do projeto e uma chave secreta (`sb_secret_...` ou a chave `service_role`). A chave publishable (`sb_publishable_...`) não permite gravar com segurança pelo servidor. O servidor envia a chave nova `sb_secret_...` somente no cabeçalho `apikey`; para a chave legada `service_role`, também envia `Authorization: Bearer`.
4. No Render, abra o serviço da loja e configure estas variáveis privadas:
   - `CATALOG_STORAGE` = `supabase`
   - `SUPABASE_URL` = URL do projeto Supabase (ou use `NEXT_PUBLIC_SUPABASE_URL`)
   - `SUPABASE_SECRET_KEY` = chave secreta do Supabase (`sb_secret_...`); também aceita `SUPABASE_SERVICE_ROLE_KEY` para projetos com a chave antiga
   - `ADMIN_USERNAME` = usuário do painel (opcional; padrão `Yan`)
   - `ADMIN_PASSWORD` = nova senha forte do painel (mínimo 12 caracteres)
   - `ADMIN_SESSION_SECRET` = segredo aleatório com pelo menos 32 caracteres
5. Salve e aguarde a nova publicação terminar. O login do painel é validado pelo servidor e o cookie de sessão é `HttpOnly`. A chave secreta do Supabase e os segredos do admin devem ficar apenas nas variáveis privadas do Render; nunca os coloque no HTML ou JavaScript do navegador.

Se a tabela estiver vazia, o primeiro acesso inicializa uma única linha com o catálogo padrão; uma linha existente nunca é substituída durante essa inicialização. Depois disso, o catálogo fica no banco; excluir um produto no painel é o que o remove. A chave publishable e os pacotes `@supabase/supabase-js` / `@supabase/ssr` não são necessários neste projeto, que usa um servidor Node.js simples, sem Next.js, e conecta ao Supabase pelo servidor. O plano gratuito do Supabase tem limites e pode pausar projetos sem atividade, então confira as condições atuais do plano antes de usar em produção.

---

## 🔐 Como Acessar o Painel Administrativo

Acesse pelo navegador:
👉 **`http://localhost:3000/admin.html`** (ou clique no link discreto *"Área Administrativa"* no rodapé da loja).

* **Usuário local padrão:** `Yan`
* **Senha local padrão:** `7519`
* **No Render:** use `ADMIN_USERNAME` e `ADMIN_PASSWORD` configurados nas variáveis privadas do serviço.

### O que você pode fazer no Admin:
1. **Adicionar novos produtos:** Clique em `+ Novo Produto`, preencha o nome, categoria, preço, descrição e selecione a foto direto do seu celular ou computador.
2. **Editar produtos existentes:** Altere nome, preço, categoria ou troque a foto a qualquer momento.
3. **Excluir produtos:** Remova itens que saíram de linha com 1 clique.
4. **Fotos automáticas:** A foto que você enviar é otimizada na hora para carregar com rapidez na loja.

---

## 📱 Configuração do WhatsApp

Para alterar o número de WhatsApp que recebe os pedidos, edite a linha 8 do arquivo `js/app.js`:

```javascript
const WHATSAPP_CONFIG = {
  number: '559889184633', // DDI + DDD + Telefone (somente números)
  display: '(98) 8918-4633',
};
```

---

## 🌐 Como Colocar na Internet

O arquivo `server.js` usa **100% JavaScript nativo do Node**, sem precisar de comandos `npm install` nem pacotes externos.

### Opção 1: Render.com (Gratuito com Admin Gravando no Servidor)
1. Crie uma conta no [render.com](https://render.com).
2. Conecte seu repositório do GitHub.
3. Escolha **Web Service**, selecione o runtime **Node** e coloque no comando de inicialização:  
   `node server.js`
4. Clique em Deploy. Sua loja e o seu admin estarão no ar com domínio próprio e HTTPS gratuito!

### Opção 2: Vercel / Netlify
1. Arraste a pasta do projeto ou conecte ao GitHub.
2. O site e o admin entram no ar imediatamente.
