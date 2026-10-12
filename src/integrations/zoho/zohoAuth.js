export function loginToZoho() {
  console.log("Starting Zoho OAuth...");

  const clientId = process.env.REACT_APP_ZOHO_CLIENT_ID;
  const redirectUri = process.env.REACT_APP_ZOHO_REDIRECT_URI;
  const domain = process.env.REACT_APP_ZOHO_AUTH_DOMAIN;
  const hireRocksOrgId = localStorage.getItem("hireRocksOrgId");

  if (!clientId || !redirectUri || !domain || !hireRocksOrgId) {
    console.error("[Zoho OAuth] 2. Missing configuration", {
      clientId: !!clientId,
      redirectUri: !!redirectUri,
      domain: !!domain,
      orgId: !!hireRocksOrgId,
    });
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
    redirectUri,
  )}&scope=${encodeURIComponent(
    scopes.join(","),
  )}&access_type=offline&prompt=consent&state=${hireRocksOrgId}`;

  console.log("[Zoho OAuth] 2. Opening consent popup");
  // OPEN OAUTH IN POPUP, NOT SAME WINDOW
  const popup = window.open(authUrl, "zoho_oauth", "width=600,height=700");

  if (!popup) {
    alert("Popup blocked! Please enable popups for Zoho login.");
  }
  console.log("[Zoho OAuth] 3. Popup opened");
}

export function attachZohoTokenListener(onToken) {
  console.log("[Zoho OAuth] 4. Registering message listener");

  function handler(event) {
    if (event.data?.type !== "ZOHO_TOKEN") return;

    console.log("[Zoho OAuth] 5. Token message received", {
      senderOrigin: event.origin,
      appOrigin: window.location.origin,
    });

    if (event.origin !== window.location.origin) {
      console.error("[Zoho OAuth] 6. Token message rejected: origin mismatch");
      return;
    }

    if (typeof event.data.token !== "string" || !event.data.token) {
      console.error("[Zoho OAuth] 6. Token message rejected: missing token");
      return;
    }

    console.log("[Zoho OAuth] 6. Token message accepted");
    onToken(event.data.token);
  }

  window.addEventListener("message", handler);

  console.log("[Zoho OAuth] Message listener registered");

  return () => {
    window.removeEventListener("message", handler);
    console.log("[Zoho OAuth] Message listener removed");
  };
}

export function storeZohoAccessToken(token) {
  sessionStorage.setItem("zoho_access_token", token);
  console.log("[Zoho OAuth] 7. Access token stored");
}

export function getZohoAccessToken() {
  return sessionStorage.getItem("zoho_access_token");
}
