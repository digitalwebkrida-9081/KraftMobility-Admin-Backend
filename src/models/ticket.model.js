const fs = require("fs");
const path = require("path");
const dbConfig = require("../config/db.config");

const getTickets = () => {
  if (!fs.existsSync(dbConfig.TICKET_FILE)) {
    return [];
  }
  const data = fs.readFileSync(dbConfig.TICKET_FILE);
  return JSON.parse(data);
};

const saveTickets = (tickets) => {
  const dir = path.dirname(dbConfig.TICKET_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(dbConfig.TICKET_FILE, JSON.stringify(tickets, null, 2));
};

const Ticket = {
  findAll: () => {
    return getTickets();
  },

  create: async (ticket) => {
    const tickets = getTickets();
    const newTicket = {
      id: Date.now(),
      status: "Pending",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // Default 8 days expiration
      notes: [],
      ...ticket,
    };

    tickets.push(newTicket);
    saveTickets(tickets);
    return newTicket;
  },

  update: async (id, ticketData) => {
    const tickets = getTickets();
    const index = tickets.findIndex((t) => t.id === parseInt(id));
    if (index === -1) {
      throw new Error("Ticket not found");
    }

    const updatedTicket = {
      ...tickets[index],
      ...ticketData,
      id: tickets[index].id, // Ensure ID doesn't change
    };

    tickets[index] = updatedTicket;
    saveTickets(tickets);
    return updatedTicket;
  },

  delete: async (id) => {
    let tickets = getTickets();
    const initialLength = tickets.length;
    tickets = tickets.filter((t) => t.id !== parseInt(id));

    if (tickets.length === initialLength) {
      throw new Error("Ticket not found");
    }

    saveTickets(tickets);
    return { message: "Ticket deleted successfully!" };
  },

  findById: (id) => {
    const tickets = getTickets();
    return tickets.find((t) => t.id === parseInt(id));
  },
};

module.exports = Ticket;
