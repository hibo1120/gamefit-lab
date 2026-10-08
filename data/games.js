(function (root, factory) {
  const api = factory();
  root.GameFitGames = api;

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis, function createGameCatalog() {
  "use strict";

  const games = Object.freeze({
    valorant: Object.freeze({
      id: "valorant",
      display_name: "VALORANT",
      official_requirement_source: "https://playvalorant.com/ja-jp/specs/",
      official_requirement_sources: Object.freeze({ JP: "https://playvalorant.com/ja-jp/specs/", global: "https://playvalorant.com/en-us/specs/" }),
      official_minimum: "30 FPS向け構成、RAM 4GB",
      official_recommended: "60 FPS向け構成、ハイエンドは144 FPS以上の構成例",
      game_type: "competitive_fps",
      performance_characteristics: ["高FPSではCPU側の影響が出やすい", "画質と解像度でCPU・GPUを切り分ける"],
      ram_requirement: { official_minimum_gb: 4, gamefit_comfortable_gb: 16 },
      storage_requirement: { official: "個別指定なし", gamefit_policy: "any" },
      competitive_high_fps: true,
      notes: "高FPSを狙いやすいタイトルです。現在FPSが十分なら、まずモニター側で活かせるかを確認します。"
    }),
    apex: Object.freeze({
      id: "apex",
      display_name: "Apex Legends",
      official_requirement_source: "https://www.ea.com/ja-jp/games/apex-legends/about/pc-system-requirements",
      official_requirement_sources: Object.freeze({ JP: "https://www.ea.com/ja-jp/games/apex-legends/about/pc-system-requirements", global: "https://www.ea.com/games/apex-legends/about/pc-system-requirements" }),
      official_minimum: "RAM 6GBを含む最低動作環境",
      official_recommended: "RAM 8GBを含む推奨動作環境",
      game_type: "battle_royale_fps",
      performance_characteristics: ["高FPS目標ではCPU・GPU双方の余裕が必要", "混戦時の落ち込みも確認する"],
      ram_requirement: { official_minimum_gb: 6, gamefit_minimum_gb: 8, gamefit_comfortable_gb: 16 },
      storage_requirement: { official: "空き容量を要確認", gamefit_policy: "ssd" },
      competitive_high_fps: true,
      notes: "高FPS目標ではPC性能の余裕が重要です。目標との差とモニターHzを分けて判定します。"
    }),
    fortnite: Object.freeze({
      id: "fortnite",
      display_name: "Fortnite",
      official_requirement_source: "https://www.epicgames.com/help/c-34254770/a16548002?lang=ja",
      official_requirement_sources: Object.freeze({ JP: "https://www.epicgames.com/help/c-34254770/a16548002?lang=ja", global: "https://www.epicgames.com/help/c-34254770/c-37371353/a16548002" }),
      official_minimum: "RAM 8GBを含む最低動作環境",
      official_recommended: "RAM 16GB以上、NVMe SSDを含む推奨動作環境",
      game_type: "battle_royale",
      performance_characteristics: ["描画モードと画質による負荷差が大きい", "推奨環境と最高品質要件を分けて考える"],
      ram_requirement: { official_minimum_gb: 8, gamefit_minimum_gb: 8, gamefit_comfortable_gb: 16 },
      storage_requirement: { official: "推奨はNVMe SSD", gamefit_policy: "nvme" },
      competitive_high_fps: true,
      notes: "設定による負荷差が大きいタイトルです。推奨環境を意識し、RAMとストレージも評価します。"
    }),
    mhwilds: Object.freeze({
      id: "mhwilds",
      display_name: "Monster Hunter Wilds",
      official_requirement_source: "https://store.captown.capcom.com/products/1723312-jp",
      official_requirement_sources: Object.freeze({ JP: "https://store.captown.capcom.com/products/1723312-jp", global: "https://store.steampowered.com/app/2246340/Monster_Hunter_Wilds/?l=english" }),
      official_minimum: "RAM 16GB、SSD必須。条件付き1080p・30 FPSの構成例",
      official_recommended: "RAM 16GB、SSD必須。条件付き1080p・60 FPSの構成例",
      game_type: "action_rpg",
      performance_characteristics: ["CPU・GPU負荷が高い", "フレーム生成の表示FPSと基礎FPSを分けて考える"],
      ram_requirement: { official_minimum_gb: 16, gamefit_minimum_gb: 16, gamefit_comfortable_gb: 32 },
      storage_requirement: { official: "SSD必須", gamefit_policy: "ssd_required" },
      competitive_high_fps: false,
      notes: "負荷の高いタイトルです。SSD必須の公式動作環境を踏まえ、FPS不足時はPC性能を強めに評価します。"
    })
  });

  function list() {
    return Object.values(games);
  }

  function get(gameId) {
    return games[gameId] || null;
  }

  return { games, get, list };
});
