/* ============ Yeali admin — catalog editor & GitHub publisher ============ */

const DRAFT_KEY = "yeali-admin-draft";
const CONFIG_KEY = "yeali-admin-config";
const PRODUCTS_PATH = "js/products.js";
const UPLOAD_DIR = "assets/uploads";

/* ---------- state ---------- */
function normalize(list) {
  return (list || []).map((p) => ({
    ...p,
    badge: p.badge || "",
    images: p.images && p.images.length ? p.images.slice() : [p.image].filter(Boolean),
  }));
}

const SITE_DEFAULTS = {
  announce: "Small-batch drops · Free shipping across India on orders over ₹2,500",
  instagram: "https://instagram.com/yeali",
  whatsapp: "919999999999",
  freeShipThreshold: 2500,
};

let products, site;
const draft = localStorage.getItem(DRAFT_KEY);
if (draft) {
  try {
    const d = JSON.parse(draft);
    if (Array.isArray(d)) products = d; // draft saved before site settings existed
    else { products = d.products; site = d.site; }
  } catch (_) { /* fall through to published state */ }
}
if (!products) products = normalize(window.PRODUCTS);
if (!site) site = { ...SITE_DEFAULTS, ...(window.SITE || {}) };

let config = { owner: "gopushaji", repo: "yeali", branch: "main", token: "" };
try { config = { ...config, ...JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}") }; } catch (_) {}

const saveDraft = () => localStorage.setItem(DRAFT_KEY, JSON.stringify({ site, products }));

/* ---------- store settings ---------- */
const SITE_FIELDS = {
  announce: "siteAnnounce",
  instagram: "siteInstagram",
  whatsapp: "siteWhatsapp",
  freeShipThreshold: "siteShip",
};

function renderSiteInputs() {
  for (const [key, id] of Object.entries(SITE_FIELDS)) {
    document.getElementById(id).value = site[key];
  }
}

for (const [key, id] of Object.entries(SITE_FIELDS)) {
  document.getElementById(id).addEventListener("input", (e) => {
    site[key] = key === "freeShipThreshold"
      ? Math.max(0, Math.round(+e.target.value || 0))
      : e.target.value;
    saveDraft();
  });
}

/* ---------- rendering ---------- */
const listEl = document.getElementById("productList");

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function render() {
  document.getElementById("productCount").textContent = `(${products.length})`;
  listEl.innerHTML = products
    .map(
      (p, i) => `
    <div class="ap" data-idx="${i}">
      <div class="ap__head">
        <span class="ap__order">
          <button data-act="up" title="Move up">▲</button>
          <button data-act="down" title="Move down">▼</button>
        </span>
        <span class="ap__title">${esc(p.name) || "Untitled product"}</span>
        <button class="ap__delete" data-act="delete">Delete</button>
      </div>
      <div class="ap__grid">
        <label>Name<input data-field="name" value="${esc(p.name)}" /></label>
        <label>Category<input data-field="category" value="${esc(p.category)}" /></label>
        <label>Price (₹)<input data-field="price" type="number" min="0" value="${p.price}" /></label>
        <label>Badge<input data-field="badge" value="${esc(p.badge)}" placeholder="New / Bestseller / blank" /></label>
      </div>
      <div class="ap__grid ap__grid--row2">
        <label>Sizes (comma-separated)<input data-field="sizes" value="${esc(p.sizes.join(", "))}" /></label>
        <label>Description<textarea data-field="desc" rows="2">${esc(p.desc)}</textarea></label>
        <label>Fabric &amp; care<textarea data-field="fabric" rows="2">${esc(p.fabric)}</textarea></label>
      </div>
      <p class="ap__images-label">Photos — first one is the shop cover</p>
      <div class="ap__images">
        ${p.images
          .map(
            (src, j) => `
          <div class="ap__thumb ${j === 0 ? "ap__thumb--cover" : ""}">
            ${j === 0 ? '<span class="ap__thumb-cover-tag">Cover</span>' : ""}
            ${src.startsWith("data:") ? '<span class="ap__new-tag">New</span>' : ""}
            <img src="${src}" alt="" />
            <div class="ap__thumb-tools">
              <button data-act="img-left" data-img="${j}" title="Move left">◀</button>
              <button class="del" data-act="img-del" data-img="${j}" title="Remove">✕</button>
              <button data-act="img-right" data-img="${j}" title="Move right">▶</button>
            </div>
          </div>`
          )
          .join("")}
        <button class="ap__add-photo" data-act="img-add">+ Add photos</button>
      </div>
    </div>`
    )
    .join("");
}

/* ---------- editing ---------- */
listEl.addEventListener("input", (e) => {
  const field = e.target.dataset.field;
  if (!field) return;
  const idx = +e.target.closest(".ap").dataset.idx;
  const p = products[idx];
  if (field === "price") p.price = Math.max(0, Math.round(+e.target.value || 0));
  else if (field === "sizes") p.sizes = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
  else p[field] = e.target.value;
  if (field === "name") e.target.closest(".ap").querySelector(".ap__title").textContent = p.name || "Untitled product";
  saveDraft();
});

listEl.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const card = btn.closest(".ap");
  const idx = +card.dataset.idx;
  const p = products[idx];
  const act = btn.dataset.act;
  const j = +btn.dataset.img;

  if (act === "up" && idx > 0) [products[idx - 1], products[idx]] = [products[idx], products[idx - 1]];
  else if (act === "down" && idx < products.length - 1) [products[idx + 1], products[idx]] = [products[idx], products[idx + 1]];
  else if (act === "delete") {
    if (!confirm(`Delete "${p.name}"? This removes it from the site on next publish.`)) return;
    products.splice(idx, 1);
  } else if (act === "img-del") {
    if (p.images.length === 1 && !confirm("This is the only photo. Remove it anyway?")) return;
    p.images.splice(j, 1);
  } else if (act === "img-left" && j > 0) [p.images[j - 1], p.images[j]] = [p.images[j], p.images[j - 1]];
  else if (act === "img-right" && j < p.images.length - 1) [p.images[j + 1], p.images[j]] = [p.images[j], p.images[j + 1]];
  else if (act === "img-add") {
    const files = await pickFiles();
    for (const f of files) p.images.push(await compressImage(f));
  } else return;

  saveDraft();
  render();
});

