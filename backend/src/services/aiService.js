// import axios from "axios";
const AI_API_BASE = process.env.AI_API_URL || "http://localhost:8000/api";
export async function callAIModel(challengeData) {
  try {
    // const response = await axios.post(`${AI_API_BASE}/classify`, challengeData); //not running now hence mocking it 
    // return response.data;
    return {
      domain: "Blockchain Infrastructure",
      tags: ["privacy", "smart contracts", "zk-proof"],  // FIX AFTER ML 
      confidence: 0.92,
    };
  } catch (error) {
    console.error("AI classification error:", error.message);
    return { domain: "Uncategorized", confidence: 0 };
  }
}

/* Called when participant submits an answer,model validates the submission + generates zk-proof*/
export async function generateProof(submissionData) {
  try {
    // const response = await axios.post(`${AI_API_BASE}/generateProof`, submissionData);
    // return response.data;
    return {        // got from net random
      proofId: "zkp-12345",
      valid: true,
      confidence: 0.97,
      proofData: {
        a: ["0x123", "0x456"],
        b: [["0x789", "0xabc"], ["0xdef", "0xghi"]],
        c: ["0xjkl", "0xmn0"],
      },
    };
  } catch (error) {
    console.error("K Proof generation error:", error.message);
    return { proofId: null, valid: false };
  }
}
