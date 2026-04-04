import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import VotingDAppProject from "./VotingDApp.json";

const CONTRACT_ADDRESS = "0x001d63F9fe9C8BF57FB3eE20fd94E90B93B102b8";
const ADMIN_ADDRESS = "0x48a42Fd5c82ef6927551f43EB531151aDe1a1C85";

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

  // ✅ FIX 2: load deleted list from localStorage so it persists after login
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

  const start = new Date(currentTime);
  start.setHours(8, 0, 0, 0);
  const end = new Date(currentTime);
  end.setHours(21, 0, 0, 0);
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

  const loadVoteCounts = useCallback(async (contractInstance, deleted) => {
    const c = contractInstance || contract;
    if (!c) return;

    // ✅ use passed deleted list or current state
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
        } catch { /* use default count */ }

        const candidates = [];
        for (let j = 0; j < count; j++) {
          // ✅ FIX 2: skip deleted candidates
          const key = `${i}-${j}`;
          if (deletedList.includes(key)) continue;

          try {
            // ✅ FIX 1: fetch name from contract using getCandidate()
            const data = await c.getCandidate(i, j);
            const name = data[0]; // exact name stored on blockchain
            const votes = Number(data[1]);
            candidates.push({ name, votes, index: j });
          } catch {
            // fallback to default name if getCandidate fails
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
      console.log("Connected chainId:", chainId);

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

      await loadVoteCounts(tempContract, deletedCandidates);
      alert(`Wallet Connected ✅\nNetwork chainId: ${chainId}`);
    } catch (err) {
      console.error(err);
      alert("Error connecting wallet");
    }
  };

  const vote = async (panelIndex, candidate) => {
    if (!isVotingOpen) return alert("Voting Closed ⛔");
    if (voted) return alert("You can vote only once ✅");
    if (!contract) return alert("Connect wallet first");

    try {
      setLoading(true);
      // ✅ use real blockchain index from candidate object
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
          console.log(`Attempt ${attempt} — votes: ${afterNum}`);
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
              votes: pi === panelIndex && (c.index === candidateIndex) ? c.votes + 1 : c.votes,
            })),
          }))
        );
      }

      setVoted(true);
      alert("Voted successfully ✅");
    } catch (err) {
      console.error(err);
      alert(err.reason || err.message || "Failed to vote ⛔");
    } finally {
      setLoading(false);
    }
  };

  const addCandidate = async () => {
    if (!newCandidate.trim()) return alert("Enter a candidate name");
    if (!contract) return alert("Connect wallet first");
    try {
      setLoading(true);
      const tx = await contract.addCandidate(selectedPanel, newCandidate);
      await tx.wait(1);
      await new Promise((res) => setTimeout(res, 1500));
      await loadVoteCounts();
      setNewCandidate("");
      alert(`"${newCandidate}" added to Panel ${selectedPanel + 1} ✅`);
    } catch (err) {
      console.error(err);
      alert(err.reason || err.message || "Failed to add candidate ⛔");
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIX 2: save deleted key to localStorage so it persists across logins
  const deleteCandidate = (pIndex, candidate) => {
    const key = `${pIndex}-${candidate.index}`;
    const updatedDeleted = [...deletedCandidates, key];
    setDeletedCandidates(updatedDeleted);
    localStorage.setItem("deletedCandidates", JSON.stringify(updatedDeleted));

    // remove from UI immediately
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
        <button onClick={connectWallet} className="bg-purple-600 px-5 py-2 rounded-xl hover:bg-purple-700">
          {connected ? "Connected ✅" : "Connect Wallet"}
        </button>
      </div>

      <div className="p-10">
        <h2 className="text-5xl font-extrabold text-center mb-8 text-white">🗳 President Election</h2>

        {/* TIMER */}
        <div className={`mx-auto mb-6 w-fit px-8 py-4 rounded-2xl border text-center ${timerInfo.bg}`}>
          <p className="text-sm text-white/60 uppercase tracking-widest mb-1">{timerInfo.dot} {timerInfo.label}</p>
          <p className={`text-4xl font-mono font-bold ${timerInfo.color}`}>{timerInfo.time}</p>
          <p className="text-xs text-white/40 mt-1">Voting Hours: 8:00 AM – 9:00 PM &nbsp;|&nbsp; Now: {currentTime.toLocaleTimeString()}</p>
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

        {/* ADMIN: ADD CANDIDATE */}
        {isAdmin && (
          <div className="flex gap-3 justify-center mb-8 flex-wrap">
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
              className="px-4 py-2 rounded-xl text-black"
            />
            <button
              onClick={addCandidate}
              disabled={loading}
              className="bg-green-500 px-5 py-2 rounded-xl hover:bg-green-600 disabled:opacity-40"
            >
              Add
            </button>
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
                    disabled={!connected || !isVotingOpen || voted || loading || isAdmin}
                    className="mt-3 w-full bg-blue-600 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {loading ? "Processing..." : "Vote"}
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
            <button onClick={() => loadVoteCounts()} disabled={loading} className="bg-purple-600 px-6 py-2 rounded-xl hover:bg-purple-700 text-sm disabled:opacity-40">
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