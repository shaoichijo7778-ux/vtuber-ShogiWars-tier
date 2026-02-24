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
  const headers = lines[0]
    .replace(/\uFEFF/g, "")
    .replace(/[\r\n\t]/g, "")
    .split(",")
    .map(h => h.trim());

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
//  ハンドル → チャンネルID 変換（元の安定版）
// ===============================
async function handleToChannelId(handle) {
  if (!handle.startsWith("@")) {
    handle = "@" + handle;
  }

  // ① forHandle（軽量）
  {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${handle}&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.items && data.items.length > 0) {
      return data.items[0].id;
    }
  }

  // ② fallback 条件：ハンドルにハイフンが含まれる場合のみ
  if (!handle.includes("-")) {
    console.warn("forHandle 失敗（fallback しない）:", handle);
    return null;
  }

  // ③ fallback：search API（重いので必要なときだけ）
  {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${handle}&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.items && data.items.length > 0) {
      return data.items[0].snippet.channelId;
    }
  }

  console.warn("チャンネル取得失敗:", handle);
  return null;
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
    channelId: channelId
  };
}

// ===============================
//  段級位の行にアイコンを置く
// ===============================
function placeIcon(info, rankCode, mode) {
  if (!rankCode) return;

  rankCode = rankCode
    .replace(/[\r\n\t]/g, "")
    .replace(/\uFEFF/g, "")
    .trim();

  const table = document.querySelector(`.tier-table[data-mode="${mode}"]`);
  if (!table) return;

  const row = table.querySelector(`.tier-row[data-rank="${rankCode}"] .icons`);
  if (!row) return;

  const exists = row.querySelector(`img[data-channel-id="${info.channelId}"]`);
  if (exists) return;

  const a = document.createElement("a");
  a.href = info.url;
  a.target = "_blank";

  // ▼ ツールチップ表示用（名前だけ）
  a.dataset.tooltip = info.title;

  // ▼ CSV 出力用（JSON）
  a.dataset.json = JSON.stringify({
    name: info.title,
    rank: rankCode,
    url: info.url
  });

  const img = document.createElement("img");
  img.src = info.icon;
  img.alt = info.title;
  img.dataset.channelId = info.channelId;

  a.appendChild(img);
  row.appendChild(a);
}

// ===============================
//  メイン処理：CSV → アイコン配置（元の安定版）
// ===============================
async function main() {
  const vtubers = await loadCSV();
  const updatedCSV = []; // ← 保存用

  for (const vt of vtubers) {
    console.log("vt:", vt);

    let channelId = vt.channelId;

    // ① channelId が空なら API で取得
    if (!channelId) {
      channelId = await handleToChannelId(vt.handle);
    }

    // 取得できなかったらスキップ
    if (!channelId) {
      updatedCSV.push({ ...vt, channelId: "" });
      continue;
    }

    // ② アイコン取得（channelId があれば API 1回だけ）
    const info = await fetchYouTubeIcon(channelId);
    if (!info) {
      updatedCSV.push({ ...vt, channelId: "" });
      continue;
    }

    // ③ 表に配置
    placeIcon(info, vt.wars10m, "10m");
    placeIcon(info, vt.wars3m, "3m");
    placeIcon(info, vt.wars10s, "10s");

    // ④ 成功した channelId を保存
    updatedCSV.push({ ...vt, channelId });
  }

  // ⑤ 更新後CSVをダウンロード
  downloadUpdatedCSV(updatedCSV);
}


main();

// ===============================
// タブ切り替え
// ===============================
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    const mode = tab.dataset.mode;

    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    document.querySelectorAll(".tier-table").forEach(table => {
      table.style.display = (table.dataset.mode === mode) ? "block" : "none";
    });
  });
});

// ===============================
// CSV 出力
// ===============================
document.getElementById("export-all").addEventListener("click", () => {
  const activeMode = document.querySelector(".tab.active").dataset.mode;
  const table = document.querySelector(`.tier-table[data-mode="${activeMode}"]`);

  const rows = table.querySelectorAll(".tier-row");
  const data = [];

  rows.forEach(row => {
    const icons = row.querySelectorAll("a");

    icons.forEach(a => {
      const info = JSON.parse(a.dataset.json);
      data.push({
        name: info.name,
        rank: info.rank,
        url: a.href
      });
    });
  });

  exportCSV(data, `vtubers_${activeMode}.csv`);
});

document.querySelectorAll(".export-row").forEach(btn => {
  btn.addEventListener("click", () => {
    const activeMode = document.querySelector(".tab.active").dataset.mode;
    const row = btn.closest(".tier-row");
    const rank = row.dataset.rank;
    const icons = row.querySelectorAll("a");

    const data = [];

    icons.forEach(a => {
      const info = JSON.parse(a.dataset.json);
      data.push({
        name: info.name,
        rank: info.rank,
        url: a.href
      });
    });

    exportCSV(data, `vtubers_${activeMode}_${rank}.csv`);
  });
});

// ===============================
// CSV 出力関数（BOM + CRLF）
// ===============================
function exportCSV(data, filename) {
  if (data.length === 0) {
    alert("データがありません");
    return;
  }

  const escape = (value) => `"${String(value).replace(/"/g, '""')}"`;

  const header = Object.keys(data[0]).map(escape).join(",");
  const rows = data.map(obj => Object.values(obj).map(escape).join(","));
  const csv = [header, ...rows].join("\r\n");

  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);

  const blob = new Blob([bom, csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}


function downloadUpdatedCSV(data) {
  const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;

  const header = Object.keys(data[0]).map(escape).join(",");
  const rows = data.map(obj => Object.values(obj).map(escape).join(","));
  const csv = [header, ...rows].join("\r\n");

  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const blob = new Blob([bom, csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "vtubers_updated.csv";
  a.click();

  URL.revokeObjectURL(url);
}
