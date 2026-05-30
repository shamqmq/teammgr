<script>
  import { apiFetch } from '../lib/api';

  let { goTo } = $props();

  let name = $state('');
  let email = $state('');
  let password = $state('');
  let role = $state('employee');
  let error = $state('');
  let loading = $state(false);

  // FIX: Accept event and run preventDefault
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
      console.error('Registration error:', err);
    } finally {
      loading = false;
    }
  }
</script>

<div style="max-width: 400px; margin: 2rem auto; padding: 2rem; border: 1px solid #ccc; border-radius: 8px;">
  <h2>Register</h2>
  <form onsubmit={handleSubmit}>
    <div style="margin-bottom: 1rem;">
      <label>Name</label>
      <input type="text" bind:value={name} required style="width: 100%; padding: 0.5rem;" />
    </div>
    <div style="margin-bottom: 1rem;">
      <label>Email</label>
      <input type="email" bind:value={email} required style="width: 100%; padding: 0.5rem;" />
    </div>
    <div style="margin-bottom: 1rem;">
      <label>Password</label>
      <input type="password" bind:value={password} required style="width: 100%; padding: 0.5rem;" />
    </div>
    <div style="margin-bottom: 1rem;">
      <label>Role</label>
      <select bind:value={role} style="width: 100%; padding: 0.5rem;">
        <option value="employee">Employee</option>
        <option value="admin">Admin</option>
      </select>
    </div>
    <button type="submit" disabled={loading} style="padding: 0.6rem 1.5rem; cursor: pointer;">
      {loading ? 'Registering...' : 'Register'}
    </button>
  </form>
  {#if error}
    <p style="color: red; margin-top: 1rem;">{error}</p>
  {/if}
</div>
