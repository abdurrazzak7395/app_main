import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db/index.js';
import { requireAppAuth } from '../middleware/auth.js';

const router = express.Router();

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

router.post('/register', async (req, res) => {
  try {
    const input = registerSchema.parse(req.body);
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(input.email.toLowerCase());
    if (existing) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const result = db.prepare(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
    ).run(input.name, input.email.toLowerCase(), passwordHash);

    req.session.user = {
      id: result.lastInsertRowid,
      name: input.name,
      email: input.email.toLowerCase(),
    };

    return res.status(201).json({ user: req.session.user });
  } catch (error) {
    if (error?.issues) {
      return res.status(400).json({ message: 'Invalid registration input.', issues: error.issues });
    }
    return res.status(500).json({ message: 'Failed to register user.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(input.email.toLowerCase());

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const ok = await bcrypt.compare(input.password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
    };

    return res.json({ user: req.session.user });
  } catch (error) {
    if (error?.issues) {
      return res.status(400).json({ message: 'Invalid login input.', issues: error.issues });
    }
    return res.status(500).json({ message: 'Failed to login.' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('svp_panel_session');
    res.json({ message: 'Logged out.' });
  });
});

router.get('/me', requireAppAuth, (req, res) => {
  res.json({ user: req.session.user });
});

export default router;
