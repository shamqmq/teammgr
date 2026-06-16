<script>
  import { apiFetch } from '../lib/api';
  let { goTo } = $props();
  let name = $state('');
  let email = $state('');
  let password = $state('');
  let role = $state('employee');
  let error = $state('');
  let loading = $state(false);

  async function handleSubmit(e) {
    e.preventDefault();
    error = '';
    loading = true;
    try {
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Registration failed');
      goTo('login');
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
      <h1>Create Account</h1>
      <p class="text-muted">Join the workspace</p>
    </div>
    <form onsubmit={handleSubmit} class="flex flex-col gap-sm">
      {#if error}<div class="alert alert-error">{error}</div>{/if}
      <div class="form-group">
        <label for="name">Full Name</label>
        <input id="name" type="text" bind:value={name} required placeholder="Jane Doe" />
      </div>
      <div class="form-group">
        <label for="email">Email</label>
        <input id="email" type="email" bind:value={email} required placeholder="you@company.com" />
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input id="password" type="password" bind:value={password} required placeholder="••••••••" />
      </div>
      <div class="form-group">
        <label for="role">Role</label>
        <select id="role" bind:value={role}>
          <option value="employee">Employee</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <button type="submit" disabled={loading} class="btn btn-primary w-full mt-sm">
        {loading ? 'Creating...' : 'Create Account'}
      </button>
    </form>
    <div class="auth-footer">
      <p>Already have an account? <button class="link-btn" onclick={() => goTo('login')}>Sign In</button></p>
    </div>
  </div>
</div>
