/*
 * Web: getTaxiUserRoutePrefix(pathname) is '/taxi/user' under the district shell and '/taxi' otherwise.
 * The app mounts the taxi user screens only at /taxi/user.
 */
export const getTaxiUserRoutePrefix = () => '/taxi/user';

export default getTaxiUserRoutePrefix;
