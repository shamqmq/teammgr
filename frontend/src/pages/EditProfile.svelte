<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { auth } from '../lib/stores/auth';
  import { apiFetch } from '../lib/api';

  let { goTo } = $props();
  let name = $state('');
  let email = $state('');
  let password = $state('');
  let loading = $state(false);
  let error = $state('');
  let successMessage = $state('');

  onMount(() => {
    const user = get(auth).user;
    name = user?.name || '';
    email = user?.email || '';
  });

  async function handleSubmit(e) {
    e.preventDefault();
    loading = true;
    error = '';
    successMessage = '';
    const body = { name, email };
    if (password) body.password = password;

    try {
      const res = await apiFetch('/api/users/me', { method: 'PATCH', body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update profile');

      auth.update(current => ({
        ...current,
        user: data.data || data.user || { ...current.user, name, email }
      }));

      successMessage = 'Profile updated successfully!';
      password = '';
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<main class="page-sm">
  <div class="card">
    <header style="margin-bottom: 2rem;">
      <h1>Edit Profile</h1>
      <p class="text-muted">Update your personal information</p>
    </header>

    <form onsubmit={handleSubmit} class="flex flex-col gap-sm">
      {#if error}<div class="alert alert-error">{error}</div>{/if}
      {#if successMessage}<div class="alert alert-success">{successMessage}</div>{/if}

      <div class="form-group">
        <label for="profile-name">Name</label>
        <input id="profile-name" type="text" bind:value={name} required disabled={loading} />
      </div>
      <div class="form-group">
        <label for="profile-email">Email</label>
        <input id="profile-email" type="email" bind:value={email} required disabled={loading} />
      </div>
      <div class="form-group">
        <label for="profile-pass">New Password <span class="text-muted">(leave blank to keep current)</span></label>
        <input id="profile-pass" type="password" bind:value={password} disabled={loading} placeholder="••••••••" />
      </div>

      <div class="flex gap-sm mt-sm">
        <button type="button" onclick={() => goTo('dashboard')} class="btn btn-secondary" style="flex: 1;">Cancel</button>
        <button type="submit" disabled={loading} class="btn btn-primary" style="flex: 1;">{loading ? 'Saving...' : 'Update Profile'}</button>
      </div>
    </form>
  </div>
</main>
