// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VotingDApp {
    address public admin;

    struct Candidate {
        string name;
        uint voteCount;
        bool exists;
    }

    struct Election {
        string name;
        bool isActive;
        Candidate[] candidates;
        mapping(address => bool) hasVoted;
    }

    Election[] public elections;

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    constructor() {
        admin = msg.sender;

        elections.push();
        elections[0].name = "Unity Panel";
        elections[0].isActive = true;
        elections[0].candidates.push(Candidate("Priyanka", 0, true));
        elections[0].candidates.push(Candidate("Raksha", 0, true));
        elections[0].candidates.push(Candidate("Nandhitha", 0, true));

        elections.push();
        elections[1].name = "Progress Panel";
        elections[1].isActive = true;
        elections[1].candidates.push(Candidate("Bhuvan", 0, true));
        elections[1].candidates.push(Candidate("Gagan", 0, true));
        elections[1].candidates.push(Candidate("Chinmayee", 0, true));

        elections.push();
        elections[2].name = "Vision Panel";
        elections[2].isActive = true;
        elections[2].candidates.push(Candidate("Gagana", 0, true));
        elections[2].candidates.push(Candidate("Teja", 0, true));
        elections[2].candidates.push(Candidate("Yukthi", 0, true));
    }

    function vote(uint _electionId, uint _candidateId) public {
        require(_electionId < elections.length, "Invalid election ID");
        Election storage e = elections[_electionId];
        require(e.isActive, "Election is not active");
        require(!e.hasVoted[msg.sender], "Already voted");
        require(_candidateId < e.candidates.length, "Invalid candidate");
        require(e.candidates[_candidateId].exists, "Candidate deleted");
        e.candidates[_candidateId].voteCount++;
        e.hasVoted[msg.sender] = true;
    }

    // ✅ Add candidate
    function addCandidate(uint _electionId, string memory _name) public onlyAdmin {
        require(_electionId < elections.length, "Invalid election ID");
        elections[_electionId].candidates.push(Candidate(_name, 0, true));
    }

    // ✅ NEW: Delete candidate permanently on blockchain
    function removeCandidate(uint _electionId, uint _candidateId) public onlyAdmin {
        require(_electionId < elections.length, "Invalid election ID");
        require(_candidateId < elections[_electionId].candidates.length, "Invalid candidate");
        elections[_electionId].candidates[_candidateId].exists = false;
        elections[_electionId].candidates[_candidateId].name = "";
    }

    function hasVoted(uint _electionId, address _voter) public view returns (bool) {
        require(_electionId < elections.length, "Invalid election ID");
        return elections[_electionId].hasVoted[_voter];
    }

    function getVotes(uint _electionId, uint _candidateId) public view returns (uint) {
        require(_electionId < elections.length, "Invalid election ID");
        require(_candidateId < elections[_electionId].candidates.length, "Invalid candidate");
        return elections[_electionId].candidates[_candidateId].voteCount;
    }

    function getCandidateCount(uint _electionId) public view returns (uint) {
        require(_electionId < elections.length, "Invalid election ID");
        return elections[_electionId].candidates.length;
    }

    function getCandidate(uint _electionId, uint _candidateId)
        public view returns (string memory, uint, bool)
    {
        require(_electionId < elections.length, "Invalid election ID");
        require(_candidateId < elections[_electionId].candidates.length, "Invalid candidate");
        Candidate memory c = elections[_electionId].candidates[_candidateId];
        return (c.name, c.voteCount, c.exists);
    }

    function isElectionActive(uint _electionId) public view returns (bool) {
        require(_electionId < elections.length, "Invalid election ID");
        return elections[_electionId].isActive;
    }

    function endElection(uint _electionId) public onlyAdmin {
        require(_electionId < elections.length, "Invalid election ID");
        elections[_electionId].isActive = false;
    }

    function activateElection(uint _electionId) public onlyAdmin {
        require(_electionId < elections.length, "Invalid election ID");
        elections[_electionId].isActive = true;
    }

    function getElectionCount() public view returns (uint) {
        return elections.length;
    }
}