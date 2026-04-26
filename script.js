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
    "copyTeams", "shareTeams", "themeToggle", "toast"
  ].forEach((id) => {
    el[id] = document.getElementById(id);
  });
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
  el.copyTeams.addEventListener("click", copyTeams);
  el.shareTeams.addEventListener("click", shareTeams);
  el.themeToggle.addEventListener("click", toggleTheme);

  [el.teamCount, el.playersPerTeam, el.allowReserves, el.goalkeepersFirst].forEach((field) => {
    field.addEventListener("change", () => {
      persistSettings();
      updateDrawHint();
    });
    field.addEventListener("input", updateDrawHint);
  });
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
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
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
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
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

function renderTeams(result) {
  if (!result) {
    el.teamsSection.classList.add("hidden");
    el.teamsList.innerHTML = "";
    el.reservesList.innerHTML = "";
    return;
  }

  el.teamsSection.classList.remove("hidden");
  el.balanceLabel.textContent = `${result.balance} · diferença de ${result.diff} ponto(s)`;
  el.teamsList.innerHTML = "";
  el.reservesList.innerHTML = "";

  result.teams.forEach((team) => {
    const average = team.players.length ? (team.total / team.players.length).toFixed(1) : "0.0";
    const card = document.createElement("article");
    card.className = "team-card";
    card.innerHTML = `
      <div class="team-header">
        <h3>${team.name}</h3>
        <span class="badge">${team.total} pts</span>
      </div>
      <div>
        ${team.players.map((player) => `
          <div class="team-player${player.isGoalkeeper ? " keeper" : ""}">
            <span>${escapeHtml(player.name)} ${player.isGoalkeeper ? '<span class="badge">G</span>' : ""}</span>
            <span class="readonly-stars">${renderStars(player.rating)}</span>
          </div>
        `).join("") || "<p class=\"hint\">Sem jogadores.</p>"}
      </div>
      <div class="team-footer">
        <span>Soma: ${team.total}</span>
        <span>Média: ${average}</span>
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

function shareTeams() {
  if (!lastTeams) {
    showToast("Sorteie os times antes de compartilhar.");
    return;
  }
  const text = formatTeamsText(lastTeams);
  if (navigator.share) {
    navigator.share({ title: "Tira Time", text }).catch(() => {});
    return;
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
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
  const theme = localStorage.getItem(THEME_KEY) || "light";
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
  return {
    id: player.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())),
    name: normalizeName(player.name || "Sem nome"),
    rating: normalizeRating(player.rating),
    isGoalkeeper: Boolean(player.isGoalkeeper),
    createdAt: Number(player.createdAt) || Date.now()
  };
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

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("show");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => el.toast.classList.remove("show"), 2800);
}
