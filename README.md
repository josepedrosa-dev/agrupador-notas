# * Agrupador Inteligente de Notas Geograficas (Ordens de Servico)

Uma ferramenta web monopagina (SPA) de alto desempenho para planejamento, otimizacao e distribuicao de ordens de servico (notas) por equipes em campo. Desenvolvida sob demanda para resolver problemas complexos de roteamento e restricoes de capacidade com base em coordenadas GPS.

---

##  Principais Recursos

*   **Motor Geografico Robusto (Haversine):** Calculo exato da distancia em metros entre os pontos de servico na superficie terrestre.
*   **Numero de Equipes Configurado:** O usuario define quantas equipes deseja. O sistema cria exatamente esse numero, salvo quando o total de notas e inferior a quantidade de equipes - nesse caso, o numero e reduzido automaticamente e um **aviso laranja** e exibido. Em todos os outros cenarios, o numero de equipes permanece fixo e notas excedentes ficam na lista *"Nao Atribuidas"* para ajuste manual.
*   **Controle de Cotas por Tipo de Nota:** Permite configurar a composicao ideal para cada equipe (ex: 4 MDFC e 2 ALGC).
*   **Mecanismo Inteligente de Fallback (Substituicao):** Caso faltem notas do tipo desejado dentro do raio de acao de uma equipe, o sistema preenche as vagas automaticamente com outros tipos de notas disponiveis na regiao.
*   **Limitador Rigido de Raio:** Caso a densidade local de notas de qualquer tipo nao atenda a capacidade total da equipe dentro do raio maximo, ela e preservada com a quantidade exata de notas disponiveis, disparando alertas informativos.
*   **Otimizacao de Rotas (Roteamento TSP Local):** Resolucao do problema do Caixeiro Viajante (Traveling Salesman Problem) para as notas de cada equipe atraves da heuristica do *Vizinho Mais Proximo*, organizando e desenhando o trajeto de execucao otimo de 1 a N.
*   **Ajuste Manual Interativo (Override):** Permite transferir manualmente qualquer nota de uma equipe para outra com um unico clique diretamente na tabela de detalhes. O mapa, centroides e as rotas sao recalculados instantaneamente!
*   **Exportacao Estruturada:** Download do planejamento logistico em um arquivo CSV estruturado pronto para planilhas (Excel/Google Sheets) com ordens, sequenciamento e distancias calculadas.
*   **Campo `tecnico` Opcional:** Notas sem tecnico definido (coluna vazia ou ausente) aparecem como grupo **" (Sem Tecnico)"** no seletor e sao agrupadas automaticamente pela proximidade geografica, preenchendo equipes por distancia. O desempate quando dois centroides estao sobrepostos sempre favorece a equipe com **menor numero de notas**.

---

##  Como Executar Localmente

Como o projeto foi projetado com arquitetura estatica leve (**HTML5, Vanilla CSS e Vanilla JS**), ele nao possui dependencias de servidor e roda 100% no navegador.

1.  Clone este repositorio ou baixe os arquivos em seu computador.
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

##  Como Publicar no GitHub e Fazer Deploy Gratis (GitHub Pages)

Siga os passos abaixo para publicar seu projeto e disponibiliza-lo para uso em qualquer dispositivo atraves do **GitHub Pages** (totalmente gratis e sem necessidade de servidores).

### Passo 1: Inicializar o Repositorio e Enviar para o GitHub

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
4.  Crie um novo repositorio no seu [GitHub](https://github.com/) (ex: `agrupador-notas-geograficas`). **Nao** adicione README ou licencas automaticas pelo site.
5.  Associe o repositorio local ao GitHub e envie os arquivos (substitua pelo seu link do GitHub):
    ```bash
    git branch -M main
    git remote add origin https://github.com/SEU-USUARIO/NOME-DO-REPOSITORIO.git
    git push -u origin main
    ```

### Passo 2: Ativar o Deploy Gratis no GitHub Pages

O **GitHub Pages** e a melhor plataforma para hospedar sites estaticos de graca. Ele le os arquivos HTML/CSS/JS do seu repositorio e gera um link publico seguro (HTTPS).

1.  Acesse o seu repositorio na interface web do GitHub.
2.  Clique na aba **Settings** (Configuracoes) no topo.
3.  No menu lateral esquerdo, clique em **Pages** (dentro da secao *Code and automation*).
4.  Na secao **Build and deployment**:
    *   **Source:** Selecione *Deploy from a branch*.
    *   **Branch:** Clique em *None*, altere para **main** (e mantenha a pasta como `/ (root)`).
    *   Clique no botao **Save** (Salvar).
5.  Aguarde cerca de 1 a 2 minutos. O GitHub gerara uma caixa no topo da tela com o link publico definitivo, como:
    `-> https://seu-usuario.github.io/nome-do-repositorio/`

Pronto! Qualquer pessoa podera acessar e utilizar a ferramenta diretamente por este link no celular, tablet ou computador.

---

##  Tecnologias Utilizadas

*   [Leaflet.js v1.9.4](https://leafletjs.com/) - Visualizacao cartografica interativa de alto desempenho.
*   [OpenStreetMap](https://www.openstreetmap.org/) - Camadas de mapas globais livres.
*   Google Fonts - Outfit & Plus Jakarta Sans.
*   Vanilla Javascript (ES6+) & Vanilla CSS (Layouts Grid, Flexbox e Glassmorphism).
