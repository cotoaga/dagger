import { useDebug } from '../contexts/DebugContext.jsx';
import './DebugToolbar.css';

/**
 * DebugToolbar - Quick access toolbar for debug features (DEV mode only)
 *
 * Features:
 * - Toggle debug panel
 * - Toggle template panel
 * - Show keyboard shortcuts
 * - Floating bottom-right position
 */
export function DebugToolbar() {
  const {
    debugPanelVisible,
    toggleDebugPanel,
    templatePanelVisible,
    toggleTemplatePanel
  } = useDebug();

  return (
    <div className="debug-toolbar">
      <div className="debug-toolbar-label">DEV Tools</div>

      <button
        className={`toolbar-button ${debugPanelVisible ? 'active' : ''}`}
        onClick={toggleDebugPanel}
        title="Toggle Debug Panel (Ctrl+Shift+D)"
      >
        🐛
      </button>

      <button
        className={`toolbar-button ${templatePanelVisible ? 'active' : ''}`}
        onClick={toggleTemplatePanel}
        title="Toggle Test Templates (Ctrl+T)"
      >
        🧪
      </button>

      <div className="toolbar-shortcuts">
        <div className="shortcut-item">
          <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd>
          <span>Debug</span>
        </div>
        <div className="shortcut-item">
          <kbd>Ctrl</kbd>+<kbd>T</kbd>
          <span>Templates</span>
        </div>
      </div>
    </div>
  );
}

export default DebugToolbar;
