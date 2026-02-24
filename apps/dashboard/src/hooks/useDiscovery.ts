'use client';

import { useState, useEffect } from 'react';

interface Discovery {
  tables: string[];
  resources: string[];
}

export function useDiscovery() {
  const [data, setData] = useState<Discovery>({ tables: [], resources: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/discovery')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return { ...data, loading };
}
