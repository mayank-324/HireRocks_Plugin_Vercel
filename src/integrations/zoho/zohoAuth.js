export function loginToZoho() {
  console.log("Starting Zoho OAuth...");

  const clientId = process.env.REACT_APP_ZOHO_CLIENT_ID;
  const redirectUri = process.env.REACT_APP_ZOHO_REDIRECT_URI;
  const domain = process.env.REACT_APP_ZOHO_AUTH_DOMAIN;
  const hireRocksOrgId = localStorage.getItem("hireRocksOrgId");

  if (!clientId || !redirectUri || !domain || !hireRocksOrgId) {
    console.error("Missing Zoho OAuth configuration.");
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

  // OPEN OAUTH IN POPUP, NOT SAME WINDOW
  const popup = window.open(authUrl, "zoho_oauth", "width=600,height=700");

  if (!popup) {
    alert("Popup blocked! Please enable popups for Zoho login.");
  }
}

export function attachZohoTokenListener(onToken) {
  function handler(event) {
    console.log("Sender origin:", event.origin);
    console.log("App origin:", window.location.origin);
    if (event.origin !== window.location.origin) return;
    if (event.data?.type === "ZOHO_TOKEN") onToken(event.data.token);
  }
  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}

export function storeZohoAccessToken(token) {
  sessionStorage.setItem("zoho_access_token", token);
}

export function getZohoAccessToken() {
  return sessionStorage.getItem("zoho_access_token");
}
