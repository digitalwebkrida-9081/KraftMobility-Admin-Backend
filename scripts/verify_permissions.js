const API_URL = "http://localhost:5000/api";

async function verify() {
  try {
    // 1. Login as Admin
    console.log("Logging in as Admin...");
    const adminLoginRes = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@test.com",
        password: "password123",
      }),
    });

    if (!adminLoginRes.ok)
      throw new Error(`Login failed: ${adminLoginRes.statusText}`);
    const adminData = await adminLoginRes.json();
    const token = adminData.token;
    console.log("Admin logged in. Token obtained.");

    // 2. Fetch Modules
    console.log("Fetching modules...");
    const modulesRes = await fetch(`${API_URL}/modules`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!modulesRes.ok)
      throw new Error(`Fetch modules failed: ${modulesRes.statusText}`);
    const modules = await modulesRes.json();
    console.log("Modules:", modules);

    // 3. Update Permissions
    console.log("Updating permissions for tickets...");
    const updateRes = await fetch(`${API_URL}/permissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        module: "tickets",
        permissions: [
          { role: "Operator", actions: ["add", "notes"] },
          { role: "End-User", actions: ["add"] },
        ],
      }),
    });

    if (!updateRes.ok)
      throw new Error(`Update permissions failed: ${updateRes.statusText}`);
    const updateData = await updateRes.json();
    console.log("Update response:", updateData);

    // 4. Verify Permissions
    console.log("Verifying permissions...");
    const permsRes = await fetch(`${API_URL}/permissions?module=tickets`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!permsRes.ok)
      throw new Error(`Verify permissions failed: ${permsRes.statusText}`);
    const perms = await permsRes.json();
    console.log("Permissions:", JSON.stringify(perms, null, 2));

    console.log("Verification successful!");
  } catch (error) {
    console.error("Verification failed:", error.message);
  }
}

verify();
