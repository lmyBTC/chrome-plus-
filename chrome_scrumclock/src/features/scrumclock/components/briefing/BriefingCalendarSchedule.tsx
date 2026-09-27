import React from 'react';
import { CalendarEvent } from '../../../../types';

export interface BriefingCalendarScheduleProps {
  events: CalendarEvent[];
}

export const BriefingCalendarSchedule: React.FC<BriefingCalendarScheduleProps> = ({ events }) => {
  if (!events || events.length === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-950/20 border-l-4 border-yellow-500 p-4 mb-6 rounded-r-lg">
      <div className="flex">
        <div className="flex-shrink-0">
          <span className="text-yellow-500">📅</span>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-400">
            注意：你今天有 {events.length} 個既有行程
          </h3>
          <div className="mt-2 text-sm text-yellow-300">
            <ul className="list-disc pl-5 space-y-1">
              {events.map((event, idx) => (
                <li key={idx}>
                  {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                  {new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: {event.title}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
