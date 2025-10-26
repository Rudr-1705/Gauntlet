import { ethers } from 'ethers';

// Import ABIs
import SponsorDAOJson from '../abis/SponsorDAO.json';
import ValidatorDAOJson from '../abis/ValidatorDAO.json';

// Extract ABIs from the JSON files
const SponsorDAOAbi = SponsorDAOJson.abi;
const ValidatorDAOAbi = ValidatorDAOJson.abi;

// Contract addresses from environment
const SPONSOR_DAO_ADDRESS = import.meta.env.VITE_SPONSOR_DAO_ADDRESS;
const VALIDATOR_DAO_ADDRESS = import.meta.env.VITE_VALIDATOR_DAO_ADDRESS;

// Sepolia testnet configuration
const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 in decimal
const SEPOLIA_NETWORK = {
  chainId: SEPOLIA_CHAIN_ID,
  chainName: 'Sepolia Testnet',
  nativeCurrency: {
    name: 'Sepolia ETH',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: ['https://sepolia.infura.io/v3/'],
  blockExplorerUrls: ['https://sepolia.etherscan.io']
};

/**
 * Switch to Sepolia network
 */
export async function switchToSepolia() {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed');
  }

  try {
    // Try to switch to Sepolia
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_CHAIN_ID }],
    });
  } catch (switchError) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [SEPOLIA_NETWORK],
        });
      } catch (addError) {
        throw new Error('Failed to add Sepolia network to MetaMask');
      }
    } else {
      throw switchError;
    }
  }
}

/**
 * Get connected signer from MetaMask/wallet
 * Ensures user is on Sepolia network
 */
export async function getSigner() {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed');
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const network = await provider.getNetwork();
  
  // Check if on Sepolia (chainId 11155111)
  if (network.chainId !== 11155111n) {
    console.log('Wrong network detected. Switching to Sepolia...');
    await switchToSepolia();
    // Refresh provider after network switch
    const newProvider = new ethers.BrowserProvider(window.ethereum);
    const signer = await newProvider.getSigner();
    return signer;
  }

  const signer = await provider.getSigner();
  return signer;
}

/**
 * Create a new challenge on the blockchain
 */
export async function createChallengeOnChain(challengeData) {
  try {
    console.log('Starting createChallengeOnChain with data:', challengeData);
    
    const signer = await getSigner();
    console.log('Got signer:', await signer.getAddress());
    
    const contract = new ethers.Contract(SPONSOR_DAO_ADDRESS, SponsorDAOAbi, signer);
    
    // Get PYUSD token address from contract
    console.log('Getting PYUSD address from contract...');
    const pyusdAddress = await contract.pyusd();
    console.log('PYUSD address:', pyusdAddress);
    
    const pyusdContract = new ethers.Contract(
      pyusdAddress,
      ['function approve(address spender, uint256 amount) returns (bool)', 'function allowance(address owner, address spender) view returns (uint256)', 'function balanceOf(address owner) view returns (uint256)'],
      signer
    );
    
    const rewardAmount = ethers.parseUnits(challengeData.reward.toString(), 6); // PYUSD has 6 decimals
    console.log('Reward amount (parsed):', rewardAmount.toString());
    
    // Check user's PYUSD balance
    const userAddress = await signer.getAddress();
    const balance = await pyusdContract.balanceOf(userAddress);
    console.log('User PYUSD balance:', ethers.formatUnits(balance, 6));
    
    if (balance < rewardAmount) {
      throw new Error(`Insufficient PYUSD balance. You have ${ethers.formatUnits(balance, 6)} PYUSD but need ${challengeData.reward} PYUSD`);
    }
    
    // Check current allowance
    const currentAllowance = await pyusdContract.allowance(userAddress, SPONSOR_DAO_ADDRESS);
    console.log('Current allowance:', ethers.formatUnits(currentAllowance, 6));
    
    // Approve PYUSD if needed
    if (currentAllowance < rewardAmount) {
      console.log('Requesting PYUSD approval...');
      const approvalTx = await pyusdContract.approve(SPONSOR_DAO_ADDRESS, rewardAmount);
      console.log('Approval tx sent:', approvalTx.hash);
      await approvalTx.wait();
      console.log('PYUSD approval confirmed');
    } else {
      console.log('Sufficient allowance already exists');
    }
    
    // Convert domain to bytes32
    const domainBytes32 = ethers.encodeBytes32String(challengeData.domain.substring(0, 31));
    console.log('Domain bytes32:', domainBytes32);
    
    console.log('Calling createChallenge...');
    const tx = await contract.createChallenge(
      rewardAmount,
      domainBytes32,
      challengeData.metadataURI || ''
    );
    
    console.log('Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt);
    
    // Extract challengeId from ChallengeCreated event
    const event = receipt.logs.find(log => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed.name === 'ChallengeCreated';
      } catch { return false; }
    });
    
    const chainChallengeId = event ? contract.interface.parseLog(event).args.id.toString() : null;
    
    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      challengeId: chainChallengeId
    };

  } catch (error) {
    console.error('Error creating challenge on chain:', error);
    throw error;
  }
}

