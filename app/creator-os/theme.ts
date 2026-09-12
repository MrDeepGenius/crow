// ============================================
// CREATOR THEME - identidad propia del Creator OS
// ============================================
// Base Crow (negro + violeta) con acento dorado editorial para
// diferenciarse del Affiliate OS (violeta + azul). Solo presentación.

export const GOLD = "#e8a33d";
export const GOLD_SOFT = "#f5c86e";
export const GOLD_DEEP = "#8a5a17";

export const CREATOR_PANEL_BG = "#0e0c10";

export const creatorCardStyle: React.CSSProperties = {
  background: `radial-gradient(130% 150% at 100% 0%, rgba(232,163,61,0.08) 0%, rgba(232,163,61,0) 45%), ${CREATOR_PANEL_BG}`,
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "20px",
  padding: "20px",
};

export const CREATOR_CSS = `
.creator-gold-text { background: linear-gradient(100deg, #f5c86e, #e8a33d); -webkit-background-clip: text; background-clip: text; color: transparent; }
.creator-hero { background: radial-gradient(90% 160% at 15% 0%, rgba(124,58,237,0.22) 0%, rgba(124,58,237,0) 55%), radial-gradient(70% 120% at 90% 20%, rgba(232,163,61,0.14) 0%, rgba(232,163,61,0) 55%), #0e0c10; border: 1px solid rgba(232,163,61,0.18); border-radius: 22px; }
.creator-btn-gold { transition: filter 0.15s ease, transform 0.15s ease; }
.creator-btn-gold:hover { filter: brightness(1.1); }
.creator-btn-gold:active { transform: scale(0.98); }
`;
