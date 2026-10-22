# Cala a Boca no Ar

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
- Só conta tempo quando o alvo é quem está falando.
- Câmera: o cone vermelho é o que está no ar; o contorno tracejado avisa o próximo plano.
- Produção: no celular, pode mandar; com a exclamação, ela vai olhar.
- Programa de 2 minutos em 3 blocos. Dois amarelos e o Gilzão é expulso.

## Onde mexer

As regras, a interface e o cenário estão em `index.html`, sem build. A arte dos quatro personagens está em `assets/personagens.png`; mantenha a pasta `assets/` junto do HTML ao copiar ou publicar o jogo.

| O quê | Onde |
|---|---|
| Dificuldade (tempos, chances, velocidade) | objeto `CFG`, no topo do script. Cada par `[início, fim]` é interpolado ao longo do programa |
| Personagens (nome, posição e visual de fallback) | `GENTE` — A = Caio Caçamba, B = Gilzão (jogável), C = Avenida Bechler, D = Ilson Jr |
| Arte dos personagens | `assets/personagens.png`, com duas poses por personagem. `RECORTES_PERSONAGENS` e `blitPersonagemDetalhado()` definem os recortes, o tamanho e a ancoragem na mesma posição lógica |
| Frases dos balões | `FRASES` |
| Planos e direção de câmera | `PLANOS`, `escolherPlano()`, `camUpdate()` |
| Produção | `prodUpdate()`, `produtorPx()` |
| Desenho | seção "DESENHO EM PIXEL ART": cenário em `renderFundo()`, personagens em `blitPersonagemDetalhado()` (fallback em `personagemSprite()`), efeitos em `desenharEfeitosPixel()` e textos em `draw()` |
| Vozes | `window.VOZES_CALA_A_BOCA`, no último `<script>` (mp3 em base64) |

As gravações originais tratadas (silêncio cortado, volume igualado, mono 96 kbps) estão em `audio/`. Para trocar uma voz, gere o base64 do novo arquivo (`base64 -w0 audio/voz1.mp3`) e substitua a string correspondente.
