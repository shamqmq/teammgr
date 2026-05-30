<script>
  import { onMount } from 'svelte';
  import { auth } from '../lib/stores/auth';
  import { apiFetch } from '../lib/api';

  let { goTo } = $props();

  let allTasks = $state([]);
  let users = $state([]);
  let loading = $state(true);
  let actionError = $state('');

  // Derived state to auto-update lists
  let requests = $derived(allTasks.filter(t => t.status === 'requested'));
  let activeTasks = $derived(allTasks.filter(t => t.status !== 'requested'));

  onMount(async () => {
    try {
      const [tasksRes, usersRes] = await Promise.all([
        apiFetch('/api/tasks?limit=100'),
        apiFetch('/api/users'),
      ]);
      
      if (!tasksRes.ok) throw new Error('Failed to load tasks');
      const tasksData = await tasksRes.json();
      allTasks = tasksData.data || [];

      if (!usersRes.ok) {
        throw new Error('Failed to load users');
      }
      const usersData = await usersRes.json();
      // Ensure we set users correctly based on your API response structure
      users = usersData.users || usersData.data || []; 
    } catch (e) {
      console.error('Failed to load admin data', e);
      actionError = e.message;
    } finally {
      loading = false;
    }
  });

  async function handleRequest(taskId, isApproved) {
    actionError = '';
    try {
      const newStatus = isApproved ? 'todo' : 'rejected';
      const res = await apiFetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update request');
      allTasks = allTasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    } catch (e) {
      actionError = e.message;
    }
  }
</script>

<header>
  <h1>Admin Control Center</h1>
  <p>System Admin: {$auth.user?.name || $auth.user?.email}</p>
  <nav style="margin-bottom: 2rem;">
    <button onclick={() => goTo('add-task')}>+ Create New Task</button>
  </nav>
</header>

<main>
  {#if actionError}
    <div style="color: red; padding: 1rem; border: 1px solid red; margin-bottom: 1rem;">
      Error: {actionError}
    </div>
  {/if}

  {#if loading}
    <p>Loading dashboard...</p>
  {:else}
    <section>
      <h2>Pending Employee Requests ({requests.length})</h2>
      {#each requests as req (req.id)}
        <div style="border: 1px solid #ddd; padding: 1rem; margin-bottom: 0.5rem;">
          <strong>{req.title}</strong>
          <p>{req.description || 'No description'}</p>
          <button onclick={() => handleRequest(req.id, true)}>Approve</button>
          <button onclick={() => handleRequest(req.id, false)}>Reject</button>
        </div>
      {/each}
    </section>

    <section style="margin-top: 2rem;">
      <h2>Active Tasks</h2>
      <ul>
        {#each activeTasks as task (task.id)}
          <li>
            <button onclick={() => goTo('task-detail', task.id)}>
              {task.title}
            </button>
            <small>({task.status})</small>
            <button onclick={() => goTo('edit-task', task.id)}>Edit</button>
          </li>
        {/each}
      </ul>
    </section>

    <section style="margin-top: 2rem;">
      <h2>System Users</h2>
      <ul>
        {#each users as user (user.id)}
          <li>{user.name} - {user.email}</li>
        {/each}
      </ul>
    </section>
  {/if}
</main>
