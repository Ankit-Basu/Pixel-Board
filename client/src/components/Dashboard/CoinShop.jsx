import { useState } from "react";

const SHOP_ITEMS = [
  {
    id: "sword",
    name: "Pixel Sword",
    price: 100,
    icon: "🗡️",
    desc: "A shiny sharp sword.",
  },
  {
    id: "shield",
    name: "Iron Shield",
    price: 150,
    icon: "🛡️",
    desc: "Block those attacks.",
  },
  {
    id: "potion",
    name: "Health Potion",
    price: 50,
    icon: "🧪",
    desc: "Restores 50 HP.",
  },
  {
    id: "crown",
    name: "Gold Crown",
    price: 500,
    icon: "👑",
    desc: "For true kings.",
  },
  {
    id: "wand",
    name: "Magic Wand",
    price: 200,
    icon: "🪄",
    desc: "Cast powerful spells.",
  },
  {
    id: "boots",
    name: "Speed Boots",
    price: 120,
    icon: "👢",
    desc: "Move twice as fast.",
  },
  {
    id: "pickaxe",
    name: "Pixel Pickaxe",
    price: 180,
    icon: "⛏️",
    desc: "Mine for rare gems.",
  },
  {
    id: "elixir",
    name: "Max Elixir",
    price: 300,
    icon: "🏺",
    desc: "Fully restores HP & MP.",
  },
  {
    id: "cloak",
    name: "Stealth Cloak",
    price: 400,
    icon: "🧥",
    desc: "Become unseen to enemies.",
  },
  {
    id: "dragon",
    name: "Pet Dragon",
    price: 1000,
    icon: "🐉",
    desc: "A loyal fiery companion.",
  },
];

export default function CoinShop({ pixelCoins, setPixelCoins }) {
  // In a real app, 'purchased' would be saved to DB/Context.
  // We'll keep it local state for this demo.
  const [purchased, setPurchased] = useState([]);

  const buyItem = (item) => {
    if (purchased.includes(item.id)) return;
    if (pixelCoins >= item.price) {
      setPixelCoins((prev) => prev - item.price);
      setPurchased((prev) => [...prev, item.id]);
    } else {
      alert("Not enough coins! Play mini-games or draw to earn more.");
    }
  };

  return (
    <div className="coin-shop-container">
      <h2 className="panel-title" style={{ color: "var(--neon-yellow)" }}>
        🏪 THE PIXEL SHOP
      </h2>
      <p style={{ color: "#aaa", fontSize: "0.8rem", marginBottom: "30px" }}>
        Spend your hard-earned coins here!
        <br />
        <strong style={{ color: "#fff", fontSize: "1rem" }}>
          Current Balance: {pixelCoins} 🪙
        </strong>
      </p>

      <div className="shop-grid">
        {SHOP_ITEMS.map((item) => {
          const isOwned = purchased.includes(item.id);
          const canAfford = pixelCoins >= item.price;

          return (
            <div
              key={item.id}
              className="shop-item-card"
              style={{ borderColor: isOwned ? "var(--neon-cyan)" : "" }}
            >
              <div className="shop-item-icon">{item.icon}</div>
              <h4
                style={{
                  fontFamily: "var(--pixel-font)",
                  margin: "0 0 10px 0",
                  color: "#fff",
                }}
              >
                {item.name}
              </h4>
              <p style={{ fontSize: "0.8rem", color: "#aaa", flexGrow: 1 }}>
                {item.desc}
              </p>

              <button
                className={`hero-btn-retro ${isOwned ? "btn-secondary" : canAfford ? "btn-green" : "btn-danger"}`}
                onClick={() => buyItem(item)}
                disabled={isOwned}
                style={{ width: "100%", marginTop: "16px", fontSize: "0.6rem" }}
              >
                {isOwned ? "OWNED" : `BUY (${item.price} 🪙)`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
