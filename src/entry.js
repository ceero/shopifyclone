// The driving window owns a separate WebGL context and synchronizes with its opener.
if (window.location.pathname.replace(/\/$/, '') === '/editions/spring2026/drive') {
  import('./drive/mount.js');
} else {
  import('./main.jsx');
}
