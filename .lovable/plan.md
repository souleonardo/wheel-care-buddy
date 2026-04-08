## Plano de Implementação

### 1. Banco de Dados — Novas tabelas
- **`whatsapp_journeys`** — Configuração das jornadas (D-1, vencimento, atraso)
  - `journey_type` (enum: `reminder_d1`, `due_date`, `overdue`)
  - `is_active` (boolean) — ativar/desativar
  - `retry_interval_days` (int) — frequência de reiteração (só para atraso)
  - `max_retries` (int) — limite de reiterações
  - `send_hour` (int) — horário de envio (ex: 9 = 9h)

- **`whatsapp_templates`** — Templates de mensagem
  - `journey_id` (FK → whatsapp_journeys)
  - `template_name` (text) — nome identificador
  - `template_body` (text) — corpo da mensagem com variáveis `{nome}`, `{valor}`, `{vencimento}`, `{placa}`
  - `is_active` (boolean)

- **`whatsapp_config`** — Configurações gerais
  - `sender_number` (text) — número Twilio remetente
  - `is_sandbox` (boolean) — modo sandbox

### 2. Frontend — Nova página `/mensageria`
- Acessível apenas para **admin**
- Seções:
  - **Jornadas**: cards para cada tipo com toggle de ativação, configuração de horário e reiteração
  - **Templates**: editor de texto com preview das variáveis dinâmicas
  - **Configuração**: número remetente e modo sandbox/produção

### 3. Integração Twilio
- Conectar o conector Twilio ao projeto
- Adicionar campo `phone` na tabela `profiles`

### 4. RLS
- Apenas admins podem ler/gravar nas novas tabelas
