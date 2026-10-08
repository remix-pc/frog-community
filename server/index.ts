import { createGameServer } from './game.js';
const server = createGameServer();
const port = Number(process.env.PORT || 3000);
await server.listen(port);
console.log(`Frog Community: http://localhost:${port} · disponível também pelo IP da sua rede`);
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { void server.close().then(() => process.exit(0)); });
