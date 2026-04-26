const STORAGE_KEY = "tira-time-players";
const SAVED_KEY = "tira-time-saved-list";
const THEME_KEY = "tira-time-theme";
const SETTINGS_KEY = "tira-time-settings";

let players = [];
let currentRating = 3;
let editingPlayerId = null;
let lastTeams = null;

const el = {};

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  bindEvents();
  loadTheme();
  loadPlayers();
  loadSettings();
  renderRatingInput();
  renderPlayers();
  updateDrawHint();
});

function bindElements() {
  [
    "playerForm", "playerName", "ratingInput", "isGoalkeeper", "submitPlayer",
    "cancelEdit", "bulkNames", "bulkAdd", "searchPlayer", "sortPlayers",
    "playersList", "playerCount", "ratingSum", "keeperCount", "savePlayers",
    "loadPlayers", "exportPlayers", "openImport", "jsonBox", "jsonData",
    "importPlayers", "closeJson", "clearPlayers", "teamCount",
    "playersPerTeam", "allowReserves", "goalkeepersFirst", "generateTeams",
    "drawHint", "teamsSection", "teamsList", "reservesList", "balanceLabel",
    "copyTeams", "openImageShare", "imageDialog", "closeImageDialog",
    "imageTeamSelect", "teamCanvas", "downloadImage", "shareImage",
    "cancelImageDialog", "themeToggle", "toast", "newDrawTop", "newDrawInline",
    "summaryPlayers", "summaryKeepers", "summaryRating", "summaryAverage",
    "drawPreviewText", "teamsMirror"
  ].forEach((id) => {
    el[id] = document.getElementById(id);
  });

  el.tabButtons = [...document.querySelectorAll("[data-tab]")];
  el.tabPanels = [...document.querySelectorAll("[data-tab-panel]")];
  el.stepButtons = [...document.querySelectorAll("[data-step-target]")];
}

function bindEvents() {
  el.playerForm.addEventListener("submit", addPlayer);
  el.cancelEdit.addEventListener("click", resetForm);
  el.bulkAdd.addEventListener("click", addBulkPlayers);
  el.searchPlayer.addEventListener("input", renderPlayers);
  el.sortPlayers.addEventListener("change", renderPlayers);
  el.savePlayers.addEventListener("click", savePlayers);
  el.loadPlayers.addEventListener("click", loadSavedPlayers);
  el.exportPlayers.addEventListener("click", exportPlayers);
  el.openImport.addEventListener("click", () => el.jsonBox.classList.toggle("hidden"));
  el.closeJson.addEventListener("click", () => el.jsonBox.classList.add("hidden"));
  el.importPlayers.addEventListener("click", importPlayers);
  el.clearPlayers.addEventListener("click", clearPlayers);
  el.generateTeams.addEventListener("click", generateTeams);
  el.newDrawTop.addEventListener("click", generateTeams);
  el.newDrawInline.addEventListener("click", generateTeams);
  el.copyTeams.addEventListener("click", copyTeams);
  el.openImageShare.addEventListener("click", () => openShareImageModal());
  el.closeImageDialog.addEventListener("click", () => el.imageDialog.close());
  el.cancelImageDialog.addEventListener("click", () => el.imageDialog.close());
  el.imageTeamSelect.addEventListener("change", drawSelectedTeamImage);
  el.downloadImage.addEventListener("click", downloadTeamImage);
  el.shareImage.addEventListener("click", shareTeamImage);
  el.themeToggle.addEventListener("click", toggleTheme);

  el.tabButtons.forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tab));
  });

  el.stepButtons.forEach((button) => {
    button.addEventListener("click", () => stepNumberInput(button.dataset.stepTarget, Number(button.dataset.step)));
  });

  [el.teamCount, el.playersPerTeam, el.allowReserves, el.goalkeepersFirst].forEach((field) => {
    field.addEventListener("change", () => {
      persistSettings();
      updateDrawHint();
    });
    field.addEventListener("input", updateDrawHint);
  });
}

function activateTab(tabName) {
  el.tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });
  el.tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.tabPanel === tabName);
  });
  document.body.dataset.activeTab = tabName;
}

