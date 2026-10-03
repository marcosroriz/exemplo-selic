# Comparador de Rendimento: Ações da B3 vs Taxa Selic 📈

Aplicação web moderna, responsiva e de alta performance desenvolvida para comparar o rendimento histórico real de qualquer ação listada na bolsa brasileira (B3) contra a rentabilidade acumulada da **Taxa Selic** (SGS Série 4390 do Banco Central do Brasil / SICALC) mês a mês, considerando um único aporte no início do período.

---

## 🚀 Funcionalidades

1. **Seleção de Qualquer Ação da B3**:
   - Campo de busca com preenchimento automático (autocomplete).
   - Atalhos rápidos para blue-chips e ações de crescimento: `PETR4`, `VALE3`, `WEGE3`, `ITUB4`, `BBAS3`, `MGLU3`.
   - Atalhos para empresas com IPO recente demonstrando a regra de listagem: `CXSE3` (5 anos) e `AURE3` (< 5 anos).

2. **Janelas Temporais Inteligentes & Dinâmicas (1a, 2a, 5a e 10a)**:
   - **Regra de Cobertura de Listagem**: Se uma empresa foi listada há menos tempo do que a janela, **a opção não é apresentada** no painel de seleção.
   - *Exemplo*: Auren Energia (`AURE3`, listada em 2022) apresenta apenas as opções de **1 ano** e **2 anos**, omitindo as opções de **5 anos** e **10 anos** com aviso explicativo em tempo real.

3. **Aporte Inicial Customizável**:
   - Definição do valor inicial (padrão de R$ 1.000,00 caso não informado).
   - Máscara monetária em tempo real e botões de atalho rápido (R$ 1.000, R$ 5.000, R$ 10.000, R$ 50.000).

4. **Painel de Resultados e Métricas (KPIs)**:
   - **Card de Vencedor**: Destaque visual para o ativo vencedor no período, indicando o alfa obtido.
   - **Saldo Final e Retorno (%)**: Valores finais calculados para a ação e para a Selic.
   - **Diferença Líquida (Alfa)**: Excedente em R$ e em pontos percentuais (p.p.).
   - **Métricas Avançadas**: Taxa anualizada (CAGR), Selic média do período, melhor e pior mês da ação.

5. **Gráfico Interativo**:
   - Visualização com áreas preenchidas em gradiente (Chart.js).
   - Alternância entre **Saldo Acumulado (R$)** e **Rendimento Percentual (%)**.
   - Alternância entre **Cotação com Dividendos Reinvestidos (Ajustada)** e **Preço Nominal**.
   - Tooltips detalhados com crosshair mostrando mês, cotação, rentabilidade acumulada de ambos os ativos e taxa Selic de cada mês.

6. **Tabela de Evolução Histórica Mês a Mês**:
   - Listagem completa de todos os meses da janela.
   - Indicador visual do vencedor de cada mês.
   - Botão para **Exportar para CSV** (compatível com Excel).

---

## 🛠️ Tecnologias Utilizadas

- **Frontend Core**: HTML5 Semântico, Vanilla JavaScript (ES2022 Modular).
- **Design & Estilo**: CSS3 Moderno, Glassmorphism, Paleta HSL Dark Luxe, Micro-animações e Tipografia (Google Fonts: *Outfit* & *JetBrains Mono*).
- **Visualização de Dados**: Chart.js v4 (com fallback offline embutido).
- **Backend / Serverless**: Node.js HTTP Server nativo + Vercel Serverless Functions (`/api/stock.js`).
- **Fontes de Dados**:
  - Selic acumulada no mês: Banco Central do Brasil (SGS Série 4390) e Receita Federal (SICALC).
  - Cotações históricas da B3: B3 / Yahoo Finance API com suporte a cotações ajustadas por proventos.

---

## 💻 Como Executar Localmente

### Pré-requisito
- Node.js instalado (v18 ou superior).

### Passo a passo
1. Clone ou acerte o diretório do repositório:
   ```bash
   cd exemplo-selic
   ```

2. Inicie o servidor local:
   ```bash
   npm start
   ```
   *Ou diretamente:*
   ```bash
   node server.mjs
   ```

3. Abra seu navegador no endereço:
   ```
   http://localhost:3000/
   ```

---

## ☁️ Como Hospedar na Vercel

O projeto foi estruturado seguindo as convenções nativas da Vercel:

1. **Deploy Direto via GitHub**:
   - Conecte o repositório `exemplo-selic` no painel da [Vercel](https://vercel.com).
   - Como o projeto possui `index.html` na raiz e `/api/stock.js` para rotas serverless, a Vercel detecta a configuração automaticamente.
   - Clique em **Deploy**.

2. **Deploy via Vercel CLI**:
   ```bash
   npx vercel
   ```

3. **Arquivos de Configuração Vercel Incluídos**:
   - `vercel.json`: Cabeçalhos de segurança (CSP, Frame Options, XSS Protection) e URLs limpas.
   - `api/stock.js`: Serverless function para contornar restrições de CORS e consultar cotações da B3.

---

## 📐 Metodologia de Cálculo

1. **Capitalização da Selic**:
   - $V_{\text{selic}}(0) = V_0$
   - Para cada mês $t \ge 1$:
     $$V_{\text{selic}}(t) = V_{\text{selic}}(t-1) \times \left(1 + \frac{\text{taxa\_selic}(t)}{100}\right)$$

2. **Rendimento da Ação**:
   - Sendo $P_0$ a cotação no início da janela (mês 0) e $P_t$ a cotação no mês $t$:
     $$V_{\text{ação}}(t) = V_0 \times \left(\frac{P_t}{P_0}\right)$$

3. **Rentabilidade Percentual**:
   $$R(t) = \left(\frac{V(t) - V_0}{V_0}\right) \times 100\%$$
