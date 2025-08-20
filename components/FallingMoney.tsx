import React, { useEffect, useState } from 'react';

interface MoneyPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  speed: number;
  symbol: string;
}

export const FallingMoney: React.FC = () => {
  const [moneyPieces, setMoneyPieces] = useState<MoneyPiece[]>([]);

  useEffect(() => {
    const createMoneyPiece = (): MoneyPiece => ({
      id: Math.random(),
      x: Math.random() * window.innerWidth,
      y: -50,
      rotation: Math.random() * 360,
      speed: 2 + Math.random() * 3,
      symbol: ['💰', '💸', '🪙', '💵'][Math.floor(Math.random() * 4)]
    });

    const addMoneyPiece = () => {
      setMoneyPieces(prev => [...prev, createMoneyPiece()]);
    };

    const updateMoneyPieces = () => {
      setMoneyPieces(prev =>
        prev
          .map(piece => ({
            ...piece,
            y: piece.y + piece.speed,
            rotation: piece.rotation + 2
          }))
          .filter(piece => piece.y < window.innerHeight + 50)
      );
    };

    // Adicionar nova moeda a cada 500ms
    const addInterval = setInterval(addMoneyPiece, 500);

    // Atualizar posições a cada 50ms
    const updateInterval = setInterval(updateMoneyPieces, 50);

    return () => {
      clearInterval(addInterval);
      clearInterval(updateInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {moneyPieces.map(piece => (
        <div
          key={piece.id}
          className="absolute text-2xl opacity-70 animate-pulse"
          style={{
            left: `${piece.x}px`,
            top: `${piece.y}px`,
            transform: `rotate(${piece.rotation}deg)`,
            filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.6))'
          }}
        >
          {piece.symbol}
        </div>
      ))}
    </div>
  );
};