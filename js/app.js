/* ============ Yeali storefront logic ============ */

// Site-wide settings, published from the admin page (window.SITE in js/products.js).
const SITE = {
  announce: "Small-batch drops · Free shipping across India on orders over ₹2,500",
  instagram: "https://instagram.com/yeali",
  whatsapp: "919999999999",
  freeShipThreshold: 2500,
  ...(window.SITE || {}),
};
const WHATSAPP_NUMBER = String(SITE.whatsapp || "").replace(/\D/g, "") || "919999999999";
const INSTAGRAM_URL = SITE.instagram || "https://instagram.com/yeali";
const FREE_SHIP_THRESHOLD = Math.max(0, +SITE.freeShipThreshold || 0) || 2500;

// announcement banner: admin-provided text, hidden entirely when empty
{
  const bar = document.getElementById("announceBar");
  if (SITE.announce && String(SITE.announce).trim()) bar.textContent = SITE.announce;
  else bar.remove();
}
// point every Instagram link at the configured profile
document.querySelectorAll('a[href*="instagram.com"]').forEach((a) => (a.href = INSTAGRAM_URL));

const PRODUCTS = (window.PRODUCTS || []).map((p) => ({
  ...p,
  images: p.images && p.images.length ? p.images : [p.image].filter(Boolean),
}));

const fmt = (n) => "₹" + n.toLocaleString("en-IN");

/* ---------- state ---------- */
let cart = []; // { id, size, qty }
try {
  cart = JSON.parse(localStorage.getItem("yeali-cart") || "[]");
} catch (_) { cart = []; }
cart = cart.filter((item) => PRODUCTS.some((p) => p.id === item.id));

const save = () => localStorage.setItem("yeali-cart", JSON.stringify(cart));
const productById = (id) => PRODUCTS.find((p) => p.id === id);
const cartTotal = () =>
  cart.reduce((sum, item) => sum + productById(item.id).price * item.qty, 0);

/* ---------- product grid ---------- */
const grid = document.getElementById("productGrid");
grid.innerHTML = PRODUCTS.map(
  (p) => `
  <article class="card">
    <div class="card__media" data-open-product="${p.id}">
      ${p.badge ? `<span class="card__badge">${p.badge}</span>` : ""}
      <div class="card__slider">
        ${p.images
          .map((src, i) => `<img src="${src}" alt="${p.name}${i ? ` — photo ${i + 1}` : ""}" loading="lazy" />`)
          .join("")}
      </div>
      ${p.images.length > 1
        ? `<div class="card__dots">${p.images.map((_, i) => `<span${i === 0 ? ' class="active"' : ""}></span>`).join("")}</div>`
        : ""}
      <button class="card__quick" data-open-product="${p.id}">Quick View</button>
    </div>
    <div class="card__body">
      <div>
        <h3 class="card__name">${p.name}</h3>
        <p class="card__cat">${p.category}</p>
      </div>
      <p class="card__price">${fmt(p.price)}</p>
    </div>
  </article>`
).join("");

// keep each card's dot indicator in sync with its swipe position
document.querySelectorAll(".card__slider").forEach((slider) => {
  const dots = slider.parentElement.querySelectorAll(".card__dots span");
  if (!dots.length) return;
  let ticking = false;
  slider.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const idx = Math.round(slider.scrollLeft / slider.clientWidth);
        dots.forEach((d, i) => d.classList.toggle("active", i === idx));
        ticking = false;
      });
    },
    { passive: true }
  );
});

/* ---------- quick view modal ---------- */
const modal = document.getElementById("productModal");
let modalProduct = null;
let selectedSize = null;
let modalImgIdx = 0;

function syncModalThumbs() {
  document
    .querySelectorAll("#modalThumbs button")
    .forEach((b, i) => b.classList.toggle("active", i === modalImgIdx));
}

// Chromium ignores smooth programmatic scrolls on mandatory-snap containers,
// so animate scrollLeft manually with the snap lifted for the duration.
let sliderAnim = null;
function scrollSliderTo(slider, left, instant) {
  cancelAnimationFrame(sliderAnim);
  if (instant) {
    slider.style.scrollSnapType = "";
    slider.scrollLeft = left;
    return;
  }
  const start = slider.scrollLeft;
  const dist = left - start;
  if (!dist) {
    slider.style.scrollSnapType = "";
    return;
  }
  const duration = 320;
  const t0 = performance.now();
  slider.style.scrollSnapType = "none";
  const step = (now) => {
    const t = Math.min(1, (now - t0) / duration);
    slider.scrollLeft = start + dist * (1 - Math.pow(1 - t, 3));
    if (t < 1) sliderAnim = requestAnimationFrame(step);
    else slider.style.scrollSnapType = "";
  };
  sliderAnim = requestAnimationFrame(step);
}

