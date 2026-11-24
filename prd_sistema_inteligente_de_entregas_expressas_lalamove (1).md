# PRD: Sistema Inteligente de Cotação e Gestão de Entregas Expressas (Lalamove)

## 1. Visão Geral e Objetivo
Construir uma aplicação web integrada via API v3 da **Lalamove** para automatizar a cotação, otimização de rotas com múltiplas paradas, contratação, rastreamento e comprovação de entregas urbanas e regionais expressas. O sistema visa agilizar a expedição de guardanapos de papel e descartáveis a partir da unidade matriz, garantindo seleção adequada de veículos conforme a cubagem, congelamento de tarifas e rastreamento em tempo real.

---

## 2. Referências Técnicas e Links Oficiais
* **Documentação Oficial da API (v3):** [https://developers.lalamove.com/#introduction](https://developers.lalamove.com/#introduction)
* **Portal de Parceiros (Geração de API Key e Secret):** [https://partner.lalamove.com/](https://partner.lalamove.com/)
* **Base URL — Ambiente de Testes (Sandbox):** `https://rest.sandbox.lalamove.com`
* **Base URL — Ambiente de Produção:** `https://rest.lalamove.com`

---

## 3. Escopo e Regras Operacionais
O motor logístico atua exclusivamente sobre a malha de atendimento urbano e metropolitano da **Lalamove**:

* **Origem Padrão Pré-Configurada:** O ponto de coleta inicial (`stops[0]`) já vem preenchido por padrão com o endereço da expedição (**Rua do Glicério, 557 — Liberdade, São Paulo - SP, CEP 01514-001**), permitindo edição pontual caso necessário.
* **Geocodificação das Paradas:** Conversão automática dos endereços de destino em coordenadas geográficas precisas (`latitude` e `longitude`) antes de acionar a API da Lalamove (com coordenadas da origem já em cache para ganho de performance).
* **Múltiplas Paradas e Escolha de Rota:** Suporte a múltiplos destinos na mesma corrida (`stops[1...n]`) com alternância entre **Rota Otimizada Automaticamente** (`isRouteOptimized: true`) ou **Ordem Manual / Ajuste pelo Operador** (`isRouteOptimized: false` com reordenação drag-and-drop).
* **Janela de Preço Garantido:** Gerenciamento ativo da validade de **5 minutos** (`expiresAt`) do `quotationId` gerado pela API.

---

## 4. Requisitos Funcionais (RF)

### RF01 — Formulário Inteligente de Coleta e Roteirização
Interface de entrada estruturada para coleta rápida de dados pela equipe comercial/expedição:

1. **Ponto de Origem (Default):**
   * **Endereço:** Rua do Glicério, 557 — Liberdade, São Paulo - SP.
   * **CEP:** `01514-001` (com coordenadas lat/lng pré-cadastradas no sistema para evitar chamadas desnecessárias de geocoding na origem).
   * **Ação:** Botão opcional *"Alterar origem"* caso a coleta ocorra em outro local.

2. **Gestão de Múltiplas Paradas e Ajuste de Rota (`stops`):**
   * **Adicionar / Remover Paradas:** Botão `+ Adicionar Parada` permitindo inserir múltiplos clientes em um único roteiro de entrega.
   * **Dados por Parada:** Nome/Razão Social, Telefone de Contato *(obrigatório para o motorista)*, CEP, Endereço Completo (Rua, Número, Complemento, Bairro, Cidade, UF) e Observações de entrega (portaria, doca, horário limite).
   * **Controle de Roteirização (Melhor Rota vs. Manual):**
     * **Modo Automático (Recomendado):** Envia `isRouteOptimized: true` para que o algoritmo da Lalamove reorganize a sequência das paradas visando menor quilometragem, tempo e custo.
     * **Modo Manual (Ajuste Fino):** Permite ao operador reordenar as paradas via arrastar-e-soltar (*drag-and-drop*) ou setas (subir/descer) e envia `isRouteOptimized: false`, respeitando exatamente a sequência definida pelo usuário (ex: entregas com janela de horário rígida).
     * **Comparativo de Rota:** Exibição da ordem sugerida pela Lalamove versus a ordem manual, mostrando a diferença de distância (km) e valor (R$) antes de fechar o pedido.

3. **Dados da Carga e Seleção Automática de Veículo:**
   * **Produto Padrão:** Pré-configurado para *Guardanapos de Papel / Artefatos de Papel* (Categoria Lalamove: `OFFICE_SUPPLIES`, Instrução: `KEEP_DRY`).
   * **Volumes Consolidados:** Soma automática da quantidade de caixas, Peso Bruto total (kg) e Dimensões (Altura, Largura e Comprimento em cm) de todas as paradas do roteiro.
   * **Cálculo de Cubagem:** Sugestão automática do modal Lalamove (`MOTORCYCLE`, `CAR`, `LUV` / Fiorino, `VAN` ou Caminhão Baú) compatível com o volume total da carga.

4. **Requisições Especiais (`specialRequests`):**
   * Opções selecionáveis para **Ajudante Adicional**, **Baú Fechado** (proteção contra chuva/umidade para papel), ou **Agendamento de Horário (`scheduleAt`)**.

### RF02 — Motor de Integração e Autenticação (Back-end)
* **Segurança de Credenciais:** Todas as chamadas ocorrem exclusivamente no servidor (Next.js API Routes / Node.js), mantendo `LALAMOVE_API_KEY` e `LALAMOVE_API_SECRET` em variáveis de ambiente (`.env`).
* **Assinatura Criptográfica HMAC-SHA256:**
  * Geração dinâmica do header `Authorization: hmac <API_KEY>:<TIMESTAMP>:<SIGNATURE>` em cada requisição, combinando `Timestamp` (ms), `Método HTTP`, `Path` e `Body JSON`.
  * Envio obrigatório dos headers `Market: BR` e `Request-ID` (UUID v4 único por chamada).
* **Endpoints Principais:**
  * `POST /v3/quotations` — Obtenção de tarifa, distância em metros, ordem otimizada dos `stops` e `quotationId`.
  * `POST /v3/orders` — Contratação da corrida utilizando o `quotationId` ativo e os contatos de cada parada.
  * `GET /v3/orders/{orderId}` — Consulta de status por parada, dados do motorista e links de rastreio.
  * `POST /v3/orders/{orderId}/drivers/{driverId}/change` — Solicitação de troca de motorista em caso de atraso na aceitação/coleta.

### RF03 — Painel de Cotação e Gestão de Riscos
* **Card de Cotação Lalamove:** Exibição do modal selecionado, sequência final das paradas, distância total estimada, detalhamento de valores (`base`, `extraMileage`, `surcharge`, `total` em BRL) e cronômetro regressivo de **05:00** indicando o tempo restante do preço congelado.
* **Alertas de Acondicionamento (Papel / Guardanapos):**
  * Lembrete visual automático exigindo embalagem fechada ou plastificada (*shrink*) e veículo fechado em dias de chuva para evitar danos por umidade ao papel.

### RF04 — Contratação, Rastreamento por Parada e Comprovante (POD)
* **Disparo da Corrida:** Confirmação imediata ou agendada com geração de **Links de Rastreamento ao Vivo (`shareLink`)** individuais por parada para envio direto a cada cliente via WhatsApp/E-mail.
* **Atualização em Tempo Real (Webhooks):** Recebimento automático de eventos de mudança de status (`ASSIGNING_DRIVER`, `ON_GOING`, `PICKED_UP`, `COMPLETED`, `CANCELED`) e avanço entre as paradas.
* **Comprovante Digital de Entrega (POD):** Exibição e armazenamento individual da foto da assinatura ou do pacote entregue capturada pelo motorista em cada ponto de parada.

---

## 5. Requisitos Não Funcionais (RNF)
* **Arquitetura e Stack Sugerida:** Next.js (App Router), TypeScript, Tailwind CSS (interface em Dark Mode com alto contraste para operação ágil), Node.js (`crypto` nativo) para assinatura HMAC e API de Geocoding (Google Maps / Mapbox).
* **Performance:** Tempo máximo de resposta de **2 segundos** para geocodificação das paradas de destino e retorno da cotação Lalamove.
* **Resiliência e Auditoria:** Registro em banco de dados de todos os `quotationId`, `orderId`, sequência de paradas, timestamps, valores pagos e links de POD por cliente para conferência financeira e controle de custos logísticos.

---

## 6. Estrutura de Dados (Payload de Cotação Lalamove com Múltiplas Paradas)

```json
{
  "data": {
    "serviceType": "LUV",
    "specialRequests": ["HELP_LOADING_UNLOADING"],
    "language": "pt_BR",
    "isRouteOptimized": true,
    "stops": [
      {
        "coordinates": {
          "lat": "-23.556780",
          "lng": "-46.628890"
        },
        "address": "Rua do Glicério, 557 - Liberdade, São Paulo - SP, 01514-001"
      },
      {
        "coordinates": {
          "lat": "-23.561684",
          "lng": "-46.655981"
        },
        "address": "Av. Paulista, 1000 - Bela Vista, São Paulo - SP"
      },
      {
        "coordinates": {
          "lat": "-23.587416",
          "lng": "-46.657634"
        },
        "address": "Av. Pedro Álvares Cabral, s/n - Vila Mariana, São Paulo - SP"
      }
    ],
    "item": {
      "quantity": "15",
      "weight": "MORE_THAN_10KG",
      "categories": ["OFFICE_SUPPLIES"],
      "handlingInstructions": ["KEEP_DRY"]
    }
  }
}
```

---

## 7. Roadmap de Implementação (Fases)

1. **Fase 1 (MVP - Cotação e Roteirização):** Configuração das chaves Sandbox/Produção, origem padrão fixada (Rua do Glicério, 557), formulário dinâmico de múltiplas paradas com ajuste manual/automático (`isRouteOptimized`), calculadora de cubagem, autenticação HMAC-SHA256 e tela de cotação com timer de validade.
2. **Fase 2 (Contratação e Rastreio Multi-Destino):** Fluxo de emissão de corrida (`POST /orders`), compartilhamento dos `shareLink` individuais com cada destinatário, troca de motorista e cancelamento controlado.
3. **Fase 3 (Webhooks, POD e Histórico):** Escuta ativa de webhooks da Lalamove, armazenamento automático das fotos de comprovante de entrega (POD) por parada e painel de relatórios de entregas realizadas.