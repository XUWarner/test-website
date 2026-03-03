(() => {
  const STORAGE_KEY = "step_by_step_tasks_v2";
  const PREF_KEY = "step_by_step_prefs_v2";

  const PRIORITY_ORDER = { high: 0, med: 1, low: 2 };

  /** @type {{ collapseNoDueToday:boolean, sortMode:"due"|"priority"|"created" }} */
  const prefs = loadPrefs();
  /** @type {Task[]} */
  let tasks = loadTasks();

  let currentView = "today";
  let searchQuery = "";
  let editingId = null;
  let analyticsView = null; // "week" | "month" | "year" | null

const appRoot = document.querySelector(".app");
const composerEl = document.querySelector(".composer");
const listWrapEl = document.querySelector(".listWrap");
const dashboardEl = document.getElementById("dashboard");

const segViews = document.getElementById("segViews");
const dashWeek = document.getElementById("dashWeek");
const dashMonth = document.getElementById("dashMonth");
const dashYear = document.getElementById("dashYear");

const weekTextList = document.getElementById("weekTextList");
const weekBarChart = document.getElementById("weekBarChart");
const monthGrid = document.getElementById("monthGrid");
const monthTextList = document.getElementById("monthTextList");
const yearHeatmap = document.getElementById("yearHeatmap");

const btnSideToggle = document.getElementById("btnSideToggle");

  // Elements
  const navButtons = Array.from(document.querySelectorAll(".nav__item"));
  const viewTitleEl = document.getElementById("viewTitle");
  const viewMetaEl = document.getElementById("viewMeta");
  const taskListEl = document.getElementById("taskList");
  const emptyStateEl = document.getElementById("emptyState");
  const statsPillEl = document.getElementById("statsPill");

  const titleInput = document.getElementById("titleInput");
  const dueInput = document.getElementById("dueInput");
  const priorityInput = document.getElementById("priorityInput");
  const tagInput = document.getElementById("tagInput");
  const noteInput = document.getElementById("noteInput");
  const btnAdd = document.getElementById("btnAdd");

  const searchInput = document.getElementById("searchInput");
  const btnClearSearch = document.getElementById("btnClearSearch");
  const sortSelect = document.getElementById("sortSelect");

  const btnExport = document.getElementById("btnExport");
  const importFile = document.getElementById("importFile");

  // Modal
  const modal = document.getElementById("modal");
  const editTitle = document.getElementById("editTitle");
  const editDue = document.getElementById("editDue");
  const editNote = document.getElementById("editNote");
  const btnSave = document.getElementById("btnSave");
  const btnDelete = document.getElementById("btnDelete");

 
  // Init UI
  sortSelect.value = prefs.sortMode;
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
   * @property {"low"|"med"|"high"} priority
   * @property {string} tag
   * @property {string|null} doneAt // ISO string or null
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

    // Sort
    sortSelect.addEventListener("change", () => {
      prefs.sortMode = sortSelect.value;
      savePrefs(prefs);
      render();
    });

    // Export/Import
    btnExport.addEventListener("click", exportJSON);
    importFile.addEventListener("change", importJSON);

    // Modal close
    modal.addEventListener("click", (e) => {
      const t = /** @type {HTMLElement} */ (e.target);
      if (t && t.getAttribute("data-close") === "1") closeModal();
    });

    // Save/Delete in modal
    btnSave.addEventListener("click", saveEdit);
    btnDelete.addEventListener("click", deleteEditingTask);

  
    // Keyboard quick delete: if modal open, let modal handle
    document.addEventListener("keydown", (e) => {
      if (modal.classList.contains("is-open")) return;
      // optional: you can add more shortcuts later
    });
    // Sidebar collapse
btnSideToggle.addEventListener("click", () => {
  appRoot.classList.toggle("is-collapsed");
});

// Segmented views: Week/Month/Year
segViews.addEventListener("click", (e) => {
  const btn = e.target.closest(".seg3__btn");
  if (!btn) return;

  // activate button
  segViews.querySelectorAll(".seg3__btn").forEach(b => b.classList.toggle("is-active", b === btn));

  analyticsView = btn.dataset.subview; // week/month/year
  currentView = "views";              // enter analytics mode
  navButtons.forEach(b => b.classList.remove("is-active")); // unselect left nav

  render();
});
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
      note,
      priority: (priorityInput && priorityInput.value) ? priorityInput.value : "med",
      tag: (tagInput && tagInput.value) ? tagInput.value.trim() : "",
      doneAt: null
    });

    tasks.unshift(task);
    persist();

    // reset inputs
    titleInput.value = "";
    noteInput.value = "";
    // keep due as convenience, keep priority, keep tag
    titleInput.focus();

    render();
  }

  function toggleDone(id, liElForAnim) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;

  t.done = !t.done;
  t.doneAt = t.done ? new Date().toISOString() : null;
  persist();

  // small animation (optional)
  if (liElForAnim) {
    liElForAnim.classList.add("just-done");
    setTimeout(() => liElForAnim.classList.remove("just-done"), 220);
  }

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
      `Created: ${formatDateTime(t.createdAt)} · Priority: ${t.priority.toUpperCase()} · Tag: ${t.tag || "—"}`;

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
    const t = tasks.find(x => x.id === editingId);
    if (!t) return;

    if (!confirm(`Delete this task?\n\n"${t.title}"`)) return;

    const idx = tasks.findIndex(x => x.id === editingId);
    if (idx === -1) return;

    tasks.splice(idx, 1);
    persist();
    closeModal();
    render();
  }

  function deleteTask(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    if (!confirm(`Delete this task?\n\n"${t.title}"`)) return;

    const idx = tasks.findIndex(x => x.id === id);
    if (idx === -1) return;

    tasks.splice(idx, 1);
    persist();
    render();
  }

  
  /** ---------------- Filtering / rendering ---------------- */
  function render() {
    const viewTitleMap = {
      today: "Today",
      week: "This Week",
      all: "All",
      done: "Done",
      history: "History"
    };
    viewTitleEl.textContent = viewTitleMap[currentView] ?? "Tasks";

    const filtered = getFilteredTasks();
    statsPillEl.textContent = `${filtered.length} task${filtered.length === 1 ? "" : "s"}`;
    viewMetaEl.textContent = makeMetaLine(filtered);

    taskListEl.innerHTML = "";
    // analytics mode
if (currentView === "views" && analyticsView) {
  // hide normal task editor/list
  composerEl.hidden = true;
  listWrapEl.hidden = true;

  // show dashboard
  dashboardEl.hidden = false;

  // show the correct panel
  dashWeek.hidden = analyticsView !== "week";
  dashMonth.hidden = analyticsView !== "month";
  dashYear.hidden = analyticsView !== "year";

  viewTitleEl.textContent = analyticsView.toUpperCase();
  viewMetaEl.textContent = "Analytics view (read-only)";

  renderAnalytics(analyticsView);
  return;
}

// normal mode
dashboardEl.hidden = true;
composerEl.hidden = false;
listWrapEl.hidden = false;

    if (currentView === "today") {
      renderTodayGrouped(filtered);
      return;
    }

    if (currentView === "week") {
      renderWeekGrouped(filtered);
      return;
    }

    if (currentView === "history") {
      renderHistory();
      return;
    }

    // All / Done simple list
    renderSimpleList(filtered);
  }

  function renderSimpleList(list) {
    taskListEl.innerHTML = "";
    if (list.length === 0) {
      emptyStateEl.hidden = false;
      return;
    }
    emptyStateEl.hidden = true;

    list.forEach(t => taskListEl.appendChild(renderTaskItem(t)));
  }

  function renderTodayGrouped(list) {
    // today view = due today + no-due (your choice), but fold no-due by default
    const todayStr = ymd(new Date());
    const dueToday = list.filter(t => t.dueDate === todayStr);
    const noDue = list.filter(t => t.dueDate === null);

    emptyStateEl.hidden = (dueToday.length + noDue.length) !== 0;

    // Group 1: Due today
    if (dueToday.length) {
      taskListEl.appendChild(makeGroup({
        title: "Due Today",
        meta: `${dueToday.length}`,
        collapsed: false,
        children: dueToday.map(renderTaskItem)
      }));
    }

    // Group 2: No due (collapsible)
    if (noDue.length) {
      taskListEl.appendChild(makeGroup({
        title: "No due tasks",
        meta: `${noDue.length}`,
        collapsed: prefs.collapseNoDueToday,
        children: noDue.map(renderTaskItem),
        onToggle: (collapsed) => {
          prefs.collapseNoDueToday = collapsed;
          savePrefs(prefs);
        }
      }));
    }
  }

  function renderWeekGrouped(list) {
    // list already filtered to week + no-due
    const start = startOfDay(new Date());
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(start, i);
      days.push(d);
    }

    const noDue = list.filter(t => t.dueDate === null);
    const withDue = list.filter(t => t.dueDate !== null);

    const groups = [];

    // day groups
    days.forEach(d => {
      const ds = ymd(d);
      const title = `${weekdayShort(d)} · ${ds}`;
      const items = withDue.filter(t => t.dueDate === ds);
      if (items.length) {
        groups.push(makeGroup({
          title,
          meta: `${items.length}`,
          collapsed: false,
          children: items.map(renderTaskItem)
        }));
      }
    });

    // No due group at end
    if (noDue.length) {
      groups.push(makeGroup({
        title: "No due tasks",
        meta: `${noDue.length}`,
        collapsed: true,
        children: noDue.map(renderTaskItem)
      }));
    }

    taskListEl.innerHTML = "";
    if (groups.length === 0) {
      emptyStateEl.hidden = false;
      return;
    }
    emptyStateEl.hidden = true;
    groups.forEach(g => taskListEl.appendChild(g));
  }

  function renderHistory() {
    // Simple: pick a date via prompt? For v1.2 we do "last 14 days" sections
    const today = startOfDay(new Date());
    const daysBack = 14;

    const buckets = [];
    for (let i = 0; i <= daysBack; i++) {
      const d = addDays(today, -i);
      const ds = ymd(d);

      const created = tasks.filter(t => formatDate(t.createdAt) === ds);
      const done = tasks.filter(t => t.doneAt && formatDate(t.doneAt) === ds);

      if (created.length || done.length) {
        buckets.push({ date: d, ds, created, done });
      }
    }

    taskListEl.innerHTML = "";
    if (buckets.length === 0) {
      emptyStateEl.hidden = false;
      return;
    }
    emptyStateEl.hidden = true;

    buckets.forEach(b => {
      const children = [];

      if (b.created.length) {
        children.push(makeMiniList("Created", b.created));
      }
      if (b.done.length) {
        children.push(makeMiniList("Completed", b.done));
      }

      taskListEl.appendChild(makeGroup({
        title: `${weekdayShort(b.date)} · ${b.ds}`,
        meta: `${b.created.length} created · ${b.done.length} done`,
        collapsed: true,
        children: children
      }));
    });
  }
