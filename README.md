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

- Escolha um apelido de 3 a 20 caracteres (letras, números, espaço, `_` ou `-`), uma das oito cores e até uma roupa, um par de óculos e um chapéu. As abas da entrada mostram quatro peças de cada tipo, além da opção sem acessório. Apelidos em uso não podem ser repetidos.
- Clique na grama ou nos caminhos. Seu sapo contorna bancos, árvores, pedras e o lago. Um novo clique muda seu destino.
- Digite no chat flutuante dentro do jogo e pressione Enter para enviar. Shift+Enter adiciona uma quebra de linha; Escape tira o foco do campo. As mensagens aparecem para todos em balões sobre os sapos durante seis segundos e no histórico. O botão **−** recolhe o histórico para liberar o cenário, mantendo o campo de mensagem disponível.
- A aba **Na praça** mostra os participantes. Silenciar oculta o histórico e os balões daquele participante apenas no seu navegador. Voltar a ouvir restaura as mensagens ainda no histórico. O silêncio vale para a sessão atual do participante.
- O botão **Personalizar sapo** ao lado do seu apelido abre o editor. Experimente as peças na prévia e escolha **Salvar visual** para mostrá-las a todos; **Cancelar** mantém o visual anterior. O editor fica indisponível durante uma partida no fliperama. O botão ao lado sai da praça. Apelido, cor e visual confirmado ficam salvos no navegador, quando o armazenamento local está disponível.

## Fliperama do Brejo

Chegue perto da máquina junto ao caminho central e escolha **Jogar** no convite. Ao escolher **Agora não**, o convite só volta depois de se afastar e se aproximar novamente.

No **Pulo do Sapo**, siga a vitória-régia mais próxima com as setas **← / →** ou os botões. As próximas cinco folhas ficam visíveis. Cada salto correto vale **10 pontos**, com intervalo de 250 ms. Cair na água ou completar **60 segundos** encerra a partida e registra o resultado. **Escape** ou **Sair do fliperama** cancela a tentativa sem salvar pontos. Durante a partida seu sapo fica parado na praça; outras pessoas podem jogar ao mesmo tempo.

O pequeno console de mesa, na parte inferior esquerda da praça, oferece **Pega-Vagalumes**. Toque no vagalume aceso em uma grade de nove posições ou use as teclas **1–9**. Ele muda de lugar a cada 1,5 segundo ou após uma tentativa. Cada acerto vale 10 pontos; erros não pontuam. A partida dura 60 segundos. Só é possível jogar em um fliperama por vez.

O ranking único mostra os dez melhores resultados e seu recorde pessoal. O servidor valida as jogadas e guarda apenas a maior pontuação de uma partida em qualquer um dos jogos por apelido, ignorando diferenças entre maiúsculas e minúsculas. Empates favorecem o recorde atingido primeiro. Não há contas: quem reutilizar um apelido compartilha aquele recorde. Os recordes existentes do Pulo do Sapo permanecem válidos.

Os recordes sobrevivem ao reinício em `data/arcade-scores.json`, criado automaticamente e ignorado pelo Git. A variável `ARCADE_SCORES_PATH` permite escolher outro arquivo. Preserve esse arquivo ao atualizar ou mover o servidor; ambientes descartáveis precisam de um volume persistente. Se não for possível ler ou salvar, o jogo informa **Ranking indisponível** e preserva o arquivo existente. Desconectar cancela a tentativa, e a reconexão retorna à praça.

## Dia e noite na praça

A praça segue o horário de São Paulo (`America/Sao_Paulo`): dia das **06h às 17h59**, noite das **18h às 05h59**. À noite, o cenário escurece suavemente e seis luminárias iluminam os caminhos. A aparência é atualizada automaticamente com a página aberta e ao voltar para a aba. É necessário que o relógio do dispositivo esteja correto.

## Cinema do Brejo

Siga o caminho no topo da praça ou clique na placa **Cinema ↑**. Ao chegar à passagem, seu sapo entra no cinema ao ar livre: um telão gigante, 24 cadeiras voltadas para ele e corredores para circular, sem carros. Para voltar, caminhe até a placa **Praça ↓** na parte inferior do cinema.

