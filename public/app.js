const state = {
  channel: "other",
  channelUserId: "demo_user_001",
  sessionId: "web_ui",
  gameState: null,
};

const el = {
  channel: document.getElementById("channel"),
  channelUserId: document.getElementById("channelUserId"),
  log: document.getElementById("log"),
  input: document.getElementById("input"),
  stateText: document.getElementById("stateText"),
  hpBar: document.getElementById("hpBar"),
  mpBar: document.getElementById("mpBar"),
  cvBar: document.getElementById("cvBar"),
  toxBar: document.getElementById("toxBar"),
  hpVal: document.getElementById("hpVal"),
  mpVal: document.getElementById("mpVal"),
  cvVal: document.getElementById("cvVal"),
  toxVal: document.getElementById("toxVal"),
  pillSummary: document.getElementById("pillSummary"),
  pillQuality: document.getElementById("pillQuality"),
  pillBuff: document.getElementById("pillBuff"),
  idleHours: document.getElementById("idleHours"),
  idleEta: document.getElementById("idleEta"),
  idleLock: document.getElementById("idleLock"),
  idleBadge: document.getElementById("idleBadge"),
  idleBadgeText: document.getElementById("idleBadgeText"),
  inventoryPills: document.getElementById("inventoryPills"),
  inventoryItems: document.getElementById("inventoryItems"),
  inventoryQuest: document.getElementById("inventoryQuest"),
  assetDiag: document.getElementById("assetDiag"),
  avatarPreview: document.getElementById("avatarPreview"),
  avatarUpload: document.getElementById("avatarUpload"),
  btnAvatarMale: document.getElementById("btnAvatarMale"),
  btnAvatarFemale: document.getElementById("btnAvatarFemale"),
  suggestionActions: document.getElementById("suggestionActions"),
  intelGoal: document.getElementById("intelGoal"),
  intelEvent: document.getElementById("intelEvent"),
  intelStage: document.getElementById("intelStage"),
  intelTension: document.getElementById("intelTension"),
  intelTips: document.getElementById("intelTips"),
};

function addLog(text, who = "sys") {
  const div = document.createElement("div");
  div.className = `msg ${who === "user" ? "user" : ""}`;
  div.textContent = text;
  el.log.prepend(div);
}

async function sendCommand(text) {
  const payload = {
    session_id: state.sessionId,
    channel: state.channel,
    channel_user_id: state.channelUserId,
    global_user_id: state.channelUserId,
    text,
    timestamp: new Date().toISOString(),
  };

  addLog(`你: ${text}`, "user");

  const resp = await fetch("/webhooks/openclaw", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await resp.json();
  if (!resp.ok) {
    addLog(`请求失败: ${JSON.stringify(data)}`);
    return;
  }

  state.gameState = data.game_state ?? null;
  addLog(data.reply_text || "(无回复)");
  renderByResponse(data);
}

function parseHpMp(text) {
  const hp = text.match(/HP\s*(\d+)\/100/);
  const mp = text.match(/MP\s*(\d+)\/100/);
  return {
    hp: hp ? Number(hp[1]) : 0,
    mp: mp ? Number(mp[1]) : 0,
  };
}

function parseCultivation(text) {
  const m = text.match(/真元:\s*(\d+)\/(\d+)/);
  if (!m) return { current: 0, max: 1 };
  return { current: Number(m[1]), max: Number(m[2]) || 1 };
}

function getCultivation(data, text) {
  const gc = data.game_state?.cultivation;
  if (gc && Number.isFinite(gc.current) && Number.isFinite(gc.max)) {
    return { current: Number(gc.current), max: Math.max(1, Number(gc.max)) };
  }
  return parseCultivation(text);
}

function renderInventoryTo(container, items, minSlots = 4) {
  container.innerHTML = "";
  const list = (items || []).map((s) => String(s || "").trim()).filter(Boolean);
  const total = Math.max(minSlots, list.length);
  for (let i = 0; i < total; i += 1) {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.textContent = list[i] || "空";
    container.appendChild(slot);
  }
}

function splitInventory(items) {
  const src = (items || []).map((s) => String(s || "").trim()).filter(Boolean);
  const pills = [];
  const quest = [];
  const gear = [];
  for (const it of src) {
    if (/丹/.test(it)) {
      pills.push(it);
    } else if (/令牌|悟道|残篇|线图|凭证|信物/.test(it)) {
      quest.push(it);
    } else {
      gear.push(it);
    }
  }
  return { pills, quest, gear };
}

function parseInventoryByText(txt) {
  const items = txt.match(/🏺\s*物\s*品\s*:\s*(.*)/);
  if (!items?.[1]) return [];
  return items[1].split(",").map((s) => s.trim()).filter(Boolean);
}

function renderSuggestionActions(suggestions) {
  el.suggestionActions.innerHTML = "";
  const list = (suggestions || []).slice(0, 8);
  for (const cmd of list) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = cmd;
    btn.dataset.cmd = cmd;
    btn.addEventListener("click", () => sendCommand(cmd));
    el.suggestionActions.appendChild(btn);
  }
}

