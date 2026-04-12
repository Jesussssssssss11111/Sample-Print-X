/* ═══════════════════════════════════════════════════════
   PRINT X — Global JavaScript Utilities v3.0
   Updated: JWT auth (Bearer tokens), admin via is_admin flag
   ═══════════════════════════════════════════════════════ */

const API_BASE = 'http://127.0.0.1:8000/api';

/* ── Auth Helpers ────────────────────────────────────────*/
const Auth = {
  getAccess()  { return localStorage.getItem('px_access'); },
  getRefresh() { return localStorage.getItem('px_refresh'); },
  getUser() {
    try { return JSON.parse(localStorage.getItem('px_user')) || null; }
    catch { return null; }
  },
  isLoggedIn() { return !!this.getAccess() && !this.getUser()?.is_admin; },
  isAdmin()    { return !!this.getAccess() && !!this.getUser()?.is_admin; },
  isAnyUser()  { return !!this.getAccess(); },
  setSession(access, refresh, user) {
    localStorage.setItem('px_access', access);
    localStorage.setItem('px_refresh', refresh);
    localStorage.setItem('px_user', JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem('px_access');
    localStorage.removeItem('px_refresh');
    localStorage.removeItem('px_user');
  },
  logout() { this.clearSession(); },
};

/* ── Token Refresh ───────────────────────────────────────*/
async function refreshAccessToken() {
  const refresh = Auth.getRefresh();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE}/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (res.ok) {
      const d = await res.json();
      localStorage.setItem('px_access', d.access);
      return true;
    }
    Auth.clearSession();
    return false;
  } catch { return false; }
}

/* ── API Fetch Wrapper ───────────────────────────────────*/
async function apiFetch(endpoint, options = {}, isFormData = false) {
  const token = Auth.getAccess();
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

    // Token expired — try refresh once
    if (res.status === 401 && !options.headers?.Authorization) {
      const refreshed = await refreshAccessToken();
      if (refreshed) return apiFetch(endpoint, options, isFormData);
      Auth.clearSession();
      window.location.href = getBasePath() + 'customer/login.html';
      return { ok: false, status: 401, data: {} };
    }

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : await res.text();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error('apiFetch error:', err);
    return { ok: false, status: 0, data: { error: 'Network error. Is the backend running?' } };
  }
}

