<script>
  import { auth } from '../lib/stores/auth';
  import { apiFetch } from '../lib/api';

  let { goTo } = $props();

  async function handleLogout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error("Backend logout failed", e);
    }
    // Clear local auth store state safely
    auth.set({ token: null, user: null, loading: false });
    goTo('login');
  }
</script>

<nav class="navbar">
  <div class="logo">Teammgr</div>
  
  <div class="nav-links">
    {#if $auth.user}
      <span>Welcome, {$auth.user?.name || $auth.user?.email}</span>
      
      {#if $auth.user?.role === 'admin'}
        <button on:click={() => goTo('admin-dashboard')}>Admin Dashboard</button>
      {:else}
        <button on:click={() => goTo('dashboard')}>Dashboard</button>
      {/if}
      
      <button on:click={() => goTo('edit-profile')}>Profile</button>
      <button on:click={handleLogout} class="logout-btn">Logout</button>
    {/if}
  </div>
</nav>

<style>
  .navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.8rem 2rem;
    background-color: #1e293b;
    color: white;
    font-family: sans-serif;
  }
  .nav-links {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  button {
    background: #334155;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    cursor: pointer;
    border-radius: 4px;
    font-size: 0.9rem;
  }
  button:hover {
    background: #475569;
  }
  .logout-btn {
    background: #ef4444;
  }
  .logout-btn:hover {
    background: #dc2626;
  }
</style>
