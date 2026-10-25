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
├── js/
│   ├── app.js               # Catálogo da loja, categorias e carrinho WhatsApp
│   └── admin.js             # Lógica do painel admin (cadastro, edição, fotos)
├── admin.html               # Página do Painel Administrativo
├── index.html               # Página principal da loja
├── iniciar-servidor.bat     # Atalho para iniciar no Windows com 1 clique
├── server.js                # Servidor Node.js nativo (para publicar na nuvem)
├── server.ps1               # Servidor nativo Windows PowerShell
├── robots.txt               # Configuração para motores de busca
└── README.md                # Este guia
```

---

## 🚀 Como Rodar Localmente no seu Computador

Você tem duas opções simples:

* **Opção 1 (Recomendada):** Dê **duplo clique no arquivo `iniciar-servidor.bat`**.  
  Ele inicia o servidor local e abre o painel administrativo automaticamente em `http://localhost:3000/admin.html`.
* **Opção 2:** Basta dar duplo clique direto no arquivo `index.html`.

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

3. No painel do Supabase, copie a URL do projeto e a chave `service_role`.
4. No Render, abra o serviço da loja e adicione estas variáveis de ambiente:
   - `CATALOG_STORAGE` = `supabase`
   - `SUPABASE_URL` = URL do projeto Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` = chave `service_role` do Supabase
5. Salve e aguarde a nova publicação terminar. A chave `service_role` deve ficar apenas nas variáveis privadas do Render; nunca a coloque no HTML ou JavaScript do navegador.

O primeiro acesso inicializa a tabela com o catálogo padrão. Depois disso, o catálogo fica no banco; excluir um produto no painel é o que o remove. O plano gratuito do Supabase tem limites e pode pausar projetos sem atividade, então confira as condições atuais do plano antes de usar em produção.

---

## 🔐 Como Acessar o Painel Administrativo

Acesse pelo navegador:
👉 **`http://localhost:3000/admin.html`** (ou clique no link discreto *"Área Administrativa"* no rodapé da loja).

* **Usuário:** `Yan`
* **Senha:** `7519`

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
