/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as camps from "../camps.js";
import type * as emails from "../emails.js";
import type * as enrollments from "../enrollments.js";
import type * as groups from "../groups.js";
import type * as http from "../http.js";
import type * as images from "../images.js";
import type * as levels from "../levels.js";
import type * as lib from "../lib.js";
import type * as pools from "../pools.js";
import type * as prices from "../prices.js";
import type * as regulations from "../regulations.js";
import type * as schedule from "../schedule.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  camps: typeof camps;
  emails: typeof emails;
  enrollments: typeof enrollments;
  groups: typeof groups;
  http: typeof http;
  images: typeof images;
  levels: typeof levels;
  lib: typeof lib;
  pools: typeof pools;
  prices: typeof prices;
  regulations: typeof regulations;
  schedule: typeof schedule;
  seed: typeof seed;
  settings: typeof settings;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
