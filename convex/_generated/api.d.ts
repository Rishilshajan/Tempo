/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as domainFields from "../domainFields.js";
import type * as domains from "../domains.js";
import type * as kanban from "../kanban.js";
import type * as rollForward from "../rollForward.js";
import type * as series from "../series.js";
import type * as taskDetailFields from "../taskDetailFields.js";
import type * as taskDetailHelpers from "../taskDetailHelpers.js";
import type * as taskDetails from "../taskDetails.js";
import type * as taskFields from "../taskFields.js";
import type * as taskRecurrence from "../taskRecurrence.js";
import type * as taskViews from "../taskViews.js";
import type * as tasks from "../tasks.js";
import type * as verificationData from "../verificationData.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  dashboard: typeof dashboard;
  domainFields: typeof domainFields;
  domains: typeof domains;
  kanban: typeof kanban;
  rollForward: typeof rollForward;
  series: typeof series;
  taskDetailFields: typeof taskDetailFields;
  taskDetailHelpers: typeof taskDetailHelpers;
  taskDetails: typeof taskDetails;
  taskFields: typeof taskFields;
  taskRecurrence: typeof taskRecurrence;
  taskViews: typeof taskViews;
  tasks: typeof tasks;
  verificationData: typeof verificationData;
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
