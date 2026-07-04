/* ============ Yeali storefront logic ============ */

// Order handoff destinations — update these with the brand's real handles.
const WHATSAPP_NUMBER = "919999999999"; // country code + number, digits only
const INSTAGRAM_URL = "https://instagram.com/yeali";
const FREE_SHIP_THRESHOLD = 2500;

const fmt = (n) => "₹" + n.toLocaleString("en-IN");

/* ---------- state ---------- */
let cart = []; // { id, size, qty }
try {
  cart = JSON.parse(localStorage.getItem("yeali-cart") || "[]");
} catch (_) { cart = []; }

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
      <img src="${p.image}" alt="${p.name}" loading="lazy" />
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

/* ---------- quick view modal ---------- */
const modal = document.getElementById("productModal");
let modalProduct = null;
let selectedSize = null;

function openProduct(id) {
  modalProduct = productById(id);
  selectedSize = null;
  document.getElementById("modalImg").src = modalProduct.image;
  document.getElementById("modalImg").alt = modalProduct.name;
  document.getElementById("modalCategory").textContent = modalProduct.category;
  document.getElementById("modalName").textContent = modalProduct.name;
  document.getElementById("modalPrice").textContent = fmt(modalProduct.price);
  document.getElementById("modalDesc").textContent = modalProduct.desc;
  document.getElementById("modalFabric").textContent = modalProduct.fabric;

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
}

function closeModal() {
  modal.classList.remove("open");
  document.body.style.overflow = "";
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
});

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
  closeModal();
  openCart();
});

/* ---------- cart drawer ---------- */
const drawer = document.getElementById("cartDrawer");
const drawerPanel = drawer.querySelector(".drawer__panel");
const steps = {
  bag: document.getElementById("stepBag"),
  details: document.getElementById("stepDetails"),
  confirm: document.getElementById("stepConfirm"),
};

function showStep(name) {
  Object.entries(steps).forEach(([key, el]) => (el.hidden = key !== name));
}

function openCart() {
  showStep("bag");
  drawer.classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeCart() {
  drawer.classList.remove("open");
  document.body.style.overflow = "";
}

function renderCart() {
  const count = cart.reduce((n, i) => n + i.qty, 0);
  document.getElementById("cartCount").textContent = count;

  const bagStep = steps.bag;
  bagStep.classList.toggle("drawer--empty", cart.length === 0);

  document.getElementById("cartItems").innerHTML = cart
    .map((item, idx) => {
      const p = productById(item.id);
      return `
      <div class="cart-item">
        <img src="${p.image}" alt="${p.name}" />
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

document.getElementById("burger").addEventListener("click", () => {
  document.getElementById("navLinks").classList.toggle("open");
});
document.querySelectorAll("#navLinks a").forEach((a) =>
  a.addEventListener("click", () =>
    document.getElementById("navLinks").classList.remove("open")
  )
);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
    closeCart();
  }
});

renderCart();