function renderAnalytics(mode) {
  if (mode === "week") {
    renderWeekAnalytics();
  } else if (mode === "month") {
    renderMonthAnalytics();
  } else if (mode === "year") {
    renderYearAnalytics();
  }
}

function renderWeekAnalytics() {
  // top: text list (show tasks created or done in last 7 days)
  const days = lastNDays(7);
  const daySet = new Set(days.map(d => ymd(d)));

  const created = tasks
    .filter(t => daySet.has(formatDate(t.createdAt)))
    .slice(0, 30);

  const done = tasks
    .filter(t => t.doneAt && daySet.has(formatDate(t.doneAt)))
    .slice(0, 30);

  weekTextList.innerHTML = "";
  const title = document.createElement("div");
  title.className = "hint";
  title.textContent = `Recent (7 days): ${created.length} created · ${done.length} done`;
  weekTextList.appendChild(title);

  created.slice(0, 10).forEach(t => weekTextList.appendChild(makeDashItem(`Created: ${t.title}`, t)));
  done.slice(0, 10).forEach(t => weekTextList.appendChild(makeDashItem(`Done: ${t.title}`, t)));

  // bottom: bar chart per day: created vs done
  const createdCount = countByDay(tasks.map(t => formatDate(t.createdAt)), 7);
  const doneCount = countByDay(tasks.filter(t => t.doneAt).map(t => formatDate(t.doneAt)), 7);

  weekBarChart.innerHTML = "";

  const maxV = Math.max(1, ...Object.values(createdCount), ...Object.values(doneCount));
  days.forEach(d => {
    const ds = ymd(d);
    const c = createdCount[ds] || 0;
    const dn = doneCount[ds] || 0;

    const col = document.createElement("div");
    col.className = "barCol";

    const bars = document.createElement("div");
    bars.className = "bars";

    const b1 = document.createElement("div");
    b1.className = "bar bar--created";
    b1.style.height = `${Math.round((c / maxV) * 120)}px`;

    const b2 = document.createElement("div");
    b2.className = "bar bar--done";
    b2.style.height = `${Math.round((dn / maxV) * 120)}px`;

    bars.appendChild(b1);
    bars.appendChild(b2);

    const label = document.createElement("div");
    label.className = "barLabel";
    label.textContent = weekdayShort(d);

    col.appendChild(bars);
    col.appendChild(label);

    weekBarChart.appendChild(col);
  });
}