function setModalImage(idx, instant = false) {
  const imgs = modalProduct.images;
  modalImgIdx = ((idx % imgs.length) + imgs.length) % imgs.length;
  const slider = document.getElementById("modalSlider");
  scrollSliderTo(slider, modalImgIdx * slider.clientWidth, instant);
  syncModalThumbs();
}

/* history-aware overlays: the browser back button closes the top overlay
   instead of leaving the page (important on mobile, where the full-screen
   quick view reads as a new page) */
function pushOverlayState(name) {
  history.pushState({ yeali: name }, "");
}
// a reload while an overlay was open leaves its state entry current — neutralize it
if (history.state && history.state.yeali) history.replaceState(null, "");
function hasOverlayState() {
  return !!(history.state && history.state.yeali);
}

function openProduct(id) {
  modalProduct = productById(id);
  selectedSize = null;
  document.getElementById("modalCategory").textContent = modalProduct.category;
  document.getElementById("modalName").textContent = modalProduct.name;
  document.getElementById("modalPrice").textContent = fmt(modalProduct.price);
  document.getElementById("modalDesc").textContent = modalProduct.desc;
  document.getElementById("modalFabric").textContent = modalProduct.fabric;

  // carousel
  const multi = modalProduct.images.length > 1;
  document.getElementById("imgPrev").hidden = !multi;
  document.getElementById("imgNext").hidden = !multi;
  const slider = document.getElementById("modalSlider");
  slider.innerHTML = modalProduct.images
    .map((src, i) => `<img src="${src}" alt="${modalProduct.name} — photo ${i + 1}"${i ? ' loading="lazy"' : ""} />`)
    .join("");
  document.getElementById("modalThumbs").innerHTML = multi
    ? modalProduct.images
        .map((src, i) => `<button type="button" data-img-idx="${i}" aria-label="Photo ${i + 1}"><img src="${src}" alt="" /></button>`)
        .join("")
    : "";
  modalImgIdx = 0;
  syncModalThumbs();

  const picker = document.getElementById("sizePicker");
  picker.innerHTML = modalProduct.sizes
    .map((s) => `<button type="button" data-size="${s}">${s}</button>`)
    .join("");
  if (modalProduct.sizes.length === 1) {
    selectedSize = modalProduct.sizes[0];
    picker.querySelector("button").classList.add("active");
  }

  modal.classList.add("open");
  document.body.style.overflow = "hidden";
  slider.scrollLeft = 0; // reset only after the modal is visible (layout exists)
  pushOverlayState("modal");
}

function modalHide() {
  modal.classList.remove("open");
  document.body.style.overflow = "";
}

function closeModal() {
  if (hasOverlayState()) history.back();
  else modalHide();
}

document.addEventListener("click", (e) => {
  const opener = e.target.closest("[data-open-product]");
  if (opener) openProduct(opener.dataset.openProduct);
  if (e.target.closest("[data-close-modal]")) closeModal();

  const sizeBtn = e.target.closest("#sizePicker button");
  if (sizeBtn) {
    selectedSize = sizeBtn.dataset.size;
    document
      .querySelectorAll("#sizePicker button")
      .forEach((b) => b.classList.toggle("active", b === sizeBtn));
  }

  const thumb = e.target.closest("[data-img-idx]");
  if (thumb) setModalImage(+thumb.dataset.imgIdx);
});

document.getElementById("imgPrev").addEventListener("click", () => setModalImage(modalImgIdx - 1));
document.getElementById("imgNext").addEventListener("click", () => setModalImage(modalImgIdx + 1));

// swiping the slider natively — keep index and thumbnails in sync
{
  const slider = document.getElementById("modalSlider");
  let ticking = false;
  slider.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const i = Math.round(slider.scrollLeft / slider.clientWidth);
      if (modalProduct && i !== modalImgIdx && i >= 0 && i < modalProduct.images.length) {
        modalImgIdx = i;
        syncModalThumbs();
      }
      ticking = false;
    });
  }, { passive: true });
}

// clicking/tapping the photo (not the controls) opens the full-screen view
document.getElementById("modalMedia").addEventListener("click", (e) => {
  if (e.target.closest(".carousel__arrow, .carousel__thumbs")) return;
  openLightbox();
});

