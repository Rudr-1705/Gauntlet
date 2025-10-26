import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";

// Import routes
import challengeRoutes from "./routes/challenges.js";
import participantRoutes from "./routes/participants.js";
import submissionRoutes from "./routes/submissions.js";
import dashboardRoutes from "./routes/dashboard.js";

// Import services
import { PrismaClient } from "./generated/prisma/index.js";
import { initializeEventListeners } from "./services/blockchainEventService.js";

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// Routes
app.use("/api/challenges", challengeRoutes);
app.use("/api/participants", participantRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get('/',(req,res)=>{
    res.send("Shree Ganeshai Namah , Jai Shiv Hanuman, Jai Shiv ShaniBaba");
});

// Initialize blockchain event listeners
let blockchainListener = null;
const initBlockchain = async () => {
  const rpcUrl = process.env.RPC_URL;
  const sponsorDaoAddress = process.env.SPONSOR_DAO_ADDRESS;
  const validatorDaoAddress = process.env.VALIDATOR_DAO_ADDRESS;

  if (rpcUrl && sponsorDaoAddress && validatorDaoAddress) {
    console.log('Initializing blockchain event listeners...');
    blockchainListener = await initializeEventListeners(
      rpcUrl,
      sponsorDaoAddress,
      validatorDaoAddress
    );
    
    if (blockchainListener) {
      console.log('Blockchain event listeners active');
      console.log('Backend will listen for events and update database');
    } else {
      console.log('Warning: Blockchain event listeners not initialized');
    }
  } else {
    console.log('Warning: Blockchain configuration incomplete - event listeners disabled');
    console.log('Set RPC_URL, SPONSOR_DAO_ADDRESS, and VALIDATOR_DAO_ADDRESS in .env');
  }
};

/*   BLOCKCHAIN - NO PRIVATE KEY NEEDED! 
Backend only LISTENS to events, does NOT sign transactions.
Users sign their own transactions from frontend using MetaMask/wallet.

import { ethers } from "ethers";

// Read-only provider (no wallet needed)
export const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

// NO WALLET - we only listen to events, don't sign transactions
// Users sign their own transactions from frontend

import sponsorAbi from "./abis/SponsorDAO.json" assert { type: "json" };
import validatorAbi from "./abis/ValidatorDAO.json" assert { type: "json" };

// Read-only contracts for listening to events
export const sponsorDAO = new ethers.Contract(
  process.env.SPONSOR_DAO_ADDRESS,
  sponsorAbi,
  provider  // Just provider, no wallet
);

export const validatorDAO = new ethers.Contract(
  process.env.VALIDATOR_DAO_ADDRESS,
  validatorAbi,
  provider  // Just provider, no wallet
);
*/

const PORT = 4444;
app.listen(PORT, async () => {
  console.log(`\nGauntlet Backend Server running on port ${PORT}`);
  console.log(`API Docs: http://localhost:${PORT}/api`);
  console.log(`Shree Ganeshai Namah, Jai Shiv Hanuman, Jai Shiv ShaniBaba\n`);
  
  // Initialize blockchain listeners
  await initBlockchain();
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});