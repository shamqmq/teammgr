<script>
  import { apiFetch } from '../lib/api';
  import TaskForm from '../components/TaskForm.svelte';

  let { goTo } = $props();
  let loading = $state(false);
  let error = $state('');

  async function handleSave(event) {
    const taskData = event.detail;   // from the form's 'save' event
    loading = true;
    error = '';
    try {
      const res = await apiFetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          ...taskData,
          status: 'todo',   // always start as todo
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create task');
      goTo('dashboard');   // back to dashboard after success
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<div class="page-container">
  <h1>Create New Task</h1>
  <TaskForm on:save={handleSave} loading={loading} error={error} />
  <button class="back-btn" on:click={() => goTo('dashboard')}>← Back to Dashboard</button>
</div>

