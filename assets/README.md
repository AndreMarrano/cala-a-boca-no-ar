# Personagens da referência visual

`personagens.png` foi produzido com o gerador de imagens integrado a partir da imagem enviada pelo usuário. A folha tem 1448×1086 pixels e transparência real. A primeira linha contém as poses de repouso; a segunda contém fala/gesto para A, C e D e o gesto de silêncio para B.

Da esquerda para a direita: Caio Caçamba (camiseta marrom), Gilzão (camiseta bege, barba e tatuagem), Avenida Bechler (blusa clara e jeans) e Ilson Jr (camiseta azul escura, óculos e cabelo grisalho).

Os quadros preservam o estilo, as roupas e os traços da referência. A arte é uma adaptação para sprites, com novas poses de animação. As coordenadas de jogo e os nomes originais não foram alterados. Os recortes explícitos em `RECORTES_PERSONAGENS` compensam a distribuição da folha e mantêm o rosto no ponto lógico original, inclusive durante o gesto do Gilzão.

O cenário é composto primeiro, os personagens são desenhados em resolução lógica maior e os cones de câmera, a produção e os alertas são compostos por cima. Não reduza os sprites para o buffer de 480×300, pois isso descarta os detalhes dos rostos.

Se o PNG não estiver disponível, o jogo utiliza o desenho anterior como fallback. Ao trocar a folha, confira os quatro nomes, o encaixe nas poltronas, as poses de fala, o gesto de silêncio e os dois finais do jogo.
