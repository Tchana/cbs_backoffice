/**
 * Shared auth/role helpers. Admins must be able to perform all CRUD in the app;
 * use isAdmin() to gate Add/Edit/Delete and admin-only pages.
 */

export function getStoredRole() {
  try {
    const raw = localStorage.getItem("role");
    const role = raw ? JSON.parse(raw) : null;
    return typeof role === "string" ? role.toLowerCase() : role;
  } catch {
    return null;
  }
}

export function isAdmin() {
  return getStoredRole() === "admin";
}
