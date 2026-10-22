// Development builds can reach Metro; the standalone preview needs no network.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    blockedPermissions: [
      ...config.android.blockedPermissions,
      ...(process.env.ROUTINE_OFFLINE_BUILD === "1"
        ? ["android.permission.INTERNET", "android.permission.ACCESS_NETWORK_STATE"]
        : []),
    ],
  },
});
