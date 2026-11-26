# Lalamove Express

Aplicação local em Next.js 14, TypeScript e Tailwind para cotar, contratar e acompanhar entregas pela API oficial Lalamove v3 no Brasil.

## Executar

```bash
npm install
cp .env.example .env
npm run dev
```

Preencha `LALAMOVE_API_KEY` e `LALAMOVE_API_SECRET` em `.env` com as chaves de produção do [portal de parceiros](https://partnerportal.lalamove.com/). O ambiente padrão é `production`, com mercado `BR`. Abra http://127.0.0.1:3000.

O painel de configurações grava as chaves em `.env`, preserva credenciais existentes quando os campos ficam vazios e remove os overrides dessas variáveis em `.env.local`. O Next.js prioriza `.env.local` quando a configuração é feita manualmente. Arquivos de credenciais são ignorados pelo Git. Apenas a chave mascarada é devolvida ao navegador.

## Operação

- Coleta pré-cadastrada: **Nevine Liberdade (Vinicius)**, telefone **+55 11 94708-4941**, Rua do Glicério, **557**, Liberdade, São Paulo, CEP **01514-001**.
- O botão **Inverter Origem/Destino** move a matriz entre coleta e entrega, preservando os demais endereços.
- Preencha rua, número e complemento nos campos separados. O endereço completo aparece abaixo; o complemento é preservado nas instruções de entrega e não participa da localização no mapa.
- Cada modalidade (Regular, Prioridade e Agrupado) consulta seu preço na API usando `pricingTierCode`. Não há multiplicadores de preços locais. Disponibilidade e valores dependem da Lalamove.
- As paradas da cotação são associadas aos contatos por `stopId`, incluindo rotas otimizadas. Alterar o formulário invalida a cotação anterior.
- A contratação usa uma cotação válida do mesmo ambiente, contatos preenchidos e `isPODEnabled: true`. Em produção, clicar em **Contratar Corrida** solicita uma entrega real.
- Os pedidos ativos são atualizados a cada 30 segundos. Dados de motorista vêm do endpoint oficial de motoristas; links e comprovantes aparecem somente quando retornados pela Lalamove.
- Cancelamento, troca de motorista, edição e taxa de prioridade só alteram o estado local após confirmação da API. Se a resposta da criação de um pedido se perder, o sistema bloqueia o reenvio da mesma cotação: confira o portal e sincronize o pedido antes de tentar uma nova contratação.
- Uma falha de autenticação, saldo, localização ou API gera um erro visível. Não há substituição por pedidos, motoristas, coordenadas ou comprovantes fictícios. O endpoint antigo `advance-status` responde HTTP 410.
- O CSV de Registros preserva IDs, valores, datas e status do arquivo. O campo `USER` não é tratado como motorista. O CSV não inclui rastreamento ou POD e não substitui pedidos já confirmados pela API.

Os dados ficam em `data/orders.json` e `data/quotes.json`, com gravação local, fora do versionamento Git. Os arquivos são criados quando necessário; uma instalação nova começa sem pedidos e permite importar o CSV de Registros pelo painel. A aplicação foi preparada para execução local em um único servidor; publicação multiusuário exige autenticação e persistência compartilhada. Cópias privadas anteriores à remoção das simulações ficam em `data/private-backups/`, fora do Git.

## Verificar

```bash
npm test
npx tsc --noEmit
npm run build
```

Os testes de regressão usam respostas controladas e diretórios temporários; não acionam motoristas nem escrevem nos dados operacionais. Uma cotação real valida autenticação e preços, mas a confirmação de uma entrega depende de uma contratação real na interface.

## Referência

[Documentação oficial Lalamove v3](https://developers.lalamove.com/): formatos de cotação e pedido, status, POD, dados de motorista e operações permitidas. As restrições de cancelamento, troca, preços e disponibilidade são definidas pela Lalamove.
