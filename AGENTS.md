# Notas para agentes de código

- Projeto sem build e sem dependências: HTML, CSS e JavaScript puro em `index.html`. Só as fontes vêm do Google Fonts.
- As regras usam coordenadas lógicas de 960×600 (posições, ângulos da câmera, cliques). O desenho é feito num buffer de 480×300 (`bx()` converte) e ampliado sem suavização; textos e etiquetas são desenhados por cima em alta resolução.
- Sprites dos personagens são gerados em código e guardados em `cacheSpr`; ao mudar a aparência, a chave do cache em `personagemSprite()` precisa cobrir o novo estado.
- Áudio só inicia depois do clique em "Entrar no ar" (regra dos navegadores). As vozes ficam em `window.VOZES_CALA_A_BOCA`.
- Para testar rápido, reduza `CFG.duracao`. Confira o console sem erros e os dois finais (tempo esgotado e expulsão), incluindo o botão "Voltar ao ar".
- Interface em português do Brasil.
