# Notas para agentes de código

- Projeto sem build e sem dependências: HTML, CSS e JavaScript puro em `index.html`. Só as fontes vêm do Google Fonts.
- As regras usam coordenadas lógicas de 960×600 (posições, ângulos da câmera, cliques). Cenário e efeitos usam um buffer de 480×300 (`bx()` converte); os personagens de `assets/personagens.png` são compostos em 960×600 para preservar os detalhes. Tudo é ampliado sem suavização; textos e etiquetas vão por cima.
- `RECORTES_PERSONAGENS` define os recortes dos dois quadros de cada personagem e ancora a cabeça em `cabeca(pe)`. Preserve as posições de `GENTE`, os nomes e a ancoragem entre os quadros. O sprite gerado em código continua como fallback; a chave de `cacheSpr` precisa cobrir qualquer novo estado desse fallback.
- Áudio só inicia depois do clique em "Entrar no ar" (regra dos navegadores). As vozes ficam em `window.VOZES_CALA_A_BOCA`.
- Para testar rápido, reduza `CFG.duracao`. Confira o console sem erros e os dois finais (tempo esgotado e expulsão), incluindo o botão "Voltar ao ar".
- Interface em português do Brasil.
- Título visível e título da aba: `CALA A BOCA!`. O cronômetro e os números do placar usam fonte contínua e dígitos tabulares, sem Pixelify Sans.
- `pontuar()` soma 1 ponto base por 0,1 s de acerto e +5 por segundo seguido no mesmo turno de fala. Os bônus são permanentes na partida; `zerarSequencia()` apaga apenas o progresso do próximo bônus. Confira o mesmo resultado em 30, 60 e 144 fps, soltura entre quadros, troca de alvo, pausa, flagra, fim e reinício. `CHAVE` e o snapshot têm versão de pontuação para não misturar o recorde antigo em segundos.
- No layout compacto, `janelaCena()` recorta apenas margens do cenário. `enquadramento()` mantém a proporção da arte e `pontoLogico()` inverte a mesma projeção (incluindo faixas vazias no modo ampliado). Preserve essa correspondência ao alterar o canvas.
- Os botões por toque compartilham um único ponteiro ativo com o canvas. Confira segurar/soltar, segundo dedo, `pointercancel`, perda de captura, troca de orientação e saída da aba. `limparEntrada()` encerra o comando e o áudio.
- Confira 320 px em pé, celular deitado (844×390 e 667×375), Ampliar/Sair e desktop. Controles e reinício precisam permanecer visíveis; a arte nunca deve ser esticada para preencher as faixas vazias.
