import { IdLabel } from "../../shared/types/IdLabel";

export const DEVICE = "device";
export const SEARCH_TEXT = "searchText";
export const AFTER = "after";
export const BEFORE = "before";
export const LOG_LEVEL = "logLevel";

export const GLOBAL = "global";

const ERROR = "Error";
const INFORMATION = "Information";
const WARNING = "Warning";
const FATAL = "Fatal";
const VERBOSE = "Verbose";
const DEBUG = "Debug";

const LOG_LEVELS = [ERROR, WARNING, INFORMATION, FATAL, VERBOSE, DEBUG];

export const logLevelOpts: IdLabel[] = [
  { id: FATAL, label: "Fatal" },
  { id: ERROR, label: "Error" },
  { id: WARNING, label: "Warning" },
  { id: INFORMATION, label: "Information" },
  { id: DEBUG, label: "Debug" },
  { id: VERBOSE, label: "Verbose" },
];

export const debugSearchParams = {
  DEVICE,
  SEARCH_TEXT,
  AFTER,
  BEFORE,
  LOG_LEVEL,
};

export const debugConsts = {
  DEVICE,
  SEARCH_TEXT,
  AFTER,
  BEFORE,
  LOG_LEVEL,
  GLOBAL,
  LOG_LEVELS,
};
