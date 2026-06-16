<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { auth } from './lib/stores/auth';
  import { apiFetch } from './lib/api';

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
  let authReady = $state(false);

  function applyHash(hash) {
    const clean = hash.replace('#/', '');
    const parts = clean.split('/');
    const path = parts[0];
    const id = parts[1] || null;

    if (path === 'task') {
      if (id === 'new') { currentPage = 'add-task'; taskId = null; }
      else if (parts[2] === 'edit') { currentPage = 'edit-task'; taskId = id; }
      else if (id) { currentPage = 'task-detail'; taskId = id; }
      else { currentPage = 'dashboard'; }
      return;
    }

    switch (path) {
      case 'login': currentPage = 'login'; break;
      case 'register': currentPage = 'register'; break;
      case 'dashboard': currentPage = 'dashboard'; break;
      case 'admin-dashboard': currentPage = 'admin-dashboard'; break;
      case 'edit-profile': currentPage = 'edit-profile'; break;
      case 'request-task': currentPage = 'request-task'; break;
      default: currentPage = 'login'; break;
    }
    taskId = null;
  }

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

  onMount(() => {
    apiFetch('/api/auth/refresh', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data?.data?.accessToken) {
          auth.set({ token: data.data.accessToken, user: data.data.user || null, loading: false });
        } else {
          auth.set({ token: null, user: null, loading: false });
        }
      })
      .catch(() => auth.set({ token: null, user: null, loading: false }))
      .finally(() => {
        authReady = true;
        applyHash(window.location.hash || '#/login');
      });

    const onHashChange = () => applyHash(window.location.hash || '#/login');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  });

  $effect(() => {
    if (!authReady) return;
    const authState = get(auth);
    if (authState.loading) return;
    const isProtected = !['login', 'register', 'loading'].includes(currentPage);
    if (!authState.token && isProtected) goTo('login');
    else if (authState.token && ['login', 'register'].includes(currentPage)) {
      goTo(authState.user?.role === 'admin' ? 'admin-dashboard' : 'dashboard');
    }
  });
</script>

{#if $auth.token && !['loading', 'login', 'register'].includes(currentPage)}
  <Navbar goTo={goTo} />
{/if}

<main class="container">
  {#if currentPage === 'loading'}
    <p class="text-center text-muted" style="padding: 3rem;">Loading...</p>
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
