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

Tudo está em `index.html`, sem build.

| O quê | Onde |
|---|---|
| Dificuldade (tempos, chances, velocidade) | objeto `CFG`, no topo do script. Cada par `[início, fim]` é interpolado ao longo do programa |
| Personagens (nome, posição, cores, roupa, cabelo, pernas) | `GENTE` — A = Caio Caçamba, B = Gilzão (jogável), C = Avenida Bechler, D = Ilson Jr |
| Frases dos balões | `FRASES` |
| Planos e direção de câmera | `PLANOS`, `escolherPlano()`, `camUpdate()` |
| Produção | `prodUpdate()`, `produtorPx()` |
| Desenho | seção "DESENHO EM PIXEL ART": cenário em `renderFundo()`, personagens em `personagemSprite()`, textos em alta resolução em `draw()` |
| Vozes | `window.VOZES_CALA_A_BOCA`, no último `<script>` (mp3 em base64) |

As gravações originais tratadas (silêncio cortado, volume igualado, mono 96 kbps) estão em `audio/`. Para trocar uma voz, gere o base64 do novo arquivo (`base64 -w0 audio/voz1.mp3`) e substitua a string correspondente.
