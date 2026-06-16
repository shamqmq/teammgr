<script>
  import { auth } from '../lib/stores/auth';
  import { apiFetch } from '../lib/api';

  let { goTo } = $props();
  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  async function handleSubmit(e) {
    e.preventDefault();
    error = '';
    loading = true;
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      auth.set({ token: data.data.accessToken, user: data.data.user, loading: false });
      goTo(data.data.user.role === 'admin' ? 'admin-dashboard' : 'dashboard');
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<div class="auth-page">
  <div class="card auth-card">
    <div class="auth-header">
      <h1>Welcome Back</h1>
      <p class="text-muted">Sign in to your workspace</p>
    </div>
    <form onsubmit={handleSubmit} class="flex flex-col gap-sm">
      {#if error}<div class="alert alert-error">{error}</div>{/if}
      <div class="form-group">
        <label for="email">Email</label>
        <input id="email" type="email" bind:value={email} required placeholder="you@company.com" />
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input id="password" type="password" bind:value={password} required placeholder="••••••••" />
      </div>
      <button type="submit" disabled={loading} class="btn btn-primary w-full mt-sm">
        {loading ? 'Logging in...' : 'Sign In'}
      </button>
    </form>
    <div class="auth-footer">
      <p>Don't have an account? <button class="link-btn" onclick={() => goTo('register')}>Get Access</button></p>
    </div>
  </div>
</div>