function renderMonthAnalytics() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const daysInMonth = last.getDate();

  // calendar grid: fill empty start
  const startDow = first.getDay(); // 0=Sun
  monthGrid.innerHTML = "";

  for (let i = 0; i < startDow; i++) {
    const empty = document.createElement("div");
    empty.className = "dayCell";
    empty.style.opacity = "0.25";
    empty.innerHTML = `<div class="dayCell__n"> </div><div class="dayCell__c"> </div>`;
    monthGrid.appendChild(empty);
  }

  // counts per day (done)
  const doneCount = {};
  tasks.forEach(t => {
    if (!t.doneAt) return;
    const ds = formatDate(t.doneAt);
    if (ds.startsWith(`${year}-${String(month + 1).padStart(2,"0")}-`)) {
      doneCount[ds] = (doneCount[ds] || 0) + 1;
    }
  });

  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const cell = document.createElement("div");
    cell.className = "dayCell";
    cell.innerHTML = `
      <div class="dayCell__n">${d}</div>
      <div class="dayCell__c">Done: ${doneCount[ds] || 0}</div>
    `;
    monthGrid.appendChild(cell);
  }

  // right: tasks in this month (created or due)
  const monthPrefix = `${year}-${String(month + 1).padStart(2,"0")}-`;
  const list = tasks
    .filter(t => (t.dueDate && t.dueDate.startsWith(monthPrefix)) || formatDate(t.createdAt).startsWith(monthPrefix))
    .slice(0, 50);

  monthTextList.innerHTML = "";
  if (list.length === 0) {
    monthTextList.innerHTML = `<div class="hint">No tasks in this month yet.</div>`;
    return;
  }
  list.forEach(t => monthTextList.appendChild(makeDashItem(t.title, t)));
}

