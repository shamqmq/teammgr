<script>
  import { auth } from '../lib/stores/auth';
  import { apiFetch } from '../lib/api';

  let { goTo } = $props();
  let name = $state($auth.user?.name || '');
  let email = $state($auth.user?.email || '');
  let password = $state('');
  
  let loading = $state(false);
  let error = $state('');
  let successMessage = $state('');

  async function handleSubmit(e) {
    e.preventDefault();
    loading = true;
    error = '';
    successMessage = '';

    const body = { name, email };
    if (password) body.password = password;

    try {
      const res = await apiFetch('/api/users/me', { 
        method: 'PATCH', 
        body: JSON.stringify(body) 
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Failed to update profile');

      // Update auth store with new user payload data from server response
      auth.update(current => ({
        ...current,
        user: data.data || data.user || { ...current.user, name, email }
      }));

      successMessage = 'Profile updated successfully!';
      password = ''; // clear password form element
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<div>
  <h1>Edit Profile</h1>
  
  <form on:submit={handleSubmit}>
    <div>
      <label for="profile-name">Name</label>
      <input id="profile-name" type="text" bind:value={name} required disabled={loading} />
    </div>

    <div>
      <label for="profile-email">Email</label>
      <input id="profile-email" type="email" bind:value={email} required disabled={loading} />
    </div>

    <div>
      <label for="profile-pass">New Password (leave blank to keep current)</label>
      <input id="profile-pass" type="password" bind:value={password} disabled={loading} />
    </div>

    {#if error}
      <p style="color: red;">{error}</p>
    {/if}
    {#if successMessage}
      <p style="color: green;">{successMessage}</p>
    {/if}

    <button type="submit" disabled={loading}>
      {loading ? 'Saving...' : 'Update Profile'}
    </button>
  </form>

</div>