/* ---------- lightbox: full-screen view with zoom ---------- */
const lbEl = document.getElementById("lightbox");
const lbStage = document.getElementById("lbStage");
const lbImg = document.getElementById("lbImg");
const LB_MAX_SCALE = 4;
const LB_TAP_SCALE = 2.5;
let lbScale = 1, lbTx = 0, lbTy = 0;

function lbApply() {
  lbImg.style.transform = `translate(${lbTx}px, ${lbTy}px) scale(${lbScale})`;
  lbStage.classList.toggle("zoomed", lbScale > 1.01);
}

function lbClampPan() {
  const maxX = Math.max(0, (lbImg.clientWidth * lbScale - lbStage.clientWidth) / 2);
  const maxY = Math.max(0, (lbImg.clientHeight * lbScale - lbStage.clientHeight) / 2);
  lbTx = Math.min(maxX, Math.max(-maxX, lbTx));
  lbTy = Math.min(maxY, Math.max(-maxY, lbTy));
}

function lbReset() {
  lbScale = 1; lbTx = 0; lbTy = 0;
  lbApply();
}

// zoom to newScale keeping the image point under (cx, cy) fixed on screen
function lbZoomTo(newScale, cx, cy) {
  const r = lbStage.getBoundingClientRect();
  const px = cx - (r.left + r.width / 2);
  const py = cy - (r.top + r.height / 2);
  const s = Math.min(LB_MAX_SCALE, Math.max(1, newScale));
  lbTx = px - (s / lbScale) * (px - lbTx);
  lbTy = py - (s / lbScale) * (py - lbTy);
  lbScale = s;
  if (s === 1) { lbTx = 0; lbTy = 0; }
  lbClampPan();
  lbApply();
}

function openLightbox() {
  if (!modalProduct) return;
  lbImg.src = modalProduct.images[modalImgIdx];
  lbImg.alt = modalProduct.name;
  const multi = modalProduct.images.length > 1;
  document.getElementById("lbPrev").hidden = !multi;
  document.getElementById("lbNext").hidden = !multi;
  lbReset();
  lbEl.classList.add("open");
  pushOverlayState("lightbox");
}

function lbHide() {
  lbEl.classList.remove("open");
}

function closeLightbox() {
  if (hasOverlayState()) history.back();
  else lbHide();
}

function lbNav(delta) {
  setModalImage(modalImgIdx + delta, true);
  lbImg.src = modalProduct.images[modalImgIdx];
  lbReset();
}

document.getElementById("lbClose").addEventListener("click", closeLightbox);
document.getElementById("lbPrev").addEventListener("click", () => lbNav(-1));
document.getElementById("lbNext").addEventListener("click", () => lbNav(1));

// pointer gestures: drag-pan, pinch-zoom, tap / double-tap to zoom
const lbPointers = new Map();
let lbGesture = null;
let lbTapStart = null;
let lbLastTap = 0;

function lbStartGesture() {
  const pts = [...lbPointers.values()];
  if (pts.length === 2) {
    lbGesture = {
      pinch: true,
      d0: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
      mid0: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 },
      s0: lbScale, tx0: lbTx, ty0: lbTy,
    };
  } else if (pts.length === 1) {
    lbGesture = { pinch: false, x: pts[0].x, y: pts[0].y, tx0: lbTx, ty0: lbTy };
  } else {
    lbGesture = null;
  }
}

lbStage.addEventListener("pointerdown", (e) => {
  try { lbStage.setPointerCapture(e.pointerId); } catch (_) {}
  lbPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  lbTapStart = { x: e.clientX, y: e.clientY, t: Date.now(), type: e.pointerType };
  lbImg.style.transition = "none";
  lbStartGesture();
});

lbStage.addEventListener("pointermove", (e) => {
  if (!lbPointers.has(e.pointerId) || !lbGesture) return;
  lbPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const pts = [...lbPointers.values()];
  if (lbGesture.pinch && pts.length === 2) {
    const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    const r = lbStage.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const s = Math.min(LB_MAX_SCALE, Math.max(1, lbGesture.s0 * (d / lbGesture.d0)));
    lbTx = (mid.x - cx) - (s / lbGesture.s0) * ((lbGesture.mid0.x - cx) - lbGesture.tx0);
    lbTy = (mid.y - cy) - (s / lbGesture.s0) * ((lbGesture.mid0.y - cy) - lbGesture.ty0);
    lbScale = s;
    if (s === 1) { lbTx = 0; lbTy = 0; }
    lbClampPan();
    lbApply();
  } else if (!lbGesture.pinch && pts.length === 1 && lbScale > 1) {
    lbTx = lbGesture.tx0 + (pts[0].x - lbGesture.x);
    lbTy = lbGesture.ty0 + (pts[0].y - lbGesture.y);
    lbClampPan();
    lbApply();
  }
});

