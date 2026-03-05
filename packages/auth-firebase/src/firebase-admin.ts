// Firebase Admin SDK — used server-side only for verifying ID tokens
// and revoking refresh tokens. Never import this from client code.

import admin from 'firebase-admin';

function getAdminApp(): admin.app.App {
  if (admin.apps.length) return admin.apps[0]!;

  // Support either a JSON service-account key or individual env vars
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccount) {
    return admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccount)),
    });
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const adminApp = getAdminApp();
export const adminAuth = adminApp.auth();
export { adminApp };