/**
 * Fund a challenge (participant joins by staking PYUSD)
 * @param {number} chainChallengeId - Challenge ID on blockchain
 * @param {number} stakeAmount - Amount to stake
 * @returns {Object} - Transaction receipt
 * Note: Answer is submitted separately via submitAnswer() after funding
 * Backend stores the answer hash and sends it to ValidatorDAO for verification
 * User's address is automatically captured via msg.sender in the contract
 */
export async function fundChallenge(chainChallengeId, stakeAmount) {
  try {
    console.log('Starting fundChallenge with:', { chainChallengeId, stakeAmount });
    
    const signer = await getSigner();
    console.log('Got signer:', await signer.getAddress());
    
    const contract = new ethers.Contract(SPONSOR_DAO_ADDRESS, SponsorDAOAbi, signer);
    
    // Get PYUSD token address from contract
    console.log('Getting PYUSD address from contract...');
    const pyusdAddress = await contract.pyusd();
    console.log('PYUSD address:', pyusdAddress);
    
    const pyusdContract = new ethers.Contract(
      pyusdAddress,
      ['function approve(address spender, uint256 amount) returns (bool)', 'function allowance(address owner, address spender) view returns (uint256)', 'function balanceOf(address owner) view returns (uint256)'],
      signer
    );
    
    const stakeAmountParsed = ethers.parseUnits(stakeAmount.toString(), 6); // PYUSD has 6 decimals
    console.log('Stake amount (parsed):', stakeAmountParsed.toString());
    
    // Check user's PYUSD balance
    const userAddress = await signer.getAddress();
    const balance = await pyusdContract.balanceOf(userAddress);
    console.log('User PYUSD balance:', ethers.formatUnits(balance, 6));
    
    if (balance < stakeAmountParsed) {
      throw new Error(`Insufficient PYUSD balance. You have ${ethers.formatUnits(balance, 6)} PYUSD but need ${stakeAmount} PYUSD to participate.`);
    }
    
    // Check current allowance
    const currentAllowance = await pyusdContract.allowance(userAddress, SPONSOR_DAO_ADDRESS);
    console.log('Current allowance:', ethers.formatUnits(currentAllowance, 6));
    
    // Approve PYUSD if needed
    if (currentAllowance < stakeAmountParsed) {
      console.log('Requesting PYUSD approval for staking...');
      const approvalTx = await pyusdContract.approve(
        SPONSOR_DAO_ADDRESS,
        stakeAmountParsed
      );
      console.log('Approval tx sent:', approvalTx.hash);
      await approvalTx.wait();
      console.log('PYUSD approval confirmed');
    } else {
      console.log('Sufficient allowance already exists');
    }
    
    // Call fundChallenge - msg.sender automatically becomes the participant
    console.log('Calling fundChallenge on contract...');
    const tx = await contract.fundChallenge(
      chainChallengeId,
      stakeAmountParsed
    );
    
    console.log('Fund challenge transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Fund challenge transaction confirmed:', receipt);
    
    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };

  } catch (error) {
    console.error('Error staking on challenge:', error);
    throw error;
  }
}

/**
 * Get challenge details from blockchain
 * @param {number} chainChallengeId - Challenge ID on blockchain
 * @returns {Object} - Challenge data
 */
