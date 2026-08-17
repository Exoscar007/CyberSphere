import React, { useState } from 'react';

export default function DraggableDashboardGrid({ widgets = [], storageKey = 'cybersphere_widgets_order' }) {
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const order = JSON.parse(saved);
        const map = new Map(widgets.map((w) => [w.id, w]));
        const sorted = [];
        order.forEach((id) => {
          if (map.has(id)) {
            sorted.push(map.get(id));
            map.delete(id);
          }
        });
        map.forEach((w) => sorted.push(w));
        return sorted;
      } catch {}
    }
    return widgets;
  });

  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

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

    setItems(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);

    try {
      localStorage.setItem(storageKey, JSON.stringify(updated.map((w) => w.id)));
    } catch {}
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 'var(--space-md)',
        marginBottom: 'var(--space-md)',
      }}
    >
      {items.map((widget, index) => {
        const isDragging = draggedIndex === index;
        const isOver = dragOverIndex === index;

        return (
          <div
            key={widget.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            style={{
              opacity: isDragging ? 0.4 : 1,
              transform: isOver ? 'scale(1.02)' : 'scale(1)',
              transition: 'transform 0.2s ease, opacity 0.2s ease',
              position: 'relative',
            }}
          >
            {/* Movable Drag Handle indicator on top right */}
            <div
              title="Drag to rearrange widget"
              style={{
                position: 'absolute',
                top: '10px',
                right: '12px',
                color: 'var(--color-secondary)',
                fontSize: '14px',
                cursor: 'grab',
                zIndex: 10,
                padding: '2px 4px',
                borderRadius: 'var(--radius-xs)',
                userSelect: 'none',
              }}
            >
              ⠿
            </div>
            {widget.component}
          </div>
        );
      })}
    </div>
  );
}
