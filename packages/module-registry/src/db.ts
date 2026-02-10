// Shared database instance — set by the dashboard app at startup.
// Modules import this to access the db without knowing the connection details.

let _db: any = null;

export function setDb(db: any): void {
  _db = db;
}

export function getDb(): any {
  if (!_db) {
    throw new Error(
      'Database not initialized. Call setDb() before using modules. ' +
      'This is typically done in apps/dashboard/src/lib/db.ts.'
    );
  }
  return _db;
}
