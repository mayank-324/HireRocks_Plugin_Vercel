import * as Sentry from "@sentry/react";


const SAFE_TAGS = new Set([
  "platform",
  "operation",
  "environment",
  "pluginVersion",
]);

function sanitizeEvent(event){
  const safetags={};

  for(const [key,value] of Object.entries(event.tags ?? {})){
    if(SAFE_TAGS.has(key)){
      safetags[key]=value;
    }
  }

  //Never send user identity, req details or other context.
  event.tags = safetags;
  event.user = undefined;
  event.request = undefined;
  event.extra = undefined;
  event.contexts = undefined;
  event.breadcrumbs = [];
  return event;
}

export const initSentry = () => {
  const sentryDSN = process.env.REACT_APP_SENTRY_DSN;

  if(!sentryDSN){
    console.warn("Sentry DSN is not configured.");
    return;
  }
  Sentry.init({
    dsn: sentryDSN,
    environment: process.env.REACT_APP_ENVIRONMENT || "development",
    release: process.env.REACT_APP_PLUGIN_VERSION || "Production",
    
    // Central event sanitization.
    beforeSend(event) {
      return sanitizeEvent(event);
    },

    // Do not transmit breadcrumb data.
    beforeBreadcrumb() {
      return null;
    },
    sendDefaultPii: false,
    tracePropagationTargets: [],
  });
};
