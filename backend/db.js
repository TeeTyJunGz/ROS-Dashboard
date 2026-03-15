const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')

const DATA_DIR = path.join(__dirname, '..', 'data')
const DB_PATH = path.join(DATA_DIR, 'ros-dashboard.db')

const DEFAULT_ROBOTS = [
  {
    id: 'turtlebot-1',
    name: 'TurtleBot 1',
    ip: '192.168.1.69',
    bridgePort: 8765,
    terminalPort: 5001,
    mjpegPort: 8081,
  },
  {
    id: 'turtlebot-2',
    name: 'TurtleBot 2',
    ip: '192.168.1.85',
    bridgePort: 8765,
    terminalPort: 5001,
    mjpegPort: 8081,
  },
]

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS robots (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ip TEXT NOT NULL,
    bridge_port INTEGER NOT NULL DEFAULT 8765,
    terminal_port INTEGER NOT NULL DEFAULT 5001,
    mjpeg_port INTEGER NOT NULL DEFAULT 8081,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_robot_permissions (
    user_id INTEGER NOT NULL,
    robot_id TEXT NOT NULL,
    can_view INTEGER NOT NULL DEFAULT 0,
    can_control INTEGER NOT NULL DEFAULT 0,
    can_edit INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, robot_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (robot_id) REFERENCES robots(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS dashboards (
    robot_id TEXT PRIMARY KEY,
    state_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER,
    FOREIGN KEY (robot_id) REFERENCES robots(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS robot_locks (
    robot_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    acquired_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (robot_id) REFERENCES robots(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`)

const insertRobotStatement = db.prepare(`
  INSERT OR IGNORE INTO robots (id, name, ip, bridge_port, terminal_port, mjpeg_port)
  VALUES (@id, @name, @ip, @bridgePort, @terminalPort, @mjpegPort)
`)

for (const robot of DEFAULT_ROBOTS) {
  insertRobotStatement.run(robot)
}

const getUserByIdStatement = db.prepare(`
  SELECT id, username, role, created_at AS createdAt
  FROM users
  WHERE id = ?
`)

const getUserByUsernameStatement = db.prepare(`
  SELECT id, username, password_hash AS passwordHash, role, created_at AS createdAt
  FROM users
  WHERE username = ?
`)

const createUserStatement = db.prepare(`
  INSERT INTO users (username, password_hash, role)
  VALUES (?, ?, ?)
`)

const countAdminUsersStatement = db.prepare(`
  SELECT COUNT(*) AS count
  FROM users
  WHERE role = 'admin'
`)

const listUsersStatement = db.prepare(`
  SELECT id, username, role, created_at AS createdAt
  FROM users
  ORDER BY username ASC
`)

const deleteUserStatement = db.prepare(`
  DELETE FROM users
  WHERE id = ?
`)

const updateUserRoleStatement = db.prepare(`
  UPDATE users
  SET role = ?
  WHERE id = ?
`)

const updateUserPasswordStatement = db.prepare(`
  UPDATE users
  SET password_hash = ?
  WHERE id = ?
`)

const listRobotsStatement = db.prepare(`
  SELECT
    id,
    name,
    ip,
    bridge_port AS bridgePort,
    terminal_port AS terminalPort,
    mjpeg_port AS mjpegPort,
    updated_at AS updatedAt
  FROM robots
  ORDER BY name ASC
`)

const getRobotByIdStatement = db.prepare(`
  SELECT
    id,
    name,
    ip,
    bridge_port AS bridgePort,
    terminal_port AS terminalPort,
    mjpeg_port AS mjpegPort,
    updated_at AS updatedAt
  FROM robots
  WHERE id = ?
`)

const updateRobotStatement = db.prepare(`
  UPDATE robots
  SET name = ?, ip = ?, bridge_port = ?, terminal_port = ?, mjpeg_port = ?, updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`)

const listPermissionsByUserStatement = db.prepare(`
  SELECT
    robot_id AS robotId,
    can_view AS canView,
    can_control AS canControl,
    can_edit AS canEdit
  FROM user_robot_permissions
  WHERE user_id = ?
`)

const getPermissionStatement = db.prepare(`
  SELECT
    can_view AS canView,
    can_control AS canControl,
    can_edit AS canEdit
  FROM user_robot_permissions
  WHERE user_id = ? AND robot_id = ?
`)

const clearPermissionsForUserStatement = db.prepare(`
  DELETE FROM user_robot_permissions
  WHERE user_id = ?
`)

const upsertPermissionStatement = db.prepare(`
  INSERT INTO user_robot_permissions (user_id, robot_id, can_view, can_control, can_edit)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(user_id, robot_id) DO UPDATE SET
    can_view = excluded.can_view,
    can_control = excluded.can_control,
    can_edit = excluded.can_edit
`)

const getDashboardStatement = db.prepare(`
  SELECT state_json AS stateJson, updated_at AS updatedAt, updated_by AS updatedBy
  FROM dashboards
  WHERE robot_id = ?
`)

const upsertDashboardStatement = db.prepare(`
  INSERT INTO dashboards (robot_id, state_json, updated_at, updated_by)
  VALUES (?, ?, CURRENT_TIMESTAMP, ?)
  ON CONFLICT(robot_id) DO UPDATE SET
    state_json = excluded.state_json,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = excluded.updated_by
`)

const getLockStatement = db.prepare(`
  SELECT
    robot_locks.robot_id AS robotId,
    robot_locks.user_id AS userId,
    robot_locks.acquired_at AS acquiredAt,
    robot_locks.expires_at AS expiresAt,
    users.username AS username
  FROM robot_locks
  JOIN users ON users.id = robot_locks.user_id
  WHERE robot_locks.robot_id = ?
`)

const setLockStatement = db.prepare(`
  INSERT INTO robot_locks (robot_id, user_id, acquired_at, expires_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(robot_id) DO UPDATE SET
    user_id = excluded.user_id,
    acquired_at = excluded.acquired_at,
    expires_at = excluded.expires_at
`)

const releaseLockStatement = db.prepare(`
  DELETE FROM robot_locks
  WHERE robot_id = ?
`)

function buildRobotUrls(robot) {
  return {
    ...robot,
    bridgeUrl: `ws://${robot.ip}:${robot.bridgePort}`,
    terminalUrl: `ws://${robot.ip}:${robot.terminalPort}`,
    cameraUrl: `http://${robot.ip}:${robot.mjpegPort}/stream`,
  }
}

function getUserById(userId) {
  return getUserByIdStatement.get(userId) || null
}

function getUserByUsername(username) {
  return getUserByUsernameStatement.get(username) || null
}

function createUser({ username, passwordHash, role }) {
  const result = createUserStatement.run(username, passwordHash, role)
  return getUserById(result.lastInsertRowid)
}

function countAdminUsers() {
  return countAdminUsersStatement.get().count
}

function listUsers() {
  return listUsersStatement.all()
}

function deleteUser(userId) {
  return deleteUserStatement.run(userId)
}

function updateUserRole(userId, role) {
  updateUserRoleStatement.run(role, userId)
}

function updateUserPassword(userId, passwordHash) {
  updateUserPasswordStatement.run(passwordHash, userId)
}

function listRobots() {
  return listRobotsStatement.all().map(buildRobotUrls)
}

function getRobotById(robotId) {
  const robot = getRobotByIdStatement.get(robotId)
  return robot ? buildRobotUrls(robot) : null
}

function updateRobot(robotId, robot) {
  updateRobotStatement.run(robot.name, robot.ip, robot.bridgePort, robot.terminalPort, robot.mjpegPort, robotId)
  return getRobotById(robotId)
}

function listPermissionsForUser(userId) {
  return listPermissionsByUserStatement.all(userId)
}

function getPermissionForUser(userId, robotId) {
  return getPermissionStatement.get(userId, robotId) || null
}

function replacePermissionsForUser(userId, permissions) {
  const transaction = db.transaction((nextPermissions) => {
    clearPermissionsForUserStatement.run(userId)
    for (const permission of nextPermissions) {
      upsertPermissionStatement.run(
        userId,
        permission.robotId,
        permission.canView ? 1 : 0,
        permission.canControl ? 1 : 0,
        permission.canEdit ? 1 : 0,
      )
    }
  })

  transaction(permissions)
}

function getDashboard(robotId) {
  return getDashboardStatement.get(robotId) || null
}

function saveDashboard(robotId, stateJson, updatedBy) {
  upsertDashboardStatement.run(robotId, stateJson, updatedBy)
  return getDashboard(robotId)
}

function getLock(robotId) {
  const lock = getLockStatement.get(robotId)
  if (!lock) {
    return null
  }

  if (lock.expiresAt <= Date.now()) {
    releaseLockStatement.run(robotId)
    return null
  }

  return lock
}

function acquireLock(robotId, userId, lockDurationMs) {
  const acquiredAt = Date.now()
  const expiresAt = acquiredAt + lockDurationMs
  setLockStatement.run(robotId, userId, acquiredAt, expiresAt)
  return getLock(robotId)
}

function releaseLock(robotId) {
  releaseLockStatement.run(robotId)
}

module.exports = {
  db,
  DB_PATH,
  DEFAULT_ROBOTS,
  countAdminUsers,
  createUser,
  deleteUser,
  getDashboard,
  getLock,
  getPermissionForUser,
  getRobotById,
  getUserById,
  getUserByUsername,
  listPermissionsForUser,
  listRobots,
  listUsers,
  acquireLock,
  releaseLock,
  replacePermissionsForUser,
  saveDashboard,
  updateRobot,
  updateUserPassword,
  updateUserRole,
}