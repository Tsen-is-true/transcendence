// Authentication middleware - 로그인 필수
export function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please login to access this resource',
    });
  }
  next();
}

// Optional authentication - 로그인 선택
export function optionalAuth(req, res, next) {
  // 세션 정보를 req.user에 추가 (있으면)
  if (req.session.userId) {
    req.user = {
      id: req.session.userId,
      username: req.session.username,
    };
  }
  next();
}

// Admin check middleware (나중에 필요시 사용)
export function requireAdmin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({
      error: 'Authentication required',
    });
  }

  if (!req.session.isAdmin) {
    return res.status(403).json({
      error: 'Admin access required',
    });
  }

  next();
}