export async function getChallengeFromChain(chainChallengeId) {
  try {
    // Check if MetaMask is available
    if (!window.ethereum) {
      throw new Error('MetaMask not installed. Please install MetaMask to view on-chain data.');
    }

    // Check if chainChallengeId is valid
    if (!chainChallengeId || chainChallengeId === '0') {
      throw new Error('Challenge not yet created on blockchain. Chain ID is missing.');
    }
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(SPONSOR_DAO_ADDRESS, SponsorDAOAbi, provider);
    
    const challengeInfo = await contract.getChallengeBasicInfo(chainChallengeId);
    
    return {
      creator: challengeInfo[0],
      stakeAmount: ethers.formatUnits(challengeInfo[1], 6), // PYUSD 6 decimals
      totalStaked: ethers.formatUnits(challengeInfo[2], 6),
      startTime: challengeInfo[3].toString(),
      endTime: challengeInfo[4].toString(),
      active: challengeInfo[5],
      verified: challengeInfo[6],
      domain: ethers.decodeBytes32String(challengeInfo[7]),
      metadataURI: challengeInfo[8],
      participantCount: challengeInfo[9].toString()
    };

  } catch (error) {
    console.error('Error getting challenge from chain:', error);
    console.error('ChainChallengeId:', chainChallengeId);
    console.error('Contract address:', SPONSOR_DAO_ADDRESS);
    throw error;
  }
}

/**
 * Check if user has approved PYUSD spending
 * @param {string} userAddress - User wallet address
 * @param {number} amount - Amount to check approval for
 * @returns {boolean} - Whether approved
 */
export async function checkPYUSDApproval(userAddress, amount) {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const sponsorDao = new ethers.Contract(SPONSOR_DAO_ADDRESS, SponsorDAOAbi, provider);
    
    // Get PYUSD token address from SponsorDAO
    const pyusdAddress = await sponsorDao.pyusd();
    
    // Check allowance
    const pyusdContract = new ethers.Contract(
      pyusdAddress,
      ['function allowance(address owner, address spender) view returns (uint256)'],
      provider
    );
    
    const allowance = await pyusdContract.allowance(userAddress, SPONSOR_DAO_ADDRESS);
    const requiredAmount = ethers.parseUnits(amount.toString(), 6); // PYUSD 6 decimals
    
    return allowance >= requiredAmount;
  } catch (error) {
    console.error('Error checking PYUSD approval:', error);
    return false;
  }
}

/**
 * Approve PYUSD spending for SponsorDAO
 * @param {number} amount - Amount to approve
 * @returns {Object} - Transaction receipt
 */
export async function approvePYUSD(amount) {
  try {
    const signer = await getSigner();
    const sponsorDao = new ethers.Contract(SPONSOR_DAO_ADDRESS, SponsorDAOAbi, signer);
    
    // Get PYUSD token address from SponsorDAO
    const pyusdAddress = await sponsorDao.pyusd();
    
    // Approve PYUSD spending
    const pyusdContract = new ethers.Contract(
      pyusdAddress,
      ['function approve(address spender, uint256 amount) returns (bool)'],
      signer
    );
    
    const tx = await pyusdContract.approve(
      SPONSOR_DAO_ADDRESS,
      ethers.parseUnits(amount.toString(), 6) // PYUSD 6 decimals
    );
    
    console.log('PYUSD approval tx sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('PYUSD approval confirmed:', receipt);
    
    return {
      success: true,
      txHash: receipt.hash
    };
  } catch (error) {
    console.error('Error approving PYUSD:', error);
    throw error;
  }
}

/**
 * Submit answer on-chain so ValidatorDAO can pick it up
 * @param {number} chainChallengeId - Challenge ID on blockchain
 * @returns {Object} - Transaction receipt
 * Note: submissionURI is sent as empty string ("") - contract doesn't use it
 */
export async function submitAnswerOnChain(chainChallengeId) {
  try {
    const signer = await getSigner();
    const contract = new ethers.Contract(SPONSOR_DAO_ADDRESS, SponsorDAOAbi, signer);

    // Contract accepts submissionURI but doesn't use it - send empty string
    const tx = await contract.submitAnswer(chainChallengeId, "");
    console.log('SubmitAnswer tx sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('SubmitAnswer confirmed:', receipt);
    return { success: true, txHash: receipt.hash, blockNumber: receipt.blockNumber };

  } catch (error) {
    console.error('Error submitting answer on chain:', error);
    throw error;
  }
}

export default {
  getSigner,
  createChallengeOnChain,
  fundChallenge,
  submitAnswerOnChain,
  getChallengeFromChain,
  checkPYUSDApproval,
  approvePYUSD
};
