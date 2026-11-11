import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Outlet, RouterProvider, ScrollRestoration } from 'react-router';
import { App } from './App.jsx';
import { edition, editionPath } from './edition/content.js';
import merch from './data/merch.json';

if (location.pathname === '/') {
  history.replaceState(null, '', editionPath + location.search + location.hash);
}

const router = createBrowserRouter([{
  id: 'root',
  path: '/',
  loader: () => ({}),
  element: <><Outlet /><ScrollRestoration /></>,
  children: [
    { path: 'editions/spring2026/api/merch', loader: () => merch },
    {
      path: 'editions/spring2026/*',
      loader: () => edition,
      element: <App />,
    },
  ],
}]);

createRoot(document.getElementById('root')).render(<RouterProvider router={router} />);