function stepNumberInput(inputId, step) {
  const input = el[inputId];
  if (!input) return;
  const min = Number(input.min) || 0;
  const max = Number(input.max) || 99;
  const nextValue = Math.min(max, Math.max(min, Number(input.value || min) + step));
  input.value = nextValue;
  persistSettings();
  updateDrawHint();
}

function addPlayer(event) {
  event.preventDefault();
  const name = normalizeName(el.playerName.value);
  const rating = normalizeRating(currentRating);
  const isGoalkeeper = el.isGoalkeeper.checked;

  if (!name) {
    showToast("Informe o nome do jogador.");
    return;
  }

  const duplicate = players.some((player) =>
    player.id !== editingPlayerId && normalizeName(player.name).toLowerCase() === name.toLowerCase()
  );

  if (duplicate) {
    showToast("Já existe um jogador com esse nome.");
    return;
  }

  if (editingPlayerId) {
    const player = players.find((item) => item.id === editingPlayerId);
    if (player) {
      player.name = name;
      player.rating = rating;
      player.isGoalkeeper = isGoalkeeper;
      showToast("Jogador atualizado.");
    }
  } else {
    players.push({
      id: createPlayerId(),
      name,
      rating,
      isGoalkeeper,
      createdAt: Date.now()
    });
    showToast("Jogador adicionado.");
  }

  persistPlayers();
  resetForm();
  renderPlayers();
  updateDrawHint();
}

function addBulkPlayers() {
  const names = el.bulkNames.value
    .split(/\r?\n/)
    .map(normalizeName)
    .filter(Boolean);

  if (!names.length) {
    showToast("Cole pelo menos um nome.");
    return;
  }

  let added = 0;
  names.forEach((name) => {
    const exists = players.some((player) => normalizeName(player.name).toLowerCase() === name.toLowerCase());
    if (!exists) {
      players.push({
        id: createPlayerId(),
        name,
        rating: 3,
        isGoalkeeper: false,
        createdAt: Date.now() + added
      });
      added += 1;
    }
  });

  el.bulkNames.value = "";
  persistPlayers();
  renderPlayers();
  updateDrawHint();
  showToast(added ? `${added} jogador(es) adicionados com nota 3.` : "Todos os nomes já estavam cadastrados.");
}

function removePlayer(id) {
  players = players.filter((player) => player.id !== id);
  persistPlayers();
  renderPlayers();
  updateDrawHint();
  showToast("Jogador removido.");
}

function editPlayer(id) {
  const player = players.find((item) => item.id === id);
  if (!player) return;
  editingPlayerId = id;
  el.playerName.value = player.name;
  currentRating = normalizeRating(player.rating);
  el.isGoalkeeper.checked = player.isGoalkeeper;
  el.submitPlayer.textContent = "Salvar alteração";
  el.cancelEdit.classList.remove("hidden");
  renderRatingInput();
  el.playerName.focus();
}

function clearPlayers() {
  if (!players.length) {
    showToast("A lista já está vazia.");
    return;
  }
  if (!confirm("Apagar todos os jogadores cadastrados?")) return;
  players = [];
  lastTeams = null;
  persistPlayers();
  renderPlayers();
  renderTeams(null);
  updateDrawHint();
  showToast("Todos os jogadores foram apagados.");
}

function savePlayers() {
  localStorage.setItem(SAVED_KEY, JSON.stringify(players));
  persistPlayers();
  showToast("Lista salva.");
}

function loadPlayers() {
  try {
    players = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]").map(sanitizePlayer);
  } catch {
    players = [];
    showToast("Dados locais inválidos foram ignorados.");
  }
}

function loadSavedPlayers() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]").map(sanitizePlayer);
    players = saved;
    persistPlayers();
    renderPlayers();
    updateDrawHint();
    showToast("Lista salva carregada.");
  } catch {
    showToast("Não foi possível carregar a lista salva.");
  }
}

function persistPlayers() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
}

function exportPlayers() {
  el.jsonBox.classList.remove("hidden");
  el.jsonData.value = JSON.stringify(players.map(({ name, rating, isGoalkeeper }) => ({
    name,
    rating,
    isGoalkeeper
  })), null, 2);
  el.jsonData.select();
  showToast("JSON pronto para copiar.");
}

