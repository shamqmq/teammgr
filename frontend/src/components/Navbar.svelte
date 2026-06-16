<script>
  import { auth } from '../lib/stores/auth';
  import { apiFetch } from '../lib/api';

  let { goTo } = $props();

  async function handleLogout() {
    try { await apiFetch('/api/auth/logout', { method: 'POST' }); } catch (e) {}
    auth.set({ token: null, user: null, loading: false });
    goTo('login');
  }
</script>

<nav class="navbar">
  <div class="navbar-content">
    <div class="navbar-brand" onclick={() => goTo($auth.user?.role === 'admin' ? 'admin-dashboard' : 'dashboard')}>
      <span>◈</span> Teammgr
    </div>
    <div class="navbar-links">
      {#if $auth.loading}
        <span class="text-muted" style="font-size: 0.85rem;">Loading...</span>
      {:else if $auth.user}
        <div class="user-greeting">
          <div class="user-avatar">{$auth.user?.name?.[0]?.toUpperCase() || $auth.user?.email?.[0]?.toUpperCase()}</div>
          <span class="user-name">{$auth.user?.name || $auth.user?.email}</span>
        </div>
        {#if $auth.user?.role === 'admin'}
          <button class="nav-btn" onclick={() => goTo('admin-dashboard')}>Dashboard</button>
        {:else}
          <button class="nav-btn" onclick={() => goTo('dashboard')}>Dashboard</button>
        {/if}
        <button class="nav-btn" onclick={() => goTo('edit-profile')}>Profile</button>
        <button class="nav-btn logout" onclick={handleLogout}>Logout</button>
      {:else}
        <span class="text-muted" style="font-size: 0.85rem;">Guest</span>
      {/if}
    </div>
  </div>
</nav>
