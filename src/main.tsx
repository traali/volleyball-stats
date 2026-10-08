import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { registerVolleyballWebMCP } from './mcp-app'
import { router } from './routes'

window.__APP_BUILD_INFO__ = { version: __APP_VERSION__, commit: __COMMIT_HASH__, buildTime: __BUILD_TIME__ }

registerVolleyballWebMCP()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
