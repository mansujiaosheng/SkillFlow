// ============================================================
// 应用根组件
// 根据 store 中的 view 状态切换显示首页或编辑器
// ============================================================

import { useAppStore } from './store/useAppStore';
import { HomePage } from './components/HomePage';
import { Editor } from './components/Editor';
import './App.css';

function App() {
  // 从全局状态中读取当前视图
  const view = useAppStore((s) => s.view);

  // 根据视图状态渲染对应组件
  return (
    <div className="app-root">
      {view === 'home' ? <HomePage /> : <Editor />}
    </div>
  );
}

export default App;