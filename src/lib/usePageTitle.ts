import { useEffect } from 'react';

export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ROCKTO Academy` : 'ROCKTO Academy — AI Security Lab';
  }, [title]);
}