function renderByResponse(data) {
  const txt = data.reply_text || "";
  el.stateText.textContent = txt;

  const { hp, mp } = parseHpMp(txt);
  const cv = getCultivation(data, txt);
  el.hpBar.value = hp;
  el.mpBar.value = mp;
  el.cvBar.max = cv.max;
  el.cvBar.value = cv.current;
  el.hpVal.textContent = `${hp}`;
  el.mpVal.textContent = `${mp}`;
  el.cvVal.textContent = `${cv.current}/${cv.max}`;
  const toxicity = Number(data.game_state?.pill_toxicity ?? 0);
  el.toxBar.value = Math.max(0, Math.min(100, toxicity));
  el.toxVal.textContent = `${Math.max(0, Math.min(100, toxicity))}/100`;

  const idle = data.game_state?.idle;
  if (idle?.active) {
    el.idleLock.textContent = "已开启";
    el.idleEta.textContent = idle.endsAt || "未知";
    el.idleBadge.src = "./assets/ui/icon-idle-on.png";
    el.idleBadgeText.textContent = "当前：挂机中（状态锁开启）";
    el.input.placeholder = "挂机中：仅可发送 挂机状态 / 领取挂机 / 结束挂机";
  } else {
    el.idleLock.textContent = "未开启";
    el.idleEta.textContent = "-";
    el.idleBadge.src = "./assets/ui/icon-idle-off.png";
    el.idleBadgeText.textContent = "当前：未挂机";
    el.input.placeholder = "自然语言输入，例如：我先打坐修炼一会、去坊市买点药";
  }

  const inventoryList = data.game_state?.inventory_list;
  let merged = [];
  if (Array.isArray(inventoryList) && inventoryList.length > 0) {
    merged = inventoryList;
  } else if (typeof data.game_state?.inventory_text === "string" && data.game_state.inventory_text.trim()) {
    merged = data.game_state.inventory_text.split(",");
  } else {
    merged = parseInventoryByText(txt);
  }
  const inv = splitInventory(merged);
  renderInventoryTo(el.inventoryPills, inv.pills, 3);
  renderInventoryTo(el.inventoryItems, inv.gear, 3);
  renderInventoryTo(el.inventoryQuest, inv.quest, 2);

  const pills = data.game_state?.pills || {};
  el.pillSummary.textContent = `丹药：纳气丹(${Number(pills.nourishQi || 0)}) / 回春丹(${Number(pills.heal || 0)}) / 凝神丹(${Number(pills.focus || 0)})`;
  el.pillQuality.textContent = `品质：${data.game_state?.last_pill_quality || "无"}`;
  const buffTurns = Number(data.game_state?.focus_buff_turns || 0);
  el.pillBuff.textContent = `丹效：${buffTurns > 0 ? `凝神加成(${buffTurns}回合)` : "无"}`;

  renderSuggestionActions(data.next_suggestions || []);

  const ge = data.game_state?.world_event || {};
  el.intelGoal.textContent = extractGoalFromText(txt) || "暂无";
  el.intelEvent.textContent = ge.name || "暂无";
  el.intelStage.textContent = ge.stage || "-";
  el.intelTension.textContent = Number.isFinite(Number(ge.tension)) ? String(ge.tension) : "0";
  const tips = (data.next_suggestions || []).slice(0, 3).join(" / ");
  el.intelTips.textContent = tips ? `建议：${tips}` : "建议：先闭关稳修，再去坊市补给。";

  const preset = data.game_state?.avatar?.preset;
  if (preset === "male") setAvatarPreset("male");
  if (preset === "female") setAvatarPreset("female");
}

function extractGoalFromText(text) {
  const m = text.match(/🎯\s*目\s*标\s*:\s*(.*)/);
  return m?.[1]?.trim() || "";
}

