'use client';

import { useState, useEffect } from 'react';
import type { BusinessSchedule } from '../types';

export interface UseBusinessHoursReturn {
  isOpen: boolean;
  nextOpenTime: Date | null;
  nextCloseTime: Date | null;
  currentDay: number;
}

export function useBusinessHours(schedule?: BusinessSchedule): UseBusinessHoursReturn {
  const [state, setState] = useState<UseBusinessHoursReturn>(() => compute(schedule));

  useEffect(() => {
    if (!schedule) return;
    setState(compute(schedule));
    const interval = setInterval(() => setState(compute(schedule)), 60_000);
    return () => clearInterval(interval);
  }, [schedule]);

  return state;
}

function compute(schedule?: BusinessSchedule): UseBusinessHoursReturn {
  const now = new Date();
  const currentDay = now.getDay();

  if (!schedule || !schedule.hours || schedule.hours.length === 0) {
    return { isOpen: true, nextOpenTime: null, nextCloseTime: null, currentDay };
  }

  const todaySchedule = schedule.hours.find(h => h.day === currentDay);

  if (!todaySchedule || !todaySchedule.isOpen) {
    const nextOpen = findNextOpenDay(schedule, currentDay, now);
    return { isOpen: false, nextOpenTime: nextOpen, nextCloseTime: null, currentDay };
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = parseTimeToMinutes(todaySchedule.open);
  const closeMinutes = parseTimeToMinutes(todaySchedule.close);

  const isOpen = nowMinutes >= openMinutes && nowMinutes < closeMinutes;

  if (isOpen) {
    const closeTime = new Date(now);
    closeTime.setHours(Math.floor(closeMinutes / 60), closeMinutes % 60, 0, 0);
    return { isOpen: true, nextOpenTime: null, nextCloseTime: closeTime, currentDay };
  }

  if (nowMinutes < openMinutes) {
    const openTime = new Date(now);
    openTime.setHours(Math.floor(openMinutes / 60), openMinutes % 60, 0, 0);
    return { isOpen: false, nextOpenTime: openTime, nextCloseTime: null, currentDay };
  }

  const nextOpen = findNextOpenDay(schedule, currentDay, now);
  return { isOpen: false, nextOpenTime: nextOpen, nextCloseTime: null, currentDay };
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function findNextOpenDay(schedule: BusinessSchedule, fromDay: number, now: Date): Date | null {
  for (let offset = 1; offset <= 7; offset++) {
    const day = (fromDay + offset) % 7;
    const daySchedule = schedule.hours.find(h => h.day === day);
    if (daySchedule && daySchedule.isOpen) {
      const nextDate = new Date(now);
      nextDate.setDate(nextDate.getDate() + offset);
      const openMinutes = parseTimeToMinutes(daySchedule.open);
      nextDate.setHours(Math.floor(openMinutes / 60), openMinutes % 60, 0, 0);
      return nextDate;
    }
  }
  return null;
}
