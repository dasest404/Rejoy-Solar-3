import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, UpdateRequest } from 'firebase-admin/auth';
import dotenv from 'dotenv';

dotenv.config();

// Firebase Admin SDK safe initialization
let firebaseAdminApp: App | null = null;
let firebaseAdminChecked = false;

function getFirebaseAdmin(): App | null {
  if (firebaseAdminChecked) return firebaseAdminApp;
  firebaseAdminChecked = true;

  try {
    const existingApps = getApps();
    if (existingApps.length > 0 && existingApps[0]) {
      firebaseAdminApp = existingApps[0];
      return firebaseAdminApp;
    }

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      firebaseAdminApp = initializeApp({
        credential: cert(parsed)
      });
      return firebaseAdminApp;
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      firebaseAdminApp = initializeApp();
      return firebaseAdminApp;
    }

    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    if (projectId) {
      try {
        firebaseAdminApp = initializeApp({ projectId });
        return firebaseAdminApp;
      } catch {
        // Ignored
      }
    }
  } catch (err: any) {
    console.warn('Firebase Admin SDK could not be initialized on server:', err?.message || err);
  }
  return null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health & Status Check
  app.get(['/api/health', '/api/status', '/api/status.php'], (_req, res) => {
    res.json({
      status: 'ONLINE',
      app: 'SolarPulse EPC ERP & CRM',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      server_time: new Date().toISOString(),
      features: {
        spa_routing: true,
        client_persistence: 'localStorage / JSON sync',
        gemini_proxy: Boolean(process.env.GEMINI_API_KEY),
        database_helper: true
      }
    });
  });

  // DB Status Check
  app.get(['/api/db', '/api/db.php'], (_req, res) => {
    res.json({
      status: 'STANDBY',
      message: 'The ERP is operating in high-performance local persistence mode with full export/import/restore capabilities.'
    });
  });

  // Gemini Generative Language Proxy Endpoint
  app.post(['/api/gemini', '/api/gemini.php'], async (req, res) => {
    try {
      const { prompt, systemInstruction, model } = req.body || {};

      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({ error: 'Missing "prompt" string in request payload.' });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(503).json({
          error: 'GEMINI_API_KEY is not configured.',
          help: 'Set GEMINI_API_KEY in your environment variables to enable AI assistance.'
        });
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction || 'You are an expert Solar EPC and CRM AI assistant.'
        }
      });

      const text = response.text || '';
      res.json({
        candidates: [
          {
            content: {
              parts: [{ text }]
            }
          }
        ],
        text
      });
    } catch (err: any) {
      console.error('Gemini API Error:', err);
      res.status(500).json({
        error: err?.message || 'Error generating content with Gemini API'
      });
    }
  });

  // Admin Authentication Status
  app.get('/api/admin/auth-status', (_req, res) => {
    const adminApp = getFirebaseAdmin();
    res.json({
      configured: Boolean(adminApp),
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || null
    });
  });

  // Create Employee Login Account via Firebase Admin SDK
  app.post(['/api/admin/create-employee-account', '/api/admin/create-user'], async (req, res) => {
    try {
      const { email, password, displayName, systemRole, employeeCode } = req.body || {};

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        res.status(400).json({ success: false, message: 'A valid email address is required.' });
        return;
      }

      if (!password || typeof password !== 'string' || password.length < 6) {
        res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
        return;
      }

      const adminApp = getFirebaseAdmin();
      if (!adminApp) {
        res.status(503).json({
          success: false,
          configured: false,
          code: 'ADMIN_NOT_CONFIGURED',
          message: 'Server-side Firebase Admin SDK credentials are not configured.'
        });
        return;
      }

      const auth = getAuth(adminApp);
      const userRecord = await auth.createUser({
        email: email.trim(),
        password,
        displayName: displayName ? String(displayName).trim() : undefined
      });

      if (systemRole) {
        try {
          await auth.setCustomUserClaims(userRecord.uid, {
            role: systemRole,
            employeeCode: employeeCode || undefined
          });
        } catch {
          // Custom claims optional
        }
      }

      res.json({
        success: true,
        configured: true,
        uid: userRecord.uid,
        message: 'Account created successfully in Firebase Auth.'
      });
    } catch (err: any) {
      const code = err?.code || 'auth/internal-error';
      res.status(400).json({
        success: false,
        code,
        message: err?.message || 'Failed to create user account via Firebase Admin SDK.'
      });
    }
  });

  // Update Employee Login Account (Password / Disable) via Firebase Admin SDK
  app.post(['/api/admin/update-employee-account', '/api/admin/update-user'], async (req, res) => {
    try {
      const { uid, password, disabled } = req.body || {};

      if (!uid || typeof uid !== 'string') {
        res.status(400).json({ success: false, message: 'Employee Auth UID is required.' });
        return;
      }

      const adminApp = getFirebaseAdmin();
      if (!adminApp) {
        res.status(503).json({
          success: false,
          configured: false,
          code: 'ADMIN_NOT_CONFIGURED',
          message: 'Server-side Firebase Admin SDK credentials are not configured.'
        });
        return;
      }

      const updateData: UpdateRequest = {};
      if (password && typeof password === 'string') {
        if (password.length < 6) {
          res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
          return;
        }
        updateData.password = password;
      }

      if (typeof disabled === 'boolean') {
        updateData.disabled = disabled;
      }

      const auth = getAuth(adminApp);
      await auth.updateUser(uid, updateData);

      res.json({
        success: true,
        uid,
        message: 'Account updated successfully.'
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        code: err?.code || 'auth/update-error',
        message: err?.message || 'Failed to update employee account.'
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
    // Explicit SPA fallback for development routes like /projects, /hrms, /finance
    app.use('*', async (req, res, next) => {
      if (req.method !== 'GET' || req.originalUrl.startsWith('/api')) {
        return next();
      }
      try {
        const url = req.originalUrl;
        const indexHtmlPath = path.resolve(process.cwd(), 'index.html');
        let template = await fs.promises.readFile(indexHtmlPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