async function loadState() {
  state.channel = el.channel.value;
  state.channelUserId = el.channelUserId.value.trim() || "demo_user_001";
  const resp = await fetch(`/state/${state.channel}/${state.channelUserId}`);
  const data = await resp.json();
  addLog(`状态已加载: mode=${data.mode}`);
  if (data.mode !== "xianxia") {
    await sendCommand("切换修仙");
  } else {
    await sendCommand("挂机状态");
  }
  loadAvatarFromStorage();
}

function avatarStorageKey() {
  return `xianxia_avatar_${state.channel}_${state.channelUserId}`;
}

function setAvatarPreset(preset) {
  if (preset === "male") {
    el.avatarPreview.src = "./assets/ui/avatar-male.png";
  } else if (preset === "female") {
    el.avatarPreview.src = "./assets/ui/avatar-female.png";
  }
}

function loadAvatarFromStorage() {
  const v = localStorage.getItem(avatarStorageKey());
  if (!v) return;
  try {
    const parsed = JSON.parse(v);
    if (parsed.type === "custom" && parsed.dataUrl) {
      el.avatarPreview.src = parsed.dataUrl;
    } else if (parsed.type === "male" || parsed.type === "female") {
      setAvatarPreset(parsed.type);
    }
  } catch {
    // ignore
  }
}

function saveAvatarToStorage(payload) {
  localStorage.setItem(avatarStorageKey(), JSON.stringify(payload));
}

async function checkAssets() {
  const paths = [
    "./styles.css",
    "./assets/map/world-map-main.png",
    "./assets/ui/icon-idle-on.png",
    "./assets/ui/icon-idle-off.png",
    "./assets/ui/icon-poi.png",
    "./assets/ui/panel-bg.png",
    "./assets/ui/button-main.png",
    "./assets/ui/avatar-male.png",
    "./assets/ui/avatar-female.png",
  ];
  const results = await Promise.all(
    paths.map(async (p) => {
      try {
        const r = await fetch(`${p}?v=${Date.now()}`, { method: "HEAD" });
        return { p, ok: r.ok };
      } catch {
        return { p, ok: false };
      }
    }),
  );
  const missing = results.filter((x) => !x.ok).map((x) => x.p);
  if (missing.length === 0) {
    el.assetDiag.textContent = "素材加载正常";
    el.assetDiag.style.borderColor = "#3d7b52";
    el.assetDiag.style.color = "#c3f3d1";
  } else {
    el.assetDiag.textContent = `素材缺失: ${missing.join(", ")}`;
    el.assetDiag.style.borderColor = "#8e4f4f";
    el.assetDiag.style.color = "#ffd0d0";
  }
}

document.getElementById("btnLoad").addEventListener("click", loadState);
document.getElementById("btnSend").addEventListener("click", async () => {
  const text = el.input.value.trim();
  if (!text) return;
  el.input.value = "";
  await sendCommand(text);
});

document.querySelectorAll(".quick-actions button").forEach((btn) => {
  btn.addEventListener("click", () => sendCommand(btn.dataset.cmd));
});

document.getElementById("btnIdleStart").addEventListener("click", () => {
  const h = Number(el.idleHours.value || 1);
  sendCommand(`开始挂机${h}小时`);
});
document.getElementById("btnIdleClaim").addEventListener("click", () => sendCommand("领取挂机"));
document.getElementById("btnIdleExit").addEventListener("click", () => sendCommand("结束挂机"));

document.querySelectorAll(".poi").forEach((btn) => {
  btn.addEventListener("click", () => {
    const scene = btn.dataset.scene || "未知区域";
    sendCommand(`前往${scene}`);
  });
});

el.btnAvatarMale.addEventListener("click", async () => {
  setAvatarPreset("male");
  saveAvatarToStorage({ type: "male" });
  await sendCommand("选择男修");
});

el.btnAvatarFemale.addEventListener("click", async () => {
  setAvatarPreset("female");
  saveAvatarToStorage({ type: "female" });
  await sendCommand("选择女修");
});

el.avatarUpload.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    const dataUrl = String(reader.result || "");
    if (!dataUrl) return;
    el.avatarPreview.src = dataUrl;
    saveAvatarToStorage({ type: "custom", dataUrl });
    await sendCommand("选择自定义立绘");
  };
  reader.readAsDataURL(file);
});

loadState();
checkAssets();