document.getElementById("addProductBtn").addEventListener("click", () => {
  products.unshift({
    id: "product-" + Date.now(),
    name: "",
    category: "",
    price: 0,
    badge: "",
    sizes: ["XS", "S", "M", "L", "XL"],
    images: [],
    desc: "",
    fabric: "",
  });
  saveDraft();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

document.getElementById("resetBtn").addEventListener("click", () => {
  if (!confirm("Discard all unpublished changes and reload the published catalog?")) return;
  localStorage.removeItem(DRAFT_KEY);
  products = normalize(window.PRODUCTS);
  site = { ...SITE_DEFAULTS, ...(window.SITE || {}) };
  renderSiteInputs();
  render();
  toast("Draft discarded");
});

/* ---------- image handling ---------- */
function pickFiles() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = () => resolve([...input.files]);
    input.click();
  });
}

function compressImage(file, maxSide = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/* ---------- settings ---------- */
const settingsPanel = document.getElementById("settingsPanel");
document.getElementById("settingsBtn").addEventListener("click", () => {
  settingsPanel.hidden = !settingsPanel.hidden;
  if (!settingsPanel.hidden) {
    document.getElementById("cfgOwner").value = config.owner;
    document.getElementById("cfgRepo").value = config.repo;
    document.getElementById("cfgBranch").value = config.branch;
    document.getElementById("cfgToken").value = config.token;
  }
});

document.getElementById("saveSettingsBtn").addEventListener("click", () => {
  config = {
    owner: document.getElementById("cfgOwner").value.trim(),
    repo: document.getElementById("cfgRepo").value.trim(),
    branch: document.getElementById("cfgBranch").value.trim() || "main",
    token: document.getElementById("cfgToken").value.trim(),
  };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  toast("Settings saved in this browser");
});

document.getElementById("testSettingsBtn").addEventListener("click", async () => {
  document.getElementById("saveSettingsBtn").click();
  try {
    await gh(`contents/${PRODUCTS_PATH}?ref=${config.branch}`);
    status("Connection OK — repository is reachable and the token works.", "ok");
  } catch (err) {
    let msg = "Connection failed: " + err.message;
    if (/failed to fetch/i.test(err.message)) {
      msg += location.protocol === "file:"
        ? " — you opened this page as a local file; open the hosted admin page (https://…/admin.html) instead."
        : " — the request was blocked before reaching GitHub. Try a private/incognito window (extensions can block it) or a different browser/network.";
    }
    status(msg, "err");
  }
});

/* ---------- GitHub API ---------- */
async function gh(path, options = {}) {
  if (!config.token) throw new Error("no access token set (open Settings)");
  const res = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/${path}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: "application/vnd.github+json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
    }
  );
  if (!res.ok) {
    let msg = res.status + " " + res.statusText;
    try { msg += " — " + (await res.json()).message; } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

function putFile(path, base64Content, message, sha) {
  return gh(`contents/${path}`, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: base64Content,
      branch: config.branch,
      ...(sha ? { sha } : {}),
    }),
  });
}