Clique em uma cadeira para caminhar até ela e sentar de frente para o telão. A cadeira fica reservada durante o trajeto, e cada assento comporta apenas um sapo. Clique no chão para levantar; escolher outro destino libera a cadeira anterior. Saídas e desconexões também liberam assentos e reservas. A cor e os acessórios continuam visíveis na postura sentada.

Cada mapa tem seus próprios participantes, balões e histórico das últimas 50 mensagens. Ao mudar de espaço, você passa a conversar com quem está naquele local. O cinema acompanha o mesmo ciclo de dia e noite, mantendo o telão iluminado. Nesta versão, a tela exibe uma arte de boas-vindas, sem vídeo ou áudio. Os fliperamas continuam na praça; reconectar retorna à praça, sem guardar mapa ou assento.

## Arquitetura e limites

- `client/`: Phaser desenha a praça e anima os sapos; HTML/CSS formam a interface acessível de entrada e conversa. Arte SVG em `client/art.ts`.
- `server/`: Node.js, Express e Socket.IO. O servidor é a autoridade sobre identidade, posição, velocidade, trajetos e autoria de mensagens.
- `shared/`: protocolo TypeScript, validações, mapa e busca A* com verificação de segmentos e suavização dos trajetos.
- Dois mapas, praça e cinema, com até **20 jogadores no total**, snapshots de posições por mapa a **10 Hz**, interpolação no cliente e velocidade de 135 unidades por segundo. Transições e reservas de assentos são controladas pelo servidor.
- Participantes e chat apenas em memória; o servidor guarda as últimas **50 mensagens de cada mapa**. Reiniciar limpa participantes e históricos, mas mantém os recordes do fliperama em disco. As preferências locais são opcionais, sem contas ou autenticação.
- Mensagens de até **200 caracteres**, no máximo **uma por segundo por conexão**. Texto é inserido com `textContent` e nunca interpretado como HTML. Payloads Socket.IO têm limite de 8 KB.
- Ao detectar uma desconexão, o cliente desativa chat e movimento. Após reconectar, tenta entrar com o mesmo perfil e recebe um estado completo. Se o apelido tiver sido ocupado ou a praça estiver cheia, a entrada reaparece com a explicação. Mensagens e destinos não são reenviados automaticamente.
- Versão para computadores e grupos conhecidos. Contas, moderação para público aberto, celular, banco de dados, lojas e inventário ficam fora desta entrega.

## Avisos de atualização no Discord

Cada Release estável publicada neste repositório envia suas notas ao canal do Discord configurado. Pré-lançamentos, pushes e edições posteriores da Release não enviam avisos. Se a descrição da Release estiver vazia, o aviso mostrará a versão e o link, indicando que não há notas.

1. No canal do Discord, crie um webhook em **Editar canal → Integrações → Webhooks** e copie sua URL.
2. No GitHub, abra **Settings → Secrets and variables → Actions → New repository secret** e salve a URL como `DISCORD_WEBHOOK_URL`. Não coloque a URL em arquivos do projeto.
3. Publique uma Release estável com uma tag de versão e escreva as notas no campo de descrição. O workflow **Anunciar Release no Discord** enviará o texto ao canal. Notas longas são divididas em várias mensagens.

Para testar o formatador e o envio simulado, sem acessar o Discord, execute `node --test scripts/announce-release.test.mjs`. Para conferir a integração real, publique uma Release estável depois que o workflow estiver na branch principal e verifique a execução em **Actions** e a mensagem no canal.

## Verificação

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Vitest testa caminhos, validação e servidor com múltiplos clientes Socket.IO reais, incluindo movimento, substituição de destino, limites, reentrada e histórico. Também verifica proximidade do fliperama, regras dos saltos, partidas simultâneas e persistência e falhas do ranking. Playwright testa navegadores independentes, chat, texto HTML literal, silenciamento, saída, preferências e o fluxo do fliperama em 1280×720 e 1920×1080. Os testes usam armazenamento temporário ou em memória, sem alterar os recordes reais.

Os testes de navegador usam Microsoft Edge no caminho padrão do Windows quando disponível. Em outro ambiente, execute `npx playwright install chromium` uma vez. Cada teste inicia seu próprio servidor em uma porta livre, servindo o cliente compilado; rode `npm run build` antes. Capturas de tela ficam em `test-results/`. Os testes não alteram a praça em execução na porta 3000.
