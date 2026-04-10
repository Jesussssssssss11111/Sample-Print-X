/* ═══════════════════════════════════════════════════════
   PRINT X — Global JavaScript Utilities (Updated for Admin)
   ═══════════════════════════════════════════════════════ */

const API_BASE = 'https://print-x-backend.onrender.com/api';

// ── Auth Helpers ─────────────────────────────────────────
const Auth = {
  getToken() { return localStorage.getItem('printx_token'); },
getUser()  {
    try {
      const stored = JSON.parse(localStorage.getItem('printx_user'));
      return stored?.user || stored;
    }
    catch { return null; }
  },
  isLoggedIn() { return !!this.getToken() && this.getToken() !== 'admin_printx_2024'; },
  isAdmin() { return this.getToken() === 'admin_printx_2024'; },
  setSession(token, user) {
    localStorage.setItem('printx_token', token);
    if (user) {
      localStorage.setItem('printx_user', JSON.stringify(user));
    }
  },
  clearSession() { this.logout(); },
  logout() {
    localStorage.removeItem('printx_token');
    localStorage.removeItem('printx_user');
  },
};

// ── API Fetch Wrapper ─────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const token = Auth.getToken();
  const headers = {
    ...(token ? { 'Authorization': `Token ${token}` } : {}),
    ...options.headers,
  };
  // FormData auto-sets Content-Type multipart/form-data with boundary
  if (options.body instanceof FormData) {
    // Don't set Content-Type; let browser handle
  } else {
    headers['Content-Type'] = 'application/json';
  }
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const contentType = res.headers.get('content-type');
    const data = contentType && contentType.includes('application/json') 
      ? await res.json() 
      : await res.text();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { error: 'Network error. Is the server running?' } };
  }
}

// ── Toast Notifications ───────────────────────────────────
const Toast = {
  container: null,
  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },
  show(message, type = 'info', duration = 3500) {
    this.init();
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || icons.info}</span> <span>${message}</span>`;
    this.container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },
  success(msg) { this.show(msg, 'success'); },
  error(msg)   { this.show(msg, 'error'); },
  info(msg)    { this.show(msg, 'info'); },
};

// ── Format Price ──────────────────────────────────────────
function formatPrice(amount) {
  return `₱${parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

// ── Format Date ───────────────────────────────────────────
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ── Display Name Helper ────────────────────────────────────
function getDisplayName(userData) {
  if (!userData) return 'Customer';
  const user = userData.user || userData;
  return user.username || user.first_name || 'Customer';
}

// ── Render Navbar ─────────────────────────────────────────
function renderNavbar(activePage = '') {
  const user = Auth.getUser();
  const isLoggedIn = Auth.isLoggedIn();
  const basePath = getBasePath();
  const pages = {
    home:     basePath + 'customer/index.html',
    products: basePath + 'customer/product.html',
    cart:     basePath + 'customer/cart.html',
    custom:   basePath + 'customer/custom.html',
    about:    basePath + 'customer/about.html',
    orders:   basePath + 'customer/orders.html',
    login:    basePath + 'customer/login.html',
  };

  const navLinksHtml = `
    <a href="${pages.home}"     ${activePage === 'home'     ? 'class="active"' : ''}>Home</a>
    <a href="${pages.products}" ${activePage === 'products' ? 'class="active"' : ''}>Products</a>
    <a href="${pages.cart}"     ${activePage === 'cart'     ? 'class="active"' : ''}>Cart</a>
    <a href="${pages.custom}"   ${activePage === 'custom'   ? 'class="active"' : ''}>Custom Order</a>
    <a href="${pages.about}"    ${activePage === 'about'    ? 'class="active"' : ''}>About</a>
  `;

      const navRightHtml = isLoggedIn
    ? `
      <div class="nav-user-info">
        <span>👤</span>
        <span>Hello, <span class="username">${getDisplayName(user)}</span></span>
      </div>
      <a href="${pages.orders}" class="nav-cart-btn" style="text-decoration:none;">📦 My Orders</a>
      <a href="${pages.cart}" class="nav-cart-btn" style="text-decoration:none;">
        🛒 Cart <span class="cart-badge" id="nav-cart-count">0</span>
      </a>
      <button class="btn-nav-login" onclick="handleLogout()">Logout</button>
    `
    : `
      <a href="${pages.cart}" class="nav-cart-btn" style="text-decoration:none;">
        🛒 Cart <span class="cart-badge" id="nav-cart-count">0</span>
      </a>
      <a href="${pages.login}" class="btn-nav-login">Login</a>
    `;

  const navbar = document.getElementById('main-navbar') || document.getElementById('navbar');
  if (navbar) {
    navbar.innerHTML = `
      <div class="nav-container">
        <a href="${pages.home}" class="nav-logo">
          <div class="nav-logo-icon">⬡</div>
          PRINT<span>X</span>
        </a>
        <nav class="nav-links" id="navLinks">
          ${navLinksHtml}
        </nav>
        <div class="nav-right">
          ${navRightHtml}
        </div>
        <div class="nav-hamburger" id="hamburger" onclick="toggleNav()">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    updateCartCount();
  }
}

function toggleNav() {
  const links = document.getElementById('navLinks');
  if (links) links.classList.toggle('open');
}

function handleLogout() {
  Auth.logout();
  Toast.success('Logged out successfully.');
  setTimeout(() => {
    window.location.href = getBasePath() + 'customer/login.html';
  }, 800);
}

// ── Get base path ─────────────────────────────────────────
function getBasePath() {
  const path = window.location.pathname;
  if (path.includes('/customer/') || path.includes('/admin/')) {
    return '../';
  }
  return './';
}

// ── Update Cart Count ─────────────────────────────────────
async function updateCartCount() {
  const badge = document.getElementById('nav-cart-count');
  if (!badge) return;

  if (!Auth.isLoggedIn()) {
    badge.textContent = '0';
    badge.style.display = 'none';
    return;
  }

  const res = await apiFetch('/cart/');
  if (res.ok && res.data.cart) {
    const count = res.data.cart.reduce((sum, item) => sum + item.quantity, 0);
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  } else {
    badge.textContent = '0';
    badge.style.display = 'none';
  }
}

// ── Render Footer ─────────────────────────────────────────
function renderFooter() {
  const basePath = getBasePath();
  const footer = document.getElementById('footer');
  if (footer) {
    footer.innerHTML = `
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <div class="nav-logo" style="margin-bottom:16px;">
              <div class="nav-logo-icon">⬡</div>
              PRINT<span style="color:var(--red)">X</span>
            </div>
            <p>Modern 3D printing service that turns digital designs into real-world objects. Based in the Philippines.</p>
          </div>
          <div class="footer-col">
            <h4>Navigate</h4>
            <ul>
              <li><a href="${basePath}customer/index.html">Home</a></li>
              <li><a href="${basePath}customer/product.html">Products</a></li>
              <li><a href="${basePath}customer/custom.html">Custom Order</a></li>
              <li><a href="${basePath}customer/about.html">About</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>Account</h4>
            <ul>
              <li><a href="${basePath}customer/login.html">Login</a></li>
              <li><a href="${basePath}customer/login.html#register">Register</a></li>
              <li><a href="${basePath}customer/orders.html">My Orders</a></li>
              <li><a href="${basePath}customer/cart.html">Cart</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>Contact</h4>
            <ul>
              <li><a href="#">info@printx.ph</a></li>
              <li><a href="#">+63 912 345 6789</a></li>
              <li><a name="Manila">Manila, Philippines</a></li>
              <li><a href="#">Mon–Sat 9AM–6PM</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <span class="logo-text">PRINT<span style="color:var(--red)">X</span></span>
          <span>© ${new Date().getFullYear()} Print X. All rights reserved.</span>
          <span>Futuristic 3D Printing 🖨️</span>
        </div>
      </div>
    `;
  }
}

// ── Modal Helpers ─────────────────────────────────────────
function showModal(id) {
  document.getElementById(id)?.classList.remove('hidden');
}

function hideModal(id) {
  document.getElementById(id)?.classList.add('hidden');
}

// ── Order Status Constants ───────────────────────────────
const OrderStatusChoices = [
  ['pending', 'Pending'],
  ['processing', 'Processing'],
  ['shipped', 'Shipped'],
  ['delivered', 'Delivered'],
  ['cancelled', 'Cancelled']
];

// ── Badge HTML helper ─────────────────────────────────────
function statusBadge(status) {
  const colors = {
    pending: 'warning',
    processing: 'info',
    shipped: 'primary',
    delivered: 'success',
    cancelled: 'error'
  };
  const color = colors[status] || 'default';
  return `<span class="badge badge-${color}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;
}

// ── Require Auth ──────────────────────────────────────────
function requireLogin() {
  return requireAuth();
}

async function addToCart(productId, productName) {
  if (!requireLogin()) return;
  
  const { ok, data } = await apiFetch('/cart/add/', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, quantity: 1 }),
  });
  
  if (ok) {
    Toast.success(`${productName} added to cart! Ready for checkout.`);
    updateCartCount();
  } else {
    Toast.error(data.error || 'Failed to add to cart');
  }
}

function requireAuth() {
  if (!Auth.isLoggedIn()) {
    Toast.error('Please login to continue.');
    setTimeout(() => {
      window.location.href = getBasePath() + 'customer/login.html';
    }, 1000);
    return false;
  }
  return true;
}

// ── Init Page ─────────────────────────────────────────────
function getActivePage() {
  const path = window.location.pathname.toLowerCase();
  if (path.includes('product') || path.includes('products')) return 'products';
  if (path.includes('custom')) return 'custom';
  if (path.includes('about')) return 'about';
  if (path.includes('cart')) return 'cart';
  return 'home';
}

document.addEventListener('DOMContentLoaded', async () => {
  const navbarEl = document.getElementById('main-navbar') || document.getElementById('navbar');
  if (navbarEl) renderNavbar(getActivePage());
  renderFooter();
  await updateCartCount();
});