function importPlayers() {
  try {
    const data = JSON.parse(el.jsonData.value);
    if (!Array.isArray(data)) {
      throw new Error("O JSON precisa ser uma lista.");
    }

    const imported = data.map(sanitizePlayer);
    const seen = new Set();
    players = imported.filter((player) => {
      const key = normalizeName(player.name).toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    persistPlayers();
    renderPlayers();
    updateDrawHint();
    el.jsonBox.classList.add("hidden");
    showToast("Jogadores importados.");
  } catch (error) {
    showToast(`JSON inválido: ${error.message}`);
  }
}

function generateTeams() {
  const teamCount = Number(el.teamCount.value);
  const playersPerTeam = Number(el.playersPerTeam.value);
  const allowReserves = el.allowReserves.checked;

  if (!players.length) {
    showToast("Cadastre jogadores antes de sortear.");
    return;
  }
  if (teamCount > players.length) {
    showToast("O número de times não pode ser maior que o número de jogadores.");
    return;
  }
  if (teamCount < 2 || playersPerTeam < 1) {
    showToast("Configure pelo menos 2 times e 1 jogador por time.");
    return;
  }

  const capacity = teamCount * playersPerTeam;
  if (!allowReserves && players.length > capacity) {
    showToast(`Há ${players.length - capacity} jogador(es) sobrando. Permita reservas ou aumente as vagas.`);
    return;
  }
  if (players.length < capacity) {
    showToast(`Faltam ${capacity - players.length} jogador(es) para completar todos os times.`);
  }

  const result = balanceTeams({
    sourcePlayers: players,
    teamCount,
    playersPerTeam,
    goalkeepersFirst: el.goalkeepersFirst.checked
  });

  lastTeams = result;
  persistSettings();
  renderTeams(result);
  activateTab("draw");
  showToast("Times sorteados.");
}

function balanceTeams({ sourcePlayers, teamCount, playersPerTeam, goalkeepersFirst }) {
  const capacity = teamCount * playersPerTeam;
  const shuffled = shuffle(sourcePlayers.map(sanitizePlayer));
  const selected = shuffled.slice(0, capacity);
  const reserves = shuffled.slice(capacity);
  const goalkeepers = selected
    .filter((player) => player.isGoalkeeper)
    .sort((a, b) => b.rating - a.rating);
  const fieldPlayers = selected
    .filter((player) => !player.isGoalkeeper)
    .sort((a, b) => b.rating - a.rating);

  const teams = Array.from({ length: teamCount }, (_, index) => ({
    name: `Time ${index + 1}`,
    players: [],
    total: 0,
    goalkeepers: 0
  }));

  const addToTeam = (team, player) => {
    team.players.push(player);
    team.total += normalizeRating(player.rating);
    if (player.isGoalkeeper) team.goalkeepers += 1;
  };

  if (goalkeepersFirst) {
    goalkeepers.forEach((player) => addToTeam(bestTeamForGoalkeeper(teams, playersPerTeam), player));
    fieldPlayers.forEach((player) => addToTeam(bestTeamForPlayer(teams, playersPerTeam), player));
  } else {
    [...goalkeepers, ...fieldPlayers]
      .sort((a, b) => b.rating - a.rating)
      .forEach((player) => addToTeam(bestTeamForPlayer(teams, playersPerTeam), player));
  }

  const totals = teams.map((team) => team.total);
  const diff = totals.length ? Math.max(...totals) - Math.min(...totals) : 0;

  return {
    teams,
    reserves,
    diff,
    balance: getBalanceLabel(diff)
  };
}

function bestTeamForGoalkeeper(teams, limit) {
  return pickRandomFromBest(teams.filter((team) => team.players.length < limit), [
    (team) => team.goalkeepers,
    (team) => team.total,
    (team) => team.players.length
  ]);
}

function bestTeamForPlayer(teams, limit) {
  return pickRandomFromBest(teams.filter((team) => team.players.length < limit), [
    (team) => team.total,
    (team) => team.players.length
  ]);
}

function pickRandomFromBest(candidates, selectors) {
  let best = [...candidates];
  selectors.forEach((selector) => {
    const min = Math.min(...best.map(selector));
    best = best.filter((item) => selector(item) === min);
  });
  return best[Math.floor(Math.random() * best.length)];
}

function renderPlayers() {
  const query = normalizeName(el.searchPlayer.value).toLowerCase();
  const sorted = getSortedPlayers().filter((player) => player.name.toLowerCase().includes(query));

  el.playerCount.textContent = players.length;
  el.ratingSum.textContent = players.reduce((sum, player) => sum + normalizeRating(player.rating), 0);
  el.keeperCount.textContent = players.filter((player) => player.isGoalkeeper).length;
  renderSummary();

  if (!sorted.length) {
    el.playersList.className = "players-list empty-state";
    el.playersList.textContent = players.length ? "Nenhum jogador encontrado." : "Nenhum jogador cadastrado.";
    return;
  }

  el.playersList.className = "players-list";
  el.playersList.innerHTML = "";

  sorted.forEach((player) => {
    const card = document.createElement("article");
    card.className = `player-card${player.isGoalkeeper ? " is-keeper" : ""}`;
    card.innerHTML = `
      <div class="player-main">
        <span class="player-name">${escapeHtml(player.name)}</span>
        ${player.isGoalkeeper ? '<span class="badge">Goleiro</span>' : ""}
      </div>
      <div class="player-meta">
        <span class="readonly-stars" aria-label="Nota ${player.rating}">${renderStars(player.rating)}</span>
        <div class="inline-actions">
          <button class="button subtle" type="button" data-action="edit">Editar</button>
          <button class="button danger" type="button" data-action="remove">Excluir</button>
        </div>
      </div>
    `;
    card.querySelector('[data-action="edit"]').addEventListener("click", () => editPlayer(player.id));
    card.querySelector('[data-action="remove"]').addEventListener("click", () => removePlayer(player.id));
    el.playersList.appendChild(card);
  });
}

function renderSummary() {
  const total = players.length;
  const keepers = players.filter((player) => player.isGoalkeeper).length;
  const ratingTotal = players.reduce((sum, player) => sum + normalizeRating(player.rating), 0);
  const average = total ? (ratingTotal / total).toFixed(1).replace(".", ",") : "0,0";

  el.summaryPlayers.textContent = total;
  el.summaryKeepers.textContent = keepers;
  el.summaryRating.textContent = ratingTotal;
  el.summaryAverage.textContent = `${average} ★`;
}

function renderTeams(result) {
  if (!result) {
    el.teamsSection.classList.add("hidden");
    el.teamsList.innerHTML = "";
    el.reservesList.innerHTML = "";
    el.drawPreviewText.textContent = "Configure o sorteio e veja os times aqui.";
    el.teamsMirror.textContent = "Sorteie os times na aba “Sortear Times”.";
    return;
  }

  el.teamsSection.classList.remove("hidden");
  el.drawPreviewText.textContent = "Resultado pronto para copiar ou compartilhar como imagem.";
  el.balanceLabel.textContent = `🛡 ${result.balance}! Diferença de ${result.diff} ponto(s)`;
  el.teamsList.innerHTML = "";
  el.reservesList.innerHTML = "";

  result.teams.forEach((team) => {
    const average = team.players.length ? (team.total / team.players.length).toFixed(1) : "0.0";
    const card = document.createElement("article");
    card.className = "team-card";
    card.innerHTML = `
      <div class="team-header">
        <h3>${team.name}</h3>
      </div>
      <div class="team-body">
        <div class="team-stats">
          <span>Soma: ${team.total}</span>
          <span>Média: ${average.replace(".", ",")}</span>
          <span class="readonly-stars">${renderStars(Math.round(Number(average)))}</span>
        </div>
        ${team.players.map((player, index) => `
          <div class="team-player${player.isGoalkeeper ? " keeper" : ""}">
            <span class="team-player-name">
              <span class="player-number">${index + 1}</span>
              <span>${escapeHtml(player.name)}</span>
              ${player.isGoalkeeper ? '<span class="badge">GOL</span>' : ""}
            </span>
            <span class="readonly-stars">${renderStars(player.rating)}</span>
          </div>
        `).join("") || "<p class=\"hint\">Sem jogadores.</p>"}
        <div class="team-footer">
          <span>${result.balance}</span>
        </div>
      </div>
    `;
    el.teamsList.appendChild(card);
  });

  if (result.reserves.length) {
    el.reservesList.innerHTML = `
      <div class="reserve-card">
        <h3>Reservas/sobrando</h3>
        <p>${result.reserves.map((player) => `${escapeHtml(player.name)} (${player.rating})`).join(", ")}</p>
      </div>
    `;
  }

  el.teamsMirror.innerHTML = `
    <div class="teams-list">${el.teamsList.innerHTML}</div>
    ${el.reservesList.innerHTML ? `<div class="reserves-list">${el.reservesList.innerHTML}</div>` : ""}
  `;
}

function renderRatingInput() {
  el.ratingInput.innerHTML = "";
  for (let value = 1; value <= 5; value += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "star-button";
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", String(value === currentRating));
    button.setAttribute("aria-label", `Nota ${value}`);
    button.textContent = value <= currentRating ? "★" : "☆";
    button.addEventListener("click", () => {
      currentRating = value;
      renderRatingInput();
    });
    el.ratingInput.appendChild(button);
  }
}

function getSortedPlayers() {
  const list = [...players];
  const sort = el.sortPlayers.value;
  if (sort === "name") return list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  if (sort === "rating") return list.sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name, "pt-BR"));
  if (sort === "goalkeeper") return list.sort((a, b) => Number(b.isGoalkeeper) - Number(a.isGoalkeeper) || a.name.localeCompare(b.name, "pt-BR"));
  return list.sort((a, b) => a.createdAt - b.createdAt);
}

