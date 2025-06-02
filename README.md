# mindponto
# 🤖 Bot de Controle de Ponto - Discord

Este bot foi desenvolvido para auxiliar no controle de ponto dos colaboradores através do Discord. Ele monitora quando os usuários ficam online e envia uma mensagem privada perguntando se bateram o ponto.

## ✨ Funcionalidades

- Monitora quando um usuário fica online no Discord
- Envia uma mensagem privada perguntando se o usuário bateu o ponto
- Gera um relatório diário dos pontos batidos
- Envia o relatório para os membros do RH configurados

## 🚀 Como usar

1. Clone este repositório
2. Instale as dependências:
```bash
npm install
```

3. Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:
```env
DISCORD_TOKEN=seu_token_do_discord
RH_IDS=id1,id2,id3
```

4. Inicie o bot:
```bash
npm start
```

## ⚙️ Configuração

- `DISCORD_TOKEN`: Token do seu bot do Discord
- `RH_IDS`: IDs dos membros do RH que receberão o relatório diário (separados por vírgula)

## 📋 Requisitos

- Node.js 18 ou superior
- NPM ou Yarn
- Bot do Discord configurado com as permissões necessárias

## 🔧 Permissões necessárias do Bot

- Ler mensagens
- Enviar mensagens
- Ver presenças
- Ver membros
- Enviar mensagens diretas

## ⏰ Funcionamento

- O bot monitora quando um usuário fica online
- Após 5 segundos, envia uma mensagem privada perguntando se bateu o ponto
- O relatório diário é gerado às 13:30 e enviado para os membros do RH configurados

## 📝 Notas

- O bot ignora outros bots
- O relatório inclui todos os membros do servidor que não são bots
- Os pontos são registrados apenas quando o usuário está online

## 🤝 Contribuição

Sinta-se à vontade para contribuir com o projeto através de pull requests.

## 📄 Licença

Este projeto está sob a licença MIT.