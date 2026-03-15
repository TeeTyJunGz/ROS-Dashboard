const jwt = require('jsonwebtoken')

const AUTH_COOKIE_NAME = 'ros_dashboard_auth'
const TOKEN_TTL_SECONDS = 60 * 60 * 12

function getJwtSecret() {
  return process.env.APP_JWT_SECRET || 'development-only-secret-change-me'
}

function signAuthToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    getJwtSecret(),
    { expiresIn: TOKEN_TTL_SECONDS }
  )
}

function verifyAuthToken(token) {
  return jwt.verify(token, getJwtSecret())
}

function setAuthCookie(res, user) {
  const token = signAuthToken(user)
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: TOKEN_TTL_SECONDS * 1000,
  })
}

function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME)
}

function getAuthTokenFromRequest(req) {
  if (req.cookies && req.cookies[AUTH_COOKIE_NAME]) {
    return req.cookies[AUTH_COOKIE_NAME]
  }

  const authorizationHeader = req.headers.authorization
  if (authorizationHeader && authorizationHeader.startsWith('Bearer ')) {
    return authorizationHeader.slice('Bearer '.length)
  }

  return null
}

module.exports = {
  AUTH_COOKIE_NAME,
  clearAuthCookie,
  getAuthTokenFromRequest,
  getJwtSecret,
  setAuthCookie,
  signAuthToken,
  verifyAuthToken,
}