function copyTeams() {
  if (!lastTeams) {
    showToast("Sorteie os times antes de copiar.");
    return;
  }
  navigator.clipboard.writeText(formatTeamsText(lastTeams))
    .then(() => showToast("Resultado copiado."))
    .catch(() => showToast("Não foi possível copiar automaticamente."));
}

function openShareImageModal(team) {
  if (!lastTeams) {
    showToast("Sorteie os times antes de gerar a imagem.");
    return;
  }

  el.imageTeamSelect.innerHTML = "";
  lastTeams.teams.forEach((team, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = team.name;
    el.imageTeamSelect.appendChild(option);
  });

  if (typeof el.imageDialog.showModal === "function") {
    el.imageDialog.showModal();
  } else {
    el.imageDialog.setAttribute("open", "");
  }
  if (team) {
    const selectedIndex = lastTeams.teams.findIndex((item) => item.name === team.name);
    if (selectedIndex >= 0) el.imageTeamSelect.value = selectedIndex;
  }
  drawSelectedTeamImage();
}

function drawSelectedTeamImage() {
  if (!lastTeams) return;
  const team = lastTeams.teams[Number(el.imageTeamSelect.value) || 0];
  renderTeamImageCanvas(team);
}

function renderTeamImageCanvas(team) {
  const canvas = el.teamCanvas;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const court = { x: 44, y: 250, w: width - 88, h: height - 330 };
  const average = team.players.length ? (team.total / team.players.length).toFixed(1) : "0.0";

  ctx.clearRect(0, 0, width, height);
  drawImageBackground(ctx, width, height);
  drawImageHeader(ctx, team, average);
  drawFutsalCourt(ctx, court);

  const positions = getFutsalPositions(team.players, court);
  const markerRadius = getMarkerRadius(team.players.length);
  team.players.forEach((player, index) => {
    drawPlayerMarker(ctx, player, positions[index], index + 1, markerRadius);
  });

  drawImageFooter(ctx, width, height);
}

