import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';

interface DroppableDayProps {
  dayId: string;
  children: ReactNode;
}

export function DroppableDay({ dayId, children }: DroppableDayProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: dayId,
    data: {
      type: 'calendar-day',
      dayId,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`day-card drop-target ${isOver ? 'drag-over' : ''}`}
    >
      {children}
    </div>
  );
}