function renderYearAnalytics() {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);

  // count done per day
  const doneCount = {};
  tasks.forEach(t => {
    if (!t.doneAt) return;
    const ds = formatDate(t.doneAt);
    if (ds.startsWith(`${year}-`)) doneCount[ds] = (doneCount[ds] || 0) + 1;
  });

  // find max to map into 5 levels
  const maxV = Math.max(0, ...Object.values(doneCount));

  yearHeatmap.innerHTML = "";

  // build from start to end day by day
  const totalDays = Math.round((end - start) / (24*3600*1000)) + 1;

  for (let i = 0; i < totalDays; i++) {
    const d = addDays(start, i);
    const ds = ymd(d);
    const v = doneCount[ds] || 0;

    const level = heatLevel(v, maxV); // 0..4

    const cell = document.createElement("div");
    cell.className = `heatCell heat${level}`;
    cell.title = `${ds} · done: ${v}`;
    yearHeatmap.appendChild(cell);
  }
}

function heatLevel(v, maxV) {
  if (v === 0) return 0;
  if (maxV <= 1) return 4;
  const ratio = v / maxV;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.50) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function makeDashItem(prefixTitle, task) {
  const div = document.createElement("div");
  div.className = "dashItem";
  div.innerHTML = `
    <div class="dashItem__top">
      <div class="dashItem__title">${escapeHtml(prefixTitle)}</div>
      <div class="badge">${task.dueDate ? escapeHtml(task.dueDate) : "—"}</div>
    </div>
    <div class="dashItem__meta">
      <span>Priority: ${escapeHtml(task.priority)}</span>
      <span>Tag: ${task.tag ? escapeHtml(task.tag) : "—"}</span>
      <span>Created: ${escapeHtml(formatDate(task.createdAt))}</span>
      <span>Done: ${task.doneAt ? escapeHtml(formatDate(task.doneAt)) : "—"}</span>
    </div>
  `;
  return div;
}

