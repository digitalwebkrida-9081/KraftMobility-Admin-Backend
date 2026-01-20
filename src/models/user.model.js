const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const dbConfig = require("../config/db.config");

const getUsers = () => {
  if (!fs.existsSync(dbConfig.DATA_FILE)) {
    return [];
  }
  const data = fs.readFileSync(dbConfig.DATA_FILE);
  return JSON.parse(data);
};

const saveUsers = (users) => {
  const dir = path.dirname(dbConfig.DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(dbConfig.DATA_FILE, JSON.stringify(users, null, 2));
};

const User = {
  findAll: () => {
    return getUsers();
  },

  findByEmail: (email) => {
    const users = getUsers();
    return users.find((u) => u.email === email);
  },

  create: async (user) => {
    const users = getUsers();
    if (users.find((u) => u.email === user.email)) {
      throw new Error("User already exists");
    }

    // Hash password if not already hashed (mock/safety)
    // In this flow, controller should handle hashing, but let's be safe or just pass through
    const newUser = {
      id: Date.now(),
      ...user,
    };

    users.push(newUser);
    saveUsers(users);
    return newUser;
  },

  update: async (id, userData) => {
    const users = getUsers();
    const index = users.findIndex((u) => u.id === parseInt(id));
    if (index === -1) {
      throw new Error("User not found");
    }

    // If password is being updated, it should already be hashed by controller
    const updatedUser = {
      ...users[index],
      ...userData,
      id: users[index].id, // Ensure ID doesn't change
    };

    users[index] = updatedUser;
    saveUsers(users);
    return updatedUser;
  },

  delete: async (id) => {
    const users = getUsers();
    const index = users.findIndex((u) => u.id === parseInt(id));
    if (index === -1) {
      throw new Error("User not found");
    }

    const deletedUser = users.splice(index, 1);
    saveUsers(users);
    return deletedUser[0];
  },

  init: async () => {
    const users = getUsers();
    if (users.length === 0) {
      const hashedPassword = await bcrypt.hash("admin", 10);
      const admin = {
        id: 1,
        username: "User",
        email: "admin@test.com",
        password: hashedPassword,
        role: "Admin",
      };
      saveUsers([admin]);
      console.log("Default Admin created: admin@test.com / admin");
    }
  },
};

module.exports = User;
