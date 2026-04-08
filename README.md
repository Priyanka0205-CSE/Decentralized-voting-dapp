🗳️ **VoteChain — Decentralized Voting DApp**

A secure, transparent, and tamper-proof voting system built on the Ethereum blockchain 🔗  
Ensuring **fair elections** with OTP verification + wallet-based authentication  

---

🌐 **Overview**

VoteChain is a decentralized application (DApp) that allows users to vote securely using blockchain technology.  
Each vote is stored permanently on the blockchain, ensuring **transparency, trust, and immutability**.  

Unlike traditional systems, this platform removes central authority and prevents manipulation.  

---

🚀 **Features**

- 🔐 **OTP-Based Authentication (Email Verification)**  
- 🦊 **MetaMask Wallet Integration**  
- ✅ **Admin Whitelisting System**  
- 🗳️ **Secure Voting via Smart Contract**  
- 🔍 **Transparent & Tamper-Proof Results**  
- 🌍 **Runs on Ethereum Sepolia Testnet**
- 👤 **admin can add and delete candidates**

---

📸 **Screenshots**

👤 **User Panel**

![WhatsApp Image 2026-04-08 at 9 55 29 PM](https://github.com/user-attachments/assets/5d79726e-53f0-4aad-84f0-98e234ec67df)

![WhatsApp Image 2026-04-08 at 9 56 41 PM](https://github.com/user-attachments/assets/efd6cbb6-ff76-4cef-ac32-c7a7a7053de6)

![WhatsApp Image 2026-04-08 at 10 00 30 PM](https://github.com/user-attachments/assets/cc5b127d-1a30-4f25-9528-65d16b19b82f)

- 🔐 Connect wallet using MetaMask  
- 📧 Enter email & verify OTP  
- 🗳️ View candidates and cast vote  

---

🛠️ **Admin Panel**

![WhatsApp Image 2026-04-08 at 9 58 30 PM](https://github.com/user-attachments/assets/83bc24ac-0016-453c-801f-9085678b113d)

- ✅ Whitelist user wallet addresses  
- 🔍 Monitor voting activity  
- ⚙️ Manage system securely  

---

🛠️ **Tech Stack**

**Frontend**
- React.js  
- Ethers.js  

**Backend**
- Node.js  
- Express.js  
- Nodemailer  

**Blockchain**
- Solidity (`^0.8.20`)  
- Ethereum (Sepolia Testnet)  

---

⚙️ **Prerequisites**

- Node.js (v16 or above)  
- MetaMask browser extension  
- Gmail account (with 2-Step Verification)  
- Sepolia testnet ETH:  
  https://sepoliafaucet.com  
  https://faucet.quicknode.com/ethereum/sepolia  

---

🚀 **Getting Started**

**1️⃣ Clone Repository**

```bash
git clone https://github.com/yourusername/votechain.git
cd votechain

2️⃣ Deploy Smart Contract

Open Remix IDE → https://remix.ethereum.org/
Paste VotingDApp.sol
Compile with Solidity ^0.8.20
Connect MetaMask (Sepolia Testnet)
Deploy using Injected Provider

Copy:

Contract Address
ABI

3️⃣ Configure Frontend

Update in voting-dapp/src/App.js:

const CONTRACT_ADDRESS = "your_contract_address";
const ADMIN_ADDRESS = "your_wallet_address";
const BACKEND_URL = "http://localhost:5000";

4️⃣ Run Frontend

cd voting-dapp
npm install
npm start

Runs on 👉 http://localhost:3000

5️⃣ Setup Gmail App Password

Go to https://myaccount.google.com
Enable 2-Step Verification
Create App Password
Copy the 16-character password

6️⃣ Run Backend

cd votechain-backend
npm init -y
npm install express nodemailer cors dotenv

Create .env:

EMAIL_USER=yourgmail@gmail.com
EMAIL_PASS=your_app_password

Start server:

node server.js

Runs on 👉 http://localhost:5000

🔄 Voting Flow

User connects MetaMask wallet
Enters email → receives OTP
OTP verification completed
System checks whitelist status
Admin whitelists wallet (if needed)
User gains voting access
Vote is cast via blockchain transaction
Results are transparent and immutable

🔐 Security Highlights

✔️ Double-layer authentication (Wallet + OTP)
✔️ Only whitelisted users can vote
✔️ Blockchain ensures no data tampering
✔️ Fully decentralized — no central control

👩‍💻 Author
Priyanka
B.Tech Student | Blockchain Enthusiast 🚀