function lastNDays(n) {
  const res = [];
  const today = startOfDay(new Date());
  for (let i = n - 1; i >= 0; i--) {
    res.push(addDays(today, -i));
  }
  return res;
}

function countByDay(dateStrings, nDays) {
  const days = lastNDays(nDays).map(d => ymd(d));
  const map = {};
  days.forEach(ds => map[ds] = 0);
  dateStrings.forEach(ds => {
    if (map[ds] !== undefined) map[ds] += 1;
  });
  return map;
}
  function makeMiniList(label, tasksArr) {
    const wrap = document.createElement("div");
    wrap.className = "group";
    wrap.style.background = "rgba(255,255,255,.35)";
    wrap.style.borderStyle = "dashed";

    const head = document.createElement("div");
    head.className = "group__head";
    head.innerHTML = `<div class="group__title">${escapeHtml(label)}</div><div class="group__meta">${tasksArr.length}</div>`;
    wrap.appendChild(head);

    const body = document.createElement("div");
    body.className = "group__body";
    tasksArr.forEach(t => body.appendChild(renderTaskItem(t, { historyMode: true })));
    wrap.appendChild(body);

    return wrap;
  }

  function makeGroup({ title, meta, collapsed, children, onToggle }) {
    const group = document.createElement("div");
    group.className = "group" + (collapsed ? " is-collapsed" : "");

    const head = document.createElement("div");
    head.className = "group__head";
    head.innerHTML = `
      <div class="group__title">${escapeHtml(title)} <span class="badge">${escapeHtml(meta)}</span></div>
      <div class="group__meta">${collapsed ? "Click to expand" : "Click to collapse"}</div>
    `;

    head.addEventListener("click", () => {
      const nowCollapsed = !group.classList.contains("is-collapsed");
      group.classList.toggle("is-collapsed", nowCollapsed);
      if (onToggle) onToggle(nowCollapsed);
    });

    const body = document.createElement("div");
    body.className = "group__body";

    children.forEach(child => body.appendChild(child));

    group.appendChild(head);
    group.appendChild(body);
    return group;
  }

  function renderTaskItem(t, opts = {}) {
    const li = document.createElement("li");
    li.className = "task" + (t.done ? " is-done" : "");

    const pClass = t.priority === "high" ? "p-high" : (t.priority === "low" ? "p-low" : "p-med");

    const tagPart = t.tag ? `<span class="badge">${escapeHtml(t.tag)}</span>` : "";
    const priPart = `<span class="badge ${pClass}">P: ${escapeHtml(t.priority)}</span>`;

    li.innerHTML = `
      <input class="task__check" type="checkbox" ${t.done ? "checked" : ""} aria-label="Mark done"/>
      <div class="task__main">
        <div class="task__titleRow">
          <div class="task__title" title="${escapeHtml(t.title)}">${escapeHtml(t.title)}</div>
        </div>
        <div class="task__meta">
          <span>Due: ${t.dueDate ? escapeHtml(t.dueDate) : "—"}</span>
          ${priPart}
          ${tagPart}
          <span>Created: ${escapeHtml(formatDate(t.createdAt))}</span>
        </div>
        ${t.note ? `<div class="task__note" title="${escapeHtml(t.note)}">${escapeHtml(t.note)}</div>` : ``}
      </div>
      <div class="task__actions">
        ${opts.historyMode ? "" : `<button class="iconBtn" data-action="edit" title="Edit">Edit</button>`}
        ${opts.historyMode ? "" : `<button class="iconBtn" data-action="delete" title="Delete">Del</button>`}
      </div>
    `;

    const checkbox = li.querySelector("input[type=checkbox]");
    checkbox.addEventListener("change", () => toggleDone(t.id, li));

    if (!opts.historyMode) {
      li.querySelector("[data-action=edit]").addEventListener("click", () => openEdit(t.id));
      li.querySelector("[data-action=delete]").addEventListener("click", () => deleteTask(t.id));
    }
    return li;
  }

  function getFilteredTasks() {
    let list = [...tasks];

    // Search (title + note + tag)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        (t.title || "").toLowerCase().includes(q) ||
        (t.note || "").toLowerCase().includes(q) ||
        (t.tag || "").toLowerCase().includes(q)
      );
    }

    const todayStr = ymd(new Date());
    const weekEnd = addDays(new Date(), 6); // rolling 7 days incl today

    if (currentView === "done") {
      list = list.filter(t => t.done);
    } else if (currentView === "all") {
      list = list.filter(t => !t.done);
    } else if (currentView === "today") {
      // your choice: show no-due in Today
      list = list.filter(t => !t.done);
      list = list.filter(t => (t.dueDate === todayStr) || (t.dueDate === null));
    } else if (currentView === "week") {
      list = list.filter(t => !t.done);
      list = list.filter(t => {
        if (!t.dueDate) return true; // show no-due in week
        const d = parseYMD(t.dueDate);
        return d >= startOfDay(new Date()) && d <= endOfDay(weekEnd);
      });
    } else if (currentView === "history") {
      // history view uses tasks directly; filtering here is fine but not required
      // keep list as-is
    }

    // Sort
    list.sort((a, b) => sortTasks(a, b, prefs.sortMode));

    return list;
  }

  function sortTasks(a, b, mode) {
    if (mode === "priority") {
      const ap = PRIORITY_ORDER[a.priority] ?? 99;
      const bp = PRIORITY_ORDER[b.priority] ?? 99;
      if (ap !== bp) return ap - bp;

      // then due
      const ad = a.dueDate || "9999-12-31";
      const bd = b.dueDate || "9999-12-31";
      if (ad !== bd) return ad.localeCompare(bd);

      return b.createdAt.localeCompare(a.createdAt);
    }

    if (mode === "created") {
      return b.createdAt.localeCompare(a.createdAt);
    }

    // default: due date
    const ad = a.dueDate || "9999-12-31";
    const bd = b.dueDate || "9999-12-31";
    if (ad !== bd) return ad.localeCompare(bd);
    // then priority
    const ap = PRIORITY_ORDER[a.priority] ?? 99;
    const bp = PRIORITY_ORDER[b.priority] ?? 99;
    if (ap !== bp) return ap - bp;
    return b.createdAt.localeCompare(a.createdAt);
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
      version: 2,
      exportedAt: new Date().toISOString(),
      tasks,
      prefs
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

    const pr = (t.priority === "high" || t.priority === "low" || t.priority === "med") ? t.priority : "med";
    return /** @type {Task} */ ({
      id: t.id,
      title: t.title,
      done: Boolean(t.done),
      createdAt: typeof t.createdAt === "string" ? t.createdAt : new Date().toISOString(),
      dueDate: typeof t.dueDate === "string" ? t.dueDate : null,
      note: typeof t.note === "string" ? t.note : "",
      priority: pr,
      tag: typeof t.tag === "string" ? t.tag : "",
      doneAt: typeof t.doneAt === "string" ? t.doneAt : null
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
      if (!raw) return { collapseNoDueToday: true, sortMode: "due" };
      const p = JSON.parse(raw);
      return {
        collapseNoDueToday: p.collapseNoDueToday !== undefined ? Boolean(p.collapseNoDueToday) : true,
        sortMode: (p.sortMode === "priority" || p.sortMode === "created" || p.sortMode === "due") ? p.sortMode : "due"
      };
    } catch {
      return { collapseNoDueToday: true, sortMode: "due" };
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

  function weekdayShort(d) {
    return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
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