/* ── Toast Notifications ─────────────────────────────────*/
const Toast = {
  _container: null,
  _getContainer() {
    if (!this._container) {
      this._container =
        document.querySelector('.toast-container') ||
        (() => {
          const el = document.createElement('div');
          el.className = 'toast-container';
          document.body.appendChild(el);
          return el;
        })();
    }
    return this._container;
  },
  show(message, type = 'info', duration = 3800) {
    const c = this._getContainer();
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span style="font-size:0.95rem">${icons[type] || icons.info}</span><span>${message}</span>`;
    c.appendChild(t);
    setTimeout(() => {
      t.style.animation = 'slideOutRight 0.3s ease forwards';
      setTimeout(() => t.remove(), 300);
    }, duration);
  },
  success(msg) { this.show(msg, 'success'); },
  error(msg)   { this.show(msg, 'error'); },
  info(msg)    { this.show(msg, 'info'); },
};

/* ── Format Helpers ──────────────────────────────────────*/
function formatPrice(amount) {
  const n = parseFloat(amount);
  if (isNaN(n)) return '₱0.00';
  return '₱' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getDisplayName(userData) {
  if (!userData) return 'Customer';
  const u = userData.user || userData;
  return u.first_name || u.username || 'Customer';
}

/* ── Path Resolution ─────────────────────────────────────*/
function getBasePath() {
  const p = window.location.pathname;
  if (p.includes('/customer/') || p.includes('/admin/')) return '../';
  return './';
}

/* ── Navbar ──────────────────────────────────────────────*/
function renderNavbar(activePage = '') {
  const user      = Auth.getUser();
  const loggedIn  = Auth.isLoggedIn();
  const base      = getBasePath();

  const pages = {
    home:     base + 'customer/index.html',
    products: base + 'customer/product.html',
    cart:     base + 'customer/cart.html',
    custom:   base + 'customer/custom.html',
    about:    base + 'customer/about.html',
    orders:   base + 'customer/orders.html',
    login:    base + 'customer/login.html',
  };

  const navLinksHtml = [
    ['home',     'Home'],
    ['products', 'Products'],
    ['cart',     'Cart'],
    ['custom',   'Custom Order'],
    ['about',    'About'],
  ].map(([key, label]) =>
    `<a href="${pages[key]}" ${activePage === key ? 'class="active"' : ''}>${label}</a>`
  ).join('');

  const navRightHtml = loggedIn
    ? `<div class="nav-user-info">
         <span>👤</span>
         <span>Hi, <span class="username">${getDisplayName(user)}</span></span>
       </div>
       <a href="${pages.orders}" class="nav-cart-btn" style="text-decoration:none">📦 <span>Orders</span></a>
       <a href="${pages.cart}"   class="nav-cart-btn" style="text-decoration:none">
         🛒 <span>Cart</span> <span class="cart-badge" id="nav-cart-count" style="display:none">0</span>
       </a>
       <button class="btn-nav-login" onclick="handleLogout()">Logout</button>`
    : `<a href="${pages.cart}" class="nav-cart-btn" style="text-decoration:none">
         🛒 <span>Cart</span> <span class="cart-badge" id="nav-cart-count" style="display:none">0</span>
       </a>
       <a href="${pages.login}" class="btn-nav-login">Login</a>`;

  const navbar = document.getElementById('main-navbar') || document.getElementById('navbar');
  if (!navbar) return;

  navbar.innerHTML = `
    <div class="nav-container">
      <a href="${pages.home}" class="nav-logo">
        <div class="nav-logo-icon">⬡</div>
        PRINT<span>X</span>
      </a>
      <nav class="nav-links" id="navLinks">${navLinksHtml}</nav>
      <div class="nav-right">${navRightHtml}</div>
      <div class="nav-hamburger" id="hamburger" onclick="toggleNav()" aria-label="Menu" role="button" tabindex="0">
        <span></span><span></span><span></span>
      </div>
    </div>`;

  updateCartCount();
}

function toggleNav() {
  const links = document.getElementById('navLinks');
  const burger = document.getElementById('hamburger');
  if (links)  links.classList.toggle('open');
  if (burger) burger.classList.toggle('open');
}

document.addEventListener('click', (e) => {
  const links  = document.getElementById('navLinks');
  const burger = document.getElementById('hamburger');
  const navbar = document.getElementById('main-navbar') || document.getElementById('navbar');
  if (links && links.classList.contains('open') && navbar && !navbar.contains(e.target)) {
    links.classList.remove('open');
    if (burger) burger.classList.remove('open');
  }
});

async function handleLogout() {
  const refresh = Auth.getRefresh();
  if (refresh) {
    await apiFetch('/logout/', { method: 'POST', body: JSON.stringify({ refresh }) }).catch(() => {});
  }
  Auth.logout();
  Toast.success('Logged out successfully.');
  setTimeout(() => {
    window.location.href = getBasePath() + 'customer/login.html';
  }, 900);
}

/* ── Cart Count ──────────────────────────────────────────*/
async function updateCartCount() {
  const badge = document.getElementById('nav-cart-count');
  if (!badge) return;

  if (!Auth.isLoggedIn()) {
    badge.textContent = '0';
    badge.style.display = 'none';
    return;
  }

  try {
    const res = await apiFetch('/cart/');
    if (res.ok) {
      const cartItems = res.data?.items || res.data?.cart || [];
      const count = cartItems.reduce((s, item) => s + (item.quantity || 1), 0);
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    } else {
      badge.style.display = 'none';
    }
  } catch {
    badge.style.display = 'none';
  }
}

/* ── Footer ──────────────────────────────────────────────*/
function renderFooter() {
  const base   = getBasePath();
  const footer = document.getElementById('footer');
  if (!footer) return;

  footer.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="${base}customer/index.html" class="nav-logo" style="text-decoration:none">
            <div class="nav-logo-icon">⬡</div>
            PRINT<span style="color:var(--red)">X</span>
          </a>
          <p>Modern 3D printing service that turns digital designs into real-world objects. Based in the Philippines. Built with precision.</p>
        </div>
        <div class="footer-col">
          <h4>Navigate</h4>
          <ul>
            <li><a href="${base}customer/index.html">Home</a></li>
            <li><a href="${base}customer/product.html">Products</a></li>
            <li><a href="${base}customer/custom.html">Custom Order</a></li>
            <li><a href="${base}customer/about.html">About Us</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Account</h4>
          <ul>
            <li><a href="${base}customer/login.html">Login</a></li>
            <li><a href="${base}customer/login.html#register">Register</a></li>
            <li><a href="${base}customer/orders.html">My Orders</a></li>
            <li><a href="${base}customer/cart.html">Cart</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Contact</h4>
          <ul>
            <li><a href="mailto:info@printx.ph">info@printx.ph</a></li>
            <li><a href="tel:+639123456789">+63 912 345 6789</a></li>
            <li><span>Manila, Philippines</span></li>
            <li><span>Mon–Sat &nbsp;9AM–6PM</span></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span class="logo-text">PRINT<span style="color:var(--red)">X</span></span>
        <span>© ${new Date().getFullYear()} Print X. All rights reserved.</span>
        <span>Precision 3D Printing 🖨️</span>
      </div>
    </div>`;
}

/* ── Modal Helpers ───────────────────────────────────────*/
function showModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
function hideModal(id) { document.getElementById(id)?.classList.add('hidden'); }

/* ── Status Badge ────────────────────────────────────────*/
function statusBadge(status) {
  const map = {
    pending: 'warning', processing: 'info', approved: 'success',
    shipped: 'primary', delivered: 'success', completed: 'success',
    cancelled: 'error', reviewing: 'info', printing: 'info', ready: 'success',
  };
  const cls = map[status] || 'default';
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
  return `<span class="badge badge-${cls}">${label}</span>`;
}

/* ── Auth Guard ──────────────────────────────────────────*/
function requireAuth() {
  if (!Auth.isLoggedIn()) {
    Toast.error('Please login to continue.');
    setTimeout(() => {
      window.location.href = getBasePath() + 'customer/login.html';
    }, 1100);
    return false;
  }
  return true;
}

function requireLogin() { return requireAuth(); }

/* ── Add to Cart ─────────────────────────────────────────*/
async function addToCart(productId, productName) {
  if (!requireAuth()) return;
  const { ok, data } = await apiFetch('/cart/add/', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, quantity: 1 }),
  });
  if (ok) {
    Toast.success(`${productName} added to cart!`);
    updateCartCount();
  } else {
    Toast.error(data?.error || 'Failed to add to cart.');
  }
}

/* ── Active Page Detection ───────────────────────────────*/
function getActivePage() {
  const pathname = window.location.pathname.toLowerCase();
  const filename = pathname.split('/').pop();
  if (filename.startsWith('custom'))   return 'custom';
  if (filename.startsWith('cart'))     return 'cart';
  if (filename.startsWith('product'))  return 'products';
  if (filename.startsWith('orders'))   return 'orders';
  if (filename.startsWith('about'))    return 'about';
  if (filename.startsWith('login'))    return 'login';
  return 'home';
}

/* ── DOMContentLoaded Init ───────────────────────────────*/
document.addEventListener('DOMContentLoaded', async () => {
  const navbarEl = document.getElementById('main-navbar') || document.getElementById('navbar');
  if (navbarEl) renderNavbar(getActivePage());
  renderFooter();
  await updateCartCount();
});