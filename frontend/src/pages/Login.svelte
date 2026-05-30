<script>
  import { auth } from '../lib/stores/auth';
  import { apiFetch } from '../lib/api';

  let { goTo } = $props();   

  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  // FIX: Accept the event object 'e'
  async function handleSubmit(e) {
    e.preventDefault(); // FIX: Explicitly handle preventDefault here!
    error = '';
    loading = true;

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Login failed');

      auth.set({
        token: data.data.accessToken,
        user: data.data.user,
        loading: false, 
      });

      if (data.data.user.role === 'admin') {
        goTo('admin-dashboard');
      } else {
        goTo('dashboard');
      }
    } catch (err) {
      error = err.message;
      console.error('Login error:', err);
    } finally {
      loading = false;
    }
  }
</script>

<div style="max-width: 400px; margin: 2rem auto; padding: 2rem; border: 1px solid #ccc; border-radius: 8px;">
  <h2>Login</h2>
  <form onsubmit={handleSubmit}>
    <div style="margin-bottom: 1rem;">
      <label>Email</label>
      <input type="email" bind:value={email} required style="width: 100%; padding: 0.5rem;" />
    </div>
    <div style="margin-bottom: 1rem;">
      <label>Password</label>
      <input type="password" bind:value={password} required style="width: 100%; padding: 0.5rem;" />
    </div>
    <button type="submit" disabled={loading} style="padding: 0.6rem 1.5rem; cursor: pointer;">
      {loading ? 'Logging in...' : 'Login'}
    </button>
  </form>
  {#if error}
    <p style="color: red; margin-top: 1rem;">{error}</p>
  {/if}
</div>
