// Where each kind of account lands after login. Admins are operators and
// only ever use the admin panel; members use the regular app.
export const isAdminUser = function(user) {
    return user?.role === 'admin'
}

export const homePathFor = function(user) {
    return isAdminUser(user) ? '/admin' : '/dashboard'
}
