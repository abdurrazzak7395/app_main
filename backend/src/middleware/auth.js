export function requireAppAuth(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  next();
}

export function resolveTokenOwner(req) {
  if (req.session?.user?.id) {
    return { userId: req.session.user.id, sessionKey: null };
  }

  if (!req.session.guestKey) {
    // Persist a stable token owner key for guest-mode browser sessions.
    req.session.guestKey = req.sessionID;
  }

  return { userId: null, sessionKey: req.session.guestKey };
}