function drawImageBackground(ctx, width, height) {
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#07110f");
  bg.addColorStop(0.22, "#0d1815");
  bg.addColorStop(1, "#10261b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 16; i += 1) {
    ctx.fillStyle = `rgba(255,255,255,${i % 2 ? 0.08 : 0.14})`;
    ctx.beginPath();
    ctx.arc(80 + i * 52, 58 + (i % 3) * 14, 9, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawImageHeader(ctx, team, average) {
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 52px Arial";
  ctx.fillText(team.name.toUpperCase(), 450, 86);

  ctx.font = "700 25px Arial";
  ctx.fillText(`Soma: ${team.total} | Média: ${average}`, 450, 135);

  ctx.fillStyle = "#f2b21b";
  ctx.font = "36px Arial";
  ctx.fillText(renderStars(Math.round(average)), 450, 180);

  ctx.fillStyle = "#10261b";
  ctx.strokeStyle = "#78e26e";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(54, 48, 120, 120, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 22px Arial";
  ctx.fillText("TIME", 114, 88);
  ctx.fillText("EQUILIBRADO", 114, 115);
  ctx.font = "44px Arial";
  ctx.fillText("⚽", 114, 146);
}

function drawFutsalCourt(ctx, court) {
  ctx.save();
  const courtGradient = ctx.createLinearGradient(court.x, court.y, court.x, court.y + court.h);
  courtGradient.addColorStop(0, "#174d82");
  courtGradient.addColorStop(0.5, "#1d609a");
  courtGradient.addColorStop(1, "#124574");
  ctx.fillStyle = courtGradient;
  ctx.fillRect(court.x, court.y, court.w, court.h);

  for (let y = court.y; y < court.y + court.h; y += 62) {
    ctx.fillStyle = y % 124 === 0 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.04)";
    ctx.fillRect(court.x, y, court.w, 62);
  }

  ctx.strokeStyle = "rgba(255,255,255,0.88)";
  ctx.lineWidth = 5;
  ctx.strokeRect(court.x + 8, court.y + 8, court.w - 16, court.h - 16);

  const centerY = court.y + court.h / 2;
  ctx.beginPath();
  ctx.moveTo(court.x + 8, centerY);
  ctx.lineTo(court.x + court.w - 8, centerY);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(court.x + court.w / 2, centerY, 90, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeRect(court.x + court.w * 0.32, court.y + 8, court.w * 0.36, 92);
  ctx.strokeRect(court.x + court.w * 0.38, court.y + 8, court.w * 0.24, 44);
  ctx.beginPath();
  ctx.arc(court.x + court.w / 2, court.y + 118, 56, 0, Math.PI);
  ctx.stroke();

  ctx.strokeRect(court.x + court.w * 0.32, court.y + court.h - 100, court.w * 0.36, 92);
  ctx.strokeRect(court.x + court.w * 0.38, court.y + court.h - 52, court.w * 0.24, 44);
  ctx.beginPath();
  ctx.arc(court.x + court.w / 2, court.y + court.h - 118, 56, Math.PI, 0);
  ctx.stroke();

  ctx.restore();
}

function getFutsalPositions(teamPlayers, court) {
  const keepers = teamPlayers.filter((player) => player.isGoalkeeper);
  const fieldPlayers = teamPlayers.filter((player) => !player.isGoalkeeper);
  const positionsById = new Map();

  keepers.forEach((player, index) => {
    const offset = (index - (keepers.length - 1) / 2) * 82;
    positionsById.set(player.id, {
      x: court.x + court.w / 2 + offset,
      y: court.y + 96 + Math.floor(index / 3) * 70
    });
  });

  const base = getBaseFutsalSpots(fieldPlayers.length);

  fieldPlayers.forEach((player, index) => {
    if (index < base.length) {
      positionsById.set(player.id, {
        x: court.x + court.w * base[index].x,
        y: court.y + court.h * base[index].y
      });
      return;
    }

    const extraIndex = index - base.length;
    const columns = fieldPlayers.length > 9 ? 4 : 3;
    const col = extraIndex % columns;
    const row = Math.floor(extraIndex / columns);
    positionsById.set(player.id, {
      x: court.x + court.w * (0.18 + col * (0.64 / Math.max(1, columns - 1))),
      y: court.y + court.h * Math.min(0.86, 0.68 + row * 0.08)
    });
  });

  return teamPlayers.map((player) => positionsById.get(player.id));
}

function getBaseFutsalSpots(playerCount) {
  const spots = [
    { x: 0.5, y: 0.34 },
    { x: 0.22, y: 0.43 },
    { x: 0.78, y: 0.43 },
    { x: 0.5, y: 0.58 }
  ];
  if (playerCount <= 1) return [spots[0]];
  if (playerCount === 2) return [spots[0], spots[3]];
  if (playerCount === 3) return [spots[0], spots[1], spots[2]];
  return spots;
}

function getMarkerRadius(playerCount) {
  if (playerCount >= 10) return 34;
  if (playerCount >= 7) return 40;
  return 48;
}

function drawPlayerMarker(ctx, player, position, number, radius = 48) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 5;

  ctx.fillStyle = player.isGoalkeeper ? "#ffd166" : "#ffffff";
  ctx.strokeStyle = player.isGoalkeeper ? "#116134" : "#1b2d43";
  ctx.lineWidth = Math.max(3, radius * 0.1);
  ctx.beginPath();
  ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#101715";
  ctx.font = `900 ${Math.max(21, radius * 0.6)}px Arial`;
  ctx.fillText(number, position.x, position.y - radius * 0.2);

  ctx.font = `900 ${Math.max(10, radius * 0.27)}px Arial`;
  wrapCanvasName(ctx, player.name, position.x, position.y + radius * 0.27, radius * 1.55);

  if (player.isGoalkeeper) {
    ctx.fillStyle = "#14795a";
    const labelY = position.y + radius + 15;
    ctx.beginPath();
    ctx.roundRect(position.x - 30, labelY - 14, 60, 28, 8);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 16px Arial";
    ctx.fillText("GOL", position.x, labelY);
  }

  ctx.restore();
}

function wrapCanvasName(ctx, name, x, y, maxWidth) {
  const parts = normalizeName(name).split(" ");
  const first = parts[0] || "";
  const second = parts.length > 1 ? parts[parts.length - 1] : "";
  const lines = second && first !== second ? [first, second] : [first];

  ctx.fillStyle = "#101715";
  lines.slice(0, 2).forEach((line, index) => {
    ctx.fillText(fitCanvasText(ctx, line, maxWidth), x, y + index * 15);
  });
}

function fitCanvasText(ctx, text, maxWidth) {
  let output = text;
  while (output.length > 2 && ctx.measureText(output).width > maxWidth) {
    output = output.slice(0, -1);
  }
  return output.length < text.length ? `${output.slice(0, -1)}.` : output;
}

function drawImageFooter(ctx, width, height) {
  const grass = ctx.createLinearGradient(0, height - 92, 0, height);
  grass.addColorStop(0, "#2e7d32");
  grass.addColorStop(1, "#0f4e26");
  ctx.fillStyle = grass;
  ctx.fillRect(0, height - 92, width, 92);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 24px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Tira Time - futebol com equilíbrio", 46, height - 36);

  ctx.font = "56px Arial";
  ctx.textAlign = "right";
  ctx.fillText("⚽", width - 42, height - 42);
}

function downloadTeamImage() {
  const team = getSelectedImageTeam();
  if (!team) return;
  const link = document.createElement("a");
  link.download = `${slugify(team.name)}-tira-time.png`;
  link.href = el.teamCanvas.toDataURL("image/png");
  link.click();
  showToast("Imagem baixada.");
}

function shareTeamImage() {
  const team = getSelectedImageTeam();
  if (!team) return;

  el.teamCanvas.toBlob(async (blob) => {
    if (!blob) {
      showToast("Não foi possível gerar a imagem.");
      return;
    }

    const file = new File([blob], `${slugify(team.name)}-tira-time.png`, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: "Tira Time",
          text: `${team.name} sorteado no Tira Time`,
          files: [file]
        });
        return;
      } catch {
        return;
      }
    }

    downloadTeamImage();
    showToast("Compartilhamento nativo indisponível. A imagem foi baixada.");
  }, "image/png");
}

