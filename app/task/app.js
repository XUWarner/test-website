(() => {
  const STORAGE_KEY = "step_by_step_tasks_v1";
  const PREF_KEY = "step_by_step_prefs_v1";

  /** @type {{hideNoDueToday:boolean}} */
  const prefs = loadPrefs();
  /** @type {Task[]} */
  let tasks = loadTasks();

  let currentView = "today";
  let searchQuery = "";
  let editingId = null;

  // Elements
  const navButtons = Array.from(document.querySelectorAll(".nav__item"));
  const viewTitleEl = document.getElementById("viewTitle");
  const viewMetaEl = document.getElementById("viewMeta");
  const taskListEl = document.getElementById("taskList");
  const emptyStateEl = document.getElementById("emptyState");
  const statsPillEl = document.getElementById("statsPill");

  const titleInput = document.getElementById("titleInput");
  const dueInput = document.getElementById("dueInput");
  const noteInput = document.getElementById("noteInput");
  const btnAdd = document.getElementById("btnAdd");

  const searchInput = document.getElementById("searchInput");
  const btnClearSearch = document.getElementById("btnClearSearch");

  const btnExport = document.getElementById("btnExport");
  const importFile = document.getElementById("importFile");
  const btnHideNoDue = document.getElementById("btnHideNoDue");

  // Modal
  const modal = document.getElementById("modal");
  const editTitle = document.getElementById("editTitle");
  const editDue = document.getElementById("editDue");
  const editNote = document.getElementById("editNote");
  const btnSave = document.getElementById("btnSave");
  const btnDelete = document.getElementById("btnDelete");

  // Init UI
  btnHideNoDue.textContent = prefs.hideNoDueToday ? "Show no-due (Today)" : "Hide no-due (Today)";
  wireEvents();
  render();

  /** ---------------- Types ---------------- */
  /**
   * @typedef {Object} Task
   * @property {string} id
   * @property {string} title
   * @property {boolean} done
   * @property {string} createdAt  // ISO string
   * @property {string|null} dueDate // "YYYY-MM-DD" or null
   * @property {string} note
   */

  /** ---------------- Event wiring ---------------- */
  function wireEvents() {
    // Nav switching
    navButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        currentView = btn.dataset.view;
        navButtons.forEach(b => b.classList.toggle("is-active", b === btn));
        render();
      });
    });

    // Add task
    btnAdd.addEventListener("click", addTaskFromInputs);
    titleInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") addTaskFromInputs();
    });

    // Search
    searchInput.addEventListener("input", () => {
      searchQuery = searchInput.value.trim();
      render();
    });
    btnClearSearch.addEventListener("click", () => {
      searchQuery = "";
      searchInput.value = "";
      render();
    });

    // Export/Import
    btnExport.addEventListener("click", exportJSON);
    importFile.addEventListener("change", importJSON);

    // Hide no-due toggle
    btnHideNoDue.addEventListener("click", () => {
      prefs.hideNoDueToday = !prefs.hideNoDueToday;
      savePrefs(prefs);
      btnHideNoDue.textContent = prefs.hideNoDueToday ? "Show no-due (Today)" : "Hide no-due (Today)";
      render();
    });

    // Modal close
    modal.addEventListener("click", (e) => {
      const t = /** @type {HTMLElement} */ (e.target);
      if (t && t.getAttribute("data-close") === "1") closeModal();
    });

    // Save/Delete in modal
    btnSave.addEventListener("click", saveEdit);
    btnDelete.addEventListener("click", deleteEditingTask);
  }

  /** ---------------- Core actions ---------------- */
  function addTaskFromInputs() {
    const title = titleInput.value.trim();
    if (!title) return;

    const due = dueInput.value ? dueInput.value : null;
    const note = noteInput.value.trim();

    const task = /** @type {Task} */ ({
      id: cryptoId(),
      title,
      done: false,
      createdAt: new Date().toISOString(),
      dueDate: due,
      note
    });

    tasks.unshift(task);
    persist();

    // reset inputs
    titleInput.value = "";
    noteInput.value = "";
    // keep due date as a convenience
    titleInput.focus();

    render();
  }

  function toggleDone(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    t.done = !t.done;
    persist();
    render();
  }

  function openEdit(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;

    editingId = id;
    editTitle.value = t.title;
    editDue.value = t.dueDate ?? "";
    editNote.value = t.note ?? "";

    document.getElementById("modalSub").textContent =
      `Created: ${formatDateTime(t.createdAt)} · ID: ${t.id.slice(0, 6)}`;

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    editTitle.focus();
  }

  function closeModal() {
    editingId = null;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }

  function saveEdit() {
    if (!editingId) return;
    const t = tasks.find(x => x.id === editingId);
    if (!t) return;

    const newTitle = editTitle.value.trim();
    if (!newTitle) return;

    t.title = newTitle;
    t.dueDate = editDue.value ? editDue.value : null;
    t.note = editNote.value.trim();

    persist();
    closeModal();
    render();
  }

  function deleteEditingTask() {
    if (!editingId) return;
    const idx = tasks.findIndex(x => x.id === editingId);
    if (idx === -1) return;

    tasks.splice(idx, 1);
    persist();
    closeModal();
    render();
  }

  function deleteTask(id) {
    const idx = tasks.findIndex(x => x.id === id);
    if (idx === -1) return;
    tasks.splice(idx, 1);
    persist();
    render();
  }

  /** ---------------- Filtering / rendering ---------------- */
  function render() {
    const viewTitleMap = { today: "Today", week: "This Week", all: "All", done: "Done" };
    viewTitleEl.textContent = viewTitleMap[currentView] ?? "Tasks";

    const filtered = getFilteredTasks();
    const countText = `${filtered.length} task${filtered.length === 1 ? "" : "s"}`;
    statsPillEl.textContent = countText;

    viewMetaEl.textContent = makeMetaLine(filtered);

    taskListEl.innerHTML = "";
    if (filtered.length === 0) {
      emptyStateEl.hidden = false;
      return;
    }
    emptyStateEl.hidden = true;

    filtered.forEach(t => {
      const li = document.createElement("li");
      li.className = "task" + (t.done ? " is-done" : "");

      li.innerHTML = `
        <input class="task__check" type="checkbox" ${t.done ? "checked" : ""} aria-label="Mark done"/>
        <div class="task__main">
          <div class="task__titleRow">
            <div class="task__title" title="${escapeHtml(t.title)}">${escapeHtml(t.title)}</div>
          </div>
          <div class="task__meta">
            <span>Due: ${t.dueDate ? escapeHtml(t.dueDate) : "—"}</span>
            <span>Created: ${escapeHtml(formatDate(t.createdAt))}</span>
          </div>
          ${t.note ? `<div class="task__note" title="${escapeHtml(t.note)}">${escapeHtml(t.note)}</div>` : ``}
        </div>
        <div class="task__actions">
          <button class="iconBtn" data-action="edit" title="Edit">Edit</button>
          <button class="iconBtn" data-action="delete" title="Delete">Del</button>
        </div>
      `;

      const checkbox = li.querySelector("input[type=checkbox]");
      checkbox.addEventListener("change", () => toggleDone(t.id));

      li.querySelector("[data-action=edit]").addEventListener("click", () => openEdit(t.id));
      li.querySelector("[data-action=delete]").addEventListener("click", () => deleteTask(t.id));

      taskListEl.appendChild(li);
    });
  }

  function getFilteredTasks() {
    let list = [...tasks];

    // Search (title + note)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        (t.title || "").toLowerCase().includes(q) ||
        (t.note || "").toLowerCase().includes(q)
      );
    }

    const todayStr = ymd(new Date());
    const weekEnd = addDays(new Date(), 6); // rolling 7 days incl today

    if (currentView === "done") {
      list = list.filter(t => t.done);
    } else if (currentView === "all") {
      list = list.filter(t => !t.done);
    } else if (currentView === "today") {
      list = list.filter(t => !t.done);
      // your choice: show no-due in Today
      if (prefs.hideNoDueToday) {
        list = list.filter(t => t.dueDate === todayStr);
      } else {
        list = list.filter(t => (t.dueDate === todayStr) || (t.dueDate === null));
      }
    } else if (currentView === "week") {
      list = list.filter(t => !t.done);
      list = list.filter(t => {
        if (!t.dueDate) return true; // show no-due (same choice style)
        const d = parseYMD(t.dueDate);
        return d >= startOfDay(new Date()) && d <= endOfDay(weekEnd);
      });
    }

    // Sort: dueDate first, then createdAt desc
    list.sort((a, b) => {
      const ad = a.dueDate || "9999-12-31";
      const bd = b.dueDate || "9999-12-31";
      if (ad !== bd) return ad.localeCompare(bd);
      return b.createdAt.localeCompare(a.createdAt);
    });

    return list;
  }

  function makeMetaLine(filtered) {
    const undone = tasks.filter(t => !t.done).length;
    const done = tasks.filter(t => t.done).length;
    const q = searchQuery ? ` · Search: "${searchQuery}"` : "";
    return `Undone: ${undone} · Done: ${done} · Showing: ${filtered.length}${q}`;
  }

  /** ---------------- Export / Import ---------------- */
  function exportJSON() {
    const payload = {
      app: "step-by-step",
      version: 1,
      exportedAt: new Date().toISOString(),
      tasks
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `step-by-step-backup-${ymd(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importJSON(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || "{}"));
        if (!data || !Array.isArray(data.tasks)) throw new Error("Invalid backup format.");
        // basic sanitize
        tasks = data.tasks.map(sanitizeTask).filter(Boolean);
        persist();
        render();
      } catch (err) {
        alert("Import failed: " + (err && err.message ? err.message : String(err)));
      } finally {
        importFile.value = "";
      }
    };
    reader.readAsText(file);
  }

  function sanitizeTask(x) {
    if (!x || typeof x !== "object") return null;
    const t = /** @type {any} */ (x);
    if (typeof t.id !== "string" || typeof t.title !== "string") return null;
    return /** @type {Task} */ ({
      id: t.id,
      title: t.title,
      done: Boolean(t.done),
      createdAt: typeof t.createdAt === "string" ? t.createdAt : new Date().toISOString(),
      dueDate: typeof t.dueDate === "string" ? t.dueDate : null,
      note: typeof t.note === "string" ? t.note : ""
    });
  }

  /** ---------------- Storage ---------------- */
  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }
  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(sanitizeTask).filter(Boolean);
    } catch {
      return [];
    }
  }
  function loadPrefs() {
    try {
      const raw = localStorage.getItem(PREF_KEY);
      if (!raw) return { hideNoDueToday: false };
      const p = JSON.parse(raw);
      return { hideNoDueToday: Boolean(p.hideNoDueToday) };
    } catch {
      return { hideNoDueToday: false };
    }
  }
  function savePrefs(p) {
    localStorage.setItem(PREF_KEY, JSON.stringify(p));
  }

  /** ---------------- Utils ---------------- */
  function cryptoId() {
    if (window.crypto && crypto.getRandomValues) {
      const bytes = new Uint8Array(10);
      crypto.getRandomValues(bytes);
      return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
    }
    return String(Date.now()) + Math.random().toString(16).slice(2);
  }

  function ymd(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function parseYMD(s) {
    // s: YYYY-MM-DD
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }

  function addDays(d, n) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }

  function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }
  function endOfDay(d) {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  }

  function formatDate(iso) {
    try {
      const d = new Date(iso);
      return ymd(d);
    } catch { return "—"; }
  }

  function formatDateTime(iso) {
    try {
      const d = new Date(iso);
      return `${ymd(d)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    } catch { return "—"; }
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();