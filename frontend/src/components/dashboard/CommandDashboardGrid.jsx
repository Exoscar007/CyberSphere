import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import {
  SlidersIcon,
  RefreshIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MaximizeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XIcon,
} from '../common/Icons';

export default function CommandDashboardGrid({
  widgets = [],
  storageKey = 'cybersphere_command_grid_layout',
  isCustomizing = false,
  onToggleCustomizing,
  onResetLayout,
}) {
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [expandedWidgetId, setExpandedWidgetId] = useState(null);
  const [collapsedMap, setCollapsedMap] = useState({});
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Initialize or re-sync widgets with saved order
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const widgetMap = new Map(widgets.map((w) => [w.id, w]));
        const ordered = [];

        parsed.forEach((id) => {
          if (widgetMap.has(id)) {
            ordered.push(widgetMap.get(id));
            widgetMap.delete(id);
          }
        });

        // Append any newly added widgets not in saved list
        widgetMap.forEach((w) => ordered.push(w));
        setItems(ordered);
        return;
      } catch (err) {
        console.error('Failed to parse saved layout:', err);
      }
    }
    setItems(widgets);
  }, [widgets, storageKey]);

  const saveLayout = (newItems) => {
    setItems(newItems);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newItems.map((w) => w.id)));
      if (addToast) addToast('Dashboard layout saved to local profile', 'success');
    } catch (e) {
      console.error(e);
    }
  };

  const handleReset = () => {
    try {
      localStorage.removeItem(storageKey);
      setItems(widgets);
      setCollapsedMap({});
      if (addToast) addToast('Dashboard layout reset to factory preset', 'info');
      if (onResetLayout) onResetLayout();
    } catch (e) {
      console.error(e);
    }
  };

  // Drag handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...items];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, moved);

    setDraggedIndex(null);
    setDragOverIndex(null);
    saveLayout(updated);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Keyboard Accessible Reordering
  const moveItem = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= items.length) return;
    const updated = [...items];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    saveLayout(updated);
  };

  // Toggle Collapse
  const toggleCollapse = (id) => {
    setCollapsedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Expanded Widget
  const expandedWidget = items.find((w) => w.id === expandedWidgetId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', width: '100%' }}>
      {/* Top Customization Action Toolbar when Active */}
      {isCustomizing && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--palette-chalk)',
            border: '1px solid var(--palette-slate-blue)',
            borderRadius: 'var(--radius-xs)',
            padding: '8px 14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--palette-sage)', display: 'flex', alignItems: 'center' }}>
              <SlidersIcon size={16} />
            </span>
            <div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-primary)', textTransform: 'uppercase' }}>
                Dashboard Customization Mode
              </span>
              <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                Drag panel headers or use arrow controls to rearrange widgets. Configuration persists automatically.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-secondary btn-sm"
            >
              <RefreshIcon size={12} />
              <span>Reset Layout</span>
            </button>
            <button
              type="button"
              onClick={onToggleCustomizing}
              className="btn btn-primary btn-sm"
            >
              <CheckIcon size={12} />
              <span>Done Editing</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Responsive Grid Container */}
      <div
        className="command-dashboard-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'var(--space-md)',
          width: '100%',
        }}
      >
        {items.map((widget, index) => {
          const isDragging = draggedIndex === index;
          const isOver = dragOverIndex === index;
          const isCollapsed = !!collapsedMap[widget.id];
          const spanFull = widget.spanFull;

          return (
            <div
              key={widget.id}
              draggable={isCustomizing}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              style={{
                gridColumn: spanFull ? '1 / -1' : 'span 1',
                opacity: isDragging ? 0.4 : 1,
                transform: isOver ? 'scale(1.01)' : 'scale(1)',
                transition: 'transform var(--transition-fast), opacity var(--transition-fast)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Card Container */}
              <div
                className="card"
                style={{
                  height: isCollapsed ? 'auto' : '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: 0,
                  overflow: 'hidden',
                  border: isCustomizing ? '1px dashed var(--palette-sage)' : '1px solid var(--color-border)',
                  boxShadow: isDragging ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
                }}
              >
                {/* Unified Card Header with Controls */}
                <div
                  style={{
                    padding: '8px 12px',
                    borderBottom: isCollapsed ? 'none' : '1px solid var(--color-border)',
                    backgroundColor: isCustomizing ? 'var(--palette-chalk)' : '#FFFFFF',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: isCustomizing ? 'grab' : 'default',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isCustomizing && (
                      <span
                        title="Drag to reposition panel"
                        style={{
                          color: 'var(--palette-slate-blue)',
                          cursor: 'grab',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <SlidersIcon size={12} />
                      </span>
                    )}
                    <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px', color: 'var(--color-text-primary)', textTransform: 'uppercase' }}>
                      {widget.title}
                    </span>
                  </div>

                  {/* Widget Control Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    {isCustomizing && (
                      <>
                        <button
                          type="button"
                          title="Move Left / Up"
                          aria-label="Move panel left or up"
                          disabled={index === 0}
                          onClick={() => moveItem(index, index - 1)}
                          style={{
                            background: 'none',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-2xs)',
                            padding: '2px 4px',
                            cursor: index === 0 ? 'not-allowed' : 'pointer',
                            color: index === 0 ? 'var(--color-border)' : 'var(--color-text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <ChevronLeftIcon size={12} />
                        </button>
                        <button
                          type="button"
                          title="Move Right / Down"
                          aria-label="Move panel right or down"
                          disabled={index === items.length - 1}
                          onClick={() => moveItem(index, index + 1)}
                          style={{
                            background: 'none',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-2xs)',
                            padding: '2px 4px',
                            cursor: index === items.length - 1 ? 'not-allowed' : 'pointer',
                            color: index === items.length - 1 ? 'var(--color-border)' : 'var(--color-text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <ChevronRightIcon size={12} />
                        </button>
                      </>
                    )}

                    {/* Expand Fullscreen / Large View */}
                    <button
                      type="button"
                      title="Expand Panel"
                      aria-label="Expand Panel"
                      onClick={() => setExpandedWidgetId(widget.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <MaximizeIcon size={13} />
                    </button>

                    {/* Collapse / Uncollapse */}
                    <button
                      type="button"
                      title={isCollapsed ? 'Expand Panel' : 'Collapse Panel'}
                      aria-label={isCollapsed ? 'Expand Panel' : 'Collapse Panel'}
                      onClick={() => toggleCollapse(widget.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {isCollapsed ? <ChevronDownIcon size={13} /> : <ChevronUpIcon size={13} />}
                    </button>
                  </div>
                </div>

                {/* Card Body */}
                {!isCollapsed && (
                  <div style={{ flex: 1, padding: widget.noPadding ? 0 : '14px', display: 'flex', flexDirection: 'column' }}>
                    {widget.component}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* EXPANDED MODAL VIEW (Card Expansion) */}
      {expandedWidget && (
        <div
          className="modal-overlay"
          onClick={() => setExpandedWidgetId(null)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '1040px',
              width: '94vw',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '10px 16px',
                borderBottom: '1px solid var(--color-border)',
                background: 'var(--palette-chalk)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: '700' }}>
                  ENLARGED COMMAND VIEW
                </span>
                <h3 style={{ margin: '1px 0 0', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '700' }}>
                  {expandedWidget.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setExpandedWidgetId(null)}
                className="btn btn-secondary btn-sm"
              >
                <XIcon size={13} />
                <span>Close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: expandedWidget.noPadding ? 0 : '16px', minHeight: '440px' }}>
              {expandedWidget.component}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