function lbEndPointer(e) {
  lbPointers.delete(e.pointerId);
  if (lbPointers.size === 0) lbImg.style.transition = "";
  if (
    lbTapStart && lbPointers.size === 0 &&
    Date.now() - lbTapStart.t < 300 &&
    Math.hypot(e.clientX - lbTapStart.x, e.clientY - lbTapStart.y) < 8
  ) {
    if (lbTapStart.type === "mouse") {
      lbZoomTo(lbScale > 1.01 ? 1 : LB_TAP_SCALE, e.clientX, e.clientY);
    } else {
      const now = Date.now();
      if (now - lbLastTap < 320) {
        lbZoomTo(lbScale > 1.01 ? 1 : LB_TAP_SCALE, e.clientX, e.clientY);
        lbLastTap = 0;
      } else {
        lbLastTap = now;
      }
    }
  }
  lbTapStart = null;
  lbStartGesture();
}
lbStage.addEventListener("pointerup", lbEndPointer);
lbStage.addEventListener("pointercancel", (e) => {
  lbPointers.delete(e.pointerId);
  if (lbPointers.size === 0) lbImg.style.transition = "";
  lbTapStart = null;
  lbStartGesture();
});

lbStage.addEventListener("wheel", (e) => {
  e.preventDefault();
  lbZoomTo(lbScale * (e.deltaY < 0 ? 1.2 : 1 / 1.2), e.clientX, e.clientY);
}, { passive: false });

document.getElementById("modalAddBtn").addEventListener("click", () => {
  if (!selectedSize) {
    toast("Please pick a size first");
    return;
  }
  const existing = cart.find(
    (i) => i.id === modalProduct.id && i.size === selectedSize
  );
  if (existing) existing.qty += 1;
  else cart.push({ id: modalProduct.id, size: selectedSize, qty: 1 });
  save();
  renderCart();
  // swap the modal for the cart drawer in place, reusing the same history entry
  modalHide();
  cartShow();
  if (hasOverlayState()) history.replaceState({ yeali: "cart" }, "");
  else pushOverlayState("cart");
});

/* ---------- cart drawer ---------- */
const drawer = document.getElementById("cartDrawer");
const steps = {
  bag: document.getElementById("stepBag"),
  details: document.getElementById("stepDetails"),
  confirm: document.getElementById("stepConfirm"),
};

function showStep(name) {
  Object.entries(steps).forEach(([key, el]) => (el.hidden = key !== name));
}

function cartShow() {
  showStep("bag");
  drawer.classList.add("open");
  document.body.style.overflow = "hidden";
}
function openCart() {
  cartShow();
  pushOverlayState("cart");
}
function drawerHide() {
  drawer.classList.remove("open");
  document.body.style.overflow = "";
}
function closeCart() {
  if (hasOverlayState()) history.back();
  else drawerHide();
}

// browser back closes the top overlay
window.addEventListener("popstate", () => {
  const lbEl = document.getElementById("lightbox");
  if (lbEl.classList.contains("open")) return lbHide();
  if (modal.classList.contains("open")) return modalHide();
  if (drawer.classList.contains("open")) drawerHide();
});

function renderCart() {
  const count = cart.reduce((n, i) => n + i.qty, 0);
  const countEl = document.getElementById("cartCount");
  countEl.textContent = count;
  countEl.hidden = count === 0;

  steps.bag.classList.toggle("drawer--empty", cart.length === 0);

  document.getElementById("cartItems").innerHTML = cart
    .map((item, idx) => {
      const p = productById(item.id);
      return `
      <div class="cart-item">
        <img src="${p.images[0]}" alt="${p.name}" />
        <div>
          <p class="cart-item__name">${p.name}</p>
          <p class="cart-item__meta">Size ${item.size}</p>
          <span class="cart-item__qty">
            <button data-qty="-1" data-idx="${idx}" aria-label="Decrease">−</button>
            <span>${item.qty}</span>
            <button data-qty="1" data-idx="${idx}" aria-label="Increase">+</button>
          </span>
        </div>
        <div class="cart-item__right">
          <p class="cart-item__price">${fmt(p.price * item.qty)}</p>
          <button class="cart-item__remove" data-remove="${idx}">Remove</button>
        </div>
      </div>`;
    })
    .join("");

  const total = cartTotal();
  document.getElementById("cartTotal").textContent = fmt(total);
  document.getElementById("checkoutTotal").textContent = fmt(total);
  const shipNote = document.getElementById("shipNote");
  if (total === 0) shipNote.textContent = "";
  else if (total >= FREE_SHIP_THRESHOLD) shipNote.textContent = "You've unlocked free shipping ✨";
  else shipNote.textContent = `Add ${fmt(FREE_SHIP_THRESHOLD - total)} more for free shipping`;
}

