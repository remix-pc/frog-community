# Frog Community

Um cantinho do brejo para encontrar amigos. Jogo multiplayer de navegador com uma praça ilustrada, sapos personalizáveis, movimento por clique e conversa pública em tempo real. Todo o desenho é original, feito com SVG; nenhuma imagem ou fonte externa é necessária.

## Rodar em desenvolvimento

Requer Node.js 22.12+ ou 24 LTS e npm.

```sh
npm install
npm run dev
```

Abra **http://localhost:5173**. O Vite atende a interface e encaminha a conexão Socket.IO ao servidor na porta 3000. É necessário deixar o terminal aberto. Use apelidos diferentes em duas abas ou navegadores para experimentar o multiplayer.

## Executar a versão compilada

```sh
npm run build
npm start
```

Abra **http://localhost:3000**. Um único servidor atende os arquivos compilados e o multiplayer, pela mesma origem. `PORT` pode alterar a porta de produção (o proxy de desenvolvimento usa a porta 3000).

### Jogar pela rede local

1. Conecte os computadores à mesma rede Wi-Fi ou cabo.
2. No computador que está executando o jogo, use `ipconfig` no Windows e procure o IPv4 da conexão ativa, por exemplo `192.168.1.25`.
3. Nos outros computadores, abra `http://192.168.1.25:3000` para a versão compilada, ou `http://192.168.1.25:5173` durante o desenvolvimento.
4. Se o Windows pedir autorização para o Node.js, permita acesso na rede **privada**. Redes de convidados podem impedir comunicação entre computadores.

Os endereços são exemplos: use o IP real da máquina. Não é necessário configurar o endereço do servidor no cliente. Publicação na internet não faz parte desta versão.

## Como jogar

- Escolha um apelido de 3 a 20 caracteres (letras, números, espaço, `_` ou `-`) e uma das oito cores. Apelidos em uso não podem ser repetidos.
- Clique na grama ou nos caminhos. Seu sapo contorna bancos, árvores, pedras e o lago. Um novo clique muda seu destino.
- Digite no chat flutuante dentro do jogo e pressione Enter para enviar. Shift+Enter adiciona uma quebra de linha; Escape tira o foco do campo. As mensagens aparecem para todos em balões sobre os sapos durante seis segundos e no histórico. O botão **−** recolhe o histórico para liberar o cenário, mantendo o campo de mensagem disponível.
- A aba **Na praça** mostra os participantes. Silenciar oculta o histórico e os balões daquele participante apenas no seu navegador. Voltar a ouvir restaura as mensagens ainda no histórico. O silêncio vale para a sessão atual do participante.
- O botão ao lado do seu apelido sai da praça. Seu apelido e sua cor ficam salvos no navegador, quando o armazenamento local está disponível.

## Arquitetura e limites

- `client/`: Phaser desenha a praça e anima os sapos; HTML/CSS formam a interface acessível de entrada e conversa. Arte SVG em `client/art.ts`.
- `server/`: Node.js, Express e Socket.IO. O servidor é a autoridade sobre identidade, posição, velocidade, trajetos e autoria de mensagens.
- `shared/`: protocolo TypeScript, validações, mapa e busca A* com verificação de segmentos e suavização dos trajetos.
- Uma praça, até **20 jogadores**, snapshots de posições a **10 Hz**, interpolação no cliente e velocidade de 135 unidades por segundo.
- Estado apenas em memória; o servidor guarda as últimas **50 mensagens**. Reiniciar limpa participantes e histórico. As preferências locais são opcionais, sem contas ou autenticação.
- Mensagens de até **200 caracteres**, no máximo **uma por segundo por conexão**. Texto é inserido com `textContent` e nunca interpretado como HTML. Payloads Socket.IO têm limite de 8 KB.
- Ao detectar uma desconexão, o cliente desativa chat e movimento. Após reconectar, tenta entrar com o mesmo perfil e recebe um estado completo. Se o apelido tiver sido ocupado ou a praça estiver cheia, a entrada reaparece com a explicação. Mensagens e destinos não são reenviados automaticamente.
- Versão para computadores e grupos conhecidos. Contas, moderação para público aberto, celular, banco de dados, lojas, inventário e outras salas ficam fora desta entrega.

## Verificação

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Vitest testa caminhos, validação e servidor com múltiplos clientes Socket.IO reais, incluindo movimento, substituição de destino, limites, reentrada e histórico. Playwright testa navegadores independentes, chat, texto HTML literal, silenciamento, saída, preferências e layout em 1280×720 e 1920×1080.

Os testes de navegador usam Microsoft Edge no caminho padrão do Windows quando disponível. Em outro ambiente, execute `npx playwright install chromium` uma vez. Cada teste inicia seu próprio servidor em uma porta livre, servindo o cliente compilado; rode `npm run build` antes. Capturas de tela ficam em `test-results/`. Os testes não alteram a praça em execução na porta 3000.
