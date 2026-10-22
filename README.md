# CALA A BOCA!

Jogo 2D em pixel art: o Gilzão manda calar a boca de quem está falando na mesa redonda, sem a câmera ou a produção pegarem.

## Rodar

Abra `index.html` no navegador. Para testar no celular na mesma rede, sirva a pasta:

```bash
npx serve .
# ou
python3 -m http.server 8000
```

## Como jogar

- Segure o dedo ou o mouse sobre quem está falando. No teclado, `←` `→` escolhe a pessoa e `Espaço` segura o "cala a boca".
- No celular, também é possível segurar um dos três botões abaixo da cena. O botão destacado indica quem está falando; solte para parar. O aviso em texto informa quando a câmera ou a produção podem pegar o Gilzão.
- Use **Ampliar** para ocupar a área disponível do navegador. Deitado, o celular mostra os controles ao lado da cena. **Sair** (ou `Esc`) volta ao layout normal; **Como jogar** abre as instruções.
- Só conta tempo quando o alvo é quem está falando.
- Cada 0,1 segundo de acerto vale 1 ponto base. A cada segundo seguido no mesmo falante, você ganha mais 5 pontos de bônus; o total é a soma dos dois valores. Soltar, errar, mudar de falante ou ser pego interrompe a sequência, mas os pontos já ganhos permanecem.
- O placar mostra pontos totais, base, bônus e progresso para o próximo bônus. O cronômetro usa números sem fonte pixelada. No fim, o resultado discrimina a base e o bônus, e o recorde é salvo em pontos (separado do recorde antigo em segundos).
- Câmera: o cone vermelho é o que está no ar; o contorno tracejado avisa o próximo plano.
- Produção: no celular, pode mandar; com a exclamação, ela vai olhar.
- Programa de 2 minutos em 3 blocos. Dois amarelos e o Gilzão é expulso.

## Ranking

Ao terminar uma rodada, **Entrar no ranking** pede nome e código numérico de 4 dígitos. Um nome novo exige aviso de criação e repetição do código; um nome existente exige o código correto. `0047` é um código válido. O aparelho lembra apenas o nome, nunca o código.

Cada nome tem uma única posição, com sua maior pontuação. Maiúsculas e minúsculas identificam o mesmo jogador; o nome público original é preservado. Empates são ordenados por quem atingiu o recorde antes. O ranking mostra até 50 jogadores e informa sua posição mesmo quando você fica fora dos 50. **Ver ranking** fica disponível antes e depois da partida.

O GitHub Pages continua servindo o jogo. A persistência fica em um projeto Supabase, com uma Edge Function pública que valida nome, PIN e limites de pontuação. O PIN é guardado somente como hash bcrypt com sal; tabelas privadas com RLS e funções SQL acessíveis apenas a `service_role`. O frontend contém apenas o endereço público em `ranking-config.js`.

O servidor limita tentativas erradas a 6 por nome em uma janela de 10 minutos, além dos limites por origem de rede. Uma tentativa recusada não altera o recorde. Novas requisições simultâneas para o mesmo nome são serializadas no banco, impedindo sobrescrita de código ou perda do recorde. Dados temporários dos limites guardam hash do IP e são limpos após um dia quando há novas requisições.

Este é um ranking casual: o placar é calculado pelo navegador. O servidor confere formato e limite de 1.800 pontos por rodada, mas não comprova cada comando da partida. Não há recuperação automática do código sem email; se ele for perdido, o administrador precisa intervir no banco.

### Backend