function getSelectedImageTeam() {
  if (!lastTeams) {
    showToast("Sorteie os times antes de gerar a imagem.");
    return null;
  }
  return lastTeams.teams[Number(el.imageTeamSelect.value) || 0];
}

function formatTeamsText(result) {
  const lines = ["Tira Time", `${result.balance} - diferença de ${result.diff} ponto(s)`, ""];
  result.teams.forEach((team) => {
    const average = team.players.length ? (team.total / team.players.length).toFixed(1) : "0.0";
    lines.push(`${team.name} (${team.total} pts, média ${average})`);
    team.players.forEach((player) => {
      lines.push(`- ${player.name}${player.isGoalkeeper ? " [G]" : ""}: ${player.rating} estrela(s)`);
    });
    lines.push("");
  });
  if (result.reserves.length) {
    lines.push(`Reservas: ${result.reserves.map((player) => player.name).join(", ")}`);
  }
  return lines.join("\n").trim();
}

function persistSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    teamCount: el.teamCount.value,
    playersPerTeam: el.playersPerTeam.value,
    allowReserves: el.allowReserves.checked,
    goalkeepersFirst: el.goalkeepersFirst.checked
  }));
}

function loadSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    if (settings.teamCount) el.teamCount.value = settings.teamCount;
    if (settings.playersPerTeam) el.playersPerTeam.value = settings.playersPerTeam;
    if (typeof settings.allowReserves === "boolean") el.allowReserves.checked = settings.allowReserves;
    if (typeof settings.goalkeepersFirst === "boolean") el.goalkeepersFirst.checked = settings.goalkeepersFirst;
  } catch {
    localStorage.removeItem(SETTINGS_KEY);
  }
}