const b64encodeText = (text) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(text)));

/* ---------- publish ---------- */
const publishBtn = document.getElementById("publishBtn");

publishBtn.addEventListener("click", async () => {
  // validation
  for (const p of products) {
    const label = p.name || p.id;
    if (!p.name.trim()) return status(`A product is missing its name.`, "err");
    if (!p.price) return status(`"${label}" needs a price.`, "err");
    if (!p.sizes.length) return status(`"${label}" needs at least one size.`, "err");
    if (!p.images.length) return status(`"${label}" needs at least one photo.`, "err");
  }
  // normalize store settings
  const cleanSite = {
    announce: String(site.announce || "").trim(),
    instagram: String(site.instagram || "").trim() || SITE_DEFAULTS.instagram,
    whatsapp: String(site.whatsapp || "").replace(/\D/g, ""),
    freeShipThreshold: Math.max(0, Math.round(+site.freeShipThreshold || 0)) || SITE_DEFAULTS.freeShipThreshold,
  };
  if (!/^https?:\/\//i.test(cleanSite.instagram)) cleanSite.instagram = "https://" + cleanSite.instagram;
  if (cleanSite.whatsapp.length < 10) {
    return status("WhatsApp number looks incomplete — enter country code + number, digits only.", "err");
  }
  if (!config.token) {
    settingsPanel.hidden = false;
    return status("Add your GitHub access token in Settings first.", "err");
  }
  if (!confirm("Publish these changes to the live site?")) return;

  publishBtn.disabled = true;
  try {
    // 1. upload any new photos (data URLs) to the repo
    const pending = [];
    products.forEach((p) => p.images.forEach((src, j) => {
      if (src.startsWith("data:")) pending.push({ p, j });
    }));
    let done = 0;
    for (const { p, j } of pending) {
      done += 1;
      status(`Uploading photo ${done} of ${pending.length}…`);
      const path = `${UPLOAD_DIR}/${p.id}-${Date.now()}-${j}.jpg`;
      await putFile(path, p.images[j].split(",")[1], `Add photo for ${p.name}`);
      p.images[j] = path;
    }

    // 2. write the catalog file
    status("Updating catalog…");
    let sha;
    try {
      sha = (await gh(`contents/${PRODUCTS_PATH}?ref=${config.branch}`)).sha;
    } catch (_) { sha = undefined; }
    const fileText =
      "// Yeali product catalog and store settings.\n" +
      "// This file is managed by the admin page (admin.html) — \"Publish\" rewrites it.\n" +
      "window.PRODUCTS = " + JSON.stringify(products, null, 2) + ";\n\n" +
      "window.SITE = " + JSON.stringify(cleanSite, null, 2) + ";\n";
    await putFile(PRODUCTS_PATH, b64encodeText(fileText), "Update catalog from admin", sha);

    localStorage.removeItem(DRAFT_KEY);
    window.PRODUCTS = JSON.parse(JSON.stringify(products));
    window.SITE = { ...cleanSite };
    site = { ...cleanSite };
    renderSiteInputs();
    render();
    status("Published! The live site updates in about a minute.", "ok");
    toast("Published ✓");
  } catch (err) {
    status("Publish failed: " + err.message, "err");
  } finally {
    publishBtn.disabled = false;
  }
});

/* ---------- feedback ---------- */
const statusBar = document.getElementById("statusBar");
function status(msg, kind = "") {
  statusBar.textContent = msg;
  statusBar.className = "ah__status" + (kind ? " " + kind : "");
}

const toastEl = document.getElementById("atoast");
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2400);
}

if (draft) status("You have an unpublished draft (restored from this browser).");
renderSiteInputs();
render();
