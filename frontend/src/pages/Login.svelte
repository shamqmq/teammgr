<script>
  import { auth } from '../lib/stores/auth';
  import { apiFetch } from '../lib/api';

  let { goTo } = $props();   

  let email = '';
  let password = '';
  let error = '';
  let loading = false;

  async function handleSubmit() {
    error = '';
    loading = true;
    console.log('Attempting login with email:', email);

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      console.log('Login response:', data);

      if (!res.ok) throw new Error(data.message || 'Login failed');

        // Set the auth store
      auth.set({
        token: data.data.accessToken,
        user: data.data.user,
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
  <form on:submit|preventDefault={handleSubmit}>
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
    <p style="color: red; margin-top: 0.5rem;">{error}</p>
  {/if}
  <p style="margin-top: 1rem;">
    Don't have an account?
    <button on:click={() => goTo('register')} style="background: none; border: none; color: blue; cursor: pointer; text-decoration: underline;">
      Register here
    </button>
  </p>
</div>