function updateDrawHint() {
  const teamCount = Number(el.teamCount.value) || 0;
  const playersPerTeam = Number(el.playersPerTeam.value) || 0;
  const capacity = teamCount * playersPerTeam;
  if (!capacity) {
    el.drawHint.textContent = "";
    return;
  }
  const reserveCount = Math.max(players.length - capacity, 0);
  const missingCount = Math.max(capacity - players.length, 0);
  if (reserveCount) {
    el.drawHint.textContent = `${reserveCount} jogador(es) ficarão como reservas/sobrando.`;
  } else if (missingCount) {
    el.drawHint.textContent = `Faltam ${missingCount} jogador(es) para completar todos os times.`;
  } else {
    el.drawHint.textContent = "Quantidade exata para completar os times.";
  }
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = current;
  localStorage.setItem(THEME_KEY, current);
  el.themeToggle.textContent = current === "dark" ? "☾" : "☀";
}

function loadTheme() {
  const theme = localStorage.getItem(THEME_KEY) || "dark";
  document.documentElement.dataset.theme = theme;
  el.themeToggle.textContent = theme === "dark" ? "☾" : "☀";
}

function resetForm() {
  editingPlayerId = null;
  currentRating = 3;
  el.playerForm.reset();
  el.submitPlayer.textContent = "Adicionar jogador";
  el.cancelEdit.classList.add("hidden");
  renderRatingInput();
}

function sanitizePlayer(player) {
  const safePlayer = player && typeof player === "object" ? player : {};
  return {
    id: safePlayer.id || createPlayerId(),
    name: normalizeName(safePlayer.name || "Sem nome"),
    rating: normalizeRating(safePlayer.rating),
    isGoalkeeper: Boolean(safePlayer.isGoalkeeper),
    createdAt: Number(safePlayer.createdAt) || Date.now()
  };
}

function createPlayerId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeName(name) {
  return String(name || "").trim().replace(/\s+/g, " ");
}

function normalizeRating(rating) {
  const value = Number(rating);
  if (!Number.isFinite(value)) return 3;
  return Math.min(5, Math.max(1, Math.round(value)));
}

function renderStars(rating) {
  const value = normalizeRating(rating);
  return "★".repeat(value) + "☆".repeat(5 - value);
}

function getBalanceLabel(diff) {
  if (diff <= 1) return "Muito equilibrado";
  if (diff === 2) return "Equilibrado";
  return "Pouco equilibrado";
}

function shuffle(list) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function truncateText(text, maxLength) {
  const value = String(text);
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function slugify(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("show");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => el.toast.classList.remove("show"), 2800);
}
