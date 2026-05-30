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
        body: JSON.stringify({
          ...taskData,
          status: taskData.status || 'todo',
        }),
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

<main style="max-width: 800px; margin: 2rem auto; padding: 1rem;">
  <header style="margin-bottom: 2rem;">
    <h1>Create New Task</h1>
  </header>

  {#if error}
    <div style="background: #ffe6e6; color: #d8000c; padding: 1rem; border-radius: 4px; margin-bottom: 1rem;">
      <strong>Error:</strong> {error}
    </div>
  {/if}

  <TaskForm 
    onSave={handleSave} 
    loading={loading} 
    {goTo}
  />
</main>
