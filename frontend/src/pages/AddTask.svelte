<script>
  import { apiFetch } from '../lib/api';
  import TaskForm from '../components/TaskForm.svelte';

  let { goTo } = $props();
  let loading = $state(false);
  let error = $state('');

  async function handleSave(taskData) {
    loading = true;
    error = '';
    try {
      const res = await apiFetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...taskData, status: taskData.status || 'todo' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create task');
      goTo('admin-dashboard');
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<main class="page">
  <div class="card">
    <header style="margin-bottom: 2rem;">
      <h1>Create New Task</h1>
      <p class="text-muted">Set up a new task for your team</p>
    </header>
    {#if error}<div class="alert alert-error mb-sm">{error}</div>{/if}
    <TaskForm onSave={handleSave} loading={loading} {goTo} />
  </div>
</main>
