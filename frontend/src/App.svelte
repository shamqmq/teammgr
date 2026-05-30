<script>
  import { onMount } from 'svelte';
  import { auth } from './lib/stores/auth';
  import { apiFetch } from './lib/api';

  // 1. Flat Imports - Everything in one place
  import Login from './pages/Login.svelte';
  import Register from './pages/Register.svelte';
  import EmployeeDashboard from './pages/EmployeeDashboard.svelte';
  import AdminDashboard from './pages/AdminDashboard.svelte';
  import TaskDetail from './pages/TaskDetail.svelte';
  import EditProfile from './pages/EditProfile.svelte';
  import RequestTask from './pages/RequestTask.svelte';
  import EditTask from './pages/EditTask.svelte';
  import AddTask from './pages/AddTask.svelte';
  import Navbar from './components/Navbar.svelte';

  let currentPage = $state('loading');
  let taskId = $state(null);

  // 2. Hash Routing Logic
  function applyHash(hash) {
    const clean = hash.replace('#/', '');
    const parts = clean.split('/');
    const path = parts[0];
    const id = parts[1] || null;

    // Handle dynamic task routes (e.g., #/task/123 or #/task/123/edit)
    if (path === 'task') {
      if (id === 'new') {
        currentPage = 'add-task';
        taskId = null;
      } else if (parts[2] === 'edit') {
        currentPage = 'edit-task';
        taskId = id;
      } else if (id) {
        currentPage = 'task-detail';
        taskId = id;
      } else {
        currentPage = 'dashboard'; // fallback if no ID
      }
      return;
    }

    // Handle static routes
    switch (path) {
      case 'login':           currentPage = 'login'; break;
      case 'register':        currentPage = 'register'; break;
      case 'dashboard':       currentPage = 'dashboard'; break;
      case 'admin-dashboard': currentPage = 'admin-dashboard'; break;
      case 'edit-profile':    currentPage = 'edit-profile'; break;
      case 'request-task':    currentPage = 'request-task'; break;
      default:                currentPage = 'login'; break;
    }
    taskId = null;
  }

  // 3. Centralized Navigation Helper
  function goTo(page, id = null) {
    let newHash = '#/login';
    if (page === 'dashboard') newHash = '#/dashboard';
    else if (page === 'admin-dashboard') newHash = '#/admin-dashboard';
    else if (page === 'task-detail') newHash = '#/task/' + id;
    else if (page === 'edit-task') newHash = '#/task/' + id + '/edit';
    else if (page === 'add-task') newHash = '#/task/new';
    else if (page === 'edit-profile') newHash = '#/edit-profile';
    else if (page === 'request-task') newHash = '#/request-task';
    else if (page === 'register') newHash = '#/register';
    else if (page === 'login') newHash = '#/login';

    window.location.hash = newHash;
  }

  // 4. Initialization & Auth Guard
  onMount(() => {
    // Try to restore session on hard refresh
    apiFetch('/api/auth/refresh', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data?.data?.accessToken) {
          auth.set({
            token: data.data.accessToken,
            user: data.data.user || null,
            loading: false,
          });
        } else {
          auth.set({ token: null, user: null, loading: false });
        }
      })
      .catch(() => {
        auth.set({ token: null, user: null, loading: false });
      })
      .finally(() => {
        applyHash(window.location.hash || '#/login');
      });

    // Listen for browser back/forward buttons
    const onHashChange = () => applyHash(window.location.hash || '#/login');
    window.addEventListener('hashchange', onHashChange);

    // Auth Guard: Watch the store and boot unauthenticated users
    const unsubscribe = auth.subscribe((authState) => {
      if (authState.loading) return;
      
      const isProtectedRoute = !['login', 'register'].includes(currentPage);
      
      if (!authState.token && isProtectedRoute) {
        goTo('login');
      } else if (authState.token && ['login', 'register'].includes(currentPage)) {
        // Don't let logged-in users sit on the login screen
        goTo(authState.user?.role === 'admin' ? 'admin-dashboard' : 'dashboard');
      }
    });

    return () => {
      window.removeEventListener('hashchange', onHashChange);
      unsubscribe();
    };
  });
</script>

{#if $auth.token && !['loading', 'login', 'register'].includes(currentPage)}
  <Navbar goTo={goTo} />
{/if}

<main class="app-container">
  {#if currentPage === 'loading'}
    <div style="padding: 2rem; text-align: center;">Loading Application...</div>
  {:else if currentPage === 'login'}
    <Login goTo={goTo} />
  {:else if currentPage === 'register'}
    <Register goTo={goTo} />
  {:else if currentPage === 'dashboard'}
    <EmployeeDashboard goTo={goTo} />
  {:else if currentPage === 'admin-dashboard'}
    <AdminDashboard goTo={goTo} />
  {:else if currentPage === 'add-task'}
     <AddTask goTo={goTo} />
  {:else if currentPage === 'task-detail'}
    <TaskDetail goTo={goTo} taskId={taskId} />
  {:else if currentPage === 'edit-task'}
    <EditTask goTo={goTo} taskId={taskId} />
  {:else if currentPage === 'edit-profile'}
    <EditProfile goTo={goTo} />
  {:else if currentPage === 'request-task'}
    <RequestTask goTo={goTo} />
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background-color: #f8f9fa;
  }

  .app-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
  }
</style>
