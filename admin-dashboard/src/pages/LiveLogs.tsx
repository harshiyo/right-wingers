import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

interface LogEntry {
  id: string;
  type?: string;
  message?: string;
  user?: string;
  timestamp?: any;
  [key: string]: any;
}

const LiveLogs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logEntries: LogEntry[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(logEntries);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Live Logs</h1>
      <div className="bg-white rounded-xl shadow p-6 min-h-[300px]">
        {loading ? (
          <p className="text-gray-600">Loading logs...</p>
        ) : logs.length === 0 ? (
          <p className="text-gray-600">No logs found.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {logs.map(log => (
              <li key={log.id} className="py-3 flex items-start gap-4">
                <span className={`px-2 py-1 rounded text-xs font-bold ${log.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{log.type}</span>
                <div className="flex-1">
                  <div className="font-mono text-sm text-gray-800">{log.message}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {log.user && <span>User: <span className="font-semibold">{log.user}</span> | </span>}
                    {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : ''}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default LiveLogs; 