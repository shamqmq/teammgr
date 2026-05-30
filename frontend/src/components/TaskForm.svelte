<script>
  import { onMount } from 'svelte';
  import { apiFetch } from '../lib/api';
  import SearchBox from '../components/SearchBox.svelte'; // Make sure you created this file!

  // Svelte 5 Props
  let { taskId = null, goTo } = $props();

  // Basic Task Details
  let title = $state('');
  let description = $state('');
  let status = $state('todo');
  let due_to = $state('');

  // Complex Relational Data
  let assignedUser = $state(null); // Holds the single assigned user object
  let dependencies = $state([]);   // Holds an array of task objects

  // UI State
  let loading = $state(false);
  let pageLoading = $state(!!taskId); // Only true initially if we are editing
  let error = $state('');

  // If taskId is provided, fetch existing data (Edit Mode)
  onMount(async () => {
    if (taskId) {
      try {
        const res = await apiFetch(`/api/tasks/${taskId}`);
        if (!res.ok) throw new Error('Failed to load task details.');
        const data = await res.json();
        
        // Ensure this matches your API response structure (e.g., data.data or data.task)
        const task = data.data || data.task || data;

        title = task.title || '';
        description = task.description || '';
        status = task.status || 'todo';
        
        if (task.due_to) {
          due_to = new Date(task.due_to).toISOString().split('T')[0];
        }

        // If the task already has an assigned user/dependencies, populate them!
        if (task.assigned_to) {
           assignedUser = task.assignedUser || { id: task.assigned_to, name: 'Assigned User' };
        }
        if (task.dependencies) {
           dependencies = task.dependencies;
        }

      } catch (e) {
        error = e.message;
      } finally {
        pageLoading = false;
      }
    }
  });

  // --- Dependency Management Functions ---
  function addDependency(task) {
    // Check if it's already in the list so we don't add duplicates
    if (!dependencies.find(d => d.id === task.id)) {
      dependencies = [...dependencies, task];
    }
  }

  function removeDependency(idToRemove) {
    // Filter out the one we want to remove
    dependencies = dependencies.filter(d => d.id !== idToRemove);
  }

  // --- Form Submission ---
  async function handleSubmit(e) {
    e.preventDefault();
    loading = true;
    error = '';

    // Build the payload EXACTLY how the backend needs it
    const payload = {
      title,
      description,
      status,
      due_to: due_to ? new Date(due_to).toISOString() : null,
      // Send only the ID of the user
      assigned_to: assignedUser ? assignedUser.id : null,
      // Map the array of full dependency objects down to just an array of their IDs
      dependency_ids: dependencies.map(dep => dep.id) 
    };

    try {
      const method = taskId ? 'PATCH' : 'POST';
      const endpoint = taskId ? `/api/tasks/${taskId}` : '/api/tasks';
      
      const res = await apiFetch(endpoint, {
        method,
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save task');
      }

      // Success! Go back to the dashboard
      goTo('admin-dashboard'); 
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }
</script>

<main style="max-width: 600px; margin: 0 auto; padding: 2rem;">
  <header style="margin-bottom: 1.5rem;">
    <h2>{taskId ? 'Edit Task' : 'Create New Task'}</h2>
  </header>

  {#if pageLoading}
    <p>Loading task data...</p>
  {:else}
    <form onsubmit={handleSubmit} style="display: flex; flex-direction: column; gap: 1.5rem;">
      
      {#if error}
        <div style="background: #ffe6e6; color: #d8000c; padding: 1rem; border-radius: 4px;">
          {error}
        </div>
      {/if}

      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        <label for="title" style="font-weight: bold;">Title *</label>
        <input id="title" type="text" bind:value={title} required style="padding: 0.5rem;" />
      </div>

      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        <label for="description" style="font-weight: bold;">Description</label>
        <textarea id="description" bind:value={description} rows="4" style="padding: 0.5rem;"></textarea>
      </div>

      <div style="display: flex; gap: 1rem;">
        <div style="flex: 1; display: flex; flex-direction: column; gap: 0.5rem;">
          <label for="status" style="font-weight: bold;">Status</label>
          <select id="status" bind:value={status} style="padding: 0.5rem;">
            <option value="todo">Todo</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div style="flex: 1; display: flex; flex-direction: column; gap: 0.5rem;">
          <label for="due_to" style="font-weight: bold;">Due Date</label>
          <input id="due_to" type="date" bind:value={due_to} style="padding: 0.5rem;" />
        </div>
      </div>

      <hr style="border: 0; border-top: 1px solid #ddd;" />

      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        <label style="font-weight: bold;">Assign to Employee</label>
        {#if assignedUser}
          <div style="display: flex; align-items: center; justify-content: space-between; background: #e9ecef; padding: 0.5rem 1rem; border-radius: 4px;">
            <span>Assigned: <strong>{assignedUser.name || assignedUser.email || assignedUser.id}</strong></span>
            <button type="button" onclick={() => assignedUser = null} style="background: none; border: none; color: red; cursor: pointer; font-weight: bold;">X</button>
          </div>
        {:else}
          <SearchBox 
            endpoint="/api/users" 
            placeholder="Search users by name or email..." 
            onSelect={(user) => assignedUser = user} 
          />
        {/if}
      </div>

      <hr style="border: 0; border-top: 1px solid #ddd;" />

      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        <label style="font-weight: bold;">Task Dependencies</label>
        <p style="font-size: 0.85rem; color: #666; margin: 0;">Search for tasks that must be completed before this one.</p>
        
        <SearchBox 
          endpoint="/api/tasks" 
          placeholder="Search active tasks..." 
          onSelect={addDependency} 
        />

        {#if dependencies.length > 0}
          <ul style="list-style: none; padding: 0; margin-top: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
            {#each dependencies as dep (dep.id)}
              <li style="display: flex; justify-content: space-between; padding: 0.5rem; border-bottom: 1px solid #eee;">
                <span>{dep.title}</span>
                <button type="button" onclick={() => removeDependency(dep.id)} style="color: red; border: none; background: none; cursor: pointer;">Remove</button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      <div style="display: flex; gap: 1rem; margin-top: 2rem; justify-content: flex-end;">
        <button 
          type="button" 
          onclick={() => goTo('admin-dashboard')} 
          style="padding: 0.75rem 1.5rem; background: #f8f9fa; color: #333; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-weight: bold;">
          Cancel
        </button>
        
        <button 
          type="submit" 
          disabled={loading} 
          style="padding: 0.75rem 1.5rem; background: #007bff; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">
          {loading ? 'Saving...' : (taskId ? 'Update Task' : 'Create Task')}
        </button>
      </div>

    </form>
  {/if}
</main>
