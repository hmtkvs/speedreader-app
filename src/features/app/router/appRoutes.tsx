import React from 'react';
import { TestPage } from '../../pdf-management/pages/TestPage';

// Define application routes
export const appRoutes = [
  {
    path: '/',
    element: <div>Home Page</div>,
  },
  {
    path: '/reader',
    element: <div>Reader Page</div>,
  },
  {
    path: '/test',
    element: <TestPage />,
  },
]; 