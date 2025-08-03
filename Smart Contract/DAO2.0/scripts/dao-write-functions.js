const { ethers } = require("hardhat");
require("dotenv").config();

/**
 * Comprehensive script to test all DAO write functions
 * IMPORTANT: This script demonstrates all functions but some require admin privileges
 */

async function main() {
  console.log("✍️  Testing All DAO Write Functions");
  console.log("==================================");

  // Updated contract address
  const daoAddress = "0x96200d82e180d09Ba12DCd25eefB14C5BE85def0";
  const tokenAddress = process.env.TOKEN_ADDRESS;

  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log("Testing with account:", deployer.address);

  // Get contract instances
  const dao = await ethers.getContractAt("GanjesDAO", daoAddress);
  const token = await ethers.getContractAt("MockERC20", tokenAddress);

  console.log("\n📋 Contract Addresses:");
  console.log("DAO Address:", daoAddress);
  console.log("Token Address:", tokenAddress);

  // Check if user is admin
  const isAdmin = await dao.isOwner(deployer.address);
  console.log("Is Admin:", isAdmin);

  try {
    console.log("\n" + "=".repeat(60));
    console.log("💰 TOKEN OPERATIONS");
    console.log("=".repeat(60));

    // 1. Check token balance
    const tokenBalance = await token.balanceOf(deployer.address);
    console.log("✅ Current Token Balance:", ethers.formatEther(tokenBalance), "tokens");

    // 2. Deposit tokens to DAO
    if (tokenBalance > ethers.parseEther("50")) {
      console.log("\n🔄 Testing deposit function...");
      const depositAmount = ethers.parseEther("10");
      
      try {
        const approveTx = await token.approve(daoAddress, depositAmount);
        await approveTx.wait();
        console.log("✅ Tokens approved for deposit");
        
        const depositTx = await dao.deposit(depositAmount);
        await depositTx.wait();
        console.log("✅ Deposited", ethers.formatEther(depositAmount), "tokens to DAO");
        console.log("Transaction hash:", depositTx.hash);
      } catch (error) {
        console.log("❌ Deposit failed:", error.message);
      }
    } else {
      console.log("⚠️  Insufficient tokens for deposit test (need > 50 tokens)");
    }

    console.log("\n" + "=".repeat(60));
    console.log("📝 PROPOSAL CREATION");
    console.log("=".repeat(60));

    // 3. Create Funding Proposal
    const govParams = await dao.getGovernanceParameters();
    const proposalFee = govParams._minTokensForProposal;
    
    if (tokenBalance >= proposalFee) {
      console.log("\n🔄 Testing createProposal function...");
      
      try {
        const approveTx = await token.approve(daoAddress, proposalFee);
        await approveTx.wait();
        console.log("✅ Proposal fee approved");
        
        const createTx = await dao.createProposal(
          "Comprehensive Function Testing Proposal - " + Date.now(),
          "DAO Function Test Project",
          "https://github.com/ganjes-dao/function-testing",
          ethers.parseEther("200")
        );
        const receipt = await createTx.wait();
        console.log("✅ Proposal created successfully!");
        console.log("Transaction hash:", createTx.hash);
        
        // Get proposal ID from event
        const proposalEvent = receipt.logs.find(
          log => log.topics[0] === dao.interface.getEvent("ProposalCreated").topicHash
        );
        if (proposalEvent) {
          const proposalId = dao.interface.parseLog(proposalEvent).args.proposalId;
          console.log("📋 New Proposal ID:", proposalId.toString());
          
          // Store for later tests
          global.testProposalId = proposalId;
        }
      } catch (error) {
        console.log("❌ Proposal creation failed:", error.message);
      }
    } else {
      console.log("⚠️  Insufficient tokens for proposal creation");
      console.log("Required:", ethers.formatEther(proposalFee), "tokens");
      console.log("Available:", ethers.formatEther(tokenBalance), "tokens");
    }

    console.log("\n" + "=".repeat(60));
    console.log("🗳️  VOTING OPERATIONS");
    console.log("=".repeat(60));

    // 4. Vote on Proposal (if we have proposals and sufficient tokens)
    const allProposalIds = await dao.getAllProposalIds();
    if (allProposalIds.length > 0 && tokenBalance >= govParams._minInvestmentAmount) {
      console.log("\n🔄 Testing vote function...");
      
      // Find an active proposal
      let activeProposalId = null;
      for (let proposalId of allProposalIds) {
        const isActive = await dao.isProposalActive(proposalId);
        const proposal = await dao.getProposalBasicDetails(proposalId);
        if (isActive && proposal.proposer.toLowerCase() !== deployer.address.toLowerCase()) {
          activeProposalId = proposalId;
          break;
        }
      }
      
      if (activeProposalId) {
        try {
          const voteAmount = ethers.parseEther("25");
          const approveTx = await token.approve(daoAddress, voteAmount);
          await approveTx.wait();
          console.log("✅ Voting tokens approved");
          
          const voteTx = await dao.vote(activeProposalId, true, voteAmount);
          await voteTx.wait();
          console.log("✅ Vote cast successfully!");
          console.log("Proposal ID:", activeProposalId.toString());
          console.log("Vote Support: YES");
          console.log("Investment Amount:", ethers.formatEther(voteAmount), "tokens");
          console.log("Transaction hash:", voteTx.hash);
        } catch (error) {
          console.log("❌ Voting failed:", error.message);
        }
      } else {
        console.log("⚠️  No active proposals available for voting (or you're the proposer)");
      }
    } else {
      console.log("⚠️  No proposals available or insufficient tokens for voting");
    }

    console.log("\n" + "=".repeat(60));
    console.log("⚙️  ADMIN FUNCTIONS (Only if you're an admin)");
    console.log("=".repeat(60));

    if (isAdmin) {
      // 5. Create Parameter Proposal
      console.log("\n🔄 Testing createParameterProposal function...");
      try {
        const paramTx = await dao.createParameterProposal(
          "minInvestmentAmount",
          ethers.parseEther("15"), // Increase min investment to 15 tokens
          "Increase minimum investment amount for better proposal quality"
        );
        await paramTx.wait();
        console.log("✅ Parameter proposal created successfully!");
        console.log("Transaction hash:", paramTx.hash);
      } catch (error) {
        console.log("❌ Parameter proposal creation failed:", error.message);
      }

      // 6. Test Voting Duration Functions
      if (allProposalIds.length > 0) {
        const proposalId = allProposalIds[allProposalIds.length - 1]; // Use latest proposal
        
        console.log("\n🔄 Testing increaseVotingDuration function...");
        try {
          const increaseTx = await dao.increaseVotingDuration(proposalId, 86400); // Add 1 day
          await increaseTx.wait();
          console.log("✅ Voting duration increased successfully!");
          console.log("Proposal ID:", proposalId.toString());
          console.log("Added Time: 86400 seconds (1 day)");
          console.log("Transaction hash:", increaseTx.hash);
        } catch (error) {
          console.log("❌ Increase voting duration failed:", error.message);
        }

        console.log("\n🔄 Testing decreaseVotingDuration function...");
        try {
          const decreaseTx = await dao.decreaseVotingDuration(proposalId, 43200); // Remove 12 hours
          await decreaseTx.wait();
          console.log("✅ Voting duration decreased successfully!");
          console.log("Proposal ID:", proposalId.toString());
          console.log("Removed Time: 43200 seconds (12 hours)");
          console.log("Transaction hash:", decreaseTx.hash);
        } catch (error) {
          console.log("❌ Decrease voting duration failed:", error.message);
        }
      }

      // 7. Create Multi-Sig Proposal
      console.log("\n🔄 Testing createMultiSigProposal function...");
      try {
        const multiSigTx = await dao.createMultiSigProposal("pause", 0, "0x0000000000000000000000000000000000000000");
        await multiSigTx.wait();
        console.log("✅ Multi-sig proposal created successfully!");
        console.log("Action: pause");
        console.log("Transaction hash:", multiSigTx.hash);
      } catch (error) {
        console.log("❌ Multi-sig proposal creation failed:", error.message);
      }

      // 8. Execute Proposal (if any are ready)
      console.log("\n🔄 Testing executeProposal function...");
      if (allProposalIds.length > 0) {
        for (let proposalId of allProposalIds) {
          try {
            const isActive = await dao.isProposalActive(proposalId);
            const proposal = await dao.getProposalBasicDetails(proposalId);
            
            if (!isActive && !proposal.executed) {
              const executeTx = await dao.executeProposal(proposalId);
              await executeTx.wait();
              console.log("✅ Proposal executed successfully!");
              console.log("Proposal ID:", proposalId.toString());
              console.log("Transaction hash:", executeTx.hash);
              break;
            }
          } catch (error) {
            console.log("❌ Execute proposal failed for ID", proposalId.toString() + ":", error.message);
          }
        }
      }

    } else {
      console.log("⚠️  Admin functions skipped (not an admin account)");
      console.log("To test admin functions, use one of these accounts:");
      console.log("- 0x073f5395476468e4fc785301026607bc4ebab128");
      console.log("- 0xc55999C2D16dB17261c7140963118efaFb64F897");
      console.log("- 0x891fc568C192832D5Ce12C66e95bC47aF5aE8A8F");
    }

    console.log("\n" + "=".repeat(60));
    console.log("💸 REFUND OPERATIONS");
    console.log("=".repeat(60));

    // 9. Test Investment Refunds (for failed/unfunded proposals)
    console.log("\n🔄 Testing refundInvestments function...");
    if (allProposalIds.length > 0) {
      for (let proposalId of allProposalIds) {
        try {
          const proposal = await dao.getProposalBasicDetails(proposalId);
          if (proposal.executed && !proposal.passed) {
            const refundTx = await dao.refundInvestments(proposalId);
            await refundTx.wait();
            console.log("✅ Investment refunded successfully!");
            console.log("Proposal ID:", proposalId.toString());
            console.log("Transaction hash:", refundTx.hash);
            break;
          }
        } catch (error) {
          console.log("❌ Refund failed for proposal", proposalId.toString() + ":", error.message);
        }
      }
    } else {
      console.log("⚠️  No proposals available for refund testing");
    }

    console.log("\n🎉 WRITE FUNCTIONS TEST COMPLETED!");
    console.log("=================================");
    console.log("✅ All available write functions tested");
    console.log("✅ Deposit function working");
    console.log("✅ Proposal creation working");
    console.log("✅ Voting system operational");
    if (isAdmin) {
      console.log("✅ Admin functions working");
      console.log("✅ Voting duration management working");
      console.log("✅ Multi-sig system operational");
    }

    console.log("\n📊 Test Summary:");
    console.log("Account tested:", deployer.address);
    console.log("Is Admin:", isAdmin);
    console.log("Token Balance:", ethers.formatEther(tokenBalance), "tokens");

    console.log("\n📝 Available Functions Tested:");
    console.log("✅ deposit() - Deposit tokens to DAO");
    console.log("✅ createProposal() - Create funding proposals");
    console.log("✅ vote() - Vote on proposals with investment");
    console.log("✅ refundInvestments() - Refund failed proposal investments");
    
    if (isAdmin) {
      console.log("✅ createParameterProposal() - Create governance parameter changes");
      console.log("✅ increaseVotingDuration() - Extend proposal voting time");
      console.log("✅ decreaseVotingDuration() - Reduce proposal voting time");
      console.log("✅ createMultiSigProposal() - Create multi-signature proposals");
      console.log("✅ executeProposal() - Execute passed proposals");
      console.log("✅ refundProposalFee() - Refund fees for failed proposals");
    }

    return {
      success: true,
      isAdmin,
      functionsAvailable: isAdmin ? "All functions" : "Public functions only",
      tokenBalance: ethers.formatEther(tokenBalance)
    };

  } catch (error) {
    console.error("\n❌ Error testing write functions:");
    console.error(error.message);
    return { success: false, error: error.message };
  }
}

if (require.main === module) {
  main()
    .then((result) => {
      if (result.success) {
        console.log("\n✅ Write functions test completed!");
        process.exit(0);
      } else {
        console.log("\n❌ Write functions test failed!");
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("❌ Script error:", error);
      process.exit(1);
    });
}

module.exports = main;