// CONVEX_SITE_URL jest wstrzykiwane przez Convex w czasie działania.
declare const process: { env: Record<string, string | undefined> };

export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
