import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import VotingDAppProject from "./VotingDApp.json";

const CONTRACT_ADDRESS = "0xbd9CFE5E548790577Db89F29ce73d5Fa75723412";
const ADMIN_ADDRESS = "0x48a42Fd5c82ef6927551f43EB531151aDe1a1C85";
const BACKEND_URL = "http://localhost:5000";
const SEPOLIA_CHAIN_ID = "0xaa36a7";

function App() {
  const [connected, setConnected] = useState(false);
  const [user, setUser] = useState(null);
  const [voted, setVoted] = useState(false);
  const [newCandidate, setNewCandidate] = useState("");
  const [selectedPanel, setSelectedPanel] = useState(0);
  const [panels, setPanels] = useState([]);
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [networkError, setNetworkError] = useState("");
  const [wrongNetwork, setWrongNetwork] = useState(false);

  // OTP / whitelist state
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [whitelistLoading, setWhitelistLoading] = useState(false);

  // Admin whitelist input
  const [whitelistInput, setWhitelistInput] = useState("");

  const [deletedCandidates, setDeletedCandidates] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("deletedCandidates") || "[]");
    } catch { return []; }
  });

  const isAdmin = user?.toLowerCase() === ADMIN_ADDRESS.toLowerCase();

  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setPanels([
      { name: "🤝 Unity Panel", candidates: [{ name: "Priyanka", votes: 0 }, { name: "Raksha", votes: 0 }, { name: "Nandhitha", votes: 0 }] },
      { name: "✨ Progress Panel", candidates: [{ name: "Bhuvan", votes: 0 }, { name: "Gagan", votes: 0 }, { name: "Chinmayee", votes: 0 }] },
      { name: "👁️ Vision Panel", candidates: [{ name: "Gagana", votes: 0 }, { name: "Teja", votes: 0 }, { name: "Yukthi", votes: 0 }] },
    ]);
  }, []);

  // Listen for network changes in MetaMask
  useEffect(() => {
    if (!window.ethereum) return;
    const handleChainChange = (chainId) => {
      if (chainId !== SEPOLIA_CHAIN_ID) {
        setWrongNetwork(true);
        setConnected(false);
        setContract(null);
        setUser(null);
        setIsWhitelisted(false);
      } else {
        setWrongNetwork(false);
      }
    };
    window.ethereum.on("chainChanged", handleChainChange);
    return () => window.ethereum.removeListener("chainChanged", handleChainChange);
  }, []);

  // Listen for account changes in MetaMask
  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountChange = (accounts) => {
      if (accounts.length === 0) {
        setConnected(false);
        setUser(null);
        setContract(null);
        setIsWhitelisted(false);
      } else {
        setUser(accounts[0]);
        setIsWhitelisted(false);
        setVoted(false);
      }
    };
    window.ethereum.on("accountsChanged", handleAccountChange);
    return () => window.ethereum.removeListener("accountsChanged", handleAccountChange);
  }, []);

  const start = new Date(currentTime);
  start.setHours(8, 0, 0, 0);
  const end = new Date(currentTime);
  end.setHours(16,0,0,0);
  const isVotingOpen = currentTime >= start && currentTime <= end;

  const getTimerDisplay = () => {
    if (currentTime < start) {
      const diff = start - currentTime;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      return { label: "Voting starts in", time: `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`, color: "text-yellow-400", bg: "bg-yellow-500/20 border-yellow-500/40", dot: "🟡" };
    } else if (currentTime <= end) {
      const diff = end - currentTime;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      return { label: "Voting closes in", time: `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`, color: "text-green-400", bg: "bg-green-500/20 border-green-500/40", dot: "🟢" };
    } else {
      return { label: "Voting Closed", time: "00:00:00", color: "text-red-400", bg: "bg-red-500/20 border-red-500/40", dot: "🔴" };
    }
  };

  const timerInfo = getTimerDisplay();

  const checkWhitelistStatus = useCallback(async (contractInstance, userAddress) => {
    const c = contractInstance || contract;
    const addr = userAddress || user;
    if (!c || !addr) return;
    try {
      const status = await c.isWhitelisted(addr);
      setIsWhitelisted(status);
    } catch (err) {
      console.error("Whitelist check failed:", err);
    }
  }, [contract, user]);

  const loadVoteCounts = useCallback(async (contractInstance, deleted) => {
    const c = contractInstance || contract;
    if (!c) return;
    const deletedList = deleted !== undefined ? deleted : deletedCandidates;

    try {
      const defaultNames = [
        ["Priyanka", "Raksha", "Nandhitha"],
        ["Bhuvan", "Gagan", "Chinmayee"],
        ["Gagana", "Teja", "Yukthi"],
      ];
      const panelNames = ["🤝 Unity Panel", "✨ Progress Panel", "👁️ Vision Panel"];
      const updatedPanels = [];

      for (let i = 0; i < 3; i++) {
        let count = defaultNames[i].length;
        try {
          const contractCount = await c.getCandidateCount(i);
          count = Number(contractCount);
        } catch { /* use default */ }

        const candidates = [];
        for (let j = 0; j < count; j++) {
          const key = `${i}-${j}`;
          if (deletedList.includes(key)) continue;
          try {
            const data = await c.getCandidate(i, j);
            const name = data[0];
            const votes = Number(data[1]);
            const exists = data[2];
            // Skip candidates that were removed on-chain
            if (!exists || name === "") continue;
            candidates.push({ name, votes, index: j });
          } catch {
            const name = j < defaultNames[i].length ? defaultNames[i][j] : `Candidate ${j + 1}`;
            try {
              const voteCount = await c.getVotes(i, j);
              candidates.push({ name, votes: Number(voteCount), index: j });
            } catch {
              candidates.push({ name, votes: 0, index: j });
            }
          }
        }
        updatedPanels.push({ name: panelNames[i], candidates });
      }

      setPanels(updatedPanels);
      setNetworkError("");
    } catch (err) {
      console.error("Error loading vote counts:", err);
      setNetworkError("⚠️ Could not load votes. Check network and contract address.");
    }
  }, [contract, deletedCandidates]);

  useEffect(() => {
    if (!contract) return;
    loadVoteCounts();
    const interval = setInterval(() => loadVoteCounts(), 30000);
    return () => clearInterval(interval);
  }, [contract, loadVoteCounts]);

  const connectWallet = async () => {
    if (!window.ethereum) return alert("MetaMask not detected");
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const chainId = await window.ethereum.request({ method: "eth_chainId" });

      if (chainId !== SEPOLIA_CHAIN_ID) {
        setWrongNetwork(true);
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: SEPOLIA_CHAIN_ID }],
          });
          setWrongNetwork(false);
        } catch (switchErr) {
          alert("❌ Please manually switch to Sepolia Testnet in MetaMask and try again.");
          return;
        }
      }

      setWrongNetwork(false);
      setUser(accounts[0]);
      setConnected(true);

      const tempProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await tempProvider.getSigner();
      const tempContract = new ethers.Contract(CONTRACT_ADDRESS, VotingDAppProject, signer);
      setContract(tempContract);

      try {
        const v0 = await tempContract.hasVoted(0, accounts[0]);
        const v1 = await tempContract.hasVoted(1, accounts[0]);
        const v2 = await tempContract.hasVoted(2, accounts[0]);
        if (v0 || v1 || v2) setVoted(true);
      } catch { /* skip */ }

      await checkWhitelistStatus(tempContract, accounts[0]);
      await loadVoteCounts(tempContract, deletedCandidates);
      alert(`✅ Wallet Connected!\nNetwork: Sepolia Testnet\nAddress: ${accounts[0].slice(0,6)}...${accounts[0].slice(-4)}`);
    } catch (err) {
      console.error(err);
      alert("Error connecting wallet");
    }
  };

  const sendOtp = async () => {
    if (!email || !email.includes("@")) return alert("Enter a valid email address");
    if (!connected) return alert("Connect your wallet first");
    try {
      setOtpLoading(true);
      const res = await fetch(`${BACKEND_URL}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
        alert("OTP sent to your email ✅ Check your inbox.");
      } else {
        alert(data.message || "Failed to send OTP");
      }
    } catch (err) {
      console.error(err);
      alert("Backend error. Is the server running on port 5000?");
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtpAndWhitelist = async () => {
    if (!otp || otp.length !== 6) return alert("Enter the 6-digit OTP");
    if (!contract || !user) return alert("Connect wallet first");
    try {
      setOtpLoading(true);

      const res = await fetch(`${BACKEND_URL}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();

      if (!data.success) {
        return alert(data.message || "OTP verification failed");
      }

      alert(`✅ OTP Verified!\n\nYour wallet address:\n${user}\n\nPlease share this with the admin to get whitelisted.`);
      setOtpSent(false);
      setOtp("");

    } catch (err) {
      console.error(err);
      alert(err.reason || err.message || "Verification failed");
    } finally {
      setOtpLoading(false);
      setWhitelistLoading(false);
    }
  };

  const whitelistWallet = async () => {
    if (!whitelistInput || !whitelistInput.startsWith("0x"))
      return alert("Enter a valid wallet address starting with 0x");
    if (!contract) return alert("Connect wallet first");
    try {
      setLoading(true);
      const tx = await contract.addToWhitelist(whitelistInput);
      await tx.wait(1);
      alert(`✅ Wallet whitelisted successfully!\n${whitelistInput}\n\nUser can now vote.`);
      setWhitelistInput("");
    } catch (err) {
      console.error(err);
      alert(err.reason || err.message || "Failed to whitelist");
    } finally {
      setLoading(false);
    }
  };

  const vote = async (panelIndex, candidate) => {
    if (!isVotingOpen) return alert("Voting Closed ⛔");
    if (voted) return alert("You have already voted ✅");
    if (!contract) return alert("Connect wallet first");
    if (!isWhitelisted) return alert("You must be whitelisted first ⛔\nVerify your email and ask admin to whitelist you.");

    try {
      setLoading(true);
      const candidateIndex = candidate.index !== undefined ? candidate.index : candidate;
      const beforeCount = await contract.getVotes(panelIndex, candidateIndex);
      const beforeNum = Number(beforeCount);

      const tx = await contract.vote(panelIndex, candidateIndex);
      const receipt = await tx.wait(1);
      console.log("Confirmed in block:", receipt.blockNumber);

      let updated = false;
      for (let attempt = 1; attempt <= 10; attempt++) {
        await new Promise((res) => setTimeout(res, 2000));
        try {
          const afterCount = await contract.getVotes(panelIndex, candidateIndex);
          const afterNum = Number(afterCount);
          if (afterNum > beforeNum) {
            await loadVoteCounts();
            updated = true;
            break;
          }
        } catch { /* keep retrying */ }
      }

      if (!updated) {
        setPanels((prev) =>
          prev.map((panel, pi) => ({
            ...panel,
            candidates: panel.candidates.map((c) => ({
              ...c,
              votes: pi === panelIndex && c.index === candidateIndex ? c.votes + 1 : c.votes,
            })),
          }))
        );
      }

      setVoted(true);
      alert("🎉 Voted successfully!");
    } catch (err) {
      console.error(err);
      alert(err.reason || err.message || "Failed to vote ⛔");
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: addCandidate with retry loop to wait for chain to reflect new candidate
  const addCandidate = async () => {
    if (!newCandidate.trim()) return alert("Enter a candidate name");
    if (!contract) return alert("Connect wallet first");
    const candidateName = newCandidate.trim();
    try {
      setLoading(true);

      // Get count before adding
      const beforeCount = Number(await contract.getCandidateCount(selectedPanel));

      const tx = await contract.addCandidate(selectedPanel, candidateName);
      await tx.wait(1);

      // Retry until the new candidate appears on-chain (up to 20 attempts x 2s = 40s)
      let added = false;
      for (let attempt = 1; attempt <= 20; attempt++) {
        await new Promise((res) => setTimeout(res, 2000));
        try {
          const afterCount = Number(await contract.getCandidateCount(selectedPanel));
if (afterCount > beforeCount) {
  // New candidate is on-chain, now reload all panels
  await loadVoteCounts(contract, deletedCandidates);
  added = true;
  break;
}
        } catch { /* keep retrying */ }
      }

     if (!added) {
  // Fallback: force reload one more time before optimistic update
  try {
    await loadVoteCounts(contract, deletedCandidates);
  } catch {
    setPanels((prev) =>
      prev.map((panel, pi) => {
        if (pi !== selectedPanel) return panel;
        return {
          ...panel,
          candidates: [
            ...panel.candidates,
            { name: candidateName, votes: 0, index: beforeCount },
          ],
        };
      })
    );
  }
}
      setNewCandidate("");
      alert(`✅ "${candidateName}" added to Panel ${selectedPanel + 1}`);
    } catch (err) {
      console.error(err);
      alert(err.reason || err.message || "Failed to add candidate ⛔");
    } finally {
      setLoading(false);
    }
  };

  const deleteCandidate = (pIndex, candidate) => {
    const key = `${pIndex}-${candidate.index}`;
    const updatedDeleted = [...deletedCandidates, key];
    setDeletedCandidates(updatedDeleted);
    localStorage.setItem("deletedCandidates", JSON.stringify(updatedDeleted));
    setPanels((prev) =>
      prev.map((panel, pi) => ({
        ...panel,
        candidates: pi === pIndex
          ? panel.candidates.filter((c) => c.index !== candidate.index)
          : panel.candidates,
      }))
    );
  };

  const totalVotes = panels.reduce(
    (sum, panel) => sum + panel.candidates.reduce((s, c) => s + c.votes, 0), 0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-950 to-indigo-950 text-white">

      {/* NAVBAR */}
      <div className="flex justify-between items-center px-8 py-5 backdrop-blur-xl bg-white/5 border-b border-white/10">
        <h1 className="text-2xl font-bold text-white">VoteChain 🗳</h1>
        <div className="flex items-center gap-3">
          {connected && (
            <span className="text-xs px-3 py-1 rounded-full bg-green-500/20 border border-green-500/40 text-green-400">
              🟢 Sepolia
            </span>
          )}
          {wrongNetwork && (
            <span className="text-xs px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400">
              ⚠️ Wrong Network
            </span>
          )}
          <button
            onClick={connectWallet}
            className="bg-purple-600 px-5 py-2 rounded-xl hover:bg-purple-700"
          >
            {connected
              ? `Connected: ${user?.slice(0,6)}...${user?.slice(-4)}`
              : "Connect Wallet"}
          </button>
        </div>
      </div>

      {wrongNetwork && (
        <div className="bg-red-500/20 border-b border-red-500/40 text-red-300 text-center py-3 text-sm">
          ⚠️ You are on the wrong network. Please switch to <strong>Sepolia Testnet</strong> in MetaMask.
        </div>
      )}

      <div className="p-10">
        <h2 className="text-5xl font-extrabold text-center mb-8 text-white">🗳 President Election</h2>

        {/* TIMER */}
        <div className={`mx-auto mb-6 w-fit px-8 py-4 rounded-2xl border text-center ${timerInfo.bg}`}>
          <p className="text-sm text-white/60 uppercase tracking-widest mb-1">{timerInfo.dot} {timerInfo.label}</p>
          <p className={`text-4xl font-mono font-bold ${timerInfo.color}`}>{timerInfo.time}</p>
          <p className="text-xs text-white/40 mt-1">Voting Hours: 8:00 AM – 4:00 PM &nbsp;|&nbsp; Now: {currentTime.toLocaleTimeString()}</p>
        </div>

        {/* VOTING STATUS */}
        <div className="text-center mb-8">
          <p className="text-lg">{isVotingOpen ? "🟢 Voting Open" : "🔴 Voting Closed"}</p>
        </div>

        {networkError && (
          <div className="text-center mb-6">
            <p className="text-red-400 text-sm">{networkError}</p>
          </div>
        )}

        {/* EMAIL OTP VERIFICATION SECTION */}
        {connected && !isAdmin && (
          <div className="max-w-md mx-auto mb-10 bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
            <h3 className="text-xl font-bold text-center text-purple-300 mb-1">🔐 Email Verification</h3>

            {isWhitelisted ? (
              <div className="text-center py-4">
                <p className="text-green-400 text-lg font-semibold">✅ Wallet Verified & Whitelisted</p>
                <p className="text-white/50 text-sm mt-1">You are authorized to vote.</p>
              </div>
            ) : (
              <>
                <p className="text-white/50 text-sm text-center mb-4">
                  Step 1: Verify your email → Step 2: Admin whitelists your wallet → Step 3: Vote
                </p>

                <div className="flex gap-2 mb-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="flex-1 px-4 py-2 rounded-xl bg-black/40 border border-purple-500/30 text-white placeholder-white/30 focus:outline-none focus:border-purple-400"
                  />
                  <button
                    onClick={sendOtp}
                    disabled={otpLoading || otpSent}
                    className="bg-purple-600 px-4 py-2 rounded-xl hover:bg-purple-700 disabled:opacity-40 whitespace-nowrap text-sm font-semibold"
                  >
                    {otpLoading ? "Sending..." : otpSent ? "Sent ✅" : "Send OTP"}
                  </button>
                </div>

                {otpSent && (
                  <>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="Enter 6-digit OTP"
                        maxLength={6}
                        className="flex-1 px-4 py-2 rounded-xl bg-black/40 border border-yellow-500/30 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400 tracking-widest text-center text-lg"
                      />
                      <button
                        onClick={verifyOtpAndWhitelist}
                        disabled={otpLoading || whitelistLoading}
                        className="bg-yellow-500 px-4 py-2 rounded-xl hover:bg-yellow-600 text-black font-bold disabled:opacity-40 whitespace-nowrap text-sm"
                      >
                        {whitelistLoading ? "Whitelisting..." : otpLoading ? "Verifying..." : "Verify"}
                      </button>
                    </div>
                    <p className="text-white/30 text-xs text-center">
                      Didn't receive it?{" "}
                      <button
                        onClick={() => { setOtpSent(false); setOtp(""); }}
                        className="text-purple-400 underline"
                      >
                        Resend
                      </button>
                    </p>
                  </>
                )}

                <div className="mt-4 p-3 bg-black/30 rounded-xl border border-white/10">
                  <p className="text-white/40 text-xs text-center mb-1">Your wallet address (share with admin):</p>
                  <p className="text-white/70 text-xs text-center break-all font-mono">{user}</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* ADMIN PANEL */}
        {isAdmin && (
          <div className="max-w-2xl mx-auto mb-10 space-y-4">

            <div className="bg-white/5 border border-green-500/20 rounded-3xl p-6 backdrop-blur-xl">
              <h3 className="text-xl font-bold text-green-400 mb-1">✅ Whitelist a Voter</h3>
              <p className="text-white/40 text-sm mb-4">
                Paste the voter's wallet address after they verify their OTP and share it with you
              </p>
              <div className="flex gap-3">
                <input
                  value={whitelistInput}
                  onChange={(e) => setWhitelistInput(e.target.value)}
                  placeholder="0x... voter wallet address"
                  className="flex-1 px-4 py-2 rounded-xl bg-black/40 border border-green-500/30 text-white placeholder-white/30 focus:outline-none focus:border-green-400 text-sm font-mono"
                />
                <button
                  onClick={whitelistWallet}
                  disabled={loading}
                  className="bg-green-500 px-5 py-2 rounded-xl hover:bg-green-600 font-bold disabled:opacity-40 whitespace-nowrap"
                >
                  {loading ? "Processing..." : "Whitelist ✅"}
                </button>
              </div>
            </div>

            <div className="bg-white/5 border border-yellow-500/20 rounded-3xl p-6 backdrop-blur-xl">
              <h3 className="text-xl font-bold text-yellow-400 mb-1">➕ Add Candidate</h3>
              <p className="text-white/40 text-sm mb-4">Add a new candidate to any panel</p>
              <div className="flex gap-3 flex-wrap">
                <select
                  value={selectedPanel}
                  onChange={(e) => setSelectedPanel(Number(e.target.value))}
                  className="px-4 py-2 rounded-xl text-black"
                >
                  <option value={0}>Unity Panel</option>
                  <option value={1}>Progress Panel</option>
                  <option value={2}>Vision Panel</option>
                </select>
                <input
                  value={newCandidate}
                  onChange={(e) => setNewCandidate(e.target.value)}
                  placeholder="Enter candidate name"
                  className="px-4 py-2 rounded-xl text-black flex-1"
                />
                <button
                  onClick={addCandidate}
                  disabled={loading}
                  className="bg-yellow-500 px-5 py-2 rounded-xl hover:bg-yellow-600 text-black font-bold disabled:opacity-40"
                >
                  {loading ? "Adding..." : "Add"}
                </button>
              </div>
            </div>

          </div>
        )}

        {loading && (
          <div className="text-center mb-6">
            <p className="text-yellow-400 text-lg animate-pulse">⏳ Processing on blockchain... please wait</p>
          </div>
        )}

        {/* PANELS */}
        <div className="grid md:grid-cols-3 gap-10">
          {panels.map((panel, pIndex) => (
            <div key={pIndex} className="bg-white/5 backdrop-blur-2xl p-6 rounded-3xl border border-white/10 shadow-2xl hover:scale-105 transition">
              <h3 className="text-2xl text-yellow-400 text-center font-bold mb-5">{panel.name}</h3>

              {panel.candidates.map((c, cIndex) => (
                <div key={cIndex} className="bg-black/40 p-4 rounded-xl mb-4 border border-purple-500/30">
                  <h4 className="text-lg font-semibold">{c.name}</h4>

                  <button
                    onClick={() => vote(pIndex, c)}
                    disabled={!connected || !isVotingOpen || voted || loading || isAdmin || !isWhitelisted}
                    className="mt-3 w-full bg-blue-600 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {loading
                      ? "Processing..."
                      : !connected
                      ? "Connect Wallet First"
                      : !isWhitelisted
                      ? "Verify Email First 🔐"
                      : voted
                      ? "Already Voted ✅"
                      : "Vote"}
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => deleteCandidate(pIndex, c)}
                      className="mt-2 w-full bg-red-500 py-2 rounded-xl hover:bg-red-600"
                    >
                      Delete
                    </button>
                  )}

                  <p className="text-sm mt-2 text-gray-300">Votes: {c.votes}</p>
                </div>
              ))}
            </div>
          ))}
        </div>

        {connected && (
          <div className="mt-8 text-center">
            <button
              onClick={() => loadVoteCounts()}
              disabled={loading}
              className="bg-purple-600 px-6 py-2 rounded-xl hover:bg-purple-700 text-sm disabled:opacity-40"
            >
              🔄 Refresh Vote Counts
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <button className="bg-green-500 px-8 py-3 rounded-2xl text-lg font-semibold hover:bg-green-600">
            Total Votes: {totalVotes}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;