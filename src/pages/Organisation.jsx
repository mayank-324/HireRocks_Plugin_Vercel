import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import EmpLogin from "../components/EmpLogin";
import axios from "axios";
import { useEffect } from "react";
import {
  loginToZoho,
  attachZohoTokenListener,
  getZohoAccessToken,
  storeZohoAccessToken,
} from "../integrations/zoho/zohoAuth.js";
import {
  loginToSalesforce,
  attachSalesforceTokenListener,
  storeSalesforceAccessToken,
  getSalesforceAccessToken,
} from "../integrations/salesforce/salesforceAuth";
import {
  fetchSalesforceUsers,
  sendSalesforceUsersToHireRocks,
} from "../integrations/salesforce/salesforceApi";
import {
  fetchZohoUsers,
  sendZohoUsersToHireRocks,
} from "../integrations/zoho/zohoApi.js";

function Organization() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [organizationName, setOrganizationName] = useState("");
  const [organizationPass, setOrganizationPass] = useState("");
  const [email, setEmail] = useState("");
  const [mailContent, setMailContent] = useState("");
  const [createMode, setCreateMode] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [FirstName, setFirstName] = useState("");
  const [LastName, setLastName] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState({});
  const [otpError, setotpError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orgError, setorgError] = useState(false);
  const [platform, setPlatform] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [employeesList, setEmployeesList] = useState([]);

  const APP_URI = process.env.REACT_APP_API_URL;
  const MAX_SELECT = 10;

  // 1️ Detect platform once

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let detected = params.get("platform");

    if (!detected) {
      const ref = document.referrer || "";
      if (ref.includes("force.com") || ref.includes("salesforce.com")) {
        detected = "salesforce";
      } else if (ref.includes("zoho.com") || ref.includes("zoho")) {
        detected = "zoho";
      } else {
        detected = "unknown";
      }
    }

    console.log("Detected platform:", detected);
    setPlatform(detected);
  }, []);

  useEffect(() => {
    if (platform !== "zoho" && platform !== "salesforce") {
      const dummyUsers = Array.from({ length: 100 }).map((_, i) => ({
        id: `unknown-${i + 1}`,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        role: "Member",
      }));

      setEmployeesList(dummyUsers);
    }
  }, [platform]);

  // Helper: normalize Zoho users

  const normalizeUsers = (raw) => {
    const records = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.users)
      ? raw.users
      : Array.isArray(raw?.data)
      ? raw.data
      : [];

    return records.map((u) => {
      const id = u.Id ?? u.id ?? u.userId;
      const first = u.FirstName ?? u.first_name ?? u.firstName ?? "";
      const last = u.LastName ?? u.last_name ?? u.lastName ?? "";
      const nameFromFields = `${first} ${last}`.trim();
      const name =
        nameFromFields || u.Full_Name || u.full_name || u.Name || u.name || "";
      const email = u.Email ?? u.email ?? u.work_email ?? "";
      const role = u.Role ?? u.role ?? u.Profile ?? u.profile ?? "Member";

      return {
        id,
        name,
        email,
        role,
        selected: false,
      };
    });
  };

  useEffect(() => {
    if (step !== 3) return;

    const hireRocksOrgId = localStorage.getItem("hireRocksOrgId");

    // --------------------------
    // Z O H O   I N T E G R A T I O N
    // --------------------------
    if (platform === "zoho") {
      // 1) Listen for token from popup
      const detach = attachZohoTokenListener(async (token) => {
        try {
          setLoading(true);

          try {
            storeZohoAccessToken(token);
          } catch (e) {}

          sessionStorage.setItem("zoho_access_token", token);

          const raw = await fetchZohoUsers(token, hireRocksOrgId);
          const mapped = normalizeUsers(raw);
          setEmployeesList(mapped);
        } catch (err) {
          console.error("Zoho token handler error:", err);
          alert("Failed to fetch Zoho users.");
        } finally {
          setLoading(false);
        }
      });

      // 2) If saved token exists → use it
      const savedToken = getZohoAccessToken();

      if (savedToken) {
        setLoading(true);
        fetchZohoUsers(savedToken, hireRocksOrgId)
          .then((raw) => {
            const mapped = normalizeUsers(raw);
            setEmployeesList(mapped);
          })
          .catch((err) => {
            console.warn("Saved Zoho token failed to fetch users:", err);

            // Clear expired token
            sessionStorage.removeItem("zoho_access_token");
            try {
              storeZohoAccessToken(null);
            } catch (e) {}

            // Trigger login popup
            loginToZoho();
          })
          .finally(() => setLoading(false));
      } else {
        // 3) No token → start OAuth popup
        loginToZoho();
      }

      return () => {
        try {
          detach();
        } catch (e) {}
      };
    }

    // --------------------------
    // S A L E S F O R C E   I N T E G R A T I O N
    // --------------------------
    if (platform === "salesforce") {
      // 1) Listen for token from popup
      const detach = attachSalesforceTokenListener(async (token) => {
        try {
          setLoading(true);

          try {
            storeSalesforceAccessToken(token);
          } catch (e) {}

          sessionStorage.setItem("sf_access_token", token);

          const raw = await fetchSalesforceUsers(token, hireRocksOrgId);
          const mapped = normalizeUsers(raw);
          setEmployeesList(mapped);
        } catch (err) {
          console.error("Salesforce token handler error:", err);
          alert("Failed to fetch Salesforce users.");
        } finally {
          setLoading(false);
        }
      });

      // 2) If saved token exists → use it
      const savedToken = getSalesforceAccessToken();

      if (savedToken) {
        setLoading(true);
        fetchSalesforceUsers(savedToken, hireRocksOrgId)
          .then((raw) => {
            const mapped = normalizeUsers(raw);
            setEmployeesList(mapped);
          })
          .catch((err) => {
            console.warn("Saved Salesforce token failed to fetch users:", err);

            // Clear expired token
            sessionStorage.removeItem("sf_access_token");
            try {
              storeSalesforceAccessToken(null);
            } catch (e) {}

            // Trigger login popup
            loginToSalesforce();
          })
          .finally(() => setLoading(false));
      } else {
        // 3) No token → start OAuth popup
        loginToSalesforce();
      }

      return () => {
        try {
          detach();
        } catch (e) {}
      };
    }
  }, [platform, step]);

  const handleZohoUsers = async () => {
    try {
      setLoading(true);

      const selectedIds = selectedEmployees.map((e) => e.id);

      const response = await sendZohoUsersToHireRocks(selectedIds);
      alert("Zoho Users successfully created in HireRocks!");

      console.log("Users created successfully:", response);
      setStep(5);
    } catch (error) {
      console.error("Error sending users:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleSalesforceUsers = async () => {
    try {
      setLoading(true);

      const selectedIds = selectedEmployees.map((e) => e.id);

      const response = await sendSalesforceUsersToHireRocks(selectedIds);
      alert("Salesforce Users successfully created in HireRocks!");

      console.log("Users created successfully:", response);
      setStep(5);
    } catch (error) {
      console.error("Error sending users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDoneClick = () => {
    if (platform === "zoho") {
      handleZohoUsers();
    } else if (platform === "salesforce") {
      handleSalesforceUsers();
    } else {
      console.warn("Unknown platform. No handler executed.");
    }
  };

  // Handle View Click (Step 1 for Viewing Organization)
  const handleViewClick = async () => {
    try {
      setLoading(true);
      setErrors({});
      if (!organizationName.trim() || !organizationPass.trim()) {
        setErrors({ organizationError: "Please Fill all the fields!" });
        return;
      }
      const loginResponse = await axios.post(
        `${APP_URI}/api/tracker/Account/Login`,
        {
          UserName: organizationName,
          Password: organizationPass,
        }
      );

      let loginData = loginResponse.data;
      if (typeof loginData === "string") {
        loginData = JSON.parse(loginData);
      }

      if (loginData.access_token) {
        localStorage.setItem("access_token", loginData.access_token);
        alert("Login successful!");
        navigate("/tracker");
      } else {
        alert("Login failed. Please try again.");
      }
    } catch (error) {
      // console.error("Error viewing organization:", error);
      setErrors({ organizationError: "Invalid Credentials!" });
    } finally {
      setLoading(false);
    }
  };

  // Handle Create Organization Mode Activation
  const handleCreateOrganization = () => {
    setCreateMode(true);
    setStep(1);
  };

  const verifyOTP = async () => {
    if (!mailContent) {
      alert("Please enter the OTP.");
      return;
    }
    setotpError(false);
    setLoading(true);
    try {
      const response = await axios.get(
        `${APP_URI}/api/Account/VerifyEmailAddress`,
        {
          params: { emailVerificationCode: mailContent },
        }
      );

      if (
        response.data?.SuccessMessage ===
        "You email address is verified successfully"
      ) {
        alert(response.data.SuccessMessage);

        await new Promise((resolve) => setTimeout(resolve, 2000));

        const username = email.split("@")[0];
        const loginResponse = await axios.post(`${APP_URI}/api/Account/Login`, {
          UserName: username,
          Password: organizationPass,
          RememberMe: true,
        });

        let loginData = loginResponse.data;
        if (typeof loginData === "string") {
          loginData = JSON.parse(loginData);
        }

        if (loginData.access_token) {
          localStorage.setItem("access_token", loginData.access_token);
          alert("Login successful!");
          setStep(3);
          setLoading(false);
        } else {
          setLoading(false);
          alert("Login failed. Please try again.");
        }
      } else {
        setLoading(false);
        setotpError(true);
        alert("Invalid OTP. Please try again.");
      }
    } catch (error) {
      setLoading(false);
      console.error("Error verifying OTP:", error);
      alert("Something went wrong. Please try again.");
    }
  };

  // Handle Next Step
  const handleNextStep = async () => {
    let newErrors = {};
    if (step === 1) {
      if (!organizationName.trim())
        newErrors.organizationName = "Organization Name is required";
      if (!email.trim()) {
        newErrors.email = "Email is required";
      } else if (!/\S+@\S+\.\S+/.test(email)) {
        newErrors.email = "Invalid email format";
      }
      if (!organizationPass.trim()) {
        newErrors.organizationPass = "Password is required";
      } else if (organizationPass.length < 6) {
        newErrors.organizationPass = "Password must be at least 6 characters";
      }
    } else if (step === 2 && !mailContent.trim()) {
      newErrors.mailContent = "OTP is required";
    }

    // If errors exist, set them in state and stop execution
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    if (createMode && step === 1) {
      // Step 1: Create Organization API Call
      setLoading(true);
      setorgError(false);
      try {
        const response = await axios.post(`${APP_URI}/PostOrganization`, {
          Email: email,
          Password: organizationPass,
          OrganizationTitle: organizationName,
          IsRegisterationSuccessFull: true,
          Platform: platform,
        });
        console.log(response);
        if (response.status == 200) {
          localStorage.setItem("hireRocksOrgId", response.data.organizationId);
          alert(
            "Organization created successfully! Please check your email for the OTP."
          );
          setStep(step + 1); // Move to OTP verification step
        } else {
          alert("Organization creation failed. Please try again.");
        }
      } catch (error) {
        console.error("Error creating organization:", error);
        setorgError(true);
      } finally {
        setLoading(false); // Set loading to false after the API call (success or failure)
      }
    } else {
      setStep(step + 1);
    }
    // }
  };

  // Handle Adding Employee
  const handleAddEmployee = async () => {
    if (FirstName && LastName && employeeEmail) {
      // Create a new employee object
      const newEmployee = {
        FirstName,
        LastName,
        Email: employeeEmail,
        IsRegisterationSuccessFull: false,
      };

      // Update state immediately
      setEmployees([
        ...employees,
        { FirstName, LastName, email: employeeEmail },
      ]);

      // Clear input fields
      setFirstName("");
      setLastName("");
      setEmployeeEmail("");

      // Get token from localStorage
      const token = localStorage.getItem("access_token");

      if (!token) {
        alert("Authentication failed. Please log in again.");
        return;
      }

      try {
        // Send API request to add employee
        const response = await axios.post(
          `${APP_URI}/api/tracker/Account/AddWorker`,
          newEmployee,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.status === 200) {
          alert("Employee added successfully!");
        } else {
          alert("Failed to add employee.");
        }
      } catch (error) {
        console.error("Error adding employee:", error);
        alert("An error occurred while adding the employee.");
      }
    } else {
      alert("Please enter the employee's first name, last name, and email.");
    }
  };

  const handleSelect = (emp) => {
    setSelectedEmployees((prev) => {
      const exists = prev.some((e) => e.id === emp.id);

      if (exists) {
        // Remove user
        return prev.filter((e) => e.id !== emp.id);
      }

      if (prev.length >= MAX_SELECT) {
        alert(`You can select a maximum of ${MAX_SELECT} employees.`);
        return prev;
      }

      // Add user
      return [...prev, emp];
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-green-950  to-green-200  text-white flex items-center justify-center">
      <div className="bg-white relative tempo text-black p-8 rounded-lg w-[85%] h-[90vh] shadow-lg ">
        {/* <h2 className="absolute ml-[40%] text-center text-[40px] text-green-700">HireRocks</h2> */}

        {/* Step 1: Organization Input for Viewing */}
        {step === 1 && !createMode && (
          <div className="flex justify-center items-center w-full h-full">
            <div className="flex w-[80%] h-auto border border-gray-300 shadow-lg rounded-lg overflow-hidden">
              {/* Left Section */}
              <div className="w-1/2 p-8 flex flex-col justify-center bg-white">
                <h2 className="text-xl font-bold text-gray-700 mb-4">
                  Enter Your Organization Name
                </h2>
                {errors.organizationError && (
                  <span className="text-red-500 text-sm">
                    {errors.organizationError}
                  </span>
                )}
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="w-full p-3 rounded-md border border-gray-300 text-gray-800 outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Organization Name"
                />

                <input
                  type="password"
                  value={organizationPass}
                  onChange={(e) => setOrganizationPass(e.target.value)}
                  className="w-full p-3 mt-4 rounded-md border border-gray-300 text-gray-800 outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Password"
                />
                <button
                  onClick={handleViewClick}
                  className="w-full bg-green-500 hover:bg-green-700 text-white py-2 rounded-md mt-4 transition-all"
                >
                  {loading ? "Opening Org..." : "View Organization"}
                </button>
                <p className="text-center text-sm text-gray-500 mt-4">
                  New to HireRocks?{" "}
                  <button
                    onClick={handleCreateOrganization}
                    className="text-green-600 hover:underline"
                  >
                    Create Organization
                  </button>
                </p>
              </div>

              {/* Vertical Separator */}
              <div className="w-[2px] bg-gray-300"></div>

              {/* Right Section */}
              <div className="w-1/2 h-full p-0 flex flex-col justify-center bg-gray-100">
                <EmpLogin />
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Create Organization Flow */}
        {createMode && step === 1 && (
          <div className="w-full h-full flex justify-center items-center">
            <div className="space-y-6 w-full h-full ">
              <label className="block text-4xl font-bold text-gray-700 text-center">
                Create Organization
              </label>
              {orgError && (
                <p className="text-red-500 text-sm">Name is already taken.</p>
              )}
              <div>
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="w-full p-3 rounded-md border border-gray-300 text-gray-800 outline-none"
                  placeholder="Enter your Organization Name"
                />
                {errors.organizationName && (
                  <p className="text-red-500 text-sm">
                    {errors.organizationName}
                  </p>
                )}
              </div>

              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 rounded-md border border-gray-300 text-gray-800 outline-none"
                  placeholder="Enter Your Email"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm">{errors.email}</p>
                )}
              </div>

              <div>
                <input
                  type="password"
                  value={organizationPass}
                  onChange={(e) => setOrganizationPass(e.target.value)}
                  className="w-full p-3 rounded-md border border-gray-300 text-gray-800 outline-none"
                  placeholder="Enter Your Password"
                />
                {errors.organizationPass && (
                  <p className="text-red-500 text-sm">
                    {errors.organizationPass}
                  </p>
                )}
              </div>
              <button
                onClick={handleNextStep}
                className="w-full bg-green-500 hover:bg-green-700 text-white py-2 rounded-md"
              >
                {loading ? "loading....." : "Next"}
              </button>
            </div>
          </div>
        )}

        {createMode && step === 2 && (
          <div className="w-full h-full flex justify-center items-center">
            <div className="space-y-6 w-[450px]">
              <label className="block text-lg font-bold text-gray-700">
                Enter the OTP sent to your email{" "}
                <span className="font-extrabold text-green-700">{email}</span>
              </label>
              <input
                type="text"
                value={mailContent}
                onChange={(e) => setMailContent(e.target.value)}
                className="w-full p-3 rounded-md border border-gray-300 text-gray-800"
                placeholder="OTP"
              />
              {otpError && (
                <p className="text-red-500 text-sm">Incorrect OTP</p>
              )}
              <button
                onClick={verifyOTP}
                className="w-full bg-green-500 hover:bg-green-700 text-white py-2 rounded-md"
              >
                {loading ? "loading....." : "Submit"}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Add Employees */}
        {createMode && step === 3 && (
          <div className="w-full max-w-3xl mx-auto">
            <label className="block text-lg font-bold text-gray-700 mb-2">
              From your CRM users, you may select up to 10 users based on your
              plan.
            </label>

            <div className="relative">
              {/* Selected employees box */}
              <div
                className="border border-gray-300 rounded-md p-3 cursor-pointer bg-white overflow-y-auto max-h-40"
                onClick={() => setIsOpen(!isOpen)}
              >
                {selectedEmployees.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedEmployees.map((emp) => (
                      <span
                        key={emp.id}
                        className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-sm flex items-center"
                      >
                        {emp.name}
                        <button
                          className="ml-1 text-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(emp);
                          }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-400">Select employees...</span>
                )}
              </div>

              {/* Dropdown — absolute inside parent so it stays within white box */}
              {isOpen && (
                <div className="absolute left-0 mt-1 w-[80vw] max-w-[80%] border border-gray-300 rounded-md max-h-60 overflow-y-auto bg-white shadow-xl z-10 p-2">
                  {employeesList.length === 0 ? (
                    <div className="p-2 text-gray-500 italic">
                      {platform === "zoho"
                        ? "No Zoho users found."
                        : platform === "salesforce"
                        ? "No Salesforce users found."
                        : "Showing 100 default users."}
                    </div>
                  ) : (
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-100 sticky top-0">
                          <th className="border px-2 py-1 text-left">User</th>
                          <th className="border px-2 py-1 text-left">Email</th>
                          <th className="border px-2 py-1 text-left">Role</th>
                          <th className="border px-2 py-1 text-center">
                            Add to Hirerocks
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {employeesList.map((emp) => {
                          const isSelected = selectedEmployees.some(
                            (e) => e.id === emp.id
                          );

                          return (
                            <tr key={emp.id} className="hover:bg-gray-50">
                              <td className="border px-2 py-1">{emp.name}</td>
                              <td className="border px-2 py-1">{emp.email}</td>
                              <td className="border px-2 py-1">{emp.role}</td>

                              <td className="border px-2 py-1 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  disabled={
                                    !isSelected &&
                                    selectedEmployees.length >= MAX_SELECT
                                  }
                                  onChange={() => handleSelect(emp)}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>

            {/* Button next to dropdown */}
            <div className="flex items-center justify-between mt-3">
              <button
                onClick={handleDoneClick}
                className={`px-4 py-2 rounded-md text-white 
                 ${
                   loading
                     ? "bg-gray-400 cursor-not-allowed"
                     : "bg-blue-500 hover:bg-blue-700"
                 }
               `}
              >
                {loading ? "Loading..." : "Done"}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Final Confirmation */}
        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Setup Complete!
            </h2>
            <p className="text-gray-600">
              Your organization is ready with employees added. You can now
              proceed to the dashboard or any other actions.
            </p>
            <button
              className="w-full bg-green-500 hover:bg-green-700 text-white py-2 rounded-md mt-4"
              onClick={() => navigate("/tracker")}
            >
              Go To Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Organization;
