import React from 'react';

// Mapeamento entre o tipo de carta e o caminho da imagem. As imagens devem ser
// adicionadas em `public/cartas/` com nomes correspondentes aos tipos. Por
// exemplo, 'machado.png', 'espada.png', 'escudo.png', 'arco.png', 'poção.png',
// 'armadilha.png'. Caso a imagem não exista, mostramos o nome textual como
// fallback.
// Mapeamento dos tipos para caminhos de imagem. Usamos extensões JPG conforme
// recomendado nas instruções. Se desejar usar PNG, basta alterar as
// extensões aqui ou adicionar os arquivos correspondentes.
const cardImages = {
  machado: '/assets/machado.jpg',
  espada: '/assets/espada.jpg',
  escudo: '/assets/escudo.jpg',
  arco: '/assets/arco_e_flecha.jpg',
  'poção': '/assets/pocao.jpg',
  armadilha: '/assets/armadilha.jpg'
};

export default function Card({ card, onClick, className = '' }) {
  const src = cardImages[card.type];
  return (
    <div
      className={`card-component ${className}`.trim()}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {src ? (
        <img
          src={src}
          alt={card.type}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span>{card.type}</span>
      )}
    </div>
  );
}