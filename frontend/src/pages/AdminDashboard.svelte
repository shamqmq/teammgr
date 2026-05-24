<script>
  import { onMount } from 'svelte';
  import { auth } from '../lib/stores/auth';
  import { apiFetch } from '../lib/api';

  let { goTo } = $props();

  let tasks = $state([]);
  let requests = $state([]);
  let users = $state([]);
  let loading = $state(true);

  onMount(async () => {
    try {
      const [tasksRes, requestsRes, usersRes] = await Promise.all([
        apiFetch('/api/tasks?limit=100'),
        apiFetch('/api/tasks/requests'),
        apiFetch('/api/users?limit=100'),
      ]);
      
      const tasksData = await tasksRes.json();
      const requestsData = await requestsRes.json();
      const usersData = await usersRes.json();

      tasks = tasksData.data || [];
      requests = requestsData.data || [];
      users = usersData.data || [];
    } catch (e) {
      console.error('Failed to load admin data', e);
    } finally {
      loading = false;
    }
  });

  async function approveRequest(requestId) {
    await apiFetch(`/api/tasks/requests/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'approved' }),
    });
    // Reload requests
    const res = await apiFetch('/api/tasks/requests');
    const data = await res.json();
    requests = data.data || [];
  }
</script>

<div>
  <h1>Admin Dashboard</h1>
  <p>Welcome, {$auth.user?.name || $auth.user?.email}</p>

  <div style="display: flex; gap: 0.5rem; margin: 1rem 0;">
    <button on:click={() => goTo('edit-profile')}>Edit Profile</button>
    <button on:click={() => goTo('request-task')}>Create Task</button>
  </div>

  {#if loading}
    <p>Loading admin dashboard...</p>
  {:else}
    <!-- Pending Requests -->
    <div style="margin-bottom: 2rem;">
      <h2>Pending Requests ({requests.length})</h2>
      {#if requests.length === 0}
        <p>No pending requests.</p>
      {:else}
        <ul>
          {#each requests as req (req.id)}
            <li>
              <strong>{req.title}</strong> – {req.description?.slice(0, 40)}...
              <button on:click={() => approveRequest(req.id)}>Approve</button>
              <button>Reject</button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <!-- All Tasks -->
    <div style="margin-bottom: 2rem;">
      <h2>All Tasks ({tasks.length})</h2>
      <ul>
        {#each tasks as task (task.id)}
          <li>
            <button on:click={() => goTo('task-detail', task.id)}>
              {task.title} – {task.status}
            </button>
          </li>
        {/each}
      </ul>
    </div>

    <!-- Users -->
    <div>
      <h2>Users ({users.length})</h2>
      <ul>
        {#each users as user (user.id)}
          <li>{user.name || user.email} – {user.role}</li>
        {/each}
      </ul>
    </div>
  {/if}
</div>
