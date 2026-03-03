# Sequência – Jogo de cartas em rede (React + Node)

Este repositório contém uma implementação básica do jogo de cartas **Sequência**, descrito pelo utilizador, utilizando **React** no front‑end e **Node.js/Express com Socket.IO** no back‑end.  O objetivo é fornecer uma base funcional que permita jogar online em tempo real, com regras implementadas.

## Como funciona

* **Cartas** – Existem 6 tipos de cartas: quatro comuns (`machado`, `espada`, `escudo`, `arco`) com 10 exemplares cada e duas especiais (`poção` e `armadilha`) com 5 exemplares cada, totalizando 50 cartas.
* **Jogadores** – De 2 a 4 participantes podem jogar em cada partida.  O host pode
  optar por preencher lugares vazios com adversários controlados pela IA.  Cada
  jogador (humano ou bot) recebe 8 cartas no início.
* **Regras de turno** – Em cada volta (sequência), os jogadores jogam uma carta da mão; cartas comuns não podem repetir o tipo já colocado na mesa naquele turno. Cartas especiais podem ser repetidas.
* **Poção** – Carta coringa que pode ser jogada em cima de qualquer carta comum ou de outra poção.
* **Armadilha** – O jogador escolhe outro jogador para lançar um dado de seis faces. Se sair 1, 3 ou 5, o alvo compra 3 cartas do monte; se sair 2, 4 ou 6, o jogador que lançou a armadilha compra 2 cartas.

O servidor implementa a lógica de jogo, gere as mãos dos jogadores e aplica as regras.  O cliente React conecta‑se via WebSocket e apresenta uma interface simples que mostra a mão do jogador, as cartas na mesa e o turno atual, permitindo escolher uma carta ou alvo de armadilha.

### Jogadores controlados pela IA

Esta versão também permite adicionar adversários controlados pelo computador.  Na
página inicial (Lobby) o host define quantos bots devem participar (de 0 a 4).  Os
bots jogam automaticamente quando é a sua vez: escolhem a primeira carta válida
(não repetindo naipes comuns que já estão na mesa) e, no caso da carta
`armadilha`, seleccionam aleatoriamente um alvo dentre os outros jogadores.  O
servidor executa as jogadas dos bots e actualiza o estado da partida para todos os
clientes.

### Adicionando imagens das cartas

Se você tiver modelos visuais (imagens) para cada tipo de carta, pode integrá‑los
à interface React facilmente.  Coloque os arquivos de imagem em
`client/public/cartas/` com nomes correspondentes aos tipos de carta — por
exemplo, `machado.png`, `espada.png`, `escudo.png`, `arco.png`, `poção.png` e
`armadilha.png`.  O componente `Card` utiliza esses ficheiros para renderizar
as cartas; se alguma imagem não estiver presente, o nome textual da carta será
exibido como fallback.  Caso deseje outras dimensões ou estilos, ajuste as
classes CSS definidas em `src/index.css`.

## Estrutura do projeto

```
sequencia/
├── README.md                — este ficheiro
├── server/                  — código Node.js/Express + Socket.IO
│   ├── package.json         — dependências e scripts do servidor
│   ├── index.js             — ponto de entrada do servidor
│   └── game.js              — implementação da lógica do jogo
└── client/                  — código React (Vite)
    ├── package.json         — dependências e scripts do cliente
    ├── vite.config.js       — configuração do Vite
    ├── public/
    │   └── index.html       — documento HTML inicial
    └── src/
        ├── main.jsx         — ponto de entrada React
        ├── App.jsx          — componente raiz
        └── components/
            ├── Lobby.jsx    — interface para criar/entrar em jogo
            ├── GameBoard.jsx— tabuleiro de jogo e interacção
            └── Card.jsx     — representação gráfica de uma carta
```

## Executando localmente

1. Certifique‑se de ter o Node.js instalado (versão 18 ou superior).
2. Em dois terminais separados:
   - `cd sequencia/server && npm install && npm start` – inicia o servidor WebSocket/HTTP na porta 4000.
   - `cd sequencia/client && npm install && npm run dev` – inicia a aplicação React (Vite) na porta 5173.
3. Abra o navegador em `http://localhost:5173` para criar uma sala de jogo e convidar amigos (todos os clientes devem usar o mesmo ID da sala para participar).

Esta implementação inicial pretende demonstrar a mecânica e pode ser expandida com melhorias visuais, persistência de estado em banco de dados, autenticação, etc.
