<script>
  import { onMount } from 'svelte';
  import { auth } from '../lib/stores/auth';
  import { apiFetch } from '../lib/api';

  let { goTo } = $props();

  let tasks = $state([]);
  let loading = $state(true);
  let error = $state('');
  let page = $state(1);
  let totalPages = $state(1);
  let totalTasks = $state(0);
  const limit = 20;

  async function loadTasks() {
    loading = true;
    error = '';
    try {
      const res = await apiFetch(`/api/tasks?page=${page}&limit=${limit}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load tasks');
      tasks = data.data || data.tasks || [];
      totalTasks = data.total || 0;
      totalPages = Math.ceil(totalTasks / limit) || 1;
    } catch (e) {
      error = e.message;
      tasks = [];
    } finally {
      loading = false;
    }
  }

  onMount(loadTasks);

  // Reload when page changes
  $effect(() => {
    page; // track changes
    loadTasks();
  });

  function goToTaskDetail(taskId) {
    goTo('task-detail', taskId);
  }

  function nextPage() {
    if (page < totalPages) page++;
  }

  function prevPage() {
    if (page > 1) page--;
  }
</script>

<div>
  <h1>Welcome, {$auth.user?.name || $auth.user?.email}</h1>
  <p>Role: {$auth.user?.role}</p>

  <div>
    <button on:click={() => goTo('request-task')}>Request Task</button>
    <button on:click={() => goTo('edit-profile')}>Edit Profile</button>
  </div>

  <h2>Your Tasks ({totalTasks})</h2>

  {#if loading}
    <p>Loading tasks...</p>
  {:else if error}
    <p>Error: {error}</p>
  {:else if tasks.length === 0}
    <p>No tasks yet.</p>
  {:else}
    <ul>
      {#each tasks as task (task.id)}
        <li>
          <button on:click={() => goToTaskDetail(task.id)} style="background: none; border: none; color: inherit; cursor: pointer; text-decoration: underline;">
            {task.title} – <span>{task.status.replace('_', ' ')}</span>
            {#if task.priority === 'high'}<strong> HIGH PRIORITY</strong>{/if}
          </button>
          <span>Due: {new Date(task.due_to).toLocaleDateString()}</span>
        </li>
      {/each}
    </ul>

    <div>
      <button on:click={prevPage} disabled={page === 1}>Previous</button>
      <span>Page {page} / {totalPages}</span>
      <button on:click={nextPage} disabled={page === totalPages}>Next</button>
    </div>
  {/if}
</div>
