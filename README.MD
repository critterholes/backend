# Vercel Serverless Faucet Backend

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2F<YOUR_USERNAME>%2F<YOUR_REPO_NAME>)

This is a serverless backend for a crypto faucet, built to run on **Vercel Serverless Functions** (Node.js runtime). It is designed as a standalone API, separate from any frontend application.

It interacts with an EVM-compatible smart contract to dispense tokens to users who meet the criteria (i.e., having a zero balance).

## Features

* **Serverless API:** Runs on Vercel's platform as a standalone backend.
* **Frontend/Backend Separation:** Designed to be called from a separate frontend application (React, Next.js, Vue, etc.).
* **CORS Ready:** Includes CORS (Cross-Origin Resource Sharing) headers to allow requests from your specified frontend domain.
* **Address Validation:** Ensures the provided `userAddress` is a valid EVM address.
* **Eligibility Check:** Only allows claims if the user's native balance is `0`.
* **Smart Contract Interaction:** Calls a `requestFaucet` function using a funded developer wallet.

## Prerequisites

* [Node.js](https://nodejs.org/) (v18 or later)
* A [Vercel](https://vercel.com/) account
* [Vercel CLI](https://vercel.com/docs/cli) (Command Line Interface)
* A funded "developer" wallet (the `DEV_PRIVATE_KEY`) to pay for gas fees.
* A deployed `Faucet` smart contract with a `requestFaucet(address _recipient)` function.

## Project Structure

Vercel uses a special directory structure. Your serverless function must be placed in the `api/` directory at the root.

project-root/ ├── api/ 
              │ └── faucet.ts <-- (This is your function) 
              ├── package.json 
              ├── tsconfig.json 
              └── .env <-- (For local development, DO NOT commit)


## Installation

1.  **Clone this backend repository:**
    ```bash
    git clone <your-repo-url>
    cd <your-backend-repo-name>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Install Vercel CLI:**
    If you don't have it globally:
    ```bash
    npm install -g vercel
    ```

## Configuration

This function relies on environment variables.

### Local Development

For local development, create an `.env` file in the root of your project.

**`.env`**

DEGEN_RPC_URL="https"//your_rpc_provider_url" FAUCET_CONTRACT_ADDRESS="0x..." DEV_PRIVATE_KEY="0x..."

Set this to your frontend's local or deployed URL
Use '*' for open access (not recommended for production)
FRONTEND_URL="http://localhost:3000"


### Production (Vercel)

For production, you must set these as **Environment Variables** in your Vercel Project Settings.

* `DEGEN_RPC_URL`
* `FAUCET_CONTRACT_ADDRESS`
* `DEV_PRIVATE_KEY` (Set this as a **Secret**)
* `FRONTEND_URL` (e.g., `https://my-awesome-game.vercel.app`)

## Running Locally

Use the Vercel CLI to run the project locally. This will start a server (usually on `http://localhost:3001`).

```bash
vercel dev
API Endpoint
Your function will be available at the path matching its filename inside the api/ directory.

Request Faucet Tokens
URL: /api/faucet

Method: POST

Headers:

Content-Type: application/json

Body (JSON):

JSON

{
  "userAddress": "0xYourUserAddressHere"
}
Responses
Success (200 OK)

JSON

{
  "success": true,
  "message": "Faucet successfully sent to 0xYourUserAddressHere",
  "transactionHash": "0x..."
}
Error: Invalid Address (400 Bad Request)

JSON

{
  "error": "address not valid."
}
Error: Not Eligible (403 Forbidden) (User's balance is > 0)

JSON

{
  "message": "your not eligible (balance > 0)."
}
Error: Already Claimed (409 Conflict)

JSON

{
  "error": "address has already been claimed by faucet."
}
Error: Method Not Allowed (405) (e.g., if you send a GET request)

JSON

{
  "error": "Method Not Allowed"
}
