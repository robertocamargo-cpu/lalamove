# Sistema Inteligente de Cotação e Gestão de Entregas Expressas (Lalamove API v3)

Aplicação web moderna desenvolvida em **Next.js (App Router)**, **TypeScript** e **Tailwind CSS (Dark Mode)**, integrada à API v3 da **Lalamove** para automatizar a cotação, otimização de rotas com múltiplas paradas, contratação, rastreamento e comprovação de entregas expressas de guardanapos de papel e descartáveis a partir da unidade matriz em São Paulo.

---

## 🚀 Principais Funcionalidades Implementadas

### 1. RF01 — Formulário Inteligente de Coleta e Roteirização
* **Origem Padrão Fixada:** Ponto de coleta pré-configurado na **Rua do Glicério, 557 — Liberdade, São Paulo - SP (CEP 01514-001)** com coordenadas geográficas em cache (`lat: -23.556780, lng: -46.628890`), com opção de alteração pontual pelo operador.
* **Múltiplas Paradas (`stops[1...n]`):** Adição e remoção dinâmica de pontos de entrega com Razão Social, Telefone de contato (obrigatório para o motorista), CEP com autopreenchimento e instruções detalhadas (portaria, doca, horário limite).
* **Estratégia de Roteirização:**
  * **Modo Automático (`isRouteOptimized: true`):** O algoritmo Lalamove calcula a melhor sequência entre múltiplos destinos, reduzindo km rodados e custo financeiro.
  * **Modo Manual (`isRouteOptimized: false`):** Permite reordenar paradas para atender janelas rígidas de entrega.
  * **Comparativo de Rota:** Modal interativo demonstrando a economia de km, tempo estimado e valor em R$.

### 2. Cálculo de Carga e Cubagem Especializada (Guardanapos de Papel)
* **Calculadora Volumétrica:** Entrada de quantidade de caixas, peso por caixa e dimensões (C x L x A cm) gerando volume total ($m^3$) e peso cubado ($kg$).
* **Sugestão Automática de Modal:** Recomendação do veículo ideal (`MOTORCYCLE`, `CAR`, `LUV` Fiorino, `VAN` ou `TRUCK`).
* **Gestão de Riscos e Acondicionamento:** Alerta proativo de proteção contra umidade para produtos de papel e opção de **Baú Fechado (`KEEP_DRY`)**, **Ajudante Adicional (`HELP_LOADING_UNLOADING`)** e **Agendamento (`scheduleAt`)**.

### 3. RF02 — Motor de Integração e Autenticação Criptográfica (Back-end)
* **Assinatura HMAC-SHA256:** Utilitário nativo em Node.js (`crypto`) gerando cabeçalhos `Authorization: hmac <API_KEY>:<TIMESTAMP>:<SIGNATURE>`, `Market: BR` e `Request-ID: <UUIDv4>`.
* **Endpoints API Routes:**
  * `POST /api/lalamove/quotations` — Cotação, distância, congelamento de preço e otimização de paradas.
  * `POST /api/lalamove/orders` — Contratação da corrida com alocação de motorista parceiro.
  * `GET /api/lalamove/orders` e `GET /api/lalamove/orders/[orderId]` — Consulta e monitoramento.
  * `POST /api/lalamove/orders/[orderId]/change-driver` — Solicitação de troca de motorista em caso de atraso.
  * `POST /api/lalamove/orders/[orderId]/cancel` — Cancelamento controlado de pedidos.
  * `POST /api/lalamove/orders/[orderId]/advance-status` — Simulador interativo de avanço de corrida e entrega para testes.
  * `GET /api/cep/[cep]` — Autopreenchimento com ViaCEP.
  * `GET /api/geocode` — Conversão de endereços em coordenadas geográficas.

### 4. RF03 — Painel de Cotação Garantida
* Exibição detalhada de custos (`baseRate`, `extraMileage`, taxas de ajudante/paradas adicionais e total em BRL).
* **Cronômetro Regressivo de 5 minutos (05:00):** Monitora a janela de preço garantido (`expiresAt`) pela Lalamove, com alerta visual e botão de recotação imediata após a expiração.

### 5. RF04 — Rastreamento por Parada, WhatsApp & Comprovante Digital (POD)
* **Links de Rastreamento ao Vivo (`shareLink`):** Gerados individualmente por ponto de parada.
* **Disparo WhatsApp:** Botão de envio rápido com mensagem pronta para os clientes de cada parada.
* **Comprovante Digital de Entrega (POD):** Visualização completa do comprovante capturado pelo motorista (nome e documento do recebedor, registro fotográfico da mercadoria entregue e assinatura biométrica digital).

### 6. Histórico, KPIs e Auditoria
* Painel com total expedido, paradas entregues, taxa de conclusão e custo acumulado de frete.
* Exportação de relatórios em formato **CSV**.

---

## 🛠️ Tecnologias Utilizadas

* **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
* **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
* **Estilização:** [Tailwind CSS](https://tailwindcss.com/) (Tema Dark de alto contraste com paleta oficial Lalamove `#F26522`)
* **Ícones:** [Lucide React](https://lucide.dev/)
* **Criptografia:** Node.js native `crypto` (HMAC-SHA256)

---

## ⚙️ Configuração e Execução

### 1. Clonar ou Acessar a Pasta
```bash
cd Lalamove
```

### 2. Configurar Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env.local`:
```bash
cp .env.example .env.local
```
Edite `.env.local` com suas credenciais obtidas no [Portal de Parceiros Lalamove](https://partner.lalamove.com/):
```env
LALAMOVE_API_KEY=sua_api_key_aqui
LALAMOVE_API_SECRET=seu_api_secret_aqui
LALAMOVE_ENV=sandbox
LALAMOVE_MARKET=BR
LALAMOVE_MOCK_FALLBACK=true
```
> **Nota:** Caso não possua chaves ativas de imediato, a flag `LALAMOVE_MOCK_FALLBACK=true` ativa o motor de simulação realista com geolocalização e rotas precisas em São Paulo.

### 3. Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```
Acesse no seu navegador: [http://localhost:3000](http://localhost:3000)

---

## 📄 Referências Oficiais
* **Documentação Oficial Lalamove API v3:** [https://developers.lalamove.com/#introduction](https://developers.lalamove.com/#introduction)
* **Portal de Parceiros Lalamove:** [https://partner.lalamove.com/](https://partner.lalamove.com/)

