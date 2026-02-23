// ===============================
//  YouTube APIキーを入れる
// ===============================
const YOUTUBE_API_KEY = "AIzaSyC3__dfDFez4-k5zhhe-RBgbF-o3CwQLec";

// ===============================
//  YouTube API からアイコン取得
// ===============================
async function fetchYouTubeIcon(channelId) {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${YOUTUBE_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.items || data.items.length === 0) {
      console.warn("チャンネルが見つかりません:", channelId);
      return null;
    }

    const snippet = data.items[0].snippet;

    return {
      title: snippet.title,
      icon: snippet.thumbnails.high.url,
      url: `https://www.youtube.com/channel/${channelId}`
    };

  } catch (e) {
    console.error("YouTube API エラー:", e);
    return null;
  }
}

// ===============================
//  段級位の行にアイコンを追加
// ===============================
async function addVtuberToRank(channelId, rankCode) {
  const info = await fetchYouTubeIcon(channelId);
  if (!info) return;

  const row = document.querySelector(`.tier-row[data-rank="${rankCode}"] .icons`);
  if (!row) {
    console.error("段級位が存在しません:", rankCode);
    return;
  }

  const a = document.createElement("a");
  a.href = info.url;
  a.target = "_blank";
  a.rel = "noopener";

  const img = document.createElement("img");
  img.src = info.icon;
  img.alt = info.title;

  a.appendChild(img);
  row.appendChild(a);
}

// ===============================
//  タブ切り替え（10分 / 3分 / 10秒）
// ===============================
document.querySelectorAll(".tabs button").forEach(btn => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;
    document.body.dataset.mode = mode;

    // タブの見た目を更新
    document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

// ===============================
//  将棋ウォーズAPIから段級位を取得
// ===============================
async function fetchWarsRank(warsId) {
  const url = `https://api.shogiwars.heroz.jp/users/${warsId}/stats`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    return {
      "10m": data["10m"]?.rate ?? null,
      "3m": data["3m"]?.rate ?? null,
      "10s": data["10s"]?.rate ?? null
    };

  } catch (e) {
    console.error("将棋ウォーズAPIエラー:", e);
    return null;
  }
}


// ===============================
//  段級位 → rankコード変換
// ===============================
function convertRank(rate) {
  if (rate === null) return null;

  if (rate >= 7) return "7d";
  if (rate >= 6) return "6d";
  if (rate >= 5) return "5d";
  if (rate >= 4) return "4d";
  if (rate >= 3) return "3d";
  if (rate >= 2) return "2d";
  if (rate >= 1) return "1d";

  // ここから級位
  if (rate >= -1) return "1k";
  if (rate >= -2) return "2k";
  if (rate >= -3) return "3k";
  if (rate >= -4) return "4k";
  if (rate >= -5) return "5k";
  if (rate >= -6) return "6k";
  if (rate >= -7) return "7k";
  if (rate >= -8) return "8k";
  return "9k";
}

// ===============================
//  Vtuber情報をまとめて処理
// ===============================
async function addVtuberByWarsId(channelId, warsId) {
  // ① YouTubeアイコン取得
  const info = await fetchYouTubeIcon(channelId);
  if (!info) return;

  // ② 将棋ウォーズ段級位取得
  const ranks = await fetchWarsRank(warsId);
  if (!ranks) return;

  // ③ 10分 / 3分 / 10秒 の rankコードに変換
  const rank10m = convertRank(ranks["10m"]);
  const rank3m  = convertRank(ranks["3m"]);
  const rank10s = convertRank(ranks["10s"]);

  // ④ 各モードの段級位行にアイコンを追加
  placeIcon(info, rank10m, "10m");
  placeIcon(info, rank3m,  "3m");
  placeIcon(info, rank10s, "10s");
}

// ===============================
//  指定モードの段級位行にアイコンを置く
// ===============================
function placeIcon(info, rankCode, mode) {
  if (!rankCode) return;

  const selector = `.tier-row[data-rank="${rankCode}"] .icons`;
  const row = document.querySelector(selector);
  if (!row) return;

  const a = document.createElement("a");
  a.href = info.url;
  a.target = "_blank";

  const img = document.createElement("img");
  img.src = info.icon;
  img.alt = info.title;

  a.appendChild(img);
  row.appendChild(a);
}


// ===============================
//  ▼ テスト用：ここにVtuberを追加
// ===============================

 addVtuberToRank("UCR05GknrVn_c5VO5kA24t5g", "7d");
 addVtuberToRank("UCEMHQxtepl_onOALX8ALzMg", "7d");
 addVtuberByWarsId("UCEMHQxtepl_onOALX8ALzMg", "xiaosen0439");
 fetchWarsRank("xiaosen0439");


// addVtuberToRank("UCzzzzzzz", "1k");

// ↑ あなたの好きなVtuberのチャンネルIDを入れてテストしてね