drawer.addEventListener("click", (e) => {
  if (e.target.closest("[data-close-cart]")) closeCart();

  const qtyBtn = e.target.closest("[data-qty]");
  if (qtyBtn) {
    const idx = +qtyBtn.dataset.idx;
    cart[idx].qty += +qtyBtn.dataset.qty;
    if (cart[idx].qty <= 0) cart.splice(idx, 1);
    save();
    renderCart();
  }

  const removeBtn = e.target.closest("[data-remove]");
  if (removeBtn) {
    cart.splice(+removeBtn.dataset.remove, 1);
    save();
    renderCart();
  }
});

document.getElementById("cartBtn").addEventListener("click", openCart);
document.getElementById("shopMoreBtn").addEventListener("click", () => {
  closeCart();
  setTimeout(
    () => document.getElementById("shop").scrollIntoView({ behavior: "smooth" }),
    120
  );
});
document.getElementById("toCheckoutBtn").addEventListener("click", () => showStep("details"));
document.getElementById("backToBag").addEventListener("click", () => showStep("bag"));
document.getElementById("backToDetails").addEventListener("click", () => showStep("details"));

/* ---------- checkout ---------- */
let orderMessage = "";

document.getElementById("checkoutForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("fName").value.trim();
  const phone = document.getElementById("fPhone").value.trim();
  const address = document.getElementById("fAddress").value.trim();
  const note = document.getElementById("fNote").value.trim();

  const lines = cart.map((item) => {
    const p = productById(item.id);
    return `• ${p.name} — Size ${item.size} × ${item.qty} — ${fmt(p.price * item.qty)}`;
  });

  orderMessage = [
    "Hi Yeali! I'd like to place an order ✨",
    "",
    ...lines,
    "",
    `Total: ${fmt(cartTotal())}`,
    "",
    `Name: ${name}`,
    `Phone: ${phone}`,
    `Address: ${address}`,
    note ? `Note: ${note}` : null,
  ]
    .filter((l) => l !== null)
    .join("\n");

  document.getElementById("orderSummary").textContent = orderMessage;
  document.getElementById("waBtn").href =
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(orderMessage)}`;
  document.getElementById("copiedMsg").hidden = true;
  showStep("confirm");
});

document.getElementById("igBtn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(orderMessage);
    document.getElementById("copiedMsg").hidden = false;
  } catch (_) {
    toast("Copy failed — long-press the summary to copy");
  }
  window.open(INSTAGRAM_URL, "_blank", "noopener");
});

/* ---------- misc UI ---------- */
const toastEl = document.getElementById("toast");
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2400);
}

const navLinksEl = document.getElementById("navLinks");
const navScrim = document.getElementById("navScrim");
function closeMenu() {
  navLinksEl.classList.remove("open");
  navScrim.classList.remove("show");
}
document.getElementById("burger").addEventListener("click", () => {
  const open = navLinksEl.classList.toggle("open");
  navScrim.classList.toggle("show", open);
});
navScrim.addEventListener("click", closeMenu);
document.querySelectorAll("#navLinks a").forEach((a) => a.addEventListener("click", closeMenu));

document.addEventListener("keydown", (e) => {
  const lbOpen = lbEl.classList.contains("open");
  if (e.key === "Escape") {
    // close only the topmost overlay — each close consumes one history entry
    if (lbOpen) closeLightbox();
    else if (modal.classList.contains("open")) closeModal();
    else if (drawer.classList.contains("open")) closeCart();
    return;
  }
  if (lbOpen && modalProduct && modalProduct.images.length > 1) {
    if (e.key === "ArrowLeft") lbNav(-1);
    if (e.key === "ArrowRight") lbNav(1);
    return;
  }
  if (modal.classList.contains("open") && modalProduct) {
    if (e.key === "ArrowLeft") setModalImage(modalImgIdx - 1);
    if (e.key === "ArrowRight") setModalImage(modalImgIdx + 1);
  }
});

renderCart();
