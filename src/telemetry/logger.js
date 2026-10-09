import * as Sentry from "@sentry/react";

const getFinalContext = (context = {}) => ({
  environment: process.env.REACT_APP_ENVIRONMENT || "development",
  pluginVersion: process.env.REACT_APP_PLUGIN_VERSION || "unknown",
  ...context,
});

const setContextTags = (scope, context) => {
  Object.entries(context).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      scope.setTag(key, String(value));
    }
  });
};

const logger = {
  error(error, context = {}) {
    const finalContext = getFinalContext(context);

    Sentry.withScope((scope) => {
      setContextTags(scope, finalContext);
      scope.setExtra("errorMessage", error?.message || String(error));
      Sentry.captureException(error);
    });
  },

  warning(message, context = {}) {
    const finalContext = getFinalContext(context);

    Sentry.withScope((scope) => {
      setContextTags(scope, finalContext);

      Sentry.captureMessage(message, "warning");
    });
  },
};

export default logger;
