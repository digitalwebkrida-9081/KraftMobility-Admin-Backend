const API_URL = "http://localhost:5000/api";

async function debug() {
  try {
    console.log("--- STARTING DEBUG ---");

    // 1. Login as Admin to get token
    console.log("1. Login as Admin...");
    const loginRes = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@test.com",
        password: "password123",
      }),
    });
    if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.statusText}`);
    const { token } = await loginRes.json();
    console.log("   Token obtained.");

    // 2. Define a test permission update
    // Let's explicitly REMOVE 'add' from End-User if it exists, or ADD it if not.
    // For consistency, let's set End-User to have NO actions first.
    console.log("2. Setting End-User permissions to EMPTY...");
    const updateRes1 = await fetch(`${API_URL}/permissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        module: "tickets",
        permissions: [
          { role: "End-User", actions: [] }, // Empty actions
        ],
      }),
    });
    console.log("   Update status:", updateRes1.status);

    // 3. Verify in DB
    console.log("3. Verifying End-User permissions are EMPTY...");
    const verifyRes1 = await fetch(`${API_URL}/permissions?module=tickets`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const perms1 = await verifyRes1.json();
    const endUserPerm1 = perms1.find((p) => p.role === "End-User");
    console.log("   End-User Perms:", JSON.stringify(endUserPerm1));
    if (endUserPerm1 && endUserPerm1.actions.length === 0) {
      console.log("   SUCCESS: Permissions are empty.");
    } else {
      console.log("   FAILURE: Permissions are NOT empty.");
    }

    // 4. Set End-User permissions to HAVE 'add'
    console.log('4. Setting End-User permissions to HAVE ["add"]...');
    const updateRes2 = await fetch(`${API_URL}/permissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        module: "tickets",
        permissions: [{ role: "End-User", actions: ["add"] }],
      }),
    });
    console.log("   Update status:", updateRes2.status);

    // 5. Verify in DB
    console.log('5. Verifying End-User permissions have ["add"]...');
    const verifyRes2 = await fetch(`${API_URL}/permissions?module=tickets`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const perms2 = await verifyRes2.json();
    const endUserPerm2 = perms2.find((p) => p.role === "End-User");
    console.log("   End-User Perms:", JSON.stringify(endUserPerm2));
    if (endUserPerm2 && endUserPerm2.actions.includes("add")) {
      console.log('   SUCCESS: Permissions include "add".');
    } else {
      console.log('   FAILURE: Permissions do NOT include "add".');
    }

    console.log("--- DEBUG COMPLETE ---");
  } catch (error) {
    console.error("DEBUG FAILED:", error.message);
  }
}

debug();
