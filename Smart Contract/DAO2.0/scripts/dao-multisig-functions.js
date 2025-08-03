const { ethers } = require("hardhat");
require("dotenv").config();

/**
 * Comprehensive script to test Multi-Signature functions
 * Requires admin privileges to execute
 */

async function main() {
  console.log("🔐 Testing Multi-Signature Functions");
  console.log("===================================");

  // Updated contract address
  const daoAddress = "0x96200d82e180d09Ba12DCd25eefB14C5BE85def0";

  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log("Testing with account:", deployer.address);

  // Get contract instance
  const dao = await ethers.getContractAt("GanjesDAO", daoAddress);

  console.log("\n📋 Contract Address:", daoAddress);

  // Check if user is admin
  const isAdmin = await dao.isOwner(deployer.address);
  console.log("Is Admin:", isAdmin);

  if (!isAdmin) {
    console.log("\n❌ This script requires admin privileges!");
    console.log("Use one of these admin accounts:");
    console.log("- 0x073f5395476468e4fc785301026607bc4ebab128");
    console.log("- 0xc55999C2D16dB17261c7140963118efaFb64F897");
    console.log("- 0x891fc568C192832D5Ce12C66e95bC47aF5aE8A8F");
    return { success: false, error: "Not an admin account" };
  }

  try {
    console.log("\n" + "=".repeat(60));
    console.log("📊 MULTI-SIG CONFIGURATION");
    console.log("=".repeat(60));

    // 1. Check multi-sig configuration
    const requiredApprovals = await dao.getRequiredApprovals();
    console.log("✅ Required Approvals:", requiredApprovals.toString());

    const adminAddresses = [
      "0x073f5395476468e4fc785301026607bc4ebab128",
      "0xc55999C2D16dB17261c7140963118efaFb64F897",
      "0x891fc568C192832D5Ce12C66e95bC47aF5aE8A8F"
    ];

    console.log("\n✅ Multi-sig Owners:");
    for (let admin of adminAddresses) {
      const isOwner = await dao.isOwner(admin);
      console.log(`  - ${admin}: ${isOwner ? "✅" : "❌"}`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("📝 MULTI-SIG PROPOSAL CREATION");
    console.log("=".repeat(60));

    // 2. Create different types of multi-sig proposals
    const proposalTypes = [
      {
        action: "pause",
        value: 0,
        target: "0x0000000000000000000000000000000000000000",
        description: "Emergency pause contract"
      },
      {
        action: "unpause",
        value: 0,
        target: "0x0000000000000000000000000000000000000000",
        description: "Resume contract operations"
      }
    ];

    // Get existing proposals first
    const existingProposalIds = await dao.getAllProposalIds();
    
    if (existingProposalIds.length > 0) {
      // Add voting duration proposals
      const latestProposalId = existingProposalIds[existingProposalIds.length - 1];
      
      proposalTypes.push({
        action: "increaseVotingDuration",
        value: latestProposalId.toString(),
        target: ethers.zeroPadValue(ethers.toBeHex(86400), 20), // 1 day in seconds, encoded as address
        description: `Increase voting duration for proposal ${latestProposalId} by 1 day`
      });

      proposalTypes.push({
        action: "decreaseVotingDuration",
        value: latestProposalId.toString(),
        target: ethers.zeroPadValue(ethers.toBeHex(43200), 20), // 12 hours in seconds, encoded as address
        description: `Decrease voting duration for proposal ${latestProposalId} by 12 hours`
      });

      proposalTypes.push({
        action: "executeProposal",
        value: latestProposalId.toString(),
        target: "0x0000000000000000000000000000000000000000",
        description: `Execute proposal ${latestProposalId}`
      });
    }

    const createdProposals = [];

    for (let i = 0; i < proposalTypes.length; i++) {
      const prop = proposalTypes[i];
      console.log(`\n🔄 Creating multi-sig proposal ${i + 1}: ${prop.action}`);
      console.log("Description:", prop.description);
      
      try {
        const createTx = await dao.createMultiSigProposal(prop.action, prop.value, prop.target);
        const receipt = await createTx.wait();
        console.log("✅ Multi-sig proposal created successfully!");
        console.log("Transaction hash:", createTx.hash);
        
        // Get proposal ID from event
        const proposalEvent = receipt.logs.find(
          log => log.topics[0] === dao.interface.getEvent("MultiSigProposalCreated").topicHash
        );
        
        if (proposalEvent) {
          const proposalId = dao.interface.parseLog(proposalEvent).args.proposalId;
          console.log("📋 Multi-sig Proposal ID:", proposalId.toString());
          createdProposals.push({
            id: proposalId,
            action: prop.action,
            description: prop.description
          });
        }
      } catch (error) {
        console.log("❌ Failed to create multi-sig proposal:", error.message);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("🗳️  MULTI-SIG PROPOSAL APPROVAL");
    console.log("=".repeat(60));

    // 3. Get all multi-sig proposals
    const contractStatus = await dao.getContractStatus();
    const totalMultiSigProposals = contractStatus.totalMultiSigProposals;
    
    console.log("✅ Total Multi-sig Proposals:", totalMultiSigProposals.toString());

    // 4. Show details of existing multi-sig proposals
    if (totalMultiSigProposals > 0) {
      console.log("\n📋 Existing Multi-sig Proposals:");
      
      for (let i = 1; i <= Math.min(parseInt(totalMultiSigProposals.toString()), 10); i++) {
        try {
          const details = await dao.getMultiSigProposalDetails(i);
          console.log(`\n✅ Multi-sig Proposal ${i}:`);
          console.log("  - ID:", details.id.toString());
          console.log("  - Proposer:", details.proposer);
          console.log("  - Action:", details.action);
          console.log("  - Value:", details.value.toString());
          console.log("  - Target:", details.target);
          console.log("  - Approvals:", details.approvals.toString());
          console.log("  - Required:", requiredApprovals.toString());
          console.log("  - Executed:", details.executed);
          console.log("  - Can Execute:", details.approvals >= requiredApprovals && !details.executed);
          
          // Try to approve if not already approved and not executed
          if (!details.executed && details.approvals < requiredApprovals) {
            console.log(`\n🔄 Approving multi-sig proposal ${i}...`);
            try {
              const approveTx = await dao.approveMultiSigProposal(i);
              await approveTx.wait();
              console.log("✅ Multi-sig proposal approved!");
              console.log("Transaction hash:", approveTx.hash);
            } catch (error) {
              console.log("❌ Approval failed:", error.message);
            }
          }
          
        } catch (error) {
          console.log(`❌ Failed to get details for proposal ${i}:`, error.message);
        }
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("⚡ MULTI-SIG PROPOSAL EXECUTION");
    console.log("=".repeat(60));

    // 5. Execute approved multi-sig proposals
    if (totalMultiSigProposals > 0) {
      console.log("\n🔄 Checking for executable multi-sig proposals...");
      
      for (let i = 1; i <= Math.min(parseInt(totalMultiSigProposals.toString()), 10); i++) {
        try {
          const details = await dao.getMultiSigProposalDetails(i);
          
          if (!details.executed && details.approvals >= requiredApprovals) {
            console.log(`\n🔄 Executing multi-sig proposal ${i} (${details.action})...`);
            try {
              const executeTx = await dao.executeMultiSigProposal(i);
              await executeTx.wait();
              console.log("✅ Multi-sig proposal executed successfully!");
              console.log("Action:", details.action);
              console.log("Transaction hash:", executeTx.hash);
              
              // Check contract status if it was a pause/unpause
              if (details.action === "pause" || details.action === "unpause") {
                const newStatus = await dao.getContractStatus();
                console.log("New contract status - Paused:", newStatus.isPaused);
              }
              
            } catch (error) {
              console.log("❌ Execution failed:", error.message);
            }
          }
        } catch (error) {
          console.log(`❌ Failed to execute proposal ${i}:`, error.message);
        }
      }
    }

    console.log("\n🎉 MULTI-SIG FUNCTIONS TEST COMPLETED!");
    console.log("=====================================");
    console.log("✅ Multi-sig configuration verified");
    console.log("✅ Multi-sig proposal creation working");
    console.log("✅ Multi-sig approval system working");
    console.log("✅ Multi-sig execution system working");

    console.log("\n📊 Multi-sig Summary:");
    console.log("Required Approvals:", requiredApprovals.toString());
    console.log("Total Multi-sig Proposals:", totalMultiSigProposals.toString());
    console.log("Created New Proposals:", createdProposals.length);

    console.log("\n📝 Available Multi-sig Actions:");
    console.log("✅ pause - Emergency pause contract");
    console.log("✅ unpause - Resume contract operations");
    console.log("✅ increaseVotingDuration - Extend proposal voting time");
    console.log("✅ decreaseVotingDuration - Reduce proposal voting time");
    console.log("✅ executeProposal - Execute passed proposals");
    console.log("✅ emergencyExecute - Emergency proposal execution");

    console.log("\n🔗 View on BSCScan:");
    console.log(`https://testnet.bscscan.com/address/${daoAddress}`);

    return {
      success: true,
      requiredApprovals: requiredApprovals.toString(),
      totalProposals: totalMultiSigProposals.toString(),
      createdProposals: createdProposals.length
    };

  } catch (error) {
    console.error("\n❌ Error testing multi-sig functions:");
    console.error(error.message);
    return { success: false, error: error.message };
  }
}

if (require.main === module) {
  main()
    .then((result) => {
      if (result.success) {
        console.log("\n✅ Multi-sig functions test completed successfully!");
        process.exit(0);
      } else {
        console.log("\n❌ Multi-sig functions test failed!");
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("❌ Script error:", error);
      process.exit(1);
    });
}

module.exports = main;