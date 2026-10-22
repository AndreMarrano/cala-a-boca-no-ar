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

## Onde mexer

As regras, a interface e o cenário estão em `index.html`, sem build. A arte dos quatro personagens está em `assets/personagens.png`; mantenha a pasta `assets/` junto do HTML ao copiar ou publicar o jogo.

| O quê | Onde |
|---|---|
| Dificuldade (tempos, chances, velocidade) | objeto `CFG`, no topo do script. Cada par `[início, fim]` é interpolado ao longo do programa |
| Pontuação e bônus | `CFG.pontos`, `pontuar()`, `totalPontos()` e `zerarSequencia()`. A precisão de base é 0,1 s; o bônus é +5 por segundo seguido. `CFG.fala` dá mais tempo para direcionar o alvo: 3,8–5,8 s no começo e 2,4–3,8 s no fim; a abertura dura 4,8 s |
| Personagens (nome, posição e visual de fallback) | `GENTE` — A = Caio Caçamba, B = Gilzão (jogável), C = Avenida Bechler, D = Ilson Jr |
| Arte dos personagens | `assets/personagens.png`, com duas poses por personagem. `RECORTES_PERSONAGENS` e `blitPersonagemDetalhado()` definem os recortes, o tamanho e a ancoragem na mesma posição lógica |
| Layout e controles no celular | CSS responsivo, `janelaCena()` / `enquadramento()` / `pontoLogico()` para desenho e toque na mesma projeção, `segurarP()` para segurar um alvo, `alternarFoco()` para ampliar |
| Frases dos balões | `FRASES` |
| Planos e direção de câmera | `PLANOS`, `escolherPlano()`, `camUpdate()` |
| Produção | `prodUpdate()`, `produtorPx()` |
| Desenho | seção "DESENHO EM PIXEL ART": cenário em `renderFundo()`, personagens em `blitPersonagemDetalhado()` (fallback em `personagemSprite()`), efeitos em `desenharEfeitosPixel()` e textos em `draw()` |
| Vozes | `window.VOZES_CALA_A_BOCA`, no último `<script>` (mp3 em base64) |

As gravações originais tratadas (silêncio cortado, volume igualado, mono 96 kbps) estão em `audio/`. Para trocar uma voz, gere o base64 do novo arquivo (`base64 -w0 audio/voz1.mp3`) e substitua a string correspondente.