- Projeto: `cala-a-boca-ranking`, organização `andremarrano`, região São Paulo. Endpoint público configurado em `ranking-config.js`.
- Migração: `supabase/migrations/20261022171839_ranking_nome_pin.sql`.
- Endpoint: `supabase/functions/cala-ranking/index.ts`, sem dependências externas.
- `verify_jwt = false` porque a autenticação das gravações usa nome + PIN na própria função. Isso não libera acesso às tabelas ou às funções SQL para usuários públicos.
- Chaves do servidor são lidas do ambiente `SUPABASE_SECRET_KEYS`, com compatibilidade para `SUPABASE_SERVICE_ROLE_KEY`. Nunca colocar essas chaves em HTML, `ranking-config.js`, logs ou commits.
- A origem de navegador permitida é `https://andremarrano.github.io`. Atualizar `ORIGEM` na função se mudar o domínio do jogo.
- A API usa GET para consultar e POST com JSON para consultar nome (`action: inspect`) ou publicar (`action: submit`). PIN é enviado somente no corpo HTTPS, nunca na URL.
- O Security Advisor pode informar [RLS Enabled No Policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) para as duas tabelas privadas. Isso é intencional: nenhum cliente tem acesso e a ausência de políticas nega todas as linhas; somente `service_role` do servidor, que ignora RLS, tem os grants necessários. Não criar políticas públicas para remover esse aviso informativo.

### Verificar o ranking

`node tests/ranking.test.cjs` (Node 24+) cobre o fluxo do formulário e o contrato da Edge Function sem abrir navegador ou acessar dados reais. `tests/ranking.sql` verifica cadastro, hash, PIN errado, recorde, limite de tentativas e permissões contra o banco dentro de uma transação revertida. Confira também a interface publicada em 320 px, paisagem e modo Ampliar.

## Onde mexer

As regras, a interface e o cenário estão em `index.html`, sem build. A arte dos quatro personagens está em `assets/personagens.png`; mantenha a pasta `assets/` junto do HTML ao copiar ou publicar o jogo.

| O quê | Onde |
|---|---|
| Dificuldade (tempos, chances, velocidade) | objeto `CFG`, no topo do script. Cada par `[início, fim]` é interpolado ao longo do programa |
| Pontuação e bônus | `CFG.pontos`, `pontuar()`, `totalPontos()` e `zerarSequencia()`. A precisão de base é 0,1 s; o bônus é +5 por segundo seguido. `CFG.fala` dá mais tempo para direcionar o alvo: 3,8–5,8 s no começo e 2,4–3,8 s no fim; a abertura dura 4,8 s |
| Personagens (nome, posição e visual de fallback) | `GENTE` — A = Caio Caçamba, B = Gilzão (jogável), C = Avenida Bechler, D = Ilson Jr |
| Arte dos personagens | `assets/personagens.png`, com duas poses por personagem. `RECORTES_PERSONAGENS` e `blitPersonagemDetalhado()` definem os recortes, o tamanho e a ancoragem na mesma posição lógica |
| Layout e controles no celular | CSS responsivo, `janelaCena()` / `enquadramento()` / `pontoLogico()` para desenho e toque na mesma projeção, `segurarP()` para segurar um alvo, `alternarFoco()` para ampliar |
| Ranking | `ranking.js`, `ranking.css`, endereço em `ranking-config.js`; backend e migração em `supabase/`. `comecar()` / `fim()` avisam o módulo do início e resultado da rodada |
| Frases dos balões | `FRASES` |
| Planos e direção de câmera | `PLANOS`, `escolherPlano()`, `camUpdate()` |
| Produção | `prodUpdate()`, `produtorPx()` |
| Desenho | seção "DESENHO EM PIXEL ART": cenário em `renderFundo()`, personagens em `blitPersonagemDetalhado()` (fallback em `personagemSprite()`), efeitos em `desenharEfeitosPixel()` e textos em `draw()` |
| Vozes | `window.VOZES_CALA_A_BOCA`, no último `<script>` (mp3 em base64) |

As gravações originais tratadas (silêncio cortado, volume igualado, mono 96 kbps) estão em `audio/`. Para trocar uma voz, gere o base64 do novo arquivo (`base64 -w0 audio/voz1.mp3`) e substitua a string correspondente.
