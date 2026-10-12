import logger from "../../telemetry/logger";

export function loginToZoho() {
  console.log("Starting Zoho OAuth...");

  const clientId = process.env.REACT_APP_ZOHO_CLIENT_ID;
  const redirectUri = process.env.REACT_APP_ZOHO_REDIRECT_URI;
  const domain = process.env.REACT_APP_ZOHO_AUTH_DOMAIN;
  const hireRocksOrgId = localStorage.getItem("hireRocksOrgId");

  console.info("[Zoho OAuth] Step 2: Checking configuration", {
    hasClientId: Boolean(clientId),
    hasRedirectUri: Boolean(redirectUri),
    hasAuthDomain: Boolean(domain),
    hasOrganizationId: Boolean(hireRocksOrgId),
  });

  if (!clientId || !redirectUri || !domain || !hireRocksOrgId) {
    console.error("Missing Zoho OAuth configuration.");
    logger.error(
      new Error("Missing Zoho OAuth configuration"),
      {
        platform: "zoho",
        operation: "oauth_configuration",
      }
    );
    alert("Zoho configuration missing.");
    return;
  }

  // save CRM tab URL
  localStorage.setItem("zoho_original_crm_url", window.location.href);

  const scopes = [
    "ZohoCRM.users.ALL",
    "ZohoCRM.org.READ",
    "ZohoCRM.modules.ALL",
  ];

  const authUrl = `${domain}/oauth/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${encodeURIComponent(
    scopes.join(",")
  )}&access_type=offline&prompt=consent&state=${hireRocksOrgId}`;

  // OPEN OAUTH IN POPUP, NOT SAME WINDOW
  const popup = window.open(authUrl, "zoho_oauth", "width=600,height=700");

  if (!popup) {
    logger.error(new Error("Zoho OAuth popup was blocked"), {
      platform: "zoho",
      operation: "oauth_popup",
    });
    alert("Popup blocked! Please enable popups for Zoho login.");
  }

  console.info("[Zoho OAuth]: Popup opened successfully");
}

export function attachZohoTokenListener(onToken) {
  console.info("[Zoho OAuth] Registering token message listener");

  function handler(event) {
    // Do not log event.data because it might contain credentials.
    console.info("[Zoho OAuth] Message received", {
      origin: event.origin,
      messageType: event.data?.type ?? "unknown",
      sameOrigin: event.origin === window.location.origin,
    });

    if (event.origin !== window.location.origin) {
      console.warn("[Zoho OAuth] Ignoring message from unexpected origin");
      return;
    }

    if (event.data?.type !== "ZOHO_TOKEN") {
      console.warn("[Zoho OAuth] Message is not a ZOHO_TOKEN message");
      return;
    }

    if (!event.data.token) {
      console.error("[Zoho OAuth] Token message has no token");
      return;
    }

    console.info("[Zoho OAuth] Token message accepted");
    onToken(event.data.token);
  }

  window.addEventListener("message", handler);

  return () => {
    window.removeEventListener("message", handler);
    console.info("[Zoho OAuth] Token message listener removed");
  };
}

export function storeZohoAccessToken(token) {
  sessionStorage.setItem("zoho_access_token", token);
  console.info("[Zoho OAuth] Access token stored");
}

export function getZohoAccessToken() {
  return sessionStorage.getItem("zoho_access_token");
}
