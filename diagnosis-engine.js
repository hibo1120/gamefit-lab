(function (root, factory) {
  const gameCatalog = root.GameFitGames || (
    typeof module === "object" && module.exports ? require("./data/games.js") : null
  );
  const api = factory(gameCatalog);
  root.GameFitDiagnosis = api;

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis, function createDiagnosisEngine(gameCatalog) {
  "use strict";

  if (!gameCatalog) throw new Error("GameFitGames must be loaded before diagnosis-engine.js");

  const recommendationCategories = Object.freeze({
    keep: Object.freeze({ key: "keep", title: "現状維持", base: 18, affiliate_category: null, default_reason: "大きな投資を急がず、設定調整や予算確保を優先する選択です。" }),
    monitor: Object.freeze({ key: "monitor", title: "モニター", base: 8, affiliate_category: "monitor", default_reason: "現在のFPSを十分に活かせる表示環境かを基準にします。" }),
    ram: Object.freeze({ key: "ram", title: "RAM", base: 7, affiliate_category: "ram", default_reason: "ゲーム要件と、配信・同時作業に必要な余裕を基準にします。" }),
    storage: Object.freeze({ key: "storage", title: "ストレージ", base: 6, affiliate_category: "storage", default_reason: "公式要件と、ロードやデータ読み込みの改善余地を基準にします。" }),
    cpu_gpu: Object.freeze({ key: "cpu_gpu", title: "CPU / GPU", base: 12, affiliate_category: "cpu_gpu", default_reason: "設定変更への反応と目標FPSとの差から、CPU・GPUの部分更新を検討します。" }),
    pc_replacement: Object.freeze({ key: "pc_replacement", title: "PC買替", base: 3, affiliate_category: "pc_replacement", default_reason: "部分交換より本体更新の方が合理的かを基準にします。" }),
    device: Object.freeze({ key: "device", title: "デバイス", base: 2, affiliate_category: "device", default_reason: "マウスやキーボードは、PC側のボトルネック解消後に比較する選択肢です。" })
  });

  function makeCategories() {
    return Object.fromEntries(Object.values(recommendationCategories).map(template => [template.key, {
      key: template.key,
      title: template.title,
      affiliateCategory: template.affiliate_category,
      score: template.base,
      reasons: [template.default_reason]
    }]));
  }

  function boost(category, points, reason) {
    category.score += points;
    if (reason) category.reasons.unshift(reason);
  }

  function clampScore(score) {
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function fail(code, message) {
    const error = new Error(message);
    error.code = code;
    throw error;
  }

  function numberInRange(value, minimum, maximum, code, label) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < minimum || number > maximum) {
      fail(code, `${label}は${minimum}〜${maximum}の範囲で入力してください。`);
    }
    return number;
  }

  function diagnoseInputs(input) {
    const game = gameCatalog.get(input?.game);
    if (!game) fail("game_invalid", "対応ゲームを選択してください。");

    const current = numberInRange(input.currentFps, 1, 1000, "current_fps_invalid", "現在FPS");
    const target = numberInRange(input.targetFps, 1, 1000, "target_fps_invalid", "目標FPS");
    const monitor = numberInRange(input.monitorHz, 1, 1000, "monitor_hz_invalid", "モニターHz");
    const ram = numberInRange(input.ram, 1, 1024, "ram_invalid", "RAM");
    const budget = numberInRange(input.budget, 0, 10000000, "budget_invalid", "予算");
    if (!["hdd", "ssd", "nvme"].includes(input.storage)) fail("storage_invalid", "ストレージを選択してください。");
    if (!["desktop", "laptop"].includes(input.device)) fail("device_invalid", "PCタイプを選択してください。");
    if (!["yes", "no"].includes(input.stream)) fail("stream_invalid", "配信・動画編集の有無を選択してください。");

    const categories = makeCategories();
    const ratio = current / target;
    const stream = input.stream === "yes";
    const laptop = input.device === "laptop";
    const minimumRam = game.ram_requirement.gamefit_minimum_gb || game.ram_requirement.official_minimum_gb;
    const comfortableRam = game.ram_requirement.gamefit_comfortable_gb;

    if (ratio >= .95) {
      boost(categories.keep, 54, `現在${current}FPSで、目標${target}FPSをほぼ満たしています。`);
      boost(categories.cpu_gpu, -5);
      boost(categories.pc_replacement, -3);
    } else if (ratio >= .8) {
      boost(categories.cpu_gpu, 30, `目標まであと約${Math.max(0, target - current)}FPSです。まず設定とCPU・GPU使用率を確認する価値があります。`);
      boost(categories.keep, 14, "目標との差が比較的小さく、設定調整だけで改善する可能性があります。");
    } else if (ratio >= .55) {
      boost(categories.cpu_gpu, 52, `現在${current}FPSに対して目標${target}FPSで、CPU・GPU側の改善余地が大きい状態です。`);
      boost(categories.pc_replacement, laptop ? 32 : 14, laptop
        ? "ノートPCは主要パーツの交換が難しく、本体更新も比較対象になります。"
        : "世代の古い構成では、複数パーツ交換より本体更新が合理的な場合があります。"
      );
    } else {
      boost(categories.cpu_gpu, 60, `現在${current}FPSに対して目標${target}FPSと差が大きく、モニターよりCPU・GPU側が先です。`);
      boost(categories.pc_replacement, laptop ? 58 : 34, laptop
        ? "ノートPCで性能差が大きいため、部分交換より買替が現実的です。"
        : "必要な性能差が大きいため、CPU・GPUを含む全体更新も比較してください。"
      );
    }

    const usableFps = Math.min(current, target);
    if (monitor < usableFps * .85) {
      boost(categories.monitor, 68, `PCは約${current}FPSを出せますが、${monitor}Hzでは表示性能を活かし切れない可能性があります。`);
    } else if (current > monitor * 1.12) {
      boost(categories.monitor, 47, `現在FPSが${monitor}Hzを上回っています。高リフレッシュレート化の体感効果を見込みやすい状態です。`);
    } else if (monitor >= target * .9) {
      boost(categories.monitor, -4, `現在の${monitor}Hzは目標${target}FPSに概ね対応しています。`);
    }

    if (monitor >= target && ratio < .75) {
      boost(categories.cpu_gpu, 16, "モニター性能は足りているため、追加のモニター投資よりCPU・GPU側が先です。");
      boost(categories.monitor, -8);
    }

    if (ram < minimumRam) {
      boost(categories.ram, 72, `${game.display_name}のGameFit動作目安に対してRAM容量が不足しています。`);
    } else if (ram < comfortableRam) {
      boost(categories.ram, 34, `${game.display_name}を快適に遊ぶGameFit目安として、${comfortableRam}GBを検討できます。`);
    } else {
      boost(categories.ram, -3, `${ram}GBあれば、ゲーム単体ではRAM増設の優先度は低めです。`);
    }

    if (stream && ram < 32) {
      boost(categories.ram, 32, "配信・編集を同時に行うなら、32GBへの増設が安定性の改善につながります。");
    }

    const storagePolicy = game.storage_requirement.gamefit_policy;
    if (storagePolicy === "ssd_required" && input.storage === "hdd") {
      boost(categories.storage, 94, `${game.display_name}の公式動作環境ではSSDが必須です。CPU・GPU交換より先にSSDへ移行してください。`);
    } else if (storagePolicy === "nvme" && input.storage !== "nvme") {
      boost(categories.storage, input.storage === "hdd" ? 30 : 16, `${game.display_name}の公式推奨環境に合わせ、NVMe SSDへの移行を検討できます。`);
    } else if (input.storage === "hdd") {
      boost(categories.storage, 15, "HDD利用中のため、ロードやデータ読み込みの改善にはSSD化が有効です。平均FPSへの効果とは分けて判断します。");
    } else {
      boost(categories.storage, -2, "SSDを利用中のため、容量不足やロード時間の不満がなければ優先度は低めです。");
    }

    if (budget < 30000) {
      boost(categories.keep, ratio < .8 ? 64 : 22, "予算内で効果の大きいPC更新が難しい場合は、今回は貯める判断が堅実です。");
      boost(categories.cpu_gpu, -12);
      boost(categories.pc_replacement, -24);
    } else if (budget < 50000) {
      boost(categories.ram, 8, "RAM増設は比較的予算に収めやすい選択肢です。");
      boost(categories.storage, 5, "SSD更新は比較的予算に収めやすい選択肢です。");
      boost(categories.pc_replacement, -18);
    } else if (budget < 100000) {
      boost(categories.cpu_gpu, 8, "一部パーツの更新を検討しやすい予算帯です。");
      boost(categories.storage, 3, "必要容量と接続規格を確認すれば、SSD更新も検討しやすい予算帯です。");
      boost(categories.pc_replacement, -10);
    } else if (budget >= 150000) {
      boost(categories.pc_replacement, ratio < .7 ? 24 : 6, "買替も現実的に比較できる予算帯です。");
    }

    if (laptop && ratio < .8) {
      boost(categories.pc_replacement, 14, "ゲーミングノートはCPU・GPUの交換自由度が低いため、買替の優先度が上がります。");
      boost(categories.cpu_gpu, -6);
    }

    const allRanked = Object.values(categories)
      .map(category => ({ ...category, score: clampScore(category.score) }))
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "ja"));
    const ranked = allRanked.slice(0, 5);

    const adviceByCategory = {
      keep: "まず設定調整と実測の確認を行い、残った予算は次の大きな更新に備えるのがおすすめです。",
      monitor: "解像度、パネル方式、可変リフレッシュレート対応も確認し、PCが安定して出せるFPSに合う製品を選んでください。",
      ram: "空きスロット、規格、最大容量、同一キットでの増設可否をPCまたはマザーボードの仕様で確認してください。",
      storage: "必要容量、接続規格、空きスロットを確認し、ゲーム移行やバックアップの手順まで含めて比較してください。",
      cpu_gpu: "画質変更への反応、CPU・GPU使用率、温度を同じ場面で測り、先に詰まっている側を切り分けてください。",
      pc_replacement: "買替時は目標FPSだけでなく、解像度・画質設定・将来の配信有無まで揃えて比較してください。",
      device: "入力機器は持ち方や操作感の相性が大きいため、可能なら実機で試してから選んでください。"
    };

    return {
      game,
      current,
      target,
      monitor,
      ram,
      budget,
      ranked,
      allRanked,
      topRecommendation: ranked[0].key,
      advice: adviceByCategory[ranked[0].key]
    };
  }

  return { diagnoseInputs, recommendationCategories };
});
