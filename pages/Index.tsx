import React, { useState } from "react";
import { LuxuryRoulette } from "@/components/LuxuryRoulette";
import { WinModal } from "@/components/WinModal";
import { FallingMoney } from "@/components/FallingMoney";

// IMPORTA o fundo direto do src (garante o path)
import bg from "@/assets/bg-tesouro.webp";

const Index = () => {
  const [showWinModal, setShowWinModal] = useState(false);

  const handleWin = () => setShowWinModal(true);
  const handleCloseModal = () => setShowWinModal(false);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* ===== CAMADAS DE FUNDO ===== */}
      {/* Imagem base com filtros (cores vivas) */}
      <img
        src={bg}
        alt=""
        aria-hidden
        className="
          absolute inset-0 -z-20 w-full h-full object-cover pointer-events-none
          filter saturate-150 contrast-125 brightness-105
        "
      />
      {/* Luz dourada + leve vinheta (não “lava” as cores) */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 45% at 50% 18%, rgba(255,210,70,.28), rgba(255,140,0,.10) 50%, transparent 70%), linear-gradient(to bottom, rgba(0,0,0,.06), rgba(0,0,0,.16))",
        }}
      />

      {/* Dinheiro Caindo (acima do BG) */}
      <div className="relative z-10 pointer-events-none">
        <FallingMoney />
      </div>

{/* Conteúdo Principal (roleta mais para baixo) */}
<main className="relative z-10 flex-1 flex items-center justify-center px-4 pb-8">
  <div className="w-full max-w-4xl mt-40 md:mt-28 lg:mt-36">
    <LuxuryRoulette onWin={handleWin} showHeader={false} />
  </div>
</main>


      {/* Rodapé – sem blur pra não desbotar o fundo */}
      <footer className="relative z-10 bg-black/60 border-t border-accent/20 py-6 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Esta página não faz parte ou está relacionada ao Kwai ou à Kuaishou
            Technology. Além disso, este site NÃO é endossado pelo Kwai de forma
            alguma.
          </p>
        </div>
      </footer>

      {/* Modal de Vitória */}
      <WinModal isOpen={showWinModal} onClose={handleCloseModal} />
    </div>
  );
};

export default Index;
