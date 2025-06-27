// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client'; // React 18+ 的渲染方式
import './index.css'; // 导入你的主 CSS 文件，其中包含了 Tailwind 指令
import App from './App'; // 导入你的 App 组件

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);