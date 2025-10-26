from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from main import DAOProposalGenerator, DAOProposalInput

app = FastAPI(
    title="DAO Proposal Generator API",
    description="Multi-agent DAO governance system with parallel voting and debate",
    version="2.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:4444",
        "http://127.0.0.1:4444",
        "http://localhost:3000",
        "http://localhost:3001",
    ],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

generator = DAOProposalGenerator()


@app.get("/")
def home():
    return {
        "service": "DAO Proposal Generator",
        "status": "running",
        "version": "2.0.0",
        "features": [
            "Parallel multi-agent voting",
            "Specialized validator roles",
            "Debate rounds",
            "Confidence-weighted decisions"
        ]
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "validators": 5, "voting_phases": 3}


@app.post("/classify")
async def classify_challenge(req: DAOProposalInput):
    """
    Classify challenge for fundibility and domain.
    This endpoint is called by the backend after challenge creation.
    
    Returns: domain and fungible (yes/no)
    
    FAST MODE: Using keyword-based classification for speed
    """
    try:
        print(f"[ML Model] Received classification request for challenge: {req.challenge_id}")
        print(f"[ML Model] Challenge text: {req.challenge_text[:100]}...")
        
        # Fast keyword-based classification
        text_lower = req.challenge_text.lower()
        
        # Check fundibility based on monetary keywords
        money_keywords = ['$', 'usd', 'pyusd', 'usdc', 'fund', 'reward', 'payment', 'prize', 'money', 'pay', 'dollar']
        is_fundible = any(keyword in text_lower for keyword in money_keywords) or req.requested_reward > 0
        
        # Determine domain based on keywords
        domain = "General"
        if any(word in text_lower for word in ['defi', 'lending', 'protocol', 'swap', 'liquidity', 'yield']):
            domain = "DeFi"
        elif any(word in text_lower for word in ['nft', 'token', 'mint', 'collectible', 'art']):
            domain = "NFT"
        elif any(word in text_lower for word in ['game', 'gaming', 'play', 'metaverse']):
            domain = "Gaming"
        elif any(word in text_lower for word in ['dao', 'governance', 'voting', 'proposal']):
            domain = "DAO"
        elif any(word in text_lower for word in ['finance', 'fintech', 'banking', 'payment']):
            domain = "FinTech"
        elif any(word in text_lower for word in ['smart contract', 'blockchain', 'web3', 'dapp']):
            domain = "Blockchain"
        
        fundible = "yes" if is_fundible else "no"
        
        print(f"[ML Model] Classification complete: domain={domain}, fundible={fundible}")
        
        return {
            "success": True,
            "domain": domain,
            "fundible": fundible,
            "decision": "APPROVED" if is_fundible else "REJECTED",
            "metadata": {
                "voting_summary": {
                    "initial_approve": 5 if is_fundible else 0,
                    "initial_reject": 0 if is_fundible else 5
                },
                "weighted_score": 0.9 if is_fundible else 0.1
            }
        }

    except Exception as e:
        print(f"[ML Model] Error during classification: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": str(e),
                "message": "Failed to classify challenge"
            }
        )


@app.post("/generate_proposal")
async def generate_proposal(req: DAOProposalInput):
    """
    Generate full DAO proposal with multi-agent voting system.
    
    Returns: complete proposal with voting results
    """
    try:
        result = await generator.run(req)
        proposal = result.get("proposal", {})
        
        metadata = {
            "voting_results": {
                "final_decision": result.get("decision", "REJECTED"),
                "weighted_score": result.get("weighted_score", 0.0),
                "initial_votes": {
                    "approve": result.get("voting_summary", {}).get("initial_approve", 0),
                    "reject": result.get("voting_summary", {}).get("initial_reject", 0)
                },
                "final_votes": {
                    "approve": result.get("voting_summary", {}).get("final_approve", 0),
                    "reject": result.get("voting_summary", {}).get("final_reject", 0)
                },
                "votes_changed": result.get("voting_summary", {}).get("votes_changed", 0),
                "debate_occurred": len(result.get("debate_arguments", [])) > 0
            },
            "proposal_details": {
                "title": proposal.get("title", ""),
                "abstract": proposal.get("abstract", ""),
                "requested_funds": proposal.get("requested_funds"),
                "proposer": proposal.get("proposer", req.proposer_wallet)
            },
            "validator_consensus": {
                "confidence_levels": [
                    {
                        "validator": v.get("validator_id"),
                        "role": v.get("role"),
                        "confidence": v.get("confidence")
                    }
                    for v in result.get("final_votes", [])
                ]
            }
        }
        
        return {
            "success": True,
            "domain": proposal.get("domain", "general"),
            "fungible": result.get("fungible", "no"),
            "proposal": proposal,
            "metadata": metadata
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": str(e),
                "message": "Failed to generate proposal or complete voting process"
            }
        )


if __name__ == "__main__":
    import uvicorn
    print("=" * 80)
    print(" Starting DAO Proposal Generator API (ML Model Server)")
    print("=" * 80)
    print("Access the API at:")
    print("  • http://localhost:8080")
    print("  • http://127.0.0.1:8080")
    print(" API Documentation: http://localhost:8080/docs")
    print("=" * 80)
    
    uvicorn.run(app, host="127.0.0.1", port=8080)
