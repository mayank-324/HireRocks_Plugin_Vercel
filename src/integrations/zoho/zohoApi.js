import axios from "axios";

const BASE_URL = "https://api.hirerocks.com/api/zoho";

// Get Zoho CRM Active Users
export async function fetchZohoUsers(accessToken, hireRocksOrgId) {
  if (!accessToken || !hireRocksOrgId) {
    throw new Error("Missing token or orgId in fetchZohoUsers()");
  }

  const url = `${BASE_URL}/active_users`;


  const res = await axios.get(url, {
    params: {
      accessToken: accessToken,
      hireRocksOrgId
    }
  });

  const data = res.data;


  const tasks = await fetchZohoTasks();
  console.log("----------------------------------- tasks :----------------", tasks);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.users)) return data.users;
  return [];
}

// Create HireRocks Users from Selected Zoho Users
export async function sendZohoUsersToHireRocks(selectedIds) {
  const token = localStorage.getItem("access_token");
  const hireRocksOrgId = localStorage.getItem("hireRocksOrgId");

  if (!token || !hireRocksOrgId) {
    throw new Error("Missing HireRocks auth token or org id.");
  }

  const url = `${BASE_URL}/create_hirerocks_users`;

  const res = await axios.post(
    url,
    { ZohoUserIds: selectedIds },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        hireRocksOrgId,
        "Content-Type": "application/json",
      },
    }
  );

  return res.data;
}

export async function fetchZohoProjects() {
  return new Promise((resolve, reject) => {
    if (!window.ZOHO) {
      reject("Zoho SDK not initialized");
      return;
    }

    window.ZOHO.CRM.API.getAllRecords({
      Entity: "Projects",
      sort_order: "asc",
    })
      .then((response) => {
        resolve(response.data || []);
      })
      .catch((err) => reject(err));
  });
}

export async function fetchZohoTasks() {
  return new Promise((resolve, reject) => {
    if (!window.ZOHO) {
      reject("Zoho SDK not initialized");
      return;
    }

    // This fetches the list you see in your screenshot
    window.ZOHO.CRM.API.getAllRecords({
      Entity: "Tasks", // Use "Tasks" to match your Workqueue
      sort_order: "asc",
    })
      .then((response) => {
        // response.data contains the Subject, Status, Priority, etc.
        resolve(response.data || []);
      })
      .catch((err) => reject(err));
  });
}

/**
 * Sends selected Zoho projects to the HireRocks API.
 */
export async function syncProjectsToHireRocks(selectedProjects) {
  const token = localStorage.getItem("access_token");
  const hireRocksOrgId = localStorage.getItem("hireRocksOrgId");

  const payload = {
    OrganizationId: hireRocksOrgId,
    Source: "Zoho",
    Projects: selectedProjects.map((p) => ({
      ExternalId: p.id,
      Title: p.Project_Name || p.Name || "Untitled Project",
      Description: p.Description || "",
      StartDate: p.Start_Date || new Date().toISOString(),
    })),
  };

  const res = await axios.post(`${BASE_URL}/api/tracker/plugin/sync-projects`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return res.data;
}

export async function syncTasksToHireRocks(selectedTasks) {
  const token = localStorage.getItem("access_token");
  const hireRocksOrgId = localStorage.getItem("hireRocksOrgId");

  const payload = {
    OrganizationId: hireRocksOrgId,
    Source: "Zoho_Tasks",
    Projects: selectedTasks.map((t) => ({
      ExternalId: t.id,
      Title: t.Subject,
      Description: t.Description || "",
      StartDate: t.Created_Time,
      DueDate: t.Due_Date,
      Priority: t.Priority,
      Status: t.Status
    })),
  };

  const res = await axios.post(`https://api.hirerocks.com/api/tracker/plugin/sync-projects`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return res.data;
}