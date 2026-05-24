<script>
  import { auth } from '../lib/stores/auth';
  import { apiFetch } from '../lib/api';

  let { goTo } = $props();
  let name = $state($auth.user?.name || '');
  let email = $state($auth.user?.email || '');
  let password = $state(''); // new password

  async function handleSubmit() {
    const body = { name, email };
    if (password) body.password = password;
    await apiFetch('/api/users/me', { method: 'PATCH', body: JSON.stringify(body) });
    // update auth store with new data if needed

  }
</script>

<!-- form with inputs bind:value, submit calls handleSubmit -->

    {#if $auth.user?.role === 'admin'}
        <button on:click={() => goTo('admin-dashboard')}>← Back to Dashboard</button>
    {:else}
        <button on:click={() => goTo('dashboard')}>← Back to Dashboard</button>
    {/if}
