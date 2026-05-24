<script>
  import { apiFetch } from '../lib/api';

  let { goTo } = $props();

  let name = '';
  let email = '';
  let password = '';
  let role = 'employee';
  let error = '';
  let loading = false;

  async function handleSubmit() {
    error = '';
    loading = true;

    try {
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Registration failed');

      // Redirect to login after successful registration
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
  <form on:submit|preventDefault={handleSubmit}>
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
    <p style="color: red; margin-top: 0.5rem;">{error}</p>
  {/if}
  <p style="margin-top: 1rem;">
    Already have an account?
    <button on:click={() => goTo('login')} style="background: none; border: none; color: blue; cursor: pointer; text-decoration: underline;">
      Login
    </button>
  </p>
</div>
