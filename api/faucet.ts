// api/faucet.ts

import { ethers } from "ethers";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Define the ABI for the specific function we need to call
// This is more gas-efficient than loading the entire ABI
const FAUCET_ABI = ["function requestFaucet(address _recipient) external"];

/**
 * Sets CORS headers to allow requests from your frontend.
 * For production, replace '*' with your specific frontend domain for security.
 * e.g., 'https://my-game-app.vercel.app'
 */
const setCorsHeaders = (res: VercelResponse) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    process.env.FRONTEND_URL || "*" // Allow specified frontend or all
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS" // Allow POST and the preflight OPTIONS requests
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type" // Allow 'Content-Type' header
  );
};

/**
 * Checks if all required environment variables are set.
 * Throws an error if any are missing.
 */
const checkEnvVars = () => {
  const requiredVars = [
    "DEGEN_RPC_URL",
    "FAUCET_CONTRACT_ADDRESS",
    "DEV_PRIVATE_KEY",
  ];
  const missingVars = requiredVars.filter((v) => !process.env[v]);

  if (missingVars.length > 0) {
    console.error(`Missing environment variables: ${missingVars.join(", ")}`);
    // This error will be caught by the main try...catch block
    throw new Error("Server configuration error.");
  }

  // Return the variables in a structured object for easy access
  return {
    rpcUrl: process.env.DEGEN_RPC_URL!,
    contractAddress: process.env.FAUCET_CONTRACT_ADDRESS!,
    privateKey: process.env.DEV_PRIVATE_KEY!,
  };
};

/**
 * The main Vercel Serverless Function handler.
 * This function is triggered for all requests to /api/faucet.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Apply CORS headers to every response
  setCorsHeaders(res);

  // Handle CORS preflight (OPTIONS) request
  // Browsers send this automatically before a POST request to check permissions
  if (req.method === "OPTIONS") {
    return res.status(204).end(); // Respond with "No Content"
  }

  // Ensure the request is a POST method
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST", "OPTIONS"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // --- 1. Configuration & Validation ---

    // Verify and get environment variables. Fails if any are missing.
    const { rpcUrl, contractAddress, privateKey } = checkEnvVars();

    // Get the user's address from the JSON request body
    // Vercel automatically parses `req.body` from JSON
    const { userAddress } = req.body;

    // Validate the Ethereum address format
    if (!userAddress || !ethers.isAddress(userAddress)) {
      return res.status(400).json({ error: "address not valid." });
    }

    // --- 2. Ethers.js Logic ---

    // Connect to the blockchain using the RPC URL
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Create a wallet instance for our developer/operator
    // This wallet pays the gas for the faucet transaction
    const devWallet = new ethers.Wallet(privateKey, provider);

    // Check the user's current native token balance
    const balance = await provider.getBalance(userAddress);

    // Eligibility check: Only allow claims if the user's balance is 0
    if (balance > 0) {
      return res
        .status(403) // 403 Forbidden
        .json({ message: "your not eligible (balance > 0)." });
    }

    // --- 3. Smart Contract Interaction ---

    // Create an instance of the faucet smart contract
    // We connect it to `devWallet` so it can sign transactions
    const faucetContract = new ethers.Contract(
      contractAddress,
      FAUCET_ABI,
      devWallet
    );

    // Log in English
    console.log(`Processing faucet request for: ${userAddress}`);

    // Call the 'requestFaucet' function on the smart contract
    // The `devWallet` will pay the gas for this transaction
    const tx = await faucetContract.requestFaucet(userAddress);

    // Log in English
    console.log(`Faucet sent successfully! Tx hash: ${tx.hash}`);

    // --- 4. Success Response ---

    // Send a 200 OK response with the transaction hash
    return res.status(200).json({
      success: true,
      message: `Faucet successfully sent to ${userAddress}`,
      transactionHash: tx.hash,
    });
  } catch (error: any) {
    // --- 5. Error Handling ---
    console.error("Faucet Error:", error);

    // Handle the specific configuration error we defined
    if (error.message?.includes("Server configuration error")) {
      return res
        .status(500) // Internal Server Error
        .json({ error: "Server configuration error." });
    }

    // Handle specific smart contract errors (e.g., revert messages)
    // This assumes your contract reverts with this specific string
    if (error.message?.includes("Address has already claimed faucet")) {
      return res
        .status(409) // 409 Conflict (good for "already exists")
        .json({ error: "address has already been claimed by faucet." });
    }

    // Generic catch-all error for any other failures
    return res
      .status(500)
      .json({ error: "An internal error occurred on the server." });
  }
}