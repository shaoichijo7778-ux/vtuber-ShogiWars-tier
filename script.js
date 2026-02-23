// ===============================
//  YouTube APIキーを入れる
// ===============================
const API_KEY = "AIzaSyC3__dfDFez4-k5zhhe-RBgbF-o3CwQLec";

// ===============================
//  CSV を読み込む
// ===============================
async function loadCSV() {
  const res = await fetch("vtubers.csv");
  let text = await res.text();

  // ▼ CSV 全体から BOM を除去
  text = text.replace(/\uFEFF/g, "");

  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");

  return lines.slice(1).map(line => {
    const cols = line.split(",");
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = cols[i] ? cols[i].replace(/[\r\n\t]/g, "").trim() : "";
    });
    return obj;
  });
}


// ===============================
//  ハンドル → チャンネルID 変換
// ===============================
async function handleToChannelId(handle) {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${handle}&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.items || data.items.length === 0) {
    console.warn("チャンネルが見つかりません:", handle);
    return null;
  }

  return data.items[0].id;
}

// ===============================
//  チャンネルID → アイコン取得
// ===============================
async function fetchYouTubeIcon(channelId) {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.items || data.items.length === 0) return null;

  const snippet = data.items[0].snippet;

  return {
    title: snippet.title,
    icon: snippet.thumbnails.high.url,
    url: `https://www.youtube.com/channel/${channelId}`,
    channelId: channelId   // ← ★これが必須！
  };
}


// ===============================
//  段級位の行にアイコンを置く
// ===============================
function placeIcon(info, rankCode, mode) {
  if (!rankCode) return;
  
  rankCode = rankCode
  .replace(/[\r\n\t]/g, "")  // 改行・タブ除去
  .replace(/\uFEFF/g, "")    // BOM除去
  .trim();                   // 前後の空白除去


  // ▼ 正しい表（10m / 3m / 10s）を選ぶ
  const table = document.querySelector(`.tier-table[data-mode="${mode}"]`);
  if (!table) return;

  // ▼ その表の中から正しい段級位を探す
  const row = table.querySelector(`.tier-row[data-rank="${rankCode}"] .icons`);
  if (!row) return;

  // ▼ 重複防止
  const exists = row.querySelector(`img[data-channel-id="${info.channelId}"]`);
  if (exists) return;

  const a = document.createElement("a");
  a.href = info.url;
  a.target = "_blank";

  const img = document.createElement("img");
  img.src = info.icon;
  img.alt = info.title;
  img.dataset.channelId = info.channelId;

  a.appendChild(img);
  row.appendChild(a);
}


// ===============================
//  メイン処理：CSV → アイコン配置
// ===============================
async function main() {
  const vtubers = await loadCSV();

  for (const vt of vtubers) {
    // ① ハンドル → チャンネルID
    const channelId = await handleToChannelId(vt.handle);
    if (!channelId) continue;

    // ② アイコン取得
    const info = await fetchYouTubeIcon(channelId);
    if (!info) continue;

    // ③ 段級位ごとに配置
	placeIcon(info, vt.wars10m, "10m");
	placeIcon(info, vt.wars3m, "3m");
	placeIcon(info, vt.wars10s, "10s");
  }
}

main();

// ===============================
// タブ切り替え
// ===============================
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    const mode = tab.dataset.mode; // "10m" / "3m" / "10s"

    // タブの見た目を更新
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    // 表示切り替え
    document.querySelectorAll(".tier-table").forEach(table => {
      table.style.display = (table.dataset.mode === mode) ? "block" : "none";
    });
  });
});
