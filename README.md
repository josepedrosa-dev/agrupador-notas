# ⚡ Agrupador Inteligente de Notas Geográficas (Ordens de Serviço)

Uma ferramenta web monopágina (SPA) de alto desempenho para planejamento, otimização e distribuição de ordens de serviço (notas) por equipes em campo. Desenvolvida sob demanda para resolver problemas complexos de roteamento e restrições de capacidade com base em coordenadas GPS.

---

## 🌟 Principais Recursos

*   **Motor Geográfico Robusto (Haversine):** Cálculo exato da distância em metros entre os pontos de serviço na superfície terrestre.
*   **Número Fixo de Equipes:** Posicionamento estratégico e inteligente de sementes operacionais (centróides iniciais via K-Means simplificado) distribuindo as notas uniformemente entre o número configurado de equipes.
*   **Controle de Cotas por Tipo de Nota:** Permite configurar a composição ideal para cada equipe (ex: 4 MDFC e 2 ALGC).
*   **Mecanismo Inteligente de Fallback (Substituição):** Caso faltem notas do tipo desejado dentro do raio de ação de uma equipe, o sistema preenche as vagas automaticamente com outros tipos de notas disponíveis na região.
*   **Limitador Rígido de Raio:** Caso a densidade local de notas de qualquer tipo não atenda à capacidade total da equipe dentro do raio máximo, ela é preservada com a quantidade exata de notas disponíveis, disparando alertas informativos.
*   **Otimização de Rotas (Roteamento TSP Local):** Resolução do problema do Caixeiro Viajante (Traveling Salesman Problem) para as notas de cada equipe através da heurística do *Vizinho Mais Próximo*, organizando e desenhando o trajeto de execução ótimo de 1 a N.
*   **Ajuste Manual Interativo (Override):** Permite transferir manualmente qualquer nota de uma equipe para outra com um único clique diretamente na tabela de detalhes. O mapa, centróides e as rotas são recalculados instantaneamente!
*   **Exportação Estruturada:** Download do planejamento logístico em um arquivo CSV estruturado pronto para planilhas (Excel/Google Sheets) com ordens, sequenciamento e distâncias calculadas.

---

## 🚀 Como Executar Localmente

Como o projeto foi projetado com arquitetura estática leve (**HTML5, Vanilla CSS e Vanilla JS**), ele não possui dependências de servidor e roda 100% no navegador.

1.  Clone este repositório ou baixe os arquivos em seu computador.
2.  Abra o arquivo `index.html` diretamente em qualquer navegador moderno.
3.  *Opcional (Recomendado):* Caso prefira rodar um servidor de desenvolvimento local, execute no terminal da pasta do projeto:
    ```bash
    # Se tiver Python instalado
    python -m http.server 8000
    
    # Ou se tiver Node.js instalado
    npx serve .
    ```
    Depois, acesse `http://localhost:8000` ou a porta gerada no navegador.

---

## 📦 Como Publicar no GitHub e Fazer Deploy Grátis (GitHub Pages)

Siga os passos abaixo para publicar seu projeto e disponibilizá-lo para uso em qualquer dispositivo através do **GitHub Pages** (totalmente grátis e sem necessidade de servidores).

### Passo 1: Inicializar o Repositório e Enviar para o GitHub

1.  Abra o seu terminal na pasta do projeto e inicialize o Git:
    ```bash
    git init
    ```
2.  Adicione todos os arquivos do projeto (HTML, CSS, JS, README e o CSV de amostra):
    ```bash
    git add .
    ```
3.  Crie o seu primeiro commit:
    ```bash
    git commit -m "feat: release inicial do agrupador de notas geograficas"
    ```
4.  Crie um novo repositório no seu [GitHub](https://github.com/) (ex: `agrupador-notas-geograficas`). **Não** adicione README ou licenças automáticas pelo site.
5.  Associe o repositório local ao GitHub e envie os arquivos (substitua pelo seu link do GitHub):
    ```bash
    git branch -M main
    git remote add origin https://github.com/SEU-USUARIO/NOME-DO-REPOSITORIO.git
    git push -u origin main
    ```

### Passo 2: Ativar o Deploy Grátis no GitHub Pages

O **GitHub Pages** é a melhor plataforma para hospedar sites estáticos de graça. Ele lê os arquivos HTML/CSS/JS do seu repositório e gera um link público seguro (HTTPS).

1.  Acesse o seu repositório na interface web do GitHub.
2.  Clique na aba **Settings** (Configurações) no topo.
3.  No menu lateral esquerdo, clique em **Pages** (dentro da seção *Code and automation*).
4.  Na seção **Build and deployment**:
    *   **Source:** Selecione *Deploy from a branch*.
    *   **Branch:** Clique em *None*, altere para **main** (e mantenha a pasta como `/ (root)`).
    *   Clique no botão **Save** (Salvar).
5.  Aguarde cerca de 1 a 2 minutos. O GitHub gerará uma caixa no topo da tela com o link público definitivo, como:
    `👉 https://seu-usuario.github.io/nome-do-repositorio/`

Pronto! Qualquer pessoa poderá acessar e utilizar a ferramenta diretamente por este link no celular, tablet ou computador.

---

## 🛠️ Tecnologias Utilizadas

*   [Leaflet.js v1.9.4](https://leafletjs.com/) - Visualização cartográfica interativa de alto desempenho.
*   [OpenStreetMap](https://www.openstreetmap.org/) - Camadas de mapas globais livres.
*   Google Fonts - Outfit & Plus Jakarta Sans.
*   Vanilla Javascript (ES6+) & Vanilla CSS (Layouts Grid, Flexbox e Glassmorphism